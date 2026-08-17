import { ProjectBundle, ReportClientInfo, UnitTypeInput } from "./types";
import {
  computeYearlyProjection,
  computeLoanAmortization,
  computePaymentPlanSchedule,
  computeExitLiquidity,
  computeComparableGrowth,
  formatMoney,
} from "./calculations";
import { barChart, lineChart, htmlLegend, horizontalStackedBar, donutChart, defaultTheme } from "./svg-charts";
import { format } from "date-fns";

export interface ComputedReportData {
  generatedOn: string;
  focusUnit: UnitTypeInput;
  unitComparisons: {
    unit: UnitTypeInput;
    projection: ReturnType<typeof computeYearlyProjection>;
    exit: ReturnType<typeof computeExitLiquidity>;
  }[];
  focusProjection: ReturnType<typeof computeYearlyProjection>;
  focusExit: ReturnType<typeof computeExitLiquidity>;
  focusAmortization: ReturnType<typeof computeLoanAmortization> | null;
  paymentPlan: ReturnType<typeof computePaymentPlanSchedule>;
  comparableGrowth: ReturnType<typeof computeComparableGrowth>[];
}

/**
 * Buyer types care about different exit horizons: an investor/end-user's
 * exit year comes from the project's own financial assumptions, but a flip
 * buyer plans to resell much sooner — so we build a shallow-cloned
 * assumptions object with the exit year overridden, rather than touching the
 * calculation engine itself. Clamped to at least 1 and at most the project's
 * configured projection length (computeExitLiquidity clamps again internally).
 */
function resolveExitAssumptions(
  financials: ProjectBundle["financials"],
  clientInfo: ReportClientInfo
): ProjectBundle["financials"] {
  if (clientInfo.clientType !== "flip") return financials;
  const requested = clientInfo.flipExitYear ?? 2;
  const exitYear = Math.min(Math.max(1, requested), Math.max(1, financials.projectionYears));
  return { ...financials, exitYear };
}

export function buildComputedReportData(
  bundle: ProjectBundle,
  clientInfo: ReportClientInfo
): ComputedReportData {
  const focusUnit =
    bundle.unitTypes.find((u) => u.id === clientInfo.focusUnitTypeId) ??
    bundle.unitTypes[0];

  const exitAssumptions = resolveExitAssumptions(bundle.financials, clientInfo);

  const unitComparisons = bundle.unitTypes.map((unit) => {
    const projection = computeYearlyProjection(unit, bundle.financials);
    const exit = computeExitLiquidity(unit, exitAssumptions, projection);
    return { unit, projection, exit };
  });

  const focusEntry = unitComparisons.find((c) => c.unit.id === focusUnit.id)!;
  const focusAmortization = bundle.financials.loanEnabled
    ? computeLoanAmortization(
        focusEntry.projection.loanAmount,
        bundle.financials.interestRatePercent,
        bundle.financials.tenureYears
      )
    : null;

  const paymentPlan = computePaymentPlanSchedule(
    focusUnit.representativePrice || focusUnit.priceFrom,
    bundle.paymentMilestones,
    bundle.project.launchDate
  );

  const comparableGrowth = bundle.comparableProjects.map(computeComparableGrowth);

  return {
    generatedOn: format(new Date(), "d MMMM yyyy"),
    focusUnit,
    unitComparisons,
    focusProjection: focusEntry.projection,
    focusExit: focusEntry.exit,
    focusAmortization,
    paymentPlan,
    comparableGrowth,
  };
}

