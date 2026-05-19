const FinanceCharts = (() => {
  const charts = {};

  function chartOptions() {
    const textColor = getComputedStyle(document.body).getPropertyValue("--muted").trim();
    const lineColor = getComputedStyle(document.body).getPropertyValue("--line").trim();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, boxWidth: 12 } }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: lineColor } },
        y: { ticks: { color: textColor }, grid: { color: lineColor } }
      }
    };
  }

  function destroy(id) {
    if (charts[id]) charts[id].destroy();
  }

  function renderCategory(transactions) {
    destroy("category");
    const expenses = transactions.filter((item) => item.type === "expense" && item.date.startsWith(Utils.currentMonth()));
    const grouped = expenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});

    charts.category = new Chart(document.getElementById("categoryChart"), {
      type: "doughnut",
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          data: Object.values(grouped),
          backgroundColor: ["#246bfe", "#13a66f", "#e05a47", "#f0b955", "#7c5cff", "#14b8a6"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: chartOptions().plugins }
    });
  }

  function monthlyBuckets(transactions) {
    const months = [...new Set(transactions.map((item) => item.date.slice(0, 7)))].sort();
    return months.length ? months : [Utils.currentMonth()];
  }

  function renderMonthly(transactions) {
    destroy("monthly");
    const months = monthlyBuckets(transactions);
    charts.monthly = new Chart(document.getElementById("monthlyChart"), {
      type: "bar",
      data: {
        labels: months.map(Utils.getMonthLabel),
        datasets: [
          {
            label: "Thu nhập",
            data: months.map((month) => Utils.sum(transactions.filter((item) => item.type === "income" && item.date.startsWith(month)), (item) => item.amount)),
            backgroundColor: "#13a66f"
          },
          {
            label: "Chi tiêu",
            data: months.map((month) => Utils.sum(transactions.filter((item) => item.type === "expense" && item.date.startsWith(month)), (item) => item.amount)),
            backgroundColor: "#e05a47"
          }
        ]
      },
      options: chartOptions()
    });
  }

  function renderBalance(transactions) {
    destroy("balance");
    let balance = 0;
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const data = sorted.map((item) => {
      balance += item.type === "income" ? Number(item.amount) : -Number(item.amount);
      return balance;
    });

    charts.balance = new Chart(document.getElementById("balanceChart"), {
      type: "line",
      data: {
        labels: sorted.map((item) => item.date),
        datasets: [{
          label: "Số dư",
          data,
          borderColor: "#246bfe",
          backgroundColor: "rgba(36, 107, 254, 0.12)",
          fill: true,
          tension: 0.32
        }]
      },
      options: chartOptions()
    });
  }

  function renderAll(transactions) {
    if (!window.Chart) return;
    renderCategory(transactions);
    renderMonthly(transactions);
    renderBalance(transactions);
  }

  return { renderAll };
})();
