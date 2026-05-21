const Budget = (() => {
  let budgets = [];
  let recurring = [];

  function load() {
    budgets = Storage.read("budgets", []).map(normalizeBudget);
    Storage.write("budgets", budgets);
    recurring = Storage.read("recurring", []);
  }

  function normalizeBudget(budget) {
    const startMonth = budget.startMonth || budget.month || Utils.currentMonth();
    const recurrence = budget.recurrence || "once";
    const overrides = Array.isArray(budget.overrides)
      ? budget.overrides.map((item) => ({
        month: item.month,
        amount: Number(item.amount) || 0,
        note: item.note || ""
      })).filter((item) => item.month && item.amount > 0)
      : [];
    return {
      id: budget.id || Utils.createId("bd"),
      category: budget.category,
      amount: Number(budget.amount) || 0,
      recurrence,
      startMonth,
      endMonth: budget.endMonth || (recurrence === "once" ? startMonth : ""),
      active: budget.active !== false,
      overrides
    };
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
    const existing = data.id ? findBudget(data.id) : null;
    const recurrence = data.recurrence || "monthly";
    const startMonth = data.startMonth || data.month || Utils.currentMonth();
    const item = normalizeBudget({
      id: data.id || Utils.createId("bd"),
      category: data.category,
      amount: Number(data.amount),
      recurrence,
      startMonth,
      endMonth: recurrence === "once" ? startMonth : data.endMonth,
      active: data.active === "on" || data.active === true || data.active === undefined,
      overrides: existing?.overrides || data.overrides || []
    });
    saveBudgets(data.id ? budgets.map((budget) => budget.id === data.id ? item : budget) : [item, ...budgets]);
  }

  function removeBudget(id) {
    saveBudgets(budgets.filter((budget) => budget.id !== id));
  }

  function findBudget(id) {
    return budgets.find((budget) => budget.id === id);
  }

  function appliesToMonth(budget, month) {
    if (!budget.active) return false;
    if (budget.recurrence === "once") return budget.startMonth === month;
    if (budget.recurrence === "range") {
      return budget.startMonth <= month && (!budget.endMonth || month <= budget.endMonth);
    }
    return budget.startMonth <= month && (!budget.endMonth || month <= budget.endMonth);
  }

  function overrideForMonth(budget, month) {
    return (budget.overrides || []).find((item) => item.month === month);
  }

  function effectiveAmount(budget, month) {
    const override = overrideForMonth(budget, month);
    return override ? Number(override.amount) || 0 : Number(budget.amount) || 0;
  }

  function upsertOverride(id, data) {
    const budget = findBudget(id);
    if (!budget) return false;

    const override = {
      month: data.month || Utils.currentMonth(),
      amount: Number(data.amount) || 0,
      note: data.note || ""
    };

    if (!override.month || override.amount <= 0) return false;

    const overrides = [
      override,
      ...(budget.overrides || []).filter((item) => item.month !== override.month)
    ].sort((a, b) => b.month.localeCompare(a.month));

    saveBudgets(budgets.map((item) => item.id === id ? { ...item, overrides } : item));
    return true;
  }

  function removeOverride(id, month) {
    const budget = findBudget(id);
    if (!budget) return false;

    saveBudgets(budgets.map((item) => item.id === id ? {
      ...item,
      overrides: (item.overrides || []).filter((override) => override.month !== month)
    } : item));
    return true;
  }

  function isVariableAmount(item) {
    return item?.amountVariable === true;
  }

  function recurringAmountLabel(item) {
    if (isVariableAmount(item)) return "Theo hóa đơn";
    if (Number(item?.amount) > 0) return Utils.formatMoney(item.amount);
    return "—";
  }

  function recurringPeriodLabel(_item, month) {
    return Utils.getMonthLabel(month);
  }

  function paymentMatchesPeriod(transaction, item, month) {
    if (!transaction?.recurringId || transaction.recurringId !== item.id) return false;
    return transaction.date.startsWith(month);
  }

  function findRecurringPayment(transactions, item, month) {
    return (Array.isArray(transactions) ? transactions : [])
      .filter((tx) => paymentMatchesPeriod(tx, item, month))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0] || null;
  }

  function isPaidInPeriod(transactions, item, month) {
    return !!findRecurringPayment(transactions, item, month);
  }

  function recurringStartMonth(item) {
    return item?.startMonth || (item?.startDate ? item.startDate.slice(0, 7) : "");
  }

  function recurringEndMonth(item) {
    return item?.endMonth || (item?.endDate ? item.endDate.slice(0, 7) : "");
  }

  function isActiveInMonth(item, month) {
    const startMonth = recurringStartMonth(item);
    const endMonth = recurringEndMonth(item);
    if (startMonth && month < startMonth) return false;
    if (endMonth && month > endMonth) return false;
    return true;
  }

  function dateRangeLabel(item) {
    const startMonth = recurringStartMonth(item);
    const endMonth = recurringEndMonth(item);
    if (!startMonth && !endMonth) return "";
    if (startMonth && endMonth) return `${Utils.getMonthLabel(startMonth)} → ${Utils.getMonthLabel(endMonth)}`;
    if (startMonth) return `Từ ${Utils.getMonthLabel(startMonth)}`;
    return `Đến ${Utils.getMonthLabel(endMonth)}`;
  }

  function upsertRecurring(data) {
    const paymentType = data.paymentType === "income" ? "income" : "expense";
    const amountVariable = data.amountVariable === true || data.amountVariable === "on";
    const amount = amountVariable ? 0 : Number(data.amount) || 0;
    const item = {
      id: data.id || Utils.createId("rc"),
      name: data.name,
      amount,
      amountVariable,
      cycle: "monthly",
      paymentType,
      category: String(data.category || "").trim(),
      wallet: "",
      startMonth: data.startMonth || Utils.currentMonth(),
      endMonth: data.endMonth || ""
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
      .filter((budget) => appliesToMonth(budget, month))
      .map((budget) => {
        const amount = effectiveAmount(budget, month);
        const override = overrideForMonth(budget, month);
        const spent = Utils.sum(
          transactions.filter((item) => item.type === "expense" && item.category === budget.category && item.date.startsWith(month)),
          (item) => item.amount
        );
        const percent = amount ? Math.round((spent / amount) * 100) : 0;
        return { ...budget, baseAmount: budget.amount, amount, override, spent, percent, remaining: amount - spent };
      });
  }

  return {
    load,
    allBudgets,
    allRecurring,
    upsertBudget,
    removeBudget,
    findBudget,
    appliesToMonth,
    overrideForMonth,
    effectiveAmount,
    upsertOverride,
    removeOverride,
    upsertRecurring,
    removeRecurring,
    findRecurring,
    isVariableAmount,
    recurringAmountLabel,
    recurringPeriodLabel,
    findRecurringPayment,
    isPaidInPeriod,
    isActiveInMonth,
    recurringStartMonth,
    recurringEndMonth,
    dateRangeLabel,
    statusFor
  };
})();
