const Budget = (() => {
  let budgets = [];
  let recurring = [];

  function load() {
    budgets = Storage.read("budgets", []);
    recurring = Storage.read("recurring", []);
  }

  function allBudgets() {
    return budgets;
  }

  function allRecurring() {
    return recurring;
  }

  function saveBudgets(next) {
    budgets = next;
    Storage.write("budgets", budgets);
  }

  function saveRecurring(next) {
    recurring = next;
    Storage.write("recurring", recurring);
  }

  function upsertBudget(data) {
    const item = {
      id: data.id || Utils.createId("bd"),
      category: data.category,
      month: data.month || Utils.currentMonth(),
      amount: Number(data.amount)
    };
    saveBudgets(data.id ? budgets.map((budget) => budget.id === data.id ? item : budget) : [item, ...budgets]);
  }

  function removeBudget(id) {
    saveBudgets(budgets.filter((budget) => budget.id !== id));
  }

  function findBudget(id) {
    return budgets.find((budget) => budget.id === id);
  }

  function upsertRecurring(data) {
    const item = {
      id: data.id || Utils.createId("rc"),
      name: data.name,
      amount: Number(data.amount),
      cycle: data.cycle || "monthly"
    };
    saveRecurring(data.id ? recurring.map((entry) => entry.id === data.id ? item : entry) : [item, ...recurring]);
  }

  function removeRecurring(id) {
    saveRecurring(recurring.filter((entry) => entry.id !== id));
  }

  function findRecurring(id) {
    return recurring.find((entry) => entry.id === id);
  }

  function statusFor(transactions, month = Utils.currentMonth()) {
    return budgets
      .filter((budget) => budget.month === month)
      .map((budget) => {
        const spent = Utils.sum(
          transactions.filter((item) => item.type === "expense" && item.category === budget.category && item.date.startsWith(month)),
          (item) => item.amount
        );
        const percent = budget.amount ? Math.round((spent / budget.amount) * 100) : 0;
        return { ...budget, spent, percent, remaining: budget.amount - spent };
      });
  }

  return {
    load,
    allBudgets,
    allRecurring,
    upsertBudget,
    removeBudget,
    findBudget,
    upsertRecurring,
    removeRecurring,
    findRecurring,
    statusFor
  };
})();
