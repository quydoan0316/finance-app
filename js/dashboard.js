const Dashboard = (() => {
  function summary(transactions) {
    const income = Utils.sum(transactions.filter((item) => item.type === "income"), (item) => item.amount);
    const expense = Utils.sum(transactions.filter((item) => item.type === "expense"), (item) => item.amount);
    const budgetTotal = Utils.sum(Budget.statusFor(transactions), (item) => item.amount);
    const budgetSpent = Utils.sum(Budget.statusFor(transactions), (item) => item.spent);
    const wallets = Storage.read("wallets", []);
    const receivables = Storage.read("receivables", []);
    const expectedIncome = Storage.read("expectedIncome", []);
    const walletBalance = Utils.sum(wallets, (item) => item.balance);
    const totalAssets = walletBalance + Utils.sum(receivables, (item) => item.amount) + Utils.sum(expectedIncome, (item) => item.amount);
    return [
      { label: "Tài sản ước tính", value: totalAssets, hint: "Ví + phải thu + dự kiến", type: "asset" },
      { label: "Tổng thu nhập", value: income, hint: "Toàn bộ khoản thu", type: "income" },
      { label: "Tổng chi tiêu", value: expense, hint: "Toàn bộ khoản chi", type: "expense" },
      { label: "Số dư hiện tại", value: walletBalance, hint: "Tổng số dư trong các ví", type: "balance" },
      { label: "Ngân sách tháng", value: Math.max(budgetTotal - budgetSpent, 0), hint: "Ngân sách còn lại", type: "budget" }
    ];
  }

  function renderSummary(transactions) {
    document.getElementById("summaryGrid").innerHTML = summary(transactions).map((item) => `
      <article class="summary-card ${item.type}">
        <span>${item.label}</span>
        <strong class="${item.type === "income" || item.type === "asset" ? "amount-income" : item.type === "expense" ? "amount-expense" : ""}">
          ${Utils.formatMoney(item.value)}
        </strong>
        <small>${item.hint}</small>
      </article>
    `).join("");
  }

  function renderRecent(transactions) {
    const recent = [...transactions].sort(Utils.byDateDesc).slice(0, 5);
    document.getElementById("recentTransactions").innerHTML = recent.length ? recent.map((item) => `
      <div class="list-row">
        <div>
          <strong>${Utils.escapeHtml(item.category)} - ${Utils.escapeHtml(item.wallet)}</strong>
          <small>${Utils.escapeHtml(item.note || "Không có ghi chú")} · ${item.date}</small>
        </div>
        <span class="${item.type === "income" ? "amount-income" : "amount-expense"}">
          ${item.type === "income" ? "+" : "-"}${Utils.formatMoney(item.amount)}
        </span>
      </div>
    `).join("") : `<p class="empty-state">Chưa có giao dịch.</p>`;
  }

  function renderBudgetStatus(transactions, targetId = "budgetStatus") {
    const status = Budget.statusFor(transactions);
    document.getElementById(targetId).innerHTML = status.length ? status.map((item) => `
      <div class="budget-row">
        <div>
          <strong>${Utils.escapeHtml(item.category)}</strong>
          <small>${Utils.getMonthLabel(Utils.currentMonth())} · Đã chi ${Utils.formatMoney(item.spent)}</small>
          <div class="budget-meter ${item.percent > 100 ? "over" : ""}" style="--progress: ${Math.min(item.percent, 100)}%">
            <span></span>
          </div>
        </div>
        <div class="budget-meta">
          <strong>${item.percent}%</strong>
          <small>${item.remaining >= 0 ? "Còn lại " : "Vượt "}${Utils.formatMoney(Math.abs(item.remaining))}</small>
        </div>
      </div>
    `).join("") : `<p class="empty-state">Chưa có ngân sách trong tháng này.</p>`;
  }

  function render(transactions) {
    renderSummary(transactions);
    renderRecent(transactions);
    renderBudgetStatus(transactions);
    FinanceCharts.renderAll(transactions);
  }

  return { render, renderBudgetStatus };
})();
