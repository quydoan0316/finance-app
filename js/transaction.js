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

  function upsert(data) {
    const normalized = {
      id: data.id || Utils.createId("tx"),
      type: data.type,
      category: data.category,
      amount: Number(data.amount),
      wallet: data.wallet || "Tiền mặt",
      note: data.note || "",
      date: data.date || Utils.today(),
      sourceType: data.sourceType || "",
      sourceId: data.sourceId || "",
      sourceEventId: data.sourceEventId || ""
    };

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
    return items.filter((item) => {
      const monthMatch = criteria.month === "all" || item.date.startsWith(criteria.month);
      const typeMatch = criteria.type === "all" || item.type === criteria.type;
      const categoryMatch = criteria.category === "all" || item.category === criteria.category;
      const text = `${item.category} ${item.wallet} ${item.note}`.toLowerCase();
      return monthMatch && typeMatch && categoryMatch && text.includes(search);
    }).sort(Utils.byDateDesc);
  }

  return { load, all, upsert, remove, find, filter };
})();
