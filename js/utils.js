const Utils = (() => {
  const currency = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  });

  function formatMoney(value) {
    return currency.format(Number(value) || 0);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentMonth() {
    return today().slice(0, 7);
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function byDateDesc(a, b) {
    return new Date(b.date) - new Date(a.date);
  }

  function getMonthLabel(month) {
    const [year, value] = month.split("-");
    return `Tháng ${Number(value)}/${year}`;
  }

  function sum(items, selector) {
    return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
  }

  function calculateWalletInitialBalance(wallet, transactions) {
    // Get transactions for this wallet
    const walletTransactions = transactions.filter((tx) => tx.wallet === wallet.name);
    const income = sum(walletTransactions.filter((tx) => tx.type === "income"), (tx) => tx.amount);
    const expense = sum(walletTransactions.filter((tx) => tx.type === "expense"), (tx) => tx.amount);
    // initial = current - income + expense
    return wallet.balance - income + expense;
  }

  return {
    formatMoney,
    today,
    currentMonth,
    createId,
    escapeHtml,
    byDateDesc,
    getMonthLabel,
    sum,
    calculateWalletInitialBalance
  };
})();