export function renderReportHtml(
  bundle: ProjectBundle,
  clientInfo: ReportClientInfo,
  computed: ComputedReportData
): string {
  const { project, firm, financials } = bundle;
  const theme = { ...defaultTheme, primary: firm.primaryColor, accent: firm.accentColor };
  const currency = project.currency || "AED";
  const money = (n: number) => formatMoney(n, currency);

  const clientType = clientInfo.clientType ?? "investor";
  const lastProjectionRow = computed.focusProjection.rows[computed.focusProjection.rows.length - 1];
  const clientTypeCopy = {
    investor: {
      badge: "Buy-to-Let Investment Analysis",
      execSecondLabel: `Projected ${financials.projectionYears}-Yr ROI`,
      execSecondValue: `${lastProjectionRow.roiOnInvestmentPercent.toFixed(0)}%`,
      execThirdLabel: "Gross Rental Yield",
      execThirdValue: `${financials.rentalYieldPercent}%`,
      projectionLede: (unitLabel: string) =>
        `Projected value growth and rental returns for <b>${unitLabel}</b> over ${financials.projectionYears} years, assuming ${financials.annualAppreciationPercent}% annual appreciation and ${financials.rentalYieldPercent}% gross rental yield.`,
      exitTitle: "Exit Strategy & Liquidity Plan",
      exitLede: (year: number) => `Illustrative exit scenario if the investor sells in <b>Year ${year}</b>.`,
      exitFootnote: (year: number) =>
        `Investors are not obligated to exit at Year ${year} — this is one illustrative liquidity scenario. Secondary market resale, refinancing, or continued rental hold are all available strategies depending on market conditions at the time.`,
    },
    end_user: {
      badge: "Home Purchase Overview",
      execSecondLabel: "Est. Monthly Mortgage",
      execSecondValue: computed.focusAmortization ? money(computed.focusAmortization.monthlyInstallment) : "Full cash purchase",
      execThirdLabel: "Total Cost to Move In",
      execThirdValue: money(computed.focusProjection.initialInvestment),
      projectionLede: (unitLabel: string) =>
        `How the value of <b>${unitLabel}</b> is projected to grow over ${financials.projectionYears} years, alongside the ongoing mortgage and service charge costs of ownership.`,
      exitTitle: "Long-Term Value (If You Ever Decide to Sell)",
      exitLede: (year: number) =>
        `Most homeowners aren't buying to sell — but it helps to know your equity position. Here's an illustrative snapshot if you were to sell in <b>Year ${year}</b>.`,
      exitFootnote: (year: number) =>
        `This is shown for reference only — there's no need to plan an exit at Year ${year}. Your equity continues to build the longer you hold and live in the property.`,
    },
    flip: {
      badge: "Short-Term Resale Analysis",
      execSecondLabel: `Est. Resale Value (Yr ${computed.focusExit.exitYear})`,
      execSecondValue: money(computed.focusExit.projectedSalePrice),
      execThirdLabel: "Cash Needed to Start",
      execThirdValue: money(computed.focusProjection.initialInvestment),
      projectionLede: (unitLabel: string) =>
        `Short-horizon appreciation trajectory for <b>${unitLabel}</b> through the planned resale window — the numbers that matter most for a quick-turn strategy.`,
      exitTitle: "Quick-Turn Exit Scenario",
      exitLede: (year: number) =>
        `Illustrative resale scenario for a short-term exit around <b>Year ${year}</b>, well ahead of a long-hold timeline.`,
      exitFootnote: (year: number) =>
        `A resale before Year ${year} may be subject to developer resale restrictions (common before a set % of the price is paid) — please confirm the project's resale/assignment policy before committing to this timeline.`,
    },
  }[clientType];

  const amenitiesHtml = project.amenities.length
    ? project.amenities.map((a) => `<span class="chip">${escapeHtml(a)}</span>`).join("")
    : `<span class="muted">Details available on request</span>`;

  const unitTableRows = bundle.unitTypes
    .map(
      (u) => `
      <tr>
        <td>${escapeHtml(u.typeLabel)}</td>
        <td>${u.sizeSqftMin.toLocaleString()} - ${u.sizeSqftMax.toLocaleString()} sq.ft</td>
        <td>${money(u.priceFrom)} - ${money(u.priceTo)}</td>
        <td>${money(u.priceFrom / (u.sizeSqftMin || 1))}/sq.ft</td>
        <td>${money(u.serviceChargePerSqft)}/sq.ft/yr</td>
      </tr>`
    )
    .join("");

  // Flip buyers only care about the window through their planned resale year —
  // showing a full 5-10 year table/chart buries the number that matters to them.
  const displayProjectionRows =
    clientType === "flip"
      ? computed.focusProjection.rows.filter((r) => r.year <= computed.focusExit.exitYear)
      : computed.focusProjection.rows;

  const yearlyTableHead =
    clientType === "end_user"
      ? `<tr><th>Year</th><th>Property Value</th><th>Equity Gain</th><th>Annual Mortgage</th><th>Annual Service Charge</th></tr>`
      : `<tr><th>Year</th><th>Property Value</th><th>Appreciation Gain</th><th>Annual Rent</th><th>Net Cashflow</th><th>Cumulative ROI</th></tr>`;

  const yearlyRows = displayProjectionRows
    .map((r) =>
      clientType === "end_user"
        ? `
      <tr>
        <td>Year ${r.year}</td>
        <td>${money(r.propertyValue)}</td>
        <td class="pos">+${money(r.appreciationGainCumulative)}</td>
        <td>${money(r.annualLoanInstallment)}</td>
        <td>${money(r.annualServiceCharge)}</td>
      </tr>`
        : `
      <tr>
        <td>Year ${r.year}</td>
        <td>${money(r.propertyValue)}</td>
        <td class="pos">+${money(r.appreciationGainCumulative)}</td>
        <td>${money(r.annualGrossRent)}</td>
        <td>${money(r.annualNetCashflow)}</td>
        <td class="pos">${r.roiOnInvestmentPercent.toFixed(1)}%</td>
      </tr>`
    )
    .join("");

  const barChartSvg = barChart(
    displayProjectionRows.map((r) => ({ label: `Yr ${r.year}`, value: r.propertyValue })),
    { theme, valuePrefix: "" }
  );

  const unitComparisonCards = computed.unitComparisons
    .map((c) => {
      const lastRow = c.projection.rows[c.projection.rows.length - 1];
      return `
      <div class="stat-card">
        <div class="stat-card-label">${escapeHtml(c.unit.typeLabel)}</div>
        <div class="stat-card-value">${money(c.unit.representativePrice || c.unit.priceFrom)}</div>
        <div class="stat-card-sub">Entry price</div>
        <div class="stat-card-divider"></div>
        <div class="stat-card-row"><span>Value in Yr ${lastRow.year}</span><b>${money(lastRow.propertyValue)}</b></div>
        <div class="stat-card-row"><span>Total ROI</span><b class="pos">${lastRow.roiOnInvestmentPercent.toFixed(1)}%</b></div>
        <div class="stat-card-row"><span>Exit money multiple</span><b>${c.exit.moneyMultiple.toFixed(2)}x</b></div>
      </div>`;
    })
    .join("");

  const paymentPlanRows = computed.paymentPlan.rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.label)}</td>
        <td>${r.percent}%</td>
        <td>${money(r.amount)}</td>
        <td>${r.estimatedDate ?? "—"}</td>
      </tr>`
    )
    .join("");

  const paymentStackedBar = horizontalStackedBar(
    [
      { label: "During construction / booking", percent: computed.paymentPlan.duringConstructionPercent, color: theme.primary },
      { label: "On handover & after", percent: computed.paymentPlan.onHandoverAndAfterPercent, color: theme.accent },
    ],
    {}
  );

  const comparableRows = computed.comparableGrowth
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.name)}<div class="muted small">${escapeHtml(c.area)}${c.distanceKm ? ` · ${c.distanceKm} km away` : ""}</div></td>
        <td>${c.firstYear ?? "—"} → ${c.lastYear ?? "—"}</td>
        <td>${c.firstPricePerSqft ? money(c.firstPricePerSqft) : "—"} → ${c.lastPricePerSqft ? money(c.lastPricePerSqft) : "—"}</td>
        <td class="pos">${c.cagrPercent !== null ? c.cagrPercent.toFixed(1) + "% / yr" : "—"}</td>
      </tr>`
    )
    .join("");

  const comparableSeries = computed.comparableGrowth
    .filter((c) => c.series.length > 1)
    .map((c, i) => ({
      name: c.name,
      color: [theme.accent, "#7A8B99", "#B5654A", "#5A7D6A"][i % 4],
      points: c.series.map((p) => ({ x: p.year, y: (p.pricePerSqft / c.series[0].pricePerSqft) * 100 })),
    }));

  // Subject project's own implied index line, using the assumed annual appreciation rate,
  // anchored to the same start year as the earliest comparable (if any).
  if (comparableSeries.length) {
    const years = Array.from(new Set(comparableSeries.flatMap((s) => s.points.map((p) => p.x)))).sort();
    const startYear = years[0];
    const subjectPoints = years.map((y) => ({
      x: y,
      y: 100 * Math.pow(1 + financials.annualAppreciationPercent / 100, y - startYear),
    }));
    comparableSeries.push({ name: `${project.name} (projected)`, color: theme.primary, points: subjectPoints });
  }

  const comparableLineChart = comparableSeries.length
    ? lineChart(comparableSeries, { theme }) + htmlLegend(comparableSeries)
    : `<p class="muted">Add comparable projects to show a market growth comparison chart.</p>`;

  const loanDonut = financials.loanEnabled
    ? donutChart(
        [
          { label: "Down payment", value: computed.focusProjection.downPayment, color: theme.primary },
          { label: "Bank loan", value: computed.focusProjection.loanAmount, color: theme.accent },
        ],
        {}
      )
    : "";

  const goldenVisaBadge = project.goldenVisaEligible
    ? `<div class="badge">✨ Golden Visa Eligible — property value qualifies towards UAE's 10-year Golden Visa investor route</div>`
    : "";

  const heroStyle = project.heroImageDataUrl
    ? `background-image: linear-gradient(180deg, rgba(11,59,55,0.15), rgba(11,59,55,0.92)), url('${project.heroImageDataUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, ${theme.primary}, #133F3A);`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(project.name)} — Investment Report</title>
