/* =========================================================================
   ZenVest — Dashboard Logic (Vanilla JS)
   -------------------------------------------------------------------------
   This file is intentionally split into clear sections so the DATA LAYER
   (currently dummy math) can be swapped for a real fetch() call to your
   Java Servlet without touching the DOM / rendering code below it.
   ========================================================================= */

(() => {
  "use strict";

  /* =======================================================================
     0. CONSTANTS & CONFIG
     ======================================================================= */

  // Asset allocation model weights per risk profile.
  // Swap this for whatever your Servlet's optimizer returns.
  const ALLOCATION_MODELS = {
    conservative: [
      { key: "debt", label: "Debt Funds", desc: "Short Duration & Corporate Bonds", pct: 45, color: "#4cd7f6" },
      { key: "largeCap", label: "Direct Mutual Funds", desc: "Large Cap Bluechip Core", pct: 25, color: "#4edea3" },
      { key: "gold", label: "Gold ETFs", desc: "Sovereign Gold & Commodities", pct: 25, color: "#f59e0b" },
      { key: "cash", label: "Cash & Liquid", desc: "Emergency Buffer", pct: 5, color: "#9699ff" },
    ],
    moderate: [
      { key: "largeCap", label: "Direct Mutual Funds", desc: "Large + Mid Cap Blend", pct: 45, color: "#4edea3" },
      { key: "midSmall", label: "Small Cap Funds", desc: "Growth Tilt Equity", pct: 20, color: "#6366f1" },
      { key: "gold", label: "Gold ETFs", desc: "Sovereign Gold & Commodities", pct: 20, color: "#f59e0b" },
      { key: "debt", label: "Debt Funds", desc: "Stability Allocation", pct: 15, color: "#4cd7f6" },
    ],
    aggressive: [
      { key: "midSmall", label: "Small & Mid Cap Funds", desc: "High Growth Equity", pct: 45, color: "#6366f1" },
      { key: "largeCap", label: "Direct Mutual Funds", desc: "Large Cap Core", pct: 30, color: "#4edea3" },
      { key: "intl", label: "International ETFs", desc: "Global Diversification", pct: 15, color: "#4cd7f6" },
      { key: "gold", label: "Gold ETFs", desc: "Volatility Hedge", pct: 10, color: "#f59e0b" },
    ],
  };

  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  /* =======================================================================
     1. DOM REFERENCES
     ======================================================================= */

  const form = document.getElementById("sip-form");
  const monthlyInput = document.getElementById("monthly-investment");
  const horizonSlider = document.getElementById("horizon-slider");
  const horizonDisplay = document.getElementById("horizon-display");
  const riskHiddenInput = document.getElementById("risk-tolerance");
  const cagrHiddenInput = document.getElementById("expected-cagr");
  const riskCards = Array.from(document.querySelectorAll(".risk-card"));
  const presetBtns = Array.from(document.querySelectorAll(".preset-btn"));
  const formError = document.getElementById("form-error");
  const analyzeBtn = document.getElementById("analyze-btn");

  const metricInvested = document.getElementById("metric-invested");
  const metricMonthly = document.getElementById("metric-monthly");
  const metricMonths = document.getElementById("metric-months");
  const metricReturns = document.getElementById("metric-returns");
  const metricXirrBadge = document.getElementById("metric-xirr-badge");
  const metricCagrText = document.getElementById("metric-cagr-text");
  const metricCorpus = document.getElementById("metric-corpus");
  const metricYearBadge = document.getElementById("metric-year-badge");
  const donutCenterAmount = document.getElementById("donut-center-amount");
  const allocationLegend = document.getElementById("allocation-legend");

  const tabAllocation = document.getElementById("tab-allocation");
  const tabGrowth = document.getElementById("tab-growth");
  const viewAllocation = document.getElementById("view-allocation");
  const viewGrowth = document.getElementById("view-growth");

  let allocationChart = null;
  let growthChart = null;

  /* =======================================================================
     2. DATA LAYER
     -------------------------------------------------------------------------
     getPortfolioProjection() is the single seam between UI and backend.
     Right now it resolves synchronously with dummy math wrapped in a
     Promise so the calling code already behaves exactly like a fetch()
     call. When your Java Servlet endpoint is ready, replace the body of
     this function with the commented fetch() block below it — nothing
     else in this file needs to change.
     ======================================================================= */

  function getPortfolioProjection({ monthlyInvestment, timeHorizonYears, riskTolerance, expectedCagr }) {
    // ---- DUMMY CALCULATION (remove when wiring up the real backend) ----
    const months = timeHorizonYears * 12;
    const monthlyRate = expectedCagr / 100 / 12;

    // Future value of a growing SIP (ordinary annuity, contributions at
    // the start of each month).
    const futureValue =
      monthlyRate === 0
        ? monthlyInvestment * months
        : monthlyInvestment *
          ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
          (1 + monthlyRate);

    const totalInvested = monthlyInvestment * months;
    const estimatedReturns = Math.max(futureValue - totalInvested, 0);

    // Build a yearly growth series for the line chart.
    const growthSeries = [];
    for (let year = 0; year <= timeHorizonYears; year++) {
      const m = year * 12;
      const investedSoFar = monthlyInvestment * m;
      const fvSoFar =
        m === 0
          ? 0
          : monthlyRate === 0
          ? investedSoFar
          : monthlyInvestment *
            ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) *
            (1 + monthlyRate);
      growthSeries.push({
        year: new Date().getFullYear() + year,
        invested: Math.round(investedSoFar),
        value: Math.round(fvSoFar),
      });
    }

    const allocation = ALLOCATION_MODELS[riskTolerance] || ALLOCATION_MODELS.moderate;

    const result = {
      totalInvested: Math.round(totalInvested),
      estimatedReturns: Math.round(estimatedReturns),
      futureValue: Math.round(futureValue),
      months,
      monthlyInvestment,
      expectedCagr,
      allocation,
      growthSeries,
      targetYear: new Date().getFullYear() + timeHorizonYears,
    };

    return Promise.resolve(result);

    // ---- REAL BACKEND CALL (uncomment + delete the block above) --------
    //
    // return fetch("/zenvest/api/sip-projection", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     monthlyInvestment,
    //     timeHorizonYears,
    //     riskTolerance,
    //     expectedCagr,
    //   }),
    // })
    //   .then((res) => {
    //     if (!res.ok) throw new Error(`Servlet returned ${res.status}`);
    //     return res.json();
    //   })
    //   .then((data) => {
    //     // Expected JSON shape from the servlet should match the
    //     // `result` object built above: totalInvested, estimatedReturns,
    //     // futureValue, months, allocation[], growthSeries[], targetYear.
    //     return data;
    //   });
  }

  /* =======================================================================
     3. RENDERING
     ======================================================================= */

  function formatCurrency(value) {
    return currencyFormatter.format(value);
  }

  function renderSummaryCards(result) {
    metricInvested.textContent = formatCurrency(result.totalInvested);
    metricMonthly.textContent = result.monthlyInvestment.toLocaleString("en-IN");
    metricMonths.textContent = result.months;

    metricReturns.textContent = formatCurrency(result.estimatedReturns);
    const returnPct = result.totalInvested > 0
      ? ((result.estimatedReturns / result.totalInvested) * 100).toFixed(1)
      : "0.0";
    metricXirrBadge.textContent = `+${returnPct}% Return`;
    metricCagrText.textContent = `${result.expectedCagr}% CAGR`;

    metricCorpus.textContent = formatCurrency(result.futureValue);
    metricYearBadge.textContent = `Year ${result.targetYear}`;

    donutCenterAmount.textContent = formatCurrency(result.monthlyInvestment);
  }

  function renderAllocationLegend(allocation) {
    allocationLegend.innerHTML = "";
    allocation.forEach((slice) => {
      const li = document.createElement("li");
      li.className = "legend-item";
      li.innerHTML = `
        <span class="legend-left">
          <span class="legend-dot" style="background:${slice.color}"></span>
          <span>
            <span class="legend-name" style="display:block;">${slice.label}</span>
            <span class="legend-desc">${slice.desc}</span>
          </span>
        </span>
        <span class="legend-value">${slice.pct}%</span>
      `;
      allocationLegend.appendChild(li);
    });
  }

  function renderAllocationChart(allocation) {
    const ctx = document.getElementById("allocationChart");
    const labels = allocation.map((a) => a.label);
    const data = allocation.map((a) => a.pct);
    const colors = allocation.map((a) => a.color);

    if (allocationChart) {
      allocationChart.data.labels = labels;
      allocationChart.data.datasets[0].data = data;
      allocationChart.data.datasets[0].backgroundColor = colors;
      allocationChart.update();
      return;
    }

    allocationChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: "#0f131b",
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1c2027",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            titleColor: "#dfe2ed",
            bodyColor: "#dfe2ed",
            padding: 10,
            callbacks: {
              label: (item) => ` ${item.label}: ${item.parsed}%`,
            },
          },
        },
      },
    });
  }

  function renderGrowthChart(growthSeries) {
    const ctx = document.getElementById("growthChart");
    const labels = growthSeries.map((p) => p.year);
    const invested = growthSeries.map((p) => p.invested);
    const value = growthSeries.map((p) => p.value);

    if (growthChart) {
      growthChart.data.labels = labels;
      growthChart.data.datasets[0].data = invested;
      growthChart.data.datasets[1].data = value;
      growthChart.update();
      return;
    }

    growthChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total Invested",
            data: invested,
            borderColor: "#4cd7f6",
            backgroundColor: "rgba(76,215,246,0.08)",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: true,
          },
          {
            label: "Projected Value",
            data: value,
            borderColor: "#4edea3",
            backgroundColor: "rgba(78,222,163,0.12)",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { color: "#9aa5ad", boxWidth: 10, font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: "#1c2027",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            titleColor: "#dfe2ed",
            bodyColor: "#dfe2ed",
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${formatCurrency(item.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#6b7680", font: { size: 10 } },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: "#6b7680",
              font: { size: 10 },
              callback: (v) => (v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : v),
            },
          },
        },
      },
    });
  }

  function renderResult(result) {
    renderSummaryCards(result);
    renderAllocationLegend(result.allocation);
    renderAllocationChart(result.allocation);
    renderGrowthChart(result.growthSeries);
  }

  /* =======================================================================
     4. FORM STATE HELPERS
     ======================================================================= */

  function setRiskCard(riskKey) {
    riskCards.forEach((card) => {
      const isActive = card.dataset.risk === riskKey;
      card.classList.toggle("active", isActive);
      card.setAttribute("aria-checked", String(isActive));
      if (isActive) {
        riskHiddenInput.value = card.dataset.risk;
        cagrHiddenInput.value = card.dataset.cagr;
      }
    });
  }

  function setPresetActive(amount) {
    presetBtns.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.amount) === amount);
    });
  }

  function updateHorizonDisplay() {
    const years = Number(horizonSlider.value);
    const startYear = new Date().getFullYear();
    horizonDisplay.textContent = `${years} Year${years > 1 ? "s" : ""} (${startYear} – ${startYear + years})`;
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearFormError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  /* =======================================================================
     5. EVENT WIRING
     ======================================================================= */

  riskCards.forEach((card) => {
    card.addEventListener("click", () => setRiskCard(card.dataset.risk));
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const amount = Number(btn.dataset.amount);
      monthlyInput.value = amount;
      setPresetActive(amount);
    });
  });

  monthlyInput.addEventListener("input", () => {
    setPresetActive(Number(monthlyInput.value));
  });

  horizonSlider.addEventListener("input", updateHorizonDisplay);

  tabAllocation.addEventListener("click", () => {
    tabAllocation.classList.add("active");
    tabGrowth.classList.remove("active");
    viewAllocation.hidden = false;
    viewGrowth.hidden = true;
  });

  tabGrowth.addEventListener("click", () => {
    tabGrowth.classList.add("active");
    tabAllocation.classList.remove("active");
    viewGrowth.hidden = false;
    viewAllocation.hidden = true;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // Never reload the page — Servlet call is async.
    clearFormError();

    const monthlyInvestment = Number(monthlyInput.value);
    const timeHorizonYears = Number(horizonSlider.value);
    const riskTolerance = riskHiddenInput.value;
    const expectedCagr = Number(cagrHiddenInput.value);

    if (!monthlyInvestment || monthlyInvestment < 500) {
      showFormError("Enter a monthly SIP amount of at least ₹500.");
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.querySelector("span:last-child").textContent = "Analyzing…";

    getPortfolioProjection({ monthlyInvestment, timeHorizonYears, riskTolerance, expectedCagr })
      .then(renderResult)
      .catch((err) => {
        console.error("ZenVest projection failed:", err);
        showFormError("Something went wrong while calculating your portfolio. Please try again.");
      })
      .finally(() => {
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector("span:last-child").textContent = "Analyze Portfolio";
      });
  });

  /* =======================================================================
     6. INIT — run an initial calculation on page load with default values
     ======================================================================= */

  function init() {
    updateHorizonDisplay();

    getPortfolioProjection({
      monthlyInvestment: Number(monthlyInput.value),
      timeHorizonYears: Number(horizonSlider.value),
      riskTolerance: riskHiddenInput.value,
      expectedCagr: Number(cagrHiddenInput.value),
    }).then(renderResult);
  }

  // Chart.js is loaded with `defer`, so DOMContentLoaded is enough to
  // guarantee `window.Chart` exists by the time init() runs.
  document.addEventListener("DOMContentLoaded", init);
})();
