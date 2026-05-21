const App = (() => {
  let categories = [];
  let wallets = [];
  let receivables = [];
  let expectedIncome = [];

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

  function boot() {
    Storage.seed();
    Transactions.load();
    Budget.load();
    categories = Storage.read("categories", []);
    wallets = Storage.read("wallets", []);
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
    document.getElementById("addRecurringBtn").addEventListener("click", () => openRecurringForm());
    document.getElementById("exportBtn").addEventListener("click", exportData);
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importInput").click());
    document.getElementById("importInput").addEventListener("change", importData);
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
      note: sourceSummary(item, item.dueDate ? `Phải thu · ${item.dueDate}` : "Phải thu · chưa có hạn"),
      type: "Phải thu",
      tone: "receivable",
      amount: item.amount,
      extraActions: `<button class="icon-btn" type="button" onclick="App.openReceivableSettlementForm('${item.id}')" aria-label="Ghi nhận đã thu" title="Ghi nhận đã thu">+</button>`,
      action: `App.openReceivableForm('${item.id}')`,
      deleteAction: `App.deleteReceivable('${item.id}')`
    }));
    const expectedRows = expectedIncome.map((item) => assetRow({
      label: item.name,
      note: sourceSummary(item, item.expectedDate ? `Dự kiến nhận · ${item.expectedDate}` : "Dự kiến nhận · chưa biết thời gian"),
      type: "Dự kiến",
      tone: "expected",
      amount: item.amount,
      extraActions: `<button class="icon-btn" type="button" onclick="App.openExpectedIncomeSettlementForm('${item.id}')" aria-label="Ghi nhận đã nhận" title="Ghi nhận đã nhận">+</button>`,
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

  function assetRow({ label, note, type, tone, amount, action, deleteAction, extraActions = "" }) {
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
            ${extraActions}
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
          <small>${item.cycle === "monthly" ? "Hàng tháng" : "Hàng năm"}</small>
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
    openModal(id ? "Chỉnh sửa ví" : "Thêm ví", `
      <input type="hidden" name="id" value="${item.id || ""}">
      <div class="form-field">
        <label>Tên ví</label>
        <input name="name" required value="${Utils.escapeHtml(item.name || "")}">
      </div>
      <div class="form-field">
        <label>Số dư hiện tại</label>
        <input name="balance" type="number" required value="${item.balance || 0}">
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" type="button" data-close-modal>Hủy</button>
        <button class="btn btn-primary" type="submit">Lưu</button>
      </div>
    `, (data) => {
      const next = { id: data.id || Utils.createId("wallet"), name: data.name, balance: Number(data.balance) || 0 };
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

  function deleteRecurring(id) {
    if (confirm("Xóa khoản định kỳ này?")) {
      Budget.removeRecurring(id);
      renderAll();
    }
  }

  function currentDataSnapshot() {
    return {
      categories,
      wallets,
      receivables,
      expectedIncome,
      transactions: Transactions.all(),
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

  function normalizeImportArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = parsed.data || parsed;
        const confirmed = confirm("Import sẽ ghi đè dữ liệu FinanceFlow hiện tại trong trình duyệt này. Bạn muốn tiếp tục?");
        if (!confirmed) return;

        categories = normalizeImportArray(imported.categories);
        wallets = normalizeImportArray(imported.wallets);
        receivables = normalizeImportArray(imported.receivables).map((item) => normalizeSourceEntry(item, "recv"));
        expectedIncome = normalizeImportArray(imported.expectedIncome).map((item) => normalizeSourceEntry(item, "exp"));

        Storage.write("categories", categories);
        Storage.write("wallets", wallets);
        Storage.write("receivables", receivables);
        Storage.write("expectedIncome", expectedIncome);
        Storage.write("transactions", normalizeImportArray(imported.transactions));
        Storage.write("budgets", normalizeImportArray(imported.budgets));
        Storage.write("recurring", normalizeImportArray(imported.recurring));

        Transactions.load();
        Budget.load();
        renderAll();
        alert("Nhập JSON thành công.");
      } catch (error) {
        alert("Không thể nhập file này. Hãy chọn file JSON backup từ FinanceFlow.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  document.addEventListener("DOMContentLoaded", boot);

  return {
    openTransactionForm,
    deleteTransaction,
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
    deleteBudget,
    openRecurringForm,
    deleteRecurring
  };
})();