<style>
  ${baseCss(theme)}
</style>
</head>
<body>

  <section class="page cover" style="${heroStyle}">
    <div class="cover-top">
      ${firm.logoDataUrl ? `<img src="${firm.logoDataUrl}" class="logo" />` : `<div class="firm-name-cover">${escapeHtml(firm.firmName)}</div>`}
    </div>
    <div class="cover-mid">
      <div class="eyebrow">${clientTypeCopy.badge}</div>
      <h1>${escapeHtml(project.name)}</h1>
      <div class="cover-location">${escapeHtml(project.area)}${project.subLocation ? ", " + escapeHtml(project.subLocation) : ""} — Dubai, UAE</div>
      ${goldenVisaBadge}
    </div>
    <div class="cover-bottom">
      <div class="cover-row"><span>Prepared for</span><b>${escapeHtml(clientInfo.clientName || "Valued Investor")}</b></div>
      <div class="cover-row"><span>Prepared by</span><b>${escapeHtml(firm.agentName)} — ${escapeHtml(firm.firmName)}</b></div>
      <div class="cover-row"><span>Date</span><b>${computed.generatedOn}</b></div>
    </div>
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">Executive Summary</h2>
    <p class="lede">${escapeHtml(project.description) || `${escapeHtml(project.name)} presents a compelling investment opportunity in ${escapeHtml(project.area)}, one of Dubai's most sought-after growth corridors.`}</p>

    <div class="stat-grid">
      <div class="mini-stat"><div class="mini-stat-label">Starting Price</div><div class="mini-stat-value">${money(Math.min(...bundle.unitTypes.map((u) => u.priceFrom || Infinity)))}</div></div>
      <div class="mini-stat"><div class="mini-stat-label">${clientTypeCopy.execSecondLabel}</div><div class="mini-stat-value pos">${clientTypeCopy.execSecondValue}</div></div>
      <div class="mini-stat"><div class="mini-stat-label">${clientTypeCopy.execThirdLabel}</div><div class="mini-stat-value">${clientTypeCopy.execThirdValue}</div></div>
      <div class="mini-stat"><div class="mini-stat-label">Handover</div><div class="mini-stat-value">${project.handoverDate ? format(new Date(project.handoverDate), "MMM yyyy") : "TBC"}</div></div>
    </div>

    <div class="callout">
      <b>Why this project:</b> RERA-registered${project.reraNumber ? ` (No. ${escapeHtml(project.reraNumber)})` : ""}, funds held in an escrow account${project.escrowBank ? ` with ${escapeHtml(project.escrowBank)}` : ""}, developed by ${escapeHtml(project.developer) || "a reputable Dubai developer"}. Flexible payment plan and strong projected capital appreciation backed by comparable project performance in ${escapeHtml(project.area)}.
    </div>

    <h3 class="sub-title">Amenities & Lifestyle</h3>
    <div class="chip-row">${amenitiesHtml}</div>
    ${footer(firm, 1)}
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">Unit Types & Pricing</h2>
    <table class="table">
      <thead><tr><th>Unit Type</th><th>Size</th><th>Price Range</th><th>Price / sq.ft</th><th>Service Charge</th></tr></thead>
      <tbody>${unitTableRows}</tbody>
    </table>

    <h3 class="sub-title">Investment Potential by Unit Type</h3>
    <div class="card-grid">${unitComparisonCards}</div>
    ${footer(firm, 2)}
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">Payment Plan</h2>
    <p class="lede">Payment schedule shown for <b>${escapeHtml(computed.focusUnit.typeLabel)}</b> at ${money(computed.focusUnit.representativePrice || computed.focusUnit.priceFrom)}.</p>
    <div class="chart-wrap">${paymentStackedBar}</div>
    <table class="table">
      <thead><tr><th>Milestone</th><th>%</th><th>Amount</th><th>Estimated Date</th></tr></thead>
      <tbody>${paymentPlanRows}</tbody>
    </table>
    ${footer(firm, 3)}
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">Yearly Investment Projection</h2>
    <p class="lede">${clientTypeCopy.projectionLede(escapeHtml(computed.focusUnit.typeLabel))}</p>
    <div class="chart-wrap">${barChartSvg}</div>
    <table class="table small">
      <thead>${yearlyTableHead}</thead>
      <tbody>${yearlyRows}</tbody>
    </table>
    ${footer(firm, 4)}
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">Financing & Bank Loan Breakdown</h2>
    ${
      financials.loanEnabled && computed.focusAmortization
        ? `
    <div class="loan-layout">
      <div class="donut-wrap">${loanDonut}
        <div class="donut-legend">
          <div><span class="dot" style="background:${theme.primary}"></span>Down payment — ${money(computed.focusProjection.downPayment)}</div>
          <div><span class="dot" style="background:${theme.accent}"></span>Bank loan — ${money(computed.focusProjection.loanAmount)}</div>
        </div>
      </div>
      <div class="loan-stats">
        <div class="stat-card-row"><span>Bank</span><b>${escapeHtml(financials.bankName) || "To be selected"}</b></div>
        <div class="stat-card-row"><span>Loan-to-Value</span><b>${financials.ltvPercent}%</b></div>
        <div class="stat-card-row"><span>Interest Rate (indicative)</span><b>${financials.interestRatePercent}% p.a.</b></div>
        <div class="stat-card-row"><span>Tenure</span><b>${financials.tenureYears} years</b></div>
        <div class="stat-card-row"><span>Monthly Installment</span><b>${money(computed.focusAmortization.monthlyInstallment)}</b></div>
        <div class="stat-card-row"><span>Total Interest Over Tenure</span><b>${money(computed.focusAmortization.totalInterest)}</b></div>
        <div class="stat-card-row"><span>Acquisition Costs (DLD ${financials.dldFeePercent}% + other ${financials.otherAcquisitionCostPercent}%)</span><b>${money(computed.focusProjection.acquisitionCosts)}</b></div>
        <div class="stat-card-row total"><span>Total Cash Required to Start</span><b>${money(computed.focusProjection.initialInvestment)}</b></div>
      </div>
    </div>
    <p class="muted small">Indicative figures for illustration only. Final loan terms are subject to bank approval, applicant profile and UAE Central Bank mortgage regulations.</p>`
        : `<p class="lede">This projection assumes a full cash purchase of ${money(computed.focusProjection.initialInvestment)} (including acquisition costs).</p>`
    }
    ${footer(firm, 5)}
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">How Nearby Projects Are Growing</h2>
    <p class="lede">Historical price-per-sq.ft growth of comparable projects near ${escapeHtml(project.area)}, versus ${escapeHtml(project.name)}'s projected trajectory.</p>
    <div class="chart-wrap">${comparableLineChart}</div>
    ${
      computed.comparableGrowth.length
        ? `<table class="table"><thead><tr><th>Project</th><th>Period</th><th>Price / sq.ft</th><th>Annual Growth (CAGR)</th></tr></thead><tbody>${comparableRows}</tbody></table>`
        : ""
    }
    ${footer(firm, 6)}
  </section>

  <section class="page">
    ${header(firm, theme)}
    <h2 class="section-title">${clientTypeCopy.exitTitle}</h2>
    <p class="lede">${clientTypeCopy.exitLede(computed.focusExit.exitYear)}</p>
    <div class="exit-grid">
      <div class="mini-stat"><div class="mini-stat-label">Projected Sale Price</div><div class="mini-stat-value">${money(computed.focusExit.projectedSalePrice)}</div></div>
      <div class="mini-stat"><div class="mini-stat-label">Remaining Loan Balance</div><div class="mini-stat-value">${money(computed.focusExit.remainingLoanBalance)}</div></div>
      <div class="mini-stat"><div class="mini-stat-label">Selling Costs</div><div class="mini-stat-value">${money(computed.focusExit.sellingCosts)}</div></div>
      <div class="mini-stat"><div class="mini-stat-label">Net Proceeds</div><div class="mini-stat-value pos">${money(computed.focusExit.netProceeds)}</div></div>
    </div>
    <div class="callout">
      Combining net sale proceeds with cumulative rental income collected over the holding period, the total projected cash return is <b>${money(computed.focusExit.totalCashReturnedIncludingRent)}</b> on an initial investment of <b>${money(computed.focusProjection.initialInvestment)}</b> — a <b class="pos">${computed.focusExit.moneyMultiple.toFixed(2)}x</b> money multiple, or approximately <b class="pos">${computed.focusExit.annualizedReturnPercent.toFixed(1)}% annualized return</b>.
    </div>
    <p class="muted small">${clientTypeCopy.exitFootnote(computed.focusExit.exitYear)}</p>
    ${footer(firm, 7)}
  </section>

  <section class="page contact-page" style="background: linear-gradient(160deg, ${theme.primary}, #0A2E2A);">
    ${firm.logoDataUrl ? `<img src="${firm.logoDataUrl}" class="logo light" />` : `<div class="firm-name-cover light">${escapeHtml(firm.firmName)}</div>`}
    <h2 class="contact-title">Ready to Secure Your Unit?</h2>
    <p class="contact-lede">Contact ${escapeHtml(firm.agentName)} today to reserve ${escapeHtml(project.name)} before prices move to the next payment milestone.</p>
    <div class="contact-grid">
      <div><span>Agent</span><b>${escapeHtml(firm.agentName)}${firm.agentTitle ? ` — ${escapeHtml(firm.agentTitle)}` : ""}</b></div>
      <div><span>Phone</span><b>${escapeHtml(firm.agentPhone)}</b></div>
      <div><span>WhatsApp</span><b>${escapeHtml(firm.agentWhatsapp)}</b></div>
      <div><span>Email</span><b>${escapeHtml(firm.agentEmail)}</b></div>
      ${firm.reraBrokerNumber ? `<div><span>RERA Broker No.</span><b>${escapeHtml(firm.reraBrokerNumber)}</b></div>` : ""}
    </div>
    <div class="disclaimer">${escapeHtml(firm.disclaimerText)}</div>
  </section>

