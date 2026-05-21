const Reconcile = (() => {
  const kindLabels = {
    cash_income: "Thu thường",
    cash_expense: "Chi thường",
    lend: "Cho vay",
    collect: "Thu hồi nợ",
    expected: "Nhận dự kiến",
    transfer: "Chuyển khoản"
  };

  function assetNames() {
    return Storage.assetCategoryNames;
  }

  function receivableMap() {
    return Storage.read("receivables", []).reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }

  function expectedMap() {
    return Storage.read("expectedIncome", []).reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }

  function sum(items, pick) {
    return Utils.sum(items, pick);
  }

  function classifyTransaction(tx) {
    if (tx.type === "transfer") return "transfer";
    if (tx.sourceType === "receivable") {
      return tx.type === "income" ? "collect" : "lend";
    }
    if (tx.sourceType === "expectedIncome") {
      return "expected";
    }
    return tx.type === "income" ? "cash_income" : "cash_expense";
  }

  function transactionLabel(tx, recvNames, expNames) {
    if (tx.sourceType === "receivable" && tx.sourceId) {
      const person = recvNames[tx.sourceId] || "Phải thu";
      return `${person} · ${tx.note || tx.category}`;
    }
    if (tx.sourceType === "expectedIncome" && tx.sourceId) {
      const name = expNames[tx.sourceId] || "Dự kiến";
      return `${name} · ${tx.note || tx.category}`;
    }
    if (tx.type === "transfer") {
      const arrow = tx.transferRole === "in" ? "←" : "→";
      return `${tx.wallet} ${arrow} ${tx.transferTo || ""}${tx.note ? ` · ${tx.note}` : ""}`;
    }
    return tx.note || tx.category || "—";
  }

  function monthTransactions(month) {
    return Transactions.all().filter((item) => item.date.startsWith(month));
  }

  function monthStats(month) {
    const items = monthTransactions(month);
    const names = assetNames();
    const regularIncome = sum(items.filter((item) => item.type === "income" && !item.sourceType), (item) => item.amount);
    const regularExpense = sum(items.filter((item) => item.type === "expense" && !item.sourceType), (item) => item.amount);
    const lent = sum(items.filter((item) => item.type === "expense" && (item.sourceType === "receivable" || item.category === names.lend)), (item) => item.amount);
    const collected = sum(items.filter((item) => item.type === "income" && (item.sourceType === "receivable" || item.category === names.collectReceivable)), (item) => item.amount);
    const expectedReceived = sum(items.filter((item) => item.type === "income" && item.sourceType === "expectedIncome"), (item) => item.amount);

    const receivables = Storage.read("receivables", []);
    const expectedIncome = Storage.read("expectedIncome", []);
    const wallets = Storage.read("wallets", []);

    return {
      regularIncome,
      regularExpense,
      lent,
      collected,
      expectedReceived,
      netRegular: regularIncome - regularExpense,
      netLending: collected - lent,
      receivableOutstanding: sum(receivables, (item) => item.amount),
      expectedOutstanding: sum(expectedIncome, (item) => item.amount),
      walletBalance: sum(wallets, (item) => item.balance)
    };
  }

  function buildLedger(month) {
    const recvNames = receivableMap();
    const expNames = expectedMap();
    return monthTransactions(month)
      .map((tx) => ({
        date: tx.date,
        kind: classifyTransaction(tx),
        type: tx.type,
        category: tx.category,
        wallet: tx.wallet,
        transferTo: tx.transferTo,
        transferRole: tx.transferRole,
        amount: Number(tx.amount) || 0,
        label: transactionLabel(tx, recvNames, expNames)
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function receivableRows(month) {
    return Storage.read("receivables", []).map((item) => {
      const adjustments = item.adjustments || [];
      const settlements = item.settlements || [];
      const lentMonth = sum(adjustments.filter((entry) => entry.date?.startsWith(month)), (entry) => entry.amount);
      const collectedMonth = sum(settlements.filter((entry) => entry.date?.startsWith(month)), (entry) => entry.amount);
      const lentTotal = sum(adjustments, (entry) => entry.amount);
      const collectedTotal = sum(settlements, (entry) => entry.amount);
      return {
        name: item.name,
        originalAmount: Number(item.originalAmount) || Number(item.amount) + collectedTotal,
        remaining: Number(item.amount) || 0,
        lentMonth,
        collectedMonth,
        lentTotal,
        collectedTotal
      };
    });
  }

  function statCard(label, value, tone = "") {
    return `
      <article class="reconcile-stat-card ${tone}">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `;
  }

  function summaryGroup(title, cardsHtml) {
    return `
      <section class="reconcile-summary-group">
        <h3 class="reconcile-group-title">${title}</h3>
        <div class="reconcile-summary-grid">${cardsHtml}</div>
      </section>
    `;
  }

  function renderSummary(month, stats) {
    const monthLabel = Utils.getMonthLabel(month);
    const netRegularClass = stats.netRegular >= 0 ? "amount-income" : "amount-expense";
    const netLendingClass = stats.netLending >= 0 ? "amount-income" : "amount-expense";

    document.getElementById("reconcileSummary").innerHTML = `
      <div class="reconcile-summary">
        ${summaryGroup(`Thu chi thường · ${monthLabel}`, `
          ${statCard("Tổng thu", Utils.formatMoney(stats.regularIncome), "tone-income")}
          ${statCard("Tổng chi", Utils.formatMoney(stats.regularExpense), "tone-expense")}
          ${statCard("Ròng", `<span class="${netRegularClass}">${Utils.formatMoney(stats.netRegular)}</span>`, "tone-highlight")}
        `)}
        ${summaryGroup("Cho vay & thu hồi nợ", `
          ${statCard("Cho vay trong tháng", Utils.formatMoney(stats.lent), "tone-expense")}
          ${statCard("Thu hồi trong tháng", Utils.formatMoney(stats.collected), "tone-income")}
          ${statCard("Ròng cho vay / thu hồi", `<span class="${netLendingClass}">${Utils.formatMoney(stats.netLending)}</span>`, "tone-highlight")}
        `)}
        ${summaryGroup("Tổng hợp tài sản", `
          ${statCard("Nhận dự kiến (tháng)", Utils.formatMoney(stats.expectedReceived), "tone-income")}
          ${statCard("Phải thu còn lại", Utils.formatMoney(stats.receivableOutstanding))}
          ${statCard("Dự kiến còn lại", Utils.formatMoney(stats.expectedOutstanding))}
          ${statCard("Tổng số dư ví", Utils.formatMoney(stats.walletBalance), "tone-balance")}
        `)}
      </div>
    `;
  }

  function renderBreakdown(month, stats) {
    document.getElementById("reconcileBreakdown").innerHTML = `
      <div class="reconcile-block">
        <h3>Thu chi tiền mặt (không qua phải thu)</h3>
        <p>Thu <strong class="amount-income">${Utils.formatMoney(stats.regularIncome)}</strong> · Chi <strong class="amount-expense">${Utils.formatMoney(stats.regularExpense)}</strong> · Ròng <strong>${Utils.formatMoney(stats.netRegular)}</strong></p>
        <small>Giao dịch thu/chi bình thường, không gắn khoản phải thu hay dự kiến.</small>
      </div>
      <div class="reconcile-block">
        <h3>Cho vay & thu hồi</h3>
        <p>Cho vay <strong class="amount-expense">${Utils.formatMoney(stats.lent)}</strong> · Thu hồi <strong class="amount-income">${Utils.formatMoney(stats.collected)}</strong> · Ròng <strong>${Utils.formatMoney(stats.netLending)}</strong></p>
        <small>Tiền ra khỏi ví khi cho vay; tiền vào ví khi người vay trả. Phải thu còn lại toàn hệ thống: <strong>${Utils.formatMoney(stats.receivableOutstanding)}</strong>.</small>
      </div>
    `;
  }

  function renderLedger(month) {
    const ledger = buildLedger(month);
    const rows = ledger.map((entry) => `
      <tr>
        <td>${entry.date}</td>
        <td><span class="reconcile-badge ${entry.kind}">${kindLabels[entry.kind] || entry.kind}</span></td>
        <td>${Utils.escapeHtml(entry.label)}</td>
        <td>${Utils.escapeHtml(entry.category)}</td>
        <td>${Utils.escapeHtml(entry.wallet)}</td>
        <td class="align-right ${entry.type === "transfer" ? "amount-transfer" : entry.type === "income" ? "amount-income" : "amount-expense"}">
          ${entry.type === "transfer"
    ? `${entry.transferRole === "in" ? "+" : "−"}${Utils.formatMoney(entry.amount)}`
    : `${entry.type === "income" ? "+" : "−"}${Utils.formatMoney(entry.amount)}`}
        </td>
      </tr>
    `).join("");

    document.getElementById("reconcileLedger").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Loại</th>
              <th>Mô tả</th>
              <th>Danh mục</th>
              <th>Ví</th>
              <th class="align-right">Số tiền</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6" class="empty-state">Không có phát sinh trong tháng này.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  }

  function renderReceivableTable(month) {
    const rows = receivableRows(month);
    document.getElementById("reconcileReceivables").innerHTML = rows.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Người vay</th>
              <th class="align-right">Tổng gốc</th>
              <th class="align-right">Còn lại</th>
              <th class="align-right">Cho vay (tháng)</th>
              <th class="align-right">Thu hồi (tháng)</th>
              <th class="align-right">Cho vay (lũy kế)</th>
              <th class="align-right">Thu hồi (lũy kế)</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><strong>${Utils.escapeHtml(row.name)}</strong></td>
                <td class="align-right">${Utils.formatMoney(row.originalAmount)}</td>
                <td class="align-right"><strong>${Utils.formatMoney(row.remaining)}</strong></td>
                <td class="align-right amount-expense">${Utils.formatMoney(row.lentMonth)}</td>
                <td class="align-right amount-income">${Utils.formatMoney(row.collectedMonth)}</td>
                <td class="align-right">${Utils.formatMoney(row.lentTotal)}</td>
                <td class="align-right">${Utils.formatMoney(row.collectedTotal)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="empty-state">Chưa có khoản phải thu.</p>`;
  }

  function render(month) {
    const stats = monthStats(month);
    renderSummary(month, stats);
    renderBreakdown(month, stats);
    renderLedger(month);
    renderReceivableTable(month);
  }

  return { render };
})();
