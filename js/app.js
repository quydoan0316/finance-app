const App = (() => {
  let categories = [];
  let wallets = [];
  let receivables = [];
  let expectedIncome = [];

  function boot() {
    Storage.seed();
    Transactions.load();
    Budget.load();
    categories = Storage.read("categories", []);
    wallets = Storage.read("wallets", []);
    receivables = Storage.read("receivables", []);
    expectedIncome = Storage.read("expectedIncome", []);
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
    document.getElementById("addReceivableBtn").addEventListener("click", () => openReceivableForm());
    document.getElementById("addExpectedIncomeBtn").addEventListener("click", () => openExpectedIncomeForm());
    document.getElementById("addCategoryBtn").addEventListener("click", () => openCategoryForm());
    document.getElementById("addBudgetBtn").addEventListener("click", () => openBudgetForm());
    document.getElementById("addRecurringBtn").addEventListener("click", () => openRecurringForm());
    document.getElementById("exportBtn").addEventListener("click", exportCsv);
    document.querySelectorAll("[data-close-modal]").forEach((item) => item.addEventListener("click", closeModal));

    ["searchInput", "monthFilter", "typeFilter", "categoryFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("input", renderTransactions);
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

  function categoryOptions(type, selected = "") {
    return options(categories.filter((cat) => cat.type === type).map((cat) => cat.name), selected);
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

  function renderFilters() {
    const months = [...new Set(Transactions.all().map((item) => item.date.slice(0, 7)))].sort().reverse();
    document.getElementById("monthFilter").innerHTML = `<option value="all">Tất cả tháng</option>${options(months)}`;
    document.getElementById("categoryFilter").innerHTML = `<option value="all">Tất cả danh mục</option>${options(categories.map((cat) => cat.name))}`;
  }

  function renderTransactions() {
    const criteria = {
      search: document.getElementById("searchInput").value,
      month: document.getElementById("monthFilter").value || "all",
      type: document.getElementById("typeFilter").value || "all",
      category: document.getElementById("categoryFilter").value || "all"
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
    document.getElementById("categoryGrid").innerHTML = categories.map((cat) => `
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
    `).join("");
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

    const walletRows = wallets.map((wallet) => assetRow({
      label: wallet.name,
      note: "Tiền sẵn dùng",
      type: "Ví",
      tone: "wallet",
      amount: wallet.balance,
      action: `App.openWalletForm('${wallet.id}')`,
      deleteAction: `App.deleteWallet('${wallet.id}')`
    }));
    const receivableRows = receivables.map((item) => assetRow({
      label: item.name,
      note: item.dueDate ? `Phải thu · ${item.dueDate}` : "Phải thu · chưa có hạn",
      type: "Phải thu",
      tone: "receivable",
      amount: item.amount,
      action: `App.openReceivableForm('${item.id}')`,
      deleteAction: `App.deleteReceivable('${item.id}')`
    }));
    const expectedRows = expectedIncome.map((item) => assetRow({
      label: item.name,
      note: item.expectedDate ? `Dự kiến nhận · ${item.expectedDate}` : "Dự kiến nhận · chưa biết thời gian",
      type: "Dự kiến",
      tone: "expected",
      amount: item.amount,
      action: `App.openExpectedIncomeForm('${item.id}')`,
      deleteAction: `App.deleteExpectedIncome('${item.id}')`
    }));

    const rows = [
      ...walletRows,
      ...receivableRows,
      ...expectedRows
    ].join("");

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
    ` : `<p class="empty-state">Chưa có nguồn tài sản.</p>`;
  }

  function assetRow({ label, note, type, tone, amount, action, deleteAction }) {
    return `
      <tr>
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
          <button class="icon-btn action-edit" type="button" onclick="${action}" aria-label="Sửa nguồn tiền" title="Sửa">✎</button>
          ${deleteAction ? `<button class="icon-btn action-delete" type="button" onclick="${deleteAction}" aria-label="Xóa nguồn tiền" title="Xóa">🗑</button>` : ""}
          </span>
        </td>
      </tr>
    `;
  }

  function renderBudgets() {
    const budgets = Budget.allBudgets();
    document.getElementById("budgetList").innerHTML = budgets.length ? budgets.map((item) => `
      <div class="budget-row">
        <div>
          <strong>${Utils.escapeHtml(item.category)}</strong>
          <small>${Utils.getMonthLabel(item.month)} · ${Utils.formatMoney(item.amount)}</small>
        </div>
        <span class="row-actions">
          <button class="icon-btn action-edit" type="button" onclick="App.openBudgetForm('${item.id}')" aria-label="Sửa ngân sách" title="Sửa">✎</button>
          <button class="icon-btn action-delete" type="button" onclick="App.deleteBudget('${item.id}')" aria-label="Xóa ngân sách" title="Xóa">🗑</button>
        </span>
      </div>
    `).join("") : `<p class="empty-state">Chưa có ngân sách.</p>`;
  }

  function renderRecurring() {
    const recurring = Budget.allRecurring();
    document.getElementById("recurringList").innerHTML = recurring.length ? recurring.map((item) => `
      <div class="list-row">
        <div>
          <strong>${Utils.escapeHtml(item.name)}</strong>
          <small>${item.cycle === "monthly" ? "Hằng tháng" : "Hằng năm"}</small>
        </div>
        <span class="row-actions">
          <strong>${Utils.formatMoney(item.amount)}</strong>
          <button class="icon-btn action-edit" type="button" onclick="App.openRecurringForm('${item.id}')" aria-label="Sửa khoản định kỳ" title="Sửa">✎</button>
          <button class="icon-btn action-delete" type="button" onclick="App.deleteRecurring('${item.id}')" aria-label="Xóa khoản định kỳ" title="Xóa">🗑</button>
        </span>
      </div>
    `).join("") : `<p class="empty-state">Chưa có khoản định kỳ.</p>`;
  }

  function openModal(title, html, onSubmit) {
    document.getElementById("modalTitle").textContent = title;
    const form = document.getElementById("modalForm");
    form.innerHTML = html;
    form.onsubmit = (event) => {
      event.preventDefault();
      onSubmit(Object.fromEntries(new FormData(form).entries()));
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
    `, (data) => Transactions.upsert(data));

    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
    document.getElementById("transactionType").addEventListener("change", (event) => {
      document.getElementById("transactionCategory").innerHTML = categoryOptions(event.target.value);
    });
  }

  function openWalletForm(id) {
    const item = id ? wallets.find((wallet) => wallet.id === id) : {};
    openModal(id ? "Chỉnh sửa ví" : "Thêm ví", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Tên ví</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>Số dư hiện tại</label>
        <input name="balance" type="number" min="0" required value="${item.balance || 0}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => {
      const next = { id: data.id || Utils.createId("wallet"), name: data.name, balance: Number(data.balance) || 0 };
      wallets = data.id ? wallets.map((wallet) => wallet.id === data.id ? next : wallet) : [next, ...wallets];
      Storage.write("wallets", wallets);
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
        <label>Số tiền</label>
        <input name="amount" type="number" min="1" required value="${item.amount || ""}">
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
      const next = {
        id: data.id || Utils.createId("recv"),
        name: data.name,
        amount: Number(data.amount) || 0,
        dueDate: data.dueDate || "",
        note: data.note || ""
      };
      receivables = data.id ? receivables.map((entry) => entry.id === data.id ? next : entry) : [next, ...receivables];
      Storage.write("receivables", receivables);
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
        <label>Số tiền</label>
        <input name="amount" type="number" min="1" required value="${item.amount || ""}">
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
      const next = {
        id: data.id || Utils.createId("exp"),
        name: data.name,
        amount: Number(data.amount) || 0,
        expectedDate: data.expectedDate || "",
        note: data.note || ""
      };
      expectedIncome = data.id ? expectedIncome.map((entry) => entry.id === data.id ? next : entry) : [next, ...expectedIncome];
      Storage.write("expectedIncome", expectedIncome);
    });
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
    const item = id ? Budget.findBudget(id) : { month: Utils.currentMonth() };
    openModal(id ? "Chỉnh sửa ngân sách" : "Thêm ngân sách", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Danh mục chi tiêu</label>
        <select name="category" required>${categoryOptions("expense", item.category)}</select>
      </div>
      <div class="form-field">
        <label>Tháng</label>
        <input name="month" type="month" required value="${item.month || Utils.currentMonth()}">
      </div>
      <div class="form-field full">
        <label>Hạn mức</label>
        <input name="amount" type="number" min="1" required value="${item.amount || ""}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => Budget.upsertBudget(data));
    document.querySelector("#modalForm [data-close-modal]").addEventListener("click", closeModal);
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
          <option value="monthly" ${item.cycle === "monthly" ? "selected" : ""}>Hằng tháng</option>
          <option value="yearly" ${item.cycle === "yearly" ? "selected" : ""}>Hằng năm</option>
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
      Transactions.remove(id);
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
      Storage.write("wallets", wallets);
      renderAll();
    }
  }

  function deleteReceivable(id) {
    if (confirm("Xóa khoản phải thu này?")) {
      receivables = receivables.filter((entry) => entry.id !== id);
      Storage.write("receivables", receivables);
      renderAll();
    }
  }

  function deleteExpectedIncome(id) {
    if (confirm("Xóa khoản dự kiến này?")) {
      expectedIncome = expectedIncome.filter((entry) => entry.id !== id);
      Storage.write("expectedIncome", expectedIncome);
      renderAll();
    }
  }

  function deleteBudget(id) {
    if (confirm("Xóa ngân sách này?")) {
      Budget.removeBudget(id);
      renderAll();
    }
  }

  function deleteRecurring(id) {
    if (confirm("Xóa khoản định kỳ này?")) {
      Budget.removeRecurring(id);
      renderAll();
    }
  }

  function exportCsv() {
    const header = ["id", "type", "category", "amount", "wallet", "note", "date"];
    const lines = Transactions.all().map((item) => header.map((key) => `"${String(item[key] ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  document.addEventListener("DOMContentLoaded", boot);

  return {
    openTransactionForm,
    deleteTransaction,
    openWalletForm,
    deleteWallet,
    openReceivableForm,
    deleteReceivable,
    openExpectedIncomeForm,
    deleteExpectedIncome,
    openCategoryForm,
    deleteCategory,
    openBudgetForm,
    deleteBudget,
    openRecurringForm,
    deleteRecurring
  };
})();
