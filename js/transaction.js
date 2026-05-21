const Transactions = (() => {
  let items = [];

  function load() {
    items = Storage.read("transactions", []);
    return items;
  }

  function all() {
    return items;
  }

  function save(nextItems) {
    items = nextItems;
    Storage.write("transactions", items);
  }

  function isCashflow(item) {
    return item?.type === "income" || item?.type === "expense";
  }

  function upsert(data) {
    const normalized = Storage.normalizeTransaction(data);

    if (data.id) {
      save(items.map((item) => item.id === data.id ? normalized : item));
      return normalized;
    }

    save([normalized, ...items]);
    return normalized;
  }

  function remove(id) {
    save(items.filter((item) => item.id !== id));
  }

  function find(id) {
    return items.find((item) => item.id === id);
  }

  function filter(criteria) {
    const search = (criteria.search || "").trim().toLowerCase();
    const day = criteria.day || "";
    return items.filter((item) => {
      const dayMatch = !day || item.date === day;
      const monthMatch = day ? true : criteria.month === "all" || item.date.startsWith(criteria.month);
      const typeMatch = criteria.type === "all" || item.type === criteria.type
        || (criteria.type === "cashflow" && isCashflow(item));
      const categoryMatch = criteria.category === "all" || item.category === criteria.category;
      const walletMatch = !criteria.wallet || criteria.wallet === "all" || item.wallet === criteria.wallet;
      const text = `${item.category} ${item.wallet} ${item.note}`.toLowerCase();
      return dayMatch && monthMatch && typeMatch && categoryMatch && walletMatch && text.includes(search);
    }).sort(Utils.byDateDesc);
  }

  function summarizeDay(transactions, day, wallet = "all") {
    const pool = transactions.filter((item) => {
      const dayMatch = item.date === day;
      const walletMatch = wallet === "all" || item.wallet === wallet;
      return dayMatch && walletMatch;
    });
    return summarize(pool);
  }

  function summarize(pool) {
    const income = Utils.sum(pool.filter((item) => item.type === "income"), (item) => item.amount);
    const expense = Utils.sum(pool.filter((item) => item.type === "expense"), (item) => item.amount);
    const transfers = pool.filter((item) => item.type === "transfer").length;
    return { income, expense, net: income - expense, count: pool.length, transfers };
  }

  function findTransferGroup(id) {
    const item = find(id);
    if (!item?.transferGroupId) return [];
    return items.filter((entry) => entry.transferGroupId === item.transferGroupId);
  }

  function expenseByCategory(pool, limit = 6) {
    const totals = {};
    pool.filter((item) => item.type === "expense").forEach((item) => {
      totals[item.category] = (totals[item.category] || 0) + Number(item.amount || 0);
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  return {
    load,
    all,
    upsert,
    remove,
    find,
    filter,
    summarizeDay,
    summarize,
    expenseByCategory,
    isCashflow,
    findTransferGroup
  };
})();