</body>
</html>`;
}

function header(firm: ProjectBundle["firm"], theme: { primary: string; accent: string }) {
  return `
  <div class="page-header">
    ${firm.logoDataUrl ? `<img src="${firm.logoDataUrl}" class="logo-sm" />` : `<div class="firm-name-sm">${escapeHtml(firm.firmName)}</div>`}
    <div class="page-header-rule"></div>
  </div>`;
}

function footer(firm: ProjectBundle["firm"], pageNum: number) {
  return `
  <div class="page-footer">
    <span>${escapeHtml(firm.agentName)} · ${escapeHtml(firm.agentPhone)} · ${escapeHtml(firm.agentEmail)}</span>
    <span>Page ${pageNum}</span>
  </div>`;
}

function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseCss(theme: { primary: string; accent: string; grid: string; text: string; muted: string }) {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: ${theme.text};
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 794px;
    min-height: 1123px;
    padding: 40px 48px 56px;
    position: relative;
    page-break-after: always;
    background: #FFFFFF;
  }
  .page:last-child { page-break-after: auto; }

  .cover { color: #fff; display: flex; flex-direction: column; justify-content: space-between; padding: 48px; }
  .cover-top { display: flex; }
  .logo { max-height: 46px; }
  .firm-name-cover { font-size: 20px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .cover-mid { margin-top: 260px; }
  .eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px; opacity: 0.85; margin-bottom: 10px; }
  .cover h1 { font-size: 44px; margin: 0 0 8px; font-weight: 700; line-height: 1.1; }
  .cover-location { font-size: 16px; opacity: 0.92; margin-bottom: 16px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.4); border-radius: 999px; padding: 6px 14px; font-size: 12px; margin-top: 8px; }
  .cover-bottom { border-top: 1px solid rgba(255,255,255,0.3); padding-top: 16px; display: flex; flex-direction: column; gap: 6px; }
  .cover-row { display: flex; justify-content: space-between; font-size: 12.5px; }
  .cover-row span { opacity: 0.75; }

  .page-header { margin-bottom: 22px; }
  .logo-sm { max-height: 26px; }
  .firm-name-sm { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${theme.primary}; }
  .page-header-rule { height: 3px; background: linear-gradient(90deg, ${theme.primary}, ${theme.accent}); margin-top: 8px; border-radius: 2px; }

  .section-title { font-size: 24px; color: ${theme.primary}; margin: 0 0 14px; font-weight: 700; }
  .sub-title { font-size: 16px; color: ${theme.primary}; margin: 22px 0 10px; font-weight: 700; }
  .lede { font-size: 13.5px; line-height: 1.6; color: ${theme.text}; margin-bottom: 16px; }
  .muted { color: ${theme.muted}; }
  .small { font-size: 11px; }
  .pos { color: #1E7A4C; }

  .callout { background: #F7F4EC; border-left: 4px solid ${theme.accent}; padding: 14px 18px; border-radius: 6px; font-size: 12.5px; line-height: 1.6; margin: 14px 0; }

  .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { background: #F1F5F3; border: 1px solid ${theme.grid}; border-radius: 999px; padding: 6px 12px; font-size: 11.5px; }

  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
  .mini-stat { background: #F7F4EC; border-radius: 10px; padding: 14px; }
  .mini-stat-label { font-size: 10.5px; color: ${theme.muted}; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
  .mini-stat-value { font-size: 17px; font-weight: 700; color: ${theme.primary}; }

  .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: ${theme.muted}; border-bottom: 2px solid ${theme.grid}; padding: 8px 10px; }
  .table td { padding: 9px 10px; border-bottom: 1px solid ${theme.grid}; font-size: 12.5px; }
  .table.small td, .table.small th { font-size: 11.5px; padding: 7px 8px; }

  .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
  .stat-card { border: 1px solid ${theme.grid}; border-radius: 10px; padding: 14px; }
  .stat-card-label { font-size: 12px; font-weight: 700; color: ${theme.primary}; }
  .stat-card-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .stat-card-sub { font-size: 10.5px; color: ${theme.muted}; }
  .stat-card-divider { height: 1px; background: ${theme.grid}; margin: 10px 0; }
  .stat-card-row { display: flex; justify-content: space-between; font-size: 11.5px; padding: 3px 0; }
  .stat-card-row.total { border-top: 1px solid ${theme.grid}; margin-top: 6px; padding-top: 8px; font-size: 13px; }

  .chart-wrap { margin: 14px 0; }

  .loan-layout { display: flex; gap: 28px; align-items: center; margin-top: 10px; }
  .donut-wrap { text-align: center; flex-shrink: 0; }
  .donut-legend { margin-top: 10px; font-size: 11.5px; display: flex; flex-direction: column; gap: 4px; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
  .loan-stats { flex: 1; }

  .exit-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }

  .page-footer { position: absolute; bottom: 24px; left: 48px; right: 48px; display: flex; justify-content: space-between; font-size: 10px; color: ${theme.muted}; border-top: 1px solid ${theme.grid}; padding-top: 8px; }

  .contact-page { color: #fff; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 64px; }
  .light { filter: brightness(0) invert(1); }
  .firm-name-cover.light { color: #fff; }
  .contact-title { font-size: 32px; margin: 28px 0 10px; font-weight: 700; }
  .contact-lede { font-size: 14px; opacity: 0.9; max-width: 480px; margin-bottom: 28px; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; max-width: 480px; }
  .contact-grid div { display: flex; flex-direction: column; gap: 2px; }
  .contact-grid span { font-size: 10.5px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.04em; }
  .contact-grid b { font-size: 13.5px; }
  .disclaimer { margin-top: 48px; font-size: 9.5px; opacity: 0.65; line-height: 1.6; max-width: 560px; }
  `;
}
