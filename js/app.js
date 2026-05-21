const App = (() => {
  let categories = [];
  let wallets = [];
  let receivables = [];
  let expectedIncome = [];
  let selectedBudgetMonth = Utils.currentMonth();

  function sumSettlements(items = []) {
    return Utils.sum(items, (item) => item.amount);
  }

  function normalizeSourceEntry(entry, prefix) {
    const settlements = Array.isArray(entry.settlements) ? entry.settlements.map((item) => ({
      id: item.id || Utils.createId(`${prefix}_settlement`),
      amount: Number(item.amount) || 0,
      wallet: item.wallet || "Tiền mặt",
      date: item.date || Utils.today(),
      note: item.note || "",
      category: item.category || "",
      transactionId: item.transactionId || ""
    })) : [];
    const remaining = Number(entry.amount) || 0;
    const collected = sumSettlements(settlements);
    const originalAmount = Number(entry.originalAmount);
    return {
      ...entry,
      amount: remaining,
      originalAmount: Number.isFinite(originalAmount) && originalAmount > 0 ? originalAmount : remaining + collected,
      settlements
    };
  }

  function persistWallets() {
    Storage.write("wallets", wallets);
  }

  function persistReceivables() {
    Storage.write("receivables", receivables);
  }

  function persistExpectedIncome() {
    Storage.write("expectedIncome", expectedIncome);
  }

  function normalizeImportArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeCategories(list) {
    return normalizeImportArray(list).map((item) => Storage.decorateCategory(item));
  }

  function normalizeTransactionsList(list) {
    return normalizeImportArray(list).map((item) => Storage.normalizeTransaction(item));
  }

  function normalizeWallets(list, transactions) {
    return normalizeImportArray(list)
      .map((wallet) => Storage.decorateWallet(wallet, transactions))
      .filter((wallet) => wallet.name);
  }

  function applyImportedData(imported) {
    // Chuẩn hóa giao dịch trong RAM trước (chưa ghi) — chỉ để suy ra initialBalance
    // khi file backup cũ thiếu trường đó. File export đúng chuẩn đã có initialBalance sẵn.
    const transactions = normalizeTransactionsList(imported.transactions);

    categories = normalizeCategories(imported.categories);
    wallets = normalizeWallets(imported.wallets, transactions);
    receivables = normalizeImportArray(imported.receivables).map((item) => normalizeSourceEntry(item, "recv"));
    expectedIncome = normalizeImportArray(imported.expectedIncome).map((item) => normalizeSourceEntry(item, "exp"));

    Storage.write("categories", categories);
    // Ví (và initialBalance) trước — giao dịch phát sinh sau khi đã có ví
    Storage.write("wallets", wallets);
    Storage.write("receivables", receivables);
    Storage.write("expectedIncome", expectedIncome);
    Storage.write("transactions", transactions);
    Storage.write("budgets", normalizeImportArray(imported.budgets));
    Storage.write("recurring", normalizeImportArray(imported.recurring));

    Transactions.load();
    Budget.load();
    persistWallets();
    persistReceivables();
    persistExpectedIncome();
  }

  function boot() {
    Storage.seed();
    Transactions.load();
    Budget.load();
    categories = normalizeCategories(Storage.read("categories", []));
    wallets = normalizeWallets(Storage.read("wallets", []), Transactions.all());
    persistWallets();
    Storage.write("categories", categories);
    receivables = Storage.read("receivables", []).map((item) => normalizeSourceEntry(item, "recv"));
    expectedIncome = Storage.read("expectedIncome", []).map((item) => normalizeSourceEntry(item, "exp"));
    persistReceivables();
    persistExpectedIncome();
    applyTheme();
    bindEvents();
    renderAll();
  }

  function renderAll() {
    renderFilters();
    renderTransactions();
    renderAssets();
    renderCategories();
    renderBudgets();
    renderRecurring();
    Dashboard.render(Transactions.all());
  }

  function applyTheme() {
    const theme = localStorage.getItem(Storage.keys.theme) || "dark";
    document.body.classList.toggle("dark", theme === "dark");
    document.getElementById("themeToggle").textContent = theme === "dark" ? "Chế độ sáng" : "Chế độ tối";
  }

  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });

    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = document.body.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem(Storage.keys.theme, next);
      applyTheme();
      FinanceCharts.renderAll(Transactions.all());
    });

    document.getElementById("addTransactionBtn").addEventListener("click", () => openTransactionForm());
    document.getElementById("addWalletBtn").addEventListener("click", () => openWalletForm());
    document.getElementById("addReceivableBtn").addEventListener("click", () => openReceivableForm());
    document.getElementById("addExpectedIncomeBtn").addEventListener("click", () => openExpectedIncomeForm());
    document.getElementById("addCategoryBtn").addEventListener("click", () => openCategoryForm());
    document.getElementById("addBudgetBtn").addEventListener("click", () => openBudgetForm());
    document.getElementById("budgetMonthInput").value = selectedBudgetMonth;
    document.getElementById("budgetMonthInput").addEventListener("input", (event) => {
      selectedBudgetMonth = event.target.value || Utils.currentMonth();
      renderBudgets();
    });
    document.getElementById("addRecurringBtn").addEventListener("click", () => openRecurringForm());
    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importInput").click());
    document.getElementById("importInput").addEventListener("change", importData);
    document.querySelectorAll("[data-close-modal]").forEach((item) => item.addEventListener("click", closeModal));

    ["searchInput", "monthFilter", "typeFilter", "categoryFilter", "walletFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderTransactions);
    });

    ["assetSearchInput", "assetTypeFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderAssets);
    });

    ["categorySearchInput", "categoryTypeListFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderCategories);
    });

    ["budgetSearchInput", "budgetStateFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderBudgets);
    });

    ["recurringSearchInput", "recurringCycleFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderRecurring);
    });
  }

  function switchView(view) {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    document.getElementById(`${view}View`).classList.add("active");
  }

  function options(items, selected = "") {
    return items.map((item) => `<option value="${Utils.escapeHtml(item)}" ${item === selected ? "selected" : ""}>${Utils.escapeHtml(item)}</option>`).join("");
  }

  function fieldValue(id, fallback = "") {
    return document.getElementById(id)?.value || fallback;
  }

  function normalizeSearch(value) {
    return String(value || "").trim().toLowerCase();
  }

  function includesSearch(values, query) {
    if (!query) return true;
    return values.some((value) => normalizeSearch(value).includes(query));
  }

  function categoryOptions(type, selected = "") {
    return options(categories.filter((cat) => cat.type === type).map((cat) => cat.name), selected);
  }

  function incomeCategoryOptions(selected = "") {
    return categoryOptions("income", selected);
  }

  function categoryMeta(name) {
    return categories.find((cat) => cat.name === name) || {
      name,
      icon: "🏷️",
      color: "#64748b"
    };
  }

  function categoryChip(name) {
    const cat = categoryMeta(name);
    return `
      <span class="category-chip" style="--category-color: ${Utils.escapeHtml(cat.color)}">
        <span class="category-icon">${Utils.escapeHtml(cat.icon)}</span>
        <span>${Utils.escapeHtml(name)}</span>
      </span>
    `;
  }

  function walletOptions(selected = "") {
    const names = wallets.map((wallet) => wallet.name);
    if (selected && !names.includes(selected)) {
      names.unshift(selected);
    }
    return options(names, selected);
  }

  function findWallet(name) {
    return wallets.find((wallet) => wallet.name === name);
  }

  function adjustWalletBalance(walletName, delta) {
    const wallet = findWallet(walletName);
    if (!wallet) {
      alert(`Không tìm thấy ví "${walletName}" để cập nhật số dư.`);
      return false;
    }

    wallets = wallets.map((item) => item.name === walletName ? {
      ...item,
      balance: Number(item.balance || 0) + Number(delta || 0)
    } : item);
    persistWallets();
    return true;
  }

  function applyTransactionImpact(transaction, direction = 1) {
    if (!transaction?.wallet) return true;
    const amount = Number(transaction.amount) || 0;
    const delta = transaction.type === "income" ? amount * direction : -amount * direction;
    return adjustWalletBalance(transaction.wallet, delta);
  }

  function saveTransaction(data) {
    const previous = data.id ? Transactions.find(data.id) : null;
    if (previous?.sourceType) {
      alert("Giao dịch này được tạo từ khoản phải thu hoặc dự kiến. Hãy cập nhật từ mục Tài sản để giữ đồng bộ.");
      return false;
    }

    if (previous && !applyTransactionImpact(previous, -1)) return false;
    const saved = Transactions.upsert(data);
    if (!applyTransactionImpact(saved, 1)) {
      if (previous) {
        Transactions.upsert(previous);
        applyTransactionImpact(previous, 1);
      } else {
        Transactions.remove(saved.id);
      }
      return false;
    }
    return saved;
  }

  function removeTransactionWithImpact(id) {
    const item = Transactions.find(id);
    if (!item) return true;
    if (item.sourceType) {
      alert("Giao dịch này được tạo từ khoản phải thu hoặc dự kiến. Hãy thao tác từ mục Tài sản để giữ dữ liệu đồng bộ.");
      return false;
    }
    if (!applyTransactionImpact(item, -1)) return false;
    Transactions.remove(id);
    return true;
  }

  function sourceSummary(item, leadingLabel) {
    const collected = sumSettlements(item.settlements);
    const total = Number(item.originalAmount || item.amount || 0);
    if (collected > 0) {
      return `${leadingLabel} · Đã nhận ${Utils.formatMoney(collected)} / ${Utils.formatMoney(total)}`;
    }
    return `${leadingLabel} · Chưa nhận khoản nào`;
  }

  function renderFilters() {
    const months = [...new Set(Transactions.all().map((item) => item.date.slice(0, 7)))].sort().reverse();
    document.getElementById("monthFilter").innerHTML = `<option value="all">Tất cả tháng</option>${options(months)}`;
    document.getElementById("categoryFilter").innerHTML = `<option value="all">Tất cả danh mục</option>${options(categories.map((cat) => cat.name))}`;
    document.getElementById("walletFilter").innerHTML = `<option value="all">Tất cả ví</option>${options(wallets.map((wallet) => wallet.name))}`;
  }

  function renderTransactions() {
    const criteria = {
      search: document.getElementById("searchInput").value,
      month: document.getElementById("monthFilter").value || "all",
      type: document.getElementById("typeFilter").value || "all",
      category: document.getElementById("categoryFilter").value || "all",
      wallet: document.getElementById("walletFilter").value || "all"
    };
    const rows = Transactions.filter(criteria);
    document.getElementById("transactionsTable").innerHTML = rows.length ? rows.map((item) => `
      <tr>
        <td>${item.date}</td>
        <td><span class="badge ${item.type}">${item.type === "income" ? "Thu nhập" : "Chi tiêu"}</span></td>
        <td>${categoryChip(item.category)}</td>
        <td>${Utils.escapeHtml(item.wallet)}</td>
        <td>${Utils.escapeHtml(item.note)}</td>
        <td class="align-right ${item.type === "income" ? "amount-income" : "amount-expense"}">${Utils.formatMoney(item.amount)}</td>
        <td class="align-right">
          <span class="row-actions">
            <button class="icon-btn action-edit" type="button" onclick="App.openTransactionForm('${item.id}')" aria-label="Sửa giao dịch" title="Sửa">✎</button>
            <button class="icon-btn action-delete" type="button" onclick="App.deleteTransaction('${item.id}')" aria-label="Xóa giao dịch" title="Xóa">🗑</button>
          </span>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7" class="empty-state">Không tìm thấy giao dịch.</td></tr>`;
  }

  function renderCategories() {
    const query = normalizeSearch(fieldValue("categorySearchInput"));
    const type = fieldValue("categoryTypeListFilter", "all");
    const filtered = categories.filter((cat) => {
      const matchType = type === "all" || cat.type === type;
      const matchSearch = includesSearch([cat.name, cat.type === "income" ? "Thu nhập" : "Chi tiêu"], query);
      return matchType && matchSearch;
    });

    document.getElementById("categoryGrid").innerHTML = filtered.length ? filtered.map((cat) => `
      <div class="category-row">
        <div class="category-main">
          <span class="category-sticker" style="--category-color: ${Utils.escapeHtml(cat.color)}">${Utils.escapeHtml(cat.icon || "🏷️")}</span>
          <div>
            <strong>${Utils.escapeHtml(cat.name)}</strong>
            <small>${cat.type === "income" ? "Thu nhập" : "Chi tiêu"}</small>
          </div>
        </div>
        <span class="row-actions">
          <button class="icon-btn action-edit" type="button" onclick="App.openCategoryForm('${cat.id}')" aria-label="Sửa danh mục" title="Sửa">✎</button>
          <button class="icon-btn action-delete" type="button" onclick="App.deleteCategory('${cat.id}')" aria-label="Xóa danh mục" title="Xóa">🗑</button>
        </span>
      </div>
    `).join("") : `<p class="empty-state">Không tìm thấy danh mục phù hợp.</p>`;
  }

  function assetTotals() {
    const available = Utils.sum(wallets, (wallet) => wallet.balance);
    const receivableTotal = Utils.sum(receivables, (item) => item.amount);
    const expectedTotal = Utils.sum(expectedIncome, (item) => item.amount);
    return {
      available,
      receivableTotal,
      expectedTotal,
      estimatedTotal: available + receivableTotal + expectedTotal
    };
  }

  function renderAssets() {
    const totals = assetTotals();
    document.getElementById("assetSummary").innerHTML = `
      <article class="asset-total">
        <span>Tiền sẵn dùng</span>
        <strong>${Utils.formatMoney(totals.available)}</strong>
      </article>
      <article class="asset-total">
        <span>Khoản phải thu</span>
        <strong>${Utils.formatMoney(totals.receivableTotal)}</strong>
      </article>
      <article class="asset-total">
        <span>Thu nhập dự kiến</span>
        <strong>${Utils.formatMoney(totals.expectedTotal)}</strong>
      </article>
      <article class="asset-total highlight">
        <span>Tài sản ước tính</span>
        <strong>${Utils.formatMoney(totals.estimatedTotal)}</strong>
      </article>
    `;

    const query = normalizeSearch(fieldValue("assetSearchInput"));
    const typeFilter = fieldValue("assetTypeFilter", "all");
    const assetItems = [
      ...wallets.map((wallet) => ({
        id: wallet.id,
        label: wallet.name,
        note: "Tiền sẵn dùng",
        type: "Ví",
        kind: "wallet",
        tone: "wallet",
        amount: wallet.balance,
        editAction: `App.openWalletForm('${wallet.id}')`,
        deleteAction: `App.deleteWallet('${wallet.id}')`
      })),
      ...receivables.map((item) => ({
        id: item.id,
        label: item.name,
        note: sourceSummary(item, item.dueDate ? `Phải thu · ${item.dueDate}` : "Phải thu · chưa có hạn"),
        type: "Phải thu",
        kind: "receivable",
        tone: "receivable",
        amount: item.amount,
        extraActions: `<button class="icon-btn" type="button" onclick="event.stopPropagation(); App.openReceivableSettlementForm('${item.id}')" aria-label="Ghi nhận đã thu" title="Ghi nhận đã thu">+</button>`,
        editAction: `App.openReceivableForm('${item.id}')`,
        deleteAction: `App.deleteReceivable('${item.id}')`
      })),
      ...expectedIncome.map((item) => ({
        id: item.id,
        label: item.name,
        note: sourceSummary(item, item.expectedDate ? `Dự kiến nhận · ${item.expectedDate}` : "Dự kiến nhận · chưa biết thời gian"),
        type: "Dự kiến",
        kind: "expected",
        tone: "expected",
        amount: item.amount,
        extraActions: `<button class="icon-btn" type="button" onclick="event.stopPropagation(); App.openExpectedIncomeSettlementForm('${item.id}')" aria-label="Ghi nhận đã nhận" title="Ghi nhận đã nhận">+</button>`,
        editAction: `App.openExpectedIncomeForm('${item.id}')`,
        deleteAction: `App.deleteExpectedIncome('${item.id}')`
      }))
    ];
    const rows = assetItems
      .filter((item) => {
        const matchType = typeFilter === "all" || item.kind === typeFilter;
        const matchSearch = includesSearch([item.label, item.note, item.type, item.amount], query);
        return matchType && matchSearch;
      })
      .map(assetRow)
      .join("");

    document.getElementById("assetSources").innerHTML = rows ? `
      <div class="table-wrap">
        <table class="asset-table">
          <thead>
            <tr>
              <th>Tên nguồn</th>
              <th class="align-center">Nhãn</th>
              <th class="align-right">Số tiền</th>
              <th class="align-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    ` : `<p class="empty-state">Không tìm thấy nguồn tài sản phù hợp.</p>`;
  }

  function assetRow({ id, kind, label, note, type, tone, amount, editAction, deleteAction, extraActions = "" }) {
    return `
      <tr class="asset-row-clickable" onclick="App.openAssetDetail('${kind}', '${id}')" role="button" tabindex="0">
        <td>
          <strong>${Utils.escapeHtml(label)}</strong>
          <small>${Utils.escapeHtml(note)}</small>
        </td>
        <td class="align-center">
          <span class="asset-label ${tone || ""}">${Utils.escapeHtml(type || "Nguồn tiền")}</span>
        </td>
        <td class="align-right">
          <strong>${Utils.formatMoney(amount || 0)}</strong>
        </td>
        <td class="align-right">
          <span class="asset-row-actions">
            ${extraActions}
            <button class="icon-btn action-edit" type="button" onclick="event.stopPropagation(); ${editAction}" aria-label="Sửa nguồn tiền" title="Sửa">✎</button>
            ${deleteAction ? `<button class="icon-btn action-delete" type="button" onclick="event.stopPropagation(); ${deleteAction}" aria-label="Xóa nguồn tiền" title="Xóa">🗑</button>` : ""}
          </span>
        </td>
      </tr>
    `;
  }

  function walletTransactions(walletName) {
    return Transactions.all()
      .filter((item) => item.wallet === walletName)
      .sort(Utils.byDateDesc);
  }

  function sourceLinkedTransactions(kind, sourceId) {
    return Transactions.all()
      .filter((item) => item.sourceType === kind && item.sourceId === sourceId)
      .sort(Utils.byDateDesc);
  }

  function assetDetailTableSection(title, headHtml, bodyHtml, colSpan = 4) {
    return `
      <div class="form-field full">
        <label>${title}</label>
        <div class="table-wrap">
          <table class="mini-table">
            <thead>${headHtml}</thead>
            <tbody>${bodyHtml || `<tr><td colspan="${colSpan}" class="empty-state">Chưa có dữ liệu.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function assetTransactionRows(transactions, { showWallet = false } = {}) {
    return transactions.map((item) => `
      <tr>
        <td>${item.date}</td>
        ${showWallet ? `<td>${Utils.escapeHtml(item.wallet)}</td>` : ""}
        <td>${categoryChip(item.category)}</td>
        <td>${Utils.escapeHtml(item.note || "—")}</td>
        <td class="align-right ${item.type === "income" ? "amount-income" : "amount-expense"}">
          ${item.type === "income" ? "+" : "−"}${Utils.formatMoney(item.amount)}
        </td>
      </tr>
    `).join("");
  }

  function settlementRows(settlements) {
    return settlements.map((item) => `
      <tr>
        <td>${item.date}</td>
        <td>${Utils.escapeHtml(item.wallet)}</td>
        <td>${categoryChip(item.category || "—")}</td>
        <td>${Utils.escapeHtml(item.note || "—")}</td>
        <td class="align-right amount-income">+${Utils.formatMoney(item.amount)}</td>
      </tr>
    `).join("");
  }

  function openAssetDetailModal(title, html, actionsHtml = "") {
    openModal(title, `
      ${html}
      <div class="form-actions">
        ${actionsHtml}
        <button class="btn btn-primary" type="submit">Đóng</button>
      </div>
    `, () => true);
  }

  function openWalletAssetDetail(id) {
    const wallet = wallets.find((item) => item.id === id);
    if (!wallet) return;

    const transactions = walletTransactions(wallet.name);
    const income = Utils.sum(transactions.filter((item) => item.type === "income"), (item) => item.amount);
    const expense = Utils.sum(transactions.filter((item) => item.type === "expense"), (item) => item.amount);

    openAssetDetailModal("Chi tiết ví", `
      <div class="asset-detail-head full">
        <div>
          <span class="asset-label wallet">Ví</span>
          <h3>${Utils.escapeHtml(wallet.name)}</h3>
          <small>Ngày tạo: ${wallet.createdAt || "—"}</small>
        </div>
        <strong>${Utils.formatMoney(wallet.balance)}</strong>
      </div>
      <div class="budget-detail-summary full">
        <article>
          <span>Số dư ban đầu</span>
          <strong>${Utils.formatMoney(wallet.initialBalance || 0)}</strong>
        </article>
        <article>
          <span>Tổng thu</span>
          <strong class="amount-income">${Utils.formatMoney(income)}</strong>
        </article>
        <article>
          <span>Tổng chi</span>
          <strong class="amount-expense">${Utils.formatMoney(expense)}</strong>
        </article>
        <article>
          <span>Số giao dịch</span>
          <strong>${transactions.length}</strong>
        </article>
      </div>
      ${assetDetailTableSection(
        "Giao dịch phát sinh",
        `<tr><th>Ngày</th><th>Danh mục</th><th>Ghi chú</th><th class="align-right">Số tiền</th></tr>`,
        assetTransactionRows(transactions)
      )}
    `, `<button class="btn btn-secondary" type="button" onclick="App.openWalletForm('${wallet.id}')">Chỉnh sửa ví</button>`);
  }

  function openReceivableAssetDetail(id) {
    const item = receivables.find((entry) => entry.id === id);
    if (!item) return;

    const collected = sumSettlements(item.settlements);
    const total = Number(item.originalAmount) || Number(item.amount || 0) + collected;
    const transactions = sourceLinkedTransactions("receivable", id);
    const settlements = [...(item.settlements || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    openAssetDetailModal("Chi tiết khoản phải thu", `
      <div class="asset-detail-head full">
        <div>
          <span class="asset-label receivable">Phải thu</span>
          <h3>${Utils.escapeHtml(item.name)}</h3>
          <small>${item.dueDate ? `Hạn trả: ${item.dueDate}` : "Chưa có hạn trả"}${item.note ? ` · ${Utils.escapeHtml(item.note)}` : ""}</small>
        </div>
        <strong>${Utils.formatMoney(item.amount)}</strong>
      </div>
      <div class="budget-detail-summary full">
        <article>
          <span>Tổng gốc</span>
          <strong>${Utils.formatMoney(total)}</strong>
        </article>
        <article>
          <span>Đã thu</span>
          <strong class="amount-income">${Utils.formatMoney(collected)}</strong>
        </article>
        <article>
          <span>Còn lại</span>
          <strong>${Utils.formatMoney(item.amount)}</strong>
        </article>
        <article>
          <span>Lần ghi nhận</span>
          <strong>${settlements.length}</strong>
        </article>
      </div>
      ${assetDetailTableSection(
        "Lịch sử đã thu",
        `<tr><th>Ngày</th><th>Ví nhận</th><th>Danh mục</th><th>Ghi chú</th><th class="align-right">Số tiền</th></tr>`,
        settlementRows(settlements),
        5
      )}
      ${assetDetailTableSection(
        "Giao dịch liên quan",
        `<tr><th>Ngày</th><th>Ví</th><th>Danh mục</th><th>Ghi chú</th><th class="align-right">Số tiền</th></tr>`,
        assetTransactionRows(transactions, { showWallet: true }),
        5
      )}
    `, `
      <button class="btn btn-secondary" type="button" onclick="App.openReceivableSettlementForm('${item.id}')">Ghi nhận đã thu</button>
      <button class="btn btn-secondary" type="button" onclick="App.openReceivableForm('${item.id}')">Chỉnh sửa</button>
    `);
  }

  function openExpectedAssetDetail(id) {
    const item = expectedIncome.find((entry) => entry.id === id);
    if (!item) return;

    const collected = sumSettlements(item.settlements);
    const total = Number(item.originalAmount) || Number(item.amount || 0) + collected;
    const transactions = sourceLinkedTransactions("expectedIncome", id);
    const settlements = [...(item.settlements || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    openAssetDetailModal("Chi tiết khoản dự kiến", `
      <div class="asset-detail-head full">
        <div>
          <span class="asset-label expected">Dự kiến</span>
          <h3>${Utils.escapeHtml(item.name)}</h3>
          <small>${item.expectedDate ? `Dự kiến nhận: ${item.expectedDate}` : "Chưa có ngày dự kiến"}${item.note ? ` · ${Utils.escapeHtml(item.note)}` : ""}</small>
        </div>
        <strong>${Utils.formatMoney(item.amount)}</strong>
      </div>
      <div class="budget-detail-summary full">
        <article>
          <span>Tổng gốc</span>
          <strong>${Utils.formatMoney(total)}</strong>
        </article>
        <article>
          <span>Đã nhận</span>
          <strong class="amount-income">${Utils.formatMoney(collected)}</strong>
        </article>
        <article>
          <span>Còn lại</span>
          <strong>${Utils.formatMoney(item.amount)}</strong>
        </article>
        <article>
          <span>Lần ghi nhận</span>
          <strong>${settlements.length}</strong>
        </article>
      </div>
      ${assetDetailTableSection(
        "Lịch sử đã nhận",
        `<tr><th>Ngày</th><th>Ví nhận</th><th>Danh mục</th><th>Ghi chú</th><th class="align-right">Số tiền</th></tr>`,
        settlementRows(settlements),
        5
      )}
      ${assetDetailTableSection(
        "Giao dịch liên quan",
        `<tr><th>Ngày</th><th>Ví</th><th>Danh mục</th><th>Ghi chú</th><th class="align-right">Số tiền</th></tr>`,
        assetTransactionRows(transactions, { showWallet: true }),
        5
      )}
    `, `
      <button class="btn btn-secondary" type="button" onclick="App.openExpectedIncomeSettlementForm('${item.id}')">Ghi nhận đã nhận</button>
      <button class="btn btn-secondary" type="button" onclick="App.openExpectedIncomeForm('${item.id}')">Chỉnh sửa</button>
    `);
  }

  function openAssetDetail(kind, id) {
    if (kind === "wallet") openWalletAssetDetail(id);
    else if (kind === "receivable") openReceivableAssetDetail(id);
    else if (kind === "expected") openExpectedAssetDetail(id);
  }

  function renderBudgets() {
    const query = normalizeSearch(fieldValue("budgetSearchInput"));
    const stateFilter = fieldValue("budgetStateFilter", "all");
    const statuses = Budget.statusFor(Transactions.all(), selectedBudgetMonth).filter((item) => {
      const state = item.remaining > 0 ? "available" : item.remaining < 0 ? "over" : "exact";
      const matchState = stateFilter === "all" || state === stateFilter;
      const matchSearch = includesSearch([item.category, item.override ? "Có chỉnh riêng" : "", item.recurrence], query);
      return matchState && matchSearch;
    });
    const totalBudget = Utils.sum(statuses, (item) => item.amount);
    const totalSpent = Utils.sum(statuses, (item) => item.spent);
    const remaining = totalBudget - totalSpent;
    const budgetPercent = totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const budgetProgress = Math.min(budgetPercent, 100);
    const stateText = remaining > 0 ? "Dư ngân sách" : remaining < 0 ? "Vượt ngân sách" : "Vừa đủ";

    document.getElementById("budgetMonthSummary").innerHTML = `
      <article class="asset-total">
        <span>Tổng ngân sách</span>
        <strong>${Utils.formatMoney(totalBudget)}</strong>
      </article>
      <article class="asset-total">
        <span>Đã chi</span>
        <strong class="amount-expense">${Utils.formatMoney(totalSpent)}</strong>
      </article>
      <article class="asset-total ${remaining >= 0 ? "highlight" : ""}">
        <span>${remaining >= 0 ? "Còn lại" : "Vượt"}</span>
        <strong>${Utils.formatMoney(Math.abs(remaining))}</strong>
      </article>
      <article class="asset-total">
        <span>Trạng thái</span>
        <strong>${stateText}</strong>
      </article>
    `;

    document.getElementById("budgetList").innerHTML = statuses.length ? `
      <div class="budget-overview-progress ${budgetPercent > 100 ? "over" : ""}">
        <div class="budget-progress-head">
          <span>Tiến độ chi tiêu tháng</span>
          <strong>${budgetPercent}%</strong>
        </div>
        <div class="budget-meter large" style="--progress: ${budgetProgress}%">
          <span></span>
        </div>
        <small>${Utils.formatMoney(totalSpent)} / ${Utils.formatMoney(totalBudget)}${remaining < 0 ? ` · Vượt ${Utils.formatMoney(Math.abs(remaining))}` : ` · Còn ${Utils.formatMoney(remaining)}`}</small>
      </div>
      ${statuses.map((item) => `
      <div class="budget-row budget-row-clickable" onclick="App.openBudgetDetail('${item.id}')" role="button" tabindex="0">
        <div>
          <strong>${Utils.escapeHtml(item.category)}</strong>
          <small>${Utils.getMonthLabel(selectedBudgetMonth)} · Đã chi ${Utils.formatMoney(item.spent)} / ${Utils.formatMoney(item.amount)}${item.override ? " · Có chỉnh riêng" : ""}</small>
          <div class="budget-meter ${item.percent > 100 ? "over" : ""}" style="--progress: ${Math.min(item.percent, 100)}%">
            <span></span>
          </div>
        </div>
        <span class="row-actions">
          <strong>${item.percent}%</strong>
          <button class="icon-btn action-edit" type="button" onclick="event.stopPropagation(); App.openBudgetForm('${item.id}')" aria-label="Sửa ngân sách" title="Sửa">✎</button>
          <button class="icon-btn action-delete" type="button" onclick="event.stopPropagation(); App.deleteBudget('${item.id}')" aria-label="Xóa ngân sách" title="Xóa">🗑</button>
        </span>
      </div>
      `).join("")}
    ` : `<p class="empty-state">Chưa có ngân sách áp dụng cho tháng này.</p>`;
  }

  function budgetTransactions(budget, month = selectedBudgetMonth) {
    return Transactions.all()
      .filter((item) => item.type === "expense" && item.category === budget.category && item.date.startsWith(month))
      .sort(Utils.byDateDesc);
  }

  function budgetWalletRows(transactions) {
    const grouped = transactions.reduce((acc, item) => {
      acc[item.wallet] = (acc[item.wallet] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([wallet, amount]) => `
        <tr>
          <td>${Utils.escapeHtml(wallet)}</td>
          <td class="align-right"><strong>${Utils.formatMoney(amount)}</strong></td>
        </tr>
      `).join("");
  }

  function openBudgetDetail(id) {
    const budget = Budget.statusFor(Transactions.all(), selectedBudgetMonth).find((item) => item.id === id);
    if (!budget) return;

    const transactions = budgetTransactions(budget);
    const remaining = budget.amount - budget.spent;
    const progress = Math.min(budget.percent, 100);
    const walletRows = budgetWalletRows(transactions);
    const overrideNote = budget.override
      ? `<p class="budget-override-note full">Tháng này đang dùng hạn mức riêng. Mức mặc định là ${Utils.formatMoney(budget.baseAmount)}${budget.override.note ? ` · ${Utils.escapeHtml(budget.override.note)}` : ""}</p>`
      : "";
    const transactionRows = transactions.map((item) => `
      <tr>
        <td>${item.date}</td>
        <td>${Utils.escapeHtml(item.wallet)}</td>
        <td>${Utils.escapeHtml(item.note || "Không có ghi chú")}</td>
        <td class="align-right"><strong>${Utils.formatMoney(item.amount)}</strong></td>
      </tr>
    `).join("");

    openModal("Chi tiết ngân sách", `
      <div class="budget-detail-head full">
        <div>
          <span class="badge expense">${Utils.escapeHtml(budget.category)}</span>
          <h3>${Utils.getMonthLabel(selectedBudgetMonth)}</h3>
        </div>
        <strong>${budget.percent}%</strong>
      </div>
      <div class="budget-detail-summary full">
        <article>
          <span>Hạn mức</span>
          <strong>${Utils.formatMoney(budget.amount)}</strong>
        </article>
        <article>
          <span>Đã chi</span>
          <strong class="amount-expense">${Utils.formatMoney(budget.spent)}</strong>
        </article>
        <article>
          <span>${remaining >= 0 ? "Còn lại" : "Vượt"}</span>
          <strong>${Utils.formatMoney(Math.abs(remaining))}</strong>
        </article>
      </div>
      <div class="budget-detail-progress full ${budget.percent > 100 ? "over" : ""}">
        <div class="budget-progress-head">
          <span>Tiến độ ngân sách</span>
          <strong>${budget.percent}%</strong>
        </div>
        <div class="budget-meter large" style="--progress: ${progress}%">
          <span></span>
        </div>
        <small>${Utils.formatMoney(budget.spent)} / ${Utils.formatMoney(budget.amount)}</small>
      </div>
      ${overrideNote}
      <div class="form-field full">
        <label>Theo ví</label>
        <div class="table-wrap">
          <table class="mini-table">
            <thead>
              <tr>
                <th>Ví</th>
                <th class="align-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>${walletRows || `<tr><td colspan="2" class="empty-state">Chưa có giao dịch.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="form-field full">
        <label>Giao dịch liên quan</label>
        <div class="table-wrap">
          <table class="mini-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Ví</th>
                <th>Ghi chú</th>
                <th class="align-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>${transactionRows || `<tr><td colspan="4" class="empty-state">Chưa có giao dịch.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" onclick="App.openBudgetOverrideForm('${budget.id}')">Chỉnh riêng tháng này</button>
        ${budget.override ? `<button class="btn btn-secondary danger-text" type="button" onclick="App.deleteBudgetOverride('${budget.id}')">Bỏ chỉnh riêng</button>` : ""}
        <button class="btn btn-primary" type="submit">Đóng</button>
      </div>
    `, () => true);
  }

  function openBudgetOverrideForm(id) {
    const budget = Budget.findBudget(id);
    if (!budget || !Budget.appliesToMonth(budget, selectedBudgetMonth)) return;

    const override = Budget.overrideForMonth(budget, selectedBudgetMonth);
    const amount = override ? override.amount : Budget.effectiveAmount(budget, selectedBudgetMonth);

    openModal("Chỉnh riêng ngân sách tháng", `
      <div class="form-field">
        <label>Danh mục</label>
        <input value="${Utils.escapeHtml(budget.category)}" disabled>
      </div>
      <div class="form-field">
        <label>Tháng áp dụng</label>
        <input value="${Utils.getMonthLabel(selectedBudgetMonth)}" disabled>
      </div>
      <div class="form-field">
        <label>Hạn mức mặc định</label>
        <input value="${Utils.formatMoney(budget.amount)}" disabled>
      </div>
      <div class="form-field">
        <label>Hạn mức riêng tháng này</label>
        <input name="amount" type="number" min="1" required value="${amount || ""}">
      </div>
      <div class="form-field full">
        <label>Ghi chú</label>
        <input name="note" value="${Utils.escapeHtml(override?.note || "")}" placeholder="Ví dụ: tháng này có tiệc, đi du lịch...">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => Budget.upsertOverride(id, {
      month: selectedBudgetMonth,
      amount: data.amount,
      note: data.note
    }));
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function renderRecurring() {
    const query = normalizeSearch(fieldValue("recurringSearchInput"));
    const cycle = fieldValue("recurringCycleFilter", "all");
    const recurring = Budget.allRecurring().filter((item) => {
      const cycleText = item.cycle === "monthly" ? "Hàng tháng" : "Hàng năm";
      const matchCycle = cycle === "all" || item.cycle === cycle;
      const matchSearch = includesSearch([item.name, item.amount, cycleText], query);
      return matchCycle && matchSearch;
    });

    document.getElementById("recurringList").innerHTML = recurring.length ? recurring.map((item) => `
      <div class="list-row">
        <div>
          <strong>${Utils.escapeHtml(item.name)}</strong>
          <small>${item.cycle === "monthly" ? "Hàng tháng" : "Hàng năm"}</small>
        </div>
        <span class="row-actions">
          <strong>${Utils.formatMoney(item.amount)}</strong>
          <button class="icon-btn action-edit" type="button" onclick="App.openRecurringForm('${item.id}')" aria-label="Sửa khoản định kỳ" title="Sửa">✎</button>
          <button class="icon-btn action-delete" type="button" onclick="App.deleteRecurring('${item.id}')" aria-label="Xóa khoản định kỳ" title="Xóa">🗑</button>
        </span>
      </div>
    `).join("") : `<p class="empty-state">Không tìm thấy khoản định kỳ phù hợp.</p>`;
  }

  function openModal(title, html, onSubmit) {
    document.getElementById("modalTitle").textContent = title;
    const form = document.getElementById("modalForm");
    form.innerHTML = html;
    form.onsubmit = (event) => {
      event.preventDefault();
      const result = onSubmit(Object.fromEntries(new FormData(form).entries()));
      if (result === false) return;
      closeModal();
      renderAll();
    };
    document.getElementById("modal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("modal").classList.remove("open");
  }

  function openTransactionForm(id) {
    const item = id ? Transactions.find(id) : { type: "expense", date: Utils.today(), wallet: "Tiền mặt" };
    if (item?.sourceType) {
      alert("Giao dịch này được tạo từ mục Tài sản. Hãy cập nhật tại khoản phải thu hoặc dự kiến để giữ đồng bộ.");
      return;
    }
    openModal(id ? "Chỉnh sửa giao dịch" : "Thêm giao dịch", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Loại</label>
        <select name="type" id="transactionType">
          <option value="expense" ${item.type === "expense" ? "selected" : ""}>Chi tiêu</option>
          <option value="income" ${item.type === "income" ? "selected" : ""}>Thu nhập</option>
        </select>
      </div>
      <div class="form-field">
        <label>Danh mục</label>
        <select name="category" id="transactionCategory">${categoryOptions(item.type || "expense", item.category)}</select>
      </div>
      <div class="form-field">
        <label>Số tiền</label>
        <input name="amount" type="number" min="1" required value="${item.amount || ""}">
      </div>
      <div class="form-field">
        <label>Ví thanh toán</label>
        <select name="wallet" required>${walletOptions(item.wallet || "Tiền mặt")}</select>
      </div>
      <div class="form-field">
        <label>Ngày</label>
        <input name="date" type="date" required value="${item.date || Utils.today()}">
      </div>
      <div class="form-field">
        <label>Ghi chú</label>
        <input name="note" value="${Utils.escapeHtml(item.note || "")}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => saveTransaction(data));

    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("transactionType").addEventListener("change", (event) => {
      document.getElementById("transactionCategory").innerHTML = categoryOptions(event.target.value);
    });
  }

  function openWalletForm(id) {
    const item = id ? wallets.find((wallet) => wallet.id === id) : {};
    const isEdit = !!id;
    
    openModal(isEdit ? "Chi tiết ví" : "Thêm ví", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Tên ví</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>Số dư hiện tại</label>
        <input name="balance" type="number" required value="${item.balance || 0}">
      </div>
      <div class="form-field">
        <label>Số dư ban đầu</label>
        <input name="initialBalance" type="number" required value="${item.initialBalance || item.balance || 0}">
      </div>
      <div class="form-field">
        <label>Ngày tạo ví</label>
        <input name="createdAt" type="date" required value="${item.createdAt || Utils.today()}">
      </div>
      ${isEdit ? `<p class="full" style="color: var(--muted); margin: 0;">Nhấn vào dòng ví trong danh sách Tài sản để xem toàn bộ giao dịch.</p>` : ""}
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => {
      const next = {
        id: data.id || Utils.createId("wallet"),
        name: data.name,
        balance: Number(data.balance) || 0,
        initialBalance: Number(data.initialBalance) || 0,
        createdAt: data.createdAt || Utils.today()
      };
      wallets = data.id ? wallets.map((wallet) => wallet.id === data.id ? next : wallet) : [next, ...wallets];
      persistWallets();
    });
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function openReceivableForm(id) {
    const item = id ? receivables.find((entry) => entry.id === id) : {};
    openModal(id ? "Chỉnh sửa khoản phải thu" : "Thêm khoản phải thu", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Người vay / nguồn thu</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>${item.id ? "Tổng số tiền phải thu" : "Số tiền"}</label>
        <input name="amount" type="number" min="1" required value="${item.id ? (item.originalAmount || item.amount || "") : (item.amount || "")}">
      </div>
      <div class="form-field">
        <label>Ngày hẹn trả</label>
        <input name="dueDate" type="date" value="${item.dueDate || ""}">
      </div>
      <div class="form-field">
        <label>Ghi chú</label>
        <input name="note" value="${Utils.escapeHtml(item.note || "")}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => {
      const collected = sumSettlements(item.settlements || []);
      const originalAmount = Number(data.amount) || 0;
      if (item.id && originalAmount < collected) {
        alert("Tổng số tiền phải thu không thể nhỏ hơn số đã nhận.");
        return false;
      }
      const next = {
        id: data.id || Utils.createId("recv"),
        name: data.name,
        amount: item.id ? originalAmount - collected : originalAmount,
        originalAmount,
        dueDate: data.dueDate || "",
        note: data.note || "",
        settlements: item.settlements || []
      };
      receivables = data.id ? receivables.map((entry) => entry.id === data.id ? next : entry) : [next, ...receivables];
      persistReceivables();
    });
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function openExpectedIncomeForm(id) {
    const item = id ? expectedIncome.find((entry) => entry.id === id) : {};
    openModal(id ? "Chỉnh sửa khoản dự kiến" : "Thêm khoản dự kiến", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Tên khoản</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>${item.id ? "Tổng thu nhập dự kiến" : "Số tiền"}</label>
        <input name="amount" type="number" min="1" required value="${item.id ? (item.originalAmount || item.amount || "") : (item.amount || "")}">
      </div>
      <div class="form-field">
        <label>Ngày dự kiến</label>
        <input name="expectedDate" type="date" value="${item.expectedDate || ""}">
      </div>
      <div class="form-field">
        <label>Ghi chú</label>
        <input name="note" value="${Utils.escapeHtml(item.note || "")}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => {
      const collected = sumSettlements(item.settlements || []);
      const originalAmount = Number(data.amount) || 0;
      if (item.id && originalAmount < collected) {
        alert("Tổng thu nhập dự kiến không thể nhỏ hơn số đã nhận.");
        return false;
      }
      const next = {
        id: data.id || Utils.createId("exp"),
        name: data.name,
        amount: item.id ? originalAmount - collected : originalAmount,
        originalAmount,
        expectedDate: data.expectedDate || "",
        note: data.note || "",
        settlements: item.settlements || []
      };
      expectedIncome = data.id ? expectedIncome.map((entry) => entry.id === data.id ? next : entry) : [next, ...expectedIncome];
      persistExpectedIncome();
    });
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function recordSourceCollection(kind, id, data) {
    const sourceItems = kind === "receivable" ? receivables : expectedIncome;
    const sourceIndex = sourceItems.findIndex((item) => item.id === id);
    if (sourceIndex === -1) return false;

    const current = sourceItems[sourceIndex];
    const amount = Number(data.amount) || 0;
    if (amount <= 0) {
      alert("Số tiền nhận phải lớn hơn 0.");
      return false;
    }
    if (amount > Number(current.amount || 0)) {
      alert("Số tiền nhận không được lớn hơn số còn lại.");
      return false;
    }

    const eventId = Utils.createId(kind === "receivable" ? "recv_settlement" : "exp_settlement");
    const transaction = saveTransaction({
      type: "income",
      category: data.category,
      amount,
      wallet: data.wallet,
      date: data.date || Utils.today(),
      note: data.note || `${current.name} (${kind === "receivable" ? "thu hồi phải thu" : "ghi nhận khoản dự kiến"})`,
      sourceType: kind,
      sourceId: current.id,
      sourceEventId: eventId
    });

    if (!transaction) return false;

    const next = {
      ...current,
      amount: Number(current.amount || 0) - amount,
      settlements: [{
        id: eventId,
        amount,
        wallet: data.wallet,
        date: data.date || Utils.today(),
        note: data.note || "",
        category: data.category,
        transactionId: transaction.id
      }, ...(current.settlements || [])]
    };

    if (kind === "receivable") {
      receivables = receivables.map((item) => item.id === id ? next : item);
      persistReceivables();
    } else {
      expectedIncome = expectedIncome.map((item) => item.id === id ? next : item);
      persistExpectedIncome();
    }
    return true;
  }

  function openSettlementForm(kind, id) {
    const collection = kind === "receivable" ? receivables : expectedIncome;
    const item = collection.find((entry) => entry.id === id);
    if (!item) return;

    const defaultCategory = categories.find((cat) => cat.type === "income")?.name || "";
    openModal(kind === "receivable" ? "Ghi nhận đã thu" : "Ghi nhận đã nhận", `
      <div class="form-field">
        <label>Khoản</label>
        <input value="${Utils.escapeHtml(item.name || "")}" disabled>
      </div>
      <div class="form-field">
        <label>Số còn lại</label>
        <input value="${Utils.formatMoney(item.amount || 0)}" disabled>
      </div>
      <div class="form-field">
        <label>Số tiền nhận</label>
        <input name="amount" type="number" min="1" max="${Number(item.amount || 0)}" required>
      </div>
      <div class="form-field">
        <label>Vào ví</label>
        <select name="wallet" required>${walletOptions()}</select>
      </div>
      <div class="form-field">
        <label>Ngày nhận</label>
        <input name="date" type="date" required value="${Utils.today()}">
      </div>
      <div class="form-field">
        <label>Danh mục thu nhập</label>
        <select name="category" required>${incomeCategoryOptions(defaultCategory)}</select>
      </div>
      <div class="form-field full">
        <label>Ghi chú</label>
        <input name="note" value="">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Cập nhật</button>
      </div>
    `, (formData) => recordSourceCollection(kind, id, formData));

    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function openCategoryForm(id) {
    const item = id ? categories.find((cat) => cat.id === id) : { type: "expense", icon: "🏷️", color: "#64748b" };
    openModal(id ? "Chỉnh sửa danh mục" : "Thêm danh mục", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Tên danh mục</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>Loại</label>
        <select name="type">
          <option value="expense" ${item.type === "expense" ? "selected" : ""}>Chi tiêu</option>
          <option value="income" ${item.type === "income" ? "selected" : ""}>Thu nhập</option>
        </select>
      </div>
      <div class="form-field">
        <label>Icon</label>
        <input name="icon" maxlength="4" required value="${Utils.escapeHtml(item.icon || "🏷️")}">
      </div>
      <div class="form-field">
        <label>Màu nhãn</label>
        <input name="color" type="color" required value="${Utils.escapeHtml(item.color || "#64748b")}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => {
      const next = {
        id: data.id || Utils.createId("cat"),
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color
      };
      categories = data.id ? categories.map((cat) => cat.id === data.id ? next : cat) : [next, ...categories];
      Storage.write("categories", categories);
    });
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function openBudgetForm(id) {
    const item = id ? Budget.findBudget(id) : {
      recurrence: "monthly",
      startMonth: selectedBudgetMonth,
      endMonth: "",
      active: true
    };
    openModal(id ? "Chỉnh sửa ngân sách" : "Thêm ngân sách", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Danh mục chi tiêu</label>
        <select name="category" required>${categoryOptions("expense", item.category)}</select>
      </div>
      <div class="form-field">
        <label>Kiểu áp dụng</label>
        <select name="recurrence" required>
          <option value="monthly" ${item.recurrence === "monthly" ? "selected" : ""}>Hàng tháng</option>
          <option value="once" ${item.recurrence === "once" ? "selected" : ""}>Chỉ một tháng</option>
          <option value="range" ${item.recurrence === "range" ? "selected" : ""}>Theo khoảng tháng</option>
        </select>
      </div>
      <div class="form-field">
        <label>Tháng bắt đầu</label>
        <input name="startMonth" type="month" required value="${item.startMonth || item.month || selectedBudgetMonth}">
      </div>
      <div class="form-field" id="budgetEndMonthField">
        <label>Tháng kết thúc</label>
        <input name="endMonth" id="budgetEndMonthInput" type="month" value="${item.endMonth || ""}">
      </div>
      <div class="form-field">
        <label>Hạn mức</label>
        <input name="amount" type="number" min="1" required value="${item.amount || ""}">
      </div>
      <div class="form-field">
        <label>Trạng thái</label>
        <select name="active">
          <option value="on" ${item.active !== false ? "selected" : ""}>Đang áp dụng</option>
          <option value="off" ${item.active === false ? "selected" : ""}>Tạm dừng</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => Budget.upsertBudget({ ...data, active: data.active === "on" }));
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
    syncBudgetEndMonthField();
    document.querySelector("#modalForm [name='recurrence']").addEventListener("change", syncBudgetEndMonthField);
  }

  function syncBudgetEndMonthField() {
    const recurrence = document.querySelector("#modalForm [name='recurrence']")?.value;
    const field = document.getElementById("budgetEndMonthField");
    const input = document.getElementById("budgetEndMonthInput");
    if (!field || !input) return;

    const isRange = recurrence === "range";
    field.style.display = isRange ? "grid" : "none";
    input.disabled = !isRange;
    if (!isRange) input.value = "";
  }

  function openRecurringForm(id) {
    const item = id ? Budget.findRecurring(id) : { cycle: "monthly" };
    openModal(id ? "Chỉnh sửa khoản định kỳ" : "Thêm khoản định kỳ", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Tên</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>Số tiền</label>
        <input name="amount" type="number" min="1" required value="${item.amount || ""}">
      </div>
      <div class="form-field full">
        <label>Chu kỳ</label>
        <select name="cycle">
          <option value="monthly" ${item.cycle === "monthly" ? "selected" : ""}>Hàng tháng</option>
          <option value="yearly" ${item.cycle === "yearly" ? "selected" : ""}>Hàng năm</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => Budget.upsertRecurring(data));
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
  }

  function deleteTransaction(id) {
    if (confirm("Xóa giao dịch này?")) {
      if (!removeTransactionWithImpact(id)) return;
      renderAll();
    }
  }

  function deleteCategory(id) {
    if (confirm("Xóa danh mục này?")) {
      categories = categories.filter((cat) => cat.id !== id);
      Storage.write("categories", categories);
      renderAll();
    }
  }

  function deleteWallet(id) {
    if (confirm("Xóa ví này?")) {
      wallets = wallets.filter((wallet) => wallet.id !== id);
      persistWallets();
      renderAll();
    }
  }

  function deleteReceivable(id) {
    const item = receivables.find((entry) => entry.id === id);
    if (sumSettlements(item?.settlements || []) > 0) {
      alert("Khoản phải thu này đã có lịch sử nhận tiền. Hãy giữ lại để tránh lệch số liệu.");
      return;
    }
    if (confirm("Xóa khoản phải thu này?")) {
      receivables = receivables.filter((entry) => entry.id !== id);
      persistReceivables();
      renderAll();
    }
  }

  function deleteExpectedIncome(id) {
    const item = expectedIncome.find((entry) => entry.id === id);
    if (sumSettlements(item?.settlements || []) > 0) {
      alert("Khoản dự kiến này đã có lịch sử nhận tiền. Hãy giữ lại để tránh lệch số liệu.");
      return;
    }
    if (confirm("Xóa khoản dự kiến này?")) {
      expectedIncome = expectedIncome.filter((entry) => entry.id !== id);
      persistExpectedIncome();
      renderAll();
    }
  }

  function deleteBudget(id) {
    if (confirm("Xóa ngân sách này?")) {
      Budget.removeBudget(id);
      renderAll();
    }
  }

  function deleteBudgetOverride(id) {
    if (confirm("Bỏ hạn mức riêng của tháng này?")) {
      Budget.removeOverride(id, selectedBudgetMonth);
      closeModal();
      renderAll();
    }
  }

  function deleteRecurring(id) {
    if (confirm("Xóa khoản định kỳ này?")) {
      Budget.removeRecurring(id);
      renderAll();
    }
  }

  function currentDataSnapshot() {
    const transactions = Transactions.all();
    return {
      categories: normalizeCategories(categories),
      wallets: normalizeWallets(wallets, transactions),
      receivables: receivables.map((item) => normalizeSourceEntry(item, "recv")),
      expectedIncome: expectedIncome.map((item) => normalizeSourceEntry(item, "exp")),
      transactions,
      budgets: Budget.allBudgets(),
      recurring: Budget.allRecurring()
    };
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportData() {
    const data = currentDataSnapshot();
    const date = Utils.today();
    const backup = {
      app: "FinanceFlow",
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };

    downloadFile(`financeflow-backup-${date}.json`, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
  }

  function parseBackupFile(raw) {
    const parsed = JSON.parse(raw);
    const imported = parsed.data || parsed;
    if (!imported || typeof imported !== "object") {
      throw new Error("INVALID_SHAPE");
    }
    return { meta: parsed, imported };
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { meta, imported } = parseBackupFile(reader.result);
        const walletCount = normalizeImportArray(imported.wallets).length;
        const txCount = normalizeImportArray(imported.transactions).length;
        const appLabel = meta.app === "FinanceFlow" ? "FinanceFlow" : "file JSON";
        const confirmed = confirm(
          `Import ${appLabel} sẽ ghi đè dữ liệu hiện tại.\n` +
          `- ${walletCount} ví\n` +
          `- ${txCount} giao dịch\n` +
          "Bạn muốn tiếp tục?"
        );
        if (!confirmed) return;

        applyImportedData(imported);
        renderAll();
        alert("Nhập JSON thành công.");
      } catch (error) {
        console.error("Import failed:", error);
        alert("Không thể nhập file này. Hãy chọn file JSON backup từ FinanceFlow (có mục data.wallets, data.transactions...).");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  document.addEventListener("DOMContentLoaded", boot);

  return {
    openTransactionForm,
    deleteTransaction,
    openAssetDetail,
    openWalletForm,
    deleteWallet,
    openReceivableForm,
    openReceivableSettlementForm: (id) => openSettlementForm("receivable", id),
    deleteReceivable,
    openExpectedIncomeForm,
    openExpectedIncomeSettlementForm: (id) => openSettlementForm("expectedIncome", id),
    deleteExpectedIncome,
    openCategoryForm,
    deleteCategory,
    openBudgetForm,
    openBudgetDetail,
    openBudgetOverrideForm,
    deleteBudgetOverride,
    deleteBudget,
    openRecurringForm,
    deleteRecurring
  };
})();
