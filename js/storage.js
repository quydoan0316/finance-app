const Storage = (() => {
  const keys = {
    transactions: "finance_transactions",
    categories: "finance_categories",
    wallets: "finance_wallets",
    receivables: "finance_receivables",
    expectedIncome: "finance_expected_income",
    budgets: "finance_budgets",
    recurring: "finance_recurring",
    theme: "finance_theme"
  };

  const defaults = {
    categories: [
      { id: "cat_food", name: "Ăn uống", type: "expense", icon: "🍜", color: "#f97316" },
      { id: "cat_transport", name: "Di chuyển", type: "expense", icon: "🚕", color: "#0ea5e9" },
      { id: "cat_shopping", name: "Mua sắm", type: "expense", icon: "🛍️", color: "#ec4899" },
      { id: "cat_bills", name: "Hóa đơn", type: "expense", icon: "💡", color: "#eab308" },
      { id: "cat_entertainment", name: "Giải trí", type: "expense", icon: "🎬", color: "#8b5cf6" },
      { id: "cat_salary", name: "Lương", type: "income", icon: "💼", color: "#16a34a" },
      { id: "cat_bonus", name: "Thưởng", type: "income", icon: "🎁", color: "#14b8a6" },
      { id: "cat_freelance", name: "Làm thêm", type: "income", icon: "💻", color: "#2563eb" },
      { id: "cat_lend", name: "Cho vay", type: "expense", icon: "🤝", color: "#dc2626" },
      { id: "cat_collect_recv", name: "Thu hồi nợ", type: "income", icon: "💰", color: "#059669" },
      { id: "cat_expected_recv", name: "Nhận khoản dự kiến", type: "income", icon: "📥", color: "#0891b2" },
      { id: "cat_transfer", name: "Chuyển tiền giữa ví", type: "transfer", icon: "↔️", color: "#6366f1" }
    ],
    wallets: [
      { id: "wallet_vietinbank", name: "VietinBank", balance: 0, initialBalance: 0, createdAt: "2026-01-01" },
      { id: "wallet_momo", name: "MoMo", balance: 0, initialBalance: 0, createdAt: "2026-01-01" },
      { id: "wallet_cash", name: "Tiền mặt", balance: 0, initialBalance: 0, createdAt: "2026-01-01" },
      { id: "wallet_vietcombank", name: "VietcomBank", balance: 0, initialBalance: 0, createdAt: "2026-01-01" },
      { id: "wallet_vpbank", name: "VPBank", balance: 0, initialBalance: 0, createdAt: "2026-01-01" }
    ],
    receivables: [],
    expectedIncome: [],
    transactions: [],
    budgets: [],
    recurring: []
  };

  const viLabels = {
    Food: "Ăn uống",
    Transport: "Di chuyển",
    Shopping: "Mua sắm",
    Bills: "Hóa đơn",
    Entertainment: "Giải trí",
    Salary: "Lương",
    Bonus: "Thưởng",
    Freelance: "Làm thêm",
    Cash: "Tiền mặt",
    Bank: "VietinBank",
    Card: "MoMo",
    "Ngân hàng": "VietinBank",
    "Thẻ": "MoMo",
    "Luong thang": "Lương tháng",
    "An uong tuan 1": "Ăn uống tuần 1",
    "Xang xe": "Xăng xe",
    "Dien nuoc": "Điện nước",
    "Du an landing page": "Dự án landing page",
    "Do dung ca nhan": "Đồ dùng cá nhân"
  };

  const categoryStyles = {
    "Ăn uống": { icon: "🍜", color: "#f97316" },
    "Di chuyển": { icon: "🚕", color: "#0ea5e9" },
    "Mua sắm": { icon: "🛍️", color: "#ec4899" },
    "Hóa đơn": { icon: "💡", color: "#eab308" },
    "Giải trí": { icon: "🎬", color: "#8b5cf6" },
    "Lương": { icon: "💼", color: "#16a34a" },
    "Thưởng": { icon: "🎁", color: "#14b8a6" },
    "Làm thêm": { icon: "💻", color: "#2563eb" },
    "Cho vay": { icon: "🤝", color: "#dc2626" },
    "Thu hồi nợ": { icon: "💰", color: "#059669" },
    "Nhận khoản dự kiến": { icon: "📥", color: "#0891b2" },
    "Chuyển tiền giữa ví": { icon: "↔️", color: "#6366f1" }
  };

  const assetCategories = [
    { id: "cat_lend", name: "Cho vay", type: "expense", icon: "🤝", color: "#dc2626" },
    { id: "cat_collect_recv", name: "Thu hồi nợ", type: "income", icon: "💰", color: "#059669" },
    { id: "cat_expected_recv", name: "Nhận khoản dự kiến", type: "income", icon: "📥", color: "#0891b2" }
  ];

  function read(key, fallback) {
    const raw = localStorage.getItem(keys[key]);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(keys[key], JSON.stringify(value));
  }

  function seed() {
    Object.keys(defaults).forEach((key) => {
      if (!localStorage.getItem(keys[key])) {
        write(key, defaults[key]);
      }
    });
    migrateVietnameseLabels();
  }

  function translate(value) {
    return viLabels[value] || value;
  }

  function decorateCategory(item) {
    const name = translate(item.name);
    const style = categoryStyles[name] || {};
    return {
      ...item,
      name,
      icon: item.icon || style.icon || "🏷️",
      color: item.color || style.color || (item.type === "income" ? "#16a34a" : item.type === "transfer" ? "#6366f1" : "#64748b")
    };
  }

  function decorateWallet(wallet, transactions = []) {
    const name = String(wallet?.name || "").trim();
    const balance = Number(wallet.balance) || 0;
    // initialBalance = số dư lúc tạo ví (trước giao dịch). Ưu tiên giá trị trong file import.
    const hasInitial = wallet.initialBalance !== undefined && wallet.initialBalance !== null && wallet.initialBalance !== "";
    const walletDates = transactions
      .filter((tx) => tx.wallet === name)
      .map((tx) => tx.date)
      .filter(Boolean)
      .sort();
    return {
      id: wallet.id || Utils.createId("wallet"),
      name,
      balance,
      initialBalance: hasInitial
        ? Number(wallet.initialBalance) || 0
        : Utils.calculateWalletInitialBalance({ name, balance }, transactions),
      createdAt: wallet.createdAt || walletDates[0] || Utils.today()
    };
  }

  function normalizeTransaction(item) {
    const type = item.type === "income"
      ? "income"
      : item.type === "transfer"
        ? "transfer"
        : "expense";
    return {
      id: item.id || Utils.createId("tx"),
      type,
      category: translate(item.category) || String(item.category || "").trim(),
      amount: Number(item.amount) || 0,
      wallet: translate(item.wallet) || String(item.wallet || "Tiền mặt").trim(),
      note: translate(item.note) || String(item.note || ""),
      date: item.date || Utils.today(),
      sourceType: item.sourceType || "",
      sourceId: item.sourceId || "",
      sourceEventId: item.sourceEventId || "",
      transferTo: translate(item.transferTo) || String(item.transferTo || "").trim(),
      transferGroupId: item.transferGroupId || "",
      transferRole: item.transferRole || "",
      recurringId: item.recurringId || ""
    };
  }

  function transferCategoryName() {
    return "Chuyển tiền giữa ví";
  }

  function ensureTransferCategory() {
    const categories = read("categories", []);
    const name = transferCategoryName();
    if (categories.some((item) => item.name === name)) return;
    write("categories", [...categories, decorateCategory({
      id: "cat_transfer",
      name,
      type: "transfer",
      icon: "↔️",
      color: "#6366f1"
    })]);
  }

  function ensureAssetCategories() {
    const categories = read("categories", []);
    const names = new Set(categories.map((item) => item.name));
    const missing = assetCategories.filter((item) => !names.has(item.name));
    if (!missing.length) return;
    write("categories", [...categories, ...missing].map(decorateCategory));
  }

  function migrateVietnameseLabels() {
    const categories = read("categories", []);
    const transactions = read("transactions", []);
    const budgets = read("budgets", []);
    const wallets = read("wallets", []);

    write("categories", categories.map(decorateCategory));
    ensureAssetCategories();
    ensureTransferCategory();
    write("wallets", wallets.map((wallet) => decorateWallet(wallet, transactions)));
    write("transactions", transactions.map((item) => normalizeTransaction({
      ...item,
      category: translate(item.category),
      wallet: translate(item.wallet),
      note: translate(item.note),
      transferTo: translate(item.transferTo)
    })));
    write("budgets", budgets.map((item) => ({ ...item, category: translate(item.category) })));
  }

  return {
    keys,
    defaults,
    read,
    write,
    seed,
    translate,
    decorateCategory,
    decorateWallet,
    normalizeTransaction,
    ensureAssetCategories,
    ensureTransferCategory,
    transferCategoryName,
    assetCategoryNames: {
      lend: "Cho vay",
      collectReceivable: "Thu hồi nợ",
      collectExpected: "Nhận khoản dự kiến"
    }
  };
})();
