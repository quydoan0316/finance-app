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
      { id: "cat_freelance", name: "Làm thêm", type: "income", icon: "💻", color: "#2563eb" }
    ],
    wallets: [
      { id: "wallet_vietinbank", name: "VietinBank", balance: 0 },
      { id: "wallet_momo", name: "MoMo", balance: 0 },
      { id: "wallet_cash", name: "Tiền mặt", balance: 0 },
      { id: "wallet_vietcombank", name: "VietcomBank", balance: 0 },
      { id: "wallet_vpbank", name: "VPBank", balance: 0 }
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
    "Làm thêm": { icon: "💻", color: "#2563eb" }
  };

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
      color: item.color || style.color || (item.type === "income" ? "#16a34a" : "#64748b")
    };
  }

  function decorateWallet(wallet) {
    return {
      ...wallet,
      balance: Number(wallet.balance) || 0
    };
  }

  function migrateVietnameseLabels() {
    const categories = read("categories", []);
    const transactions = read("transactions", []);
    const budgets = read("budgets", []);
    const wallets = read("wallets", []);

    write("categories", categories.map(decorateCategory));
    write("wallets", wallets.map(decorateWallet));
    write("transactions", transactions.map((item) => ({
      ...item,
      category: translate(item.category),
      wallet: translate(item.wallet),
      note: translate(item.note)
    })));
    write("budgets", budgets.map((item) => ({ ...item, category: translate(item.category) })));
  }

  return { keys, defaults, read, write, seed };
})();
