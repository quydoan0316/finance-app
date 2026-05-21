const Backup = (() => {
  const APP_NAME = "FinanceFlow";
  const VERSION = 1;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function sumAmount(items) {
    return Utils.sum(items, (item) => item.amount);
  }

  function normalizeSettlement(item, prefix) {
    return {
      id: item.id || Utils.createId(`${prefix}_settlement`),
      amount: Number(item.amount) || 0,
      wallet: Storage.translate(item.wallet) || String(item.wallet || "Tiền mặt").trim(),
      date: item.date || Utils.today(),
      note: String(item.note || ""),
      category: Storage.translate(item.category) || String(item.category || ""),
      transactionId: item.transactionId || ""
    };
  }

  function normalizeAdjustment(item, prefix) {
    return {
      id: item.id || Utils.createId(`${prefix}_adj`),
      amount: Number(item.amount) || 0,
      date: item.date || Utils.today(),
      note: String(item.note || ""),
      wallet: Storage.translate(item.wallet) || String(item.wallet || ""),
      category: Storage.translate(item.category) || String(item.category || ""),
      transactionId: item.transactionId || ""
    };
  }

  function normalizeSourceEntry(entry, prefix, dateField) {
    const settlements = asArray(entry.settlements).map((item) => normalizeSettlement(item, prefix));
    const adjustments = asArray(entry.adjustments).map((item) => normalizeAdjustment(item, prefix));
    const remaining = Number(entry.amount) || 0;
    const collected = sumAmount(settlements);
    const originalAmount = Number(entry.originalAmount);
    const base = {
      id: entry.id || Utils.createId(prefix),
      name: String(entry.name || "").trim(),
      amount: remaining,
      originalAmount: Number.isFinite(originalAmount) && originalAmount > 0 ? originalAmount : remaining + collected,
      note: String(entry.note || ""),
      settlements,
      adjustments
    };
    if (dateField === "dueDate") {
      base.dueDate = entry.dueDate || "";
    } else {
      base.expectedDate = entry.expectedDate || "";
    }
    return base;
  }

  function serializeSourceEntry(entry, prefix, dateField) {
    const normalized = normalizeSourceEntry(entry, prefix, dateField);
    const payload = {
      id: normalized.id,
      name: normalized.name,
      amount: normalized.amount,
      originalAmount: normalized.originalAmount,
      note: normalized.note,
      settlements: normalized.settlements,
      adjustments: normalized.adjustments
    };
    if (dateField === "dueDate") {
      payload.dueDate = normalized.dueDate || "";
    } else {
      payload.expectedDate = normalized.expectedDate || "";
    }
    return payload;
  }

  function serializeCategory(item) {
    const category = Storage.decorateCategory(item);
    return {
      id: category.id,
      name: category.name,
      type: category.type === "income"
        ? "income"
        : category.type === "transfer"
          ? "transfer"
          : "expense",
      icon: category.icon || "🏷️",
      color: category.color || "#64748b"
    };
  }

  function serializeWallet(wallet) {
    const name = String(wallet?.name || "").trim();
    const balance = Number(wallet?.balance) || 0;
    const hasInitial = wallet?.initialBalance !== undefined && wallet?.initialBalance !== null && wallet?.initialBalance !== "";
    return {
      id: wallet?.id || Utils.createId("wallet"),
      name,
      balance,
      initialBalance: hasInitial ? Number(wallet.initialBalance) || 0 : balance,
      createdAt: wallet?.createdAt || Utils.today()
    };
  }

  function serializeTransaction(item) {
    const tx = Storage.normalizeTransaction(item);
    return {
      id: tx.id,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      wallet: tx.wallet,
      note: tx.note,
      date: tx.date,
      sourceType: tx.sourceType || "",
      sourceId: tx.sourceId || "",
      sourceEventId: tx.sourceEventId || "",
      transferTo: tx.transferTo || "",
      transferGroupId: tx.transferGroupId || "",
      transferRole: tx.transferRole || ""
    };
  }

  function transferIssues(transactions) {
    const groups = {};
    asArray(transactions).filter((item) => item.type === "transfer").forEach((item) => {
      const groupId = item.transferGroupId || item.id;
      if (!groups[groupId]) {
        groups[groupId] = { out: 0, in: 0 };
      }
      if (item.transferRole === "out") groups[groupId].out += 1;
      if (item.transferRole === "in") groups[groupId].in += 1;
    });
    return Object.entries(groups).filter(([, legs]) => legs.out !== 1 || legs.in !== 1).length;
  }

  function normalizeBudget(budget) {
    const startMonth = budget.startMonth || budget.month || Utils.currentMonth();
    const recurrence = budget.recurrence || "once";
    const overrides = asArray(budget.overrides)
      .map((item) => ({
        month: item.month,
        amount: Number(item.amount) || 0,
        note: item.note || ""
      }))
      .filter((item) => item.month && item.amount > 0);
    return {
      id: budget.id || Utils.createId("bd"),
      category: Storage.translate(budget.category) || String(budget.category || "").trim(),
      amount: Number(budget.amount) || 0,
      recurrence,
      startMonth,
      endMonth: budget.endMonth || (recurrence === "once" ? startMonth : ""),
      active: budget.active !== false,
      overrides
    };
  }

  function serializeBudget(budget) {
    return normalizeBudget(budget);
  }

  function normalizeRecurring(item) {
    return {
      id: item.id || Utils.createId("rc"),
      name: String(item.name || "").trim(),
      amount: Number(item.amount) || 0,
      cycle: item.cycle || "monthly"
    };
  }

  function normalizeImport(payload) {
    const raw = payload && typeof payload === "object" ? payload : {};
    const transactions = asArray(raw.transactions).map((item) => Storage.normalizeTransaction(item));
    const categories = asArray(raw.categories).map((item) => Storage.decorateCategory(item));
    const wallets = asArray(raw.wallets)
      .map((wallet) => Storage.decorateWallet(wallet, transactions))
      .filter((wallet) => wallet.name);

    return {
      categories,
      wallets,
      receivables: asArray(raw.receivables).map((item) => normalizeSourceEntry(item, "recv", "dueDate")),
      expectedIncome: asArray(raw.expectedIncome).map((item) => normalizeSourceEntry(item, "exp", "expectedDate")),
      transactions,
      budgets: asArray(raw.budgets).map(normalizeBudget),
      recurring: asArray(raw.recurring).map(normalizeRecurring),
      transferIssues: transferIssues(transactions)
    };
  }

  function buildSnapshot(state) {
    const transactions = asArray(state.transactions).map(serializeTransaction);
    const payload = {
      categories: asArray(state.categories).map(serializeCategory),
      wallets: asArray(state.wallets).map(serializeWallet),
      receivables: asArray(state.receivables).map((item) => serializeSourceEntry(item, "recv", "dueDate")),
      expectedIncome: asArray(state.expectedIncome).map((item) => serializeSourceEntry(item, "exp", "expectedDate")),
      transactions,
      budgets: asArray(state.budgets).map(serializeBudget),
      recurring: asArray(state.recurring).map(normalizeRecurring)
    };
    return payload;
  }

  function wrapExport(data) {
    return {
      app: APP_NAME,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  function parseFile(raw) {
    const parsed = JSON.parse(raw);
    const imported = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
    if (!imported || typeof imported !== "object") {
      throw new Error("INVALID_SHAPE");
    }
    const hasKnownKeys = ["wallets", "transactions", "categories", "receivables", "expectedIncome"].some(
      (key) => Array.isArray(imported[key])
    );
    if (!hasKnownKeys) {
      throw new Error("INVALID_SHAPE");
    }
    return { meta: parsed, data: normalizeImport(imported) };
  }

  function describeImport({ meta = {}, data = {} } = {}) {
    const appLabel = meta.app === APP_NAME ? APP_NAME : "file JSON";
    const transfers = asArray(data.transactions).filter((item) => item.type === "transfer").length;
    const lines = [
      `${asArray(data.categories).length} danh mục`,
      `${asArray(data.wallets).length} ví`,
      `${asArray(data.transactions).length} giao dịch${transfers ? ` (${transfers} chuyển khoản)` : ""}`,
      `${asArray(data.receivables).length} khoản phải thu`,
      `${asArray(data.expectedIncome).length} khoản dự kiến`,
      `${asArray(data.budgets).length} ngân sách`,
      `${asArray(data.recurring).length} định kỳ`
    ];
    if (data.transferIssues > 0) {
      lines.push(`${data.transferIssues} nhóm chuyển khoản thiếu đủ 2 dòng (ra/vào)`);
    }
    return { appLabel, summary: lines.join("\n- ") };
  }

  return {
    APP_NAME,
    VERSION,
    normalizeSourceEntry,
    normalizeImport,
    buildSnapshot,
    wrapExport,
    parseFile,
    describeImport,
    transferIssues
  };
})();
