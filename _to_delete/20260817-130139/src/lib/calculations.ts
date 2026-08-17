import {
  UnitTypeInput,
  PaymentMilestoneInput,
  ComparableProjectInput,
  FinancialAssumptionsInput,
} from "./types";
import { addMonths, format } from "date-fns";

/* -------------------------------------------------------------------------- */
/* Yearly investment projection                                               */
/* -------------------------------------------------------------------------- */

export interface YearlyProjectionRow {
  year: number;
  propertyValue: number;
  appreciationGainCumulative: number;
  annualGrossRent: number;
  annualServiceCharge: number;
  annualLoanInstallment: number;
  annualNetCashflow: number;
  cumulativeNetCashflow: number;
  totalReturnCumulative: number; // appreciation + cumulative net cashflow
  roiOnInvestmentPercent: number; // totalReturn / initial investment
}

export interface YearlyProjectionResult {
  rows: YearlyProjectionRow[];
  initialInvestment: number; // down payment + acquisition costs (or full price if cash)
  downPayment: number;
  loanAmount: number;
  acquisitionCosts: number;
}

/**
 * Builds a year-by-year projection of property value, rental income and
 * cashflow for a single unit type, given the project's financial assumptions.
 *
 * Rental yield is applied against the ORIGINAL purchase price (standard gross
 * yield convention), and rent itself grows at `rentGrowthPercent` per year.
 * Vacancy is deducted from gross rent before service charges/debt service.
 */
export function computeYearlyProjection(
  unit: UnitTypeInput,
  assumptions: FinancialAssumptionsInput
): YearlyProjectionResult {
  const price = unit.representativePrice || unit.priceFrom;
  const years = Math.max(1, assumptions.projectionYears);

  const loanAmount = assumptions.loanEnabled
    ? price * (assumptions.ltvPercent / 100)
    : 0;
  const downPayment = price - loanAmount;
  const acquisitionCosts =
    price *
    ((assumptions.dldFeePercent + assumptions.otherAcquisitionCostPercent) / 100);
  const initialInvestment = downPayment + acquisitionCosts;

  const amortization = assumptions.loanEnabled
    ? computeLoanAmortization(loanAmount, assumptions.interestRatePercent, assumptions.tenureYears)
    : null;
  const annualLoanInstallment = amortization ? amortization.monthlyInstallment * 12 : 0;

  const baseAnnualRent = price * (assumptions.rentalYieldPercent / 100);
  const annualServiceCharge = unit.sizeSqftMax || unit.sizeSqftMin
    ? ((unit.sizeSqftMax + unit.sizeSqftMin) / 2) * unit.serviceChargePerSqft
    : 0;

  const rows: YearlyProjectionRow[] = [];
  let propertyValue = price;
  let cumulativeNetCashflow = 0;

  for (let year = 1; year <= years; year++) {
    propertyValue = propertyValue * (1 + assumptions.annualAppreciationPercent / 100);
    const grossRent =
      baseAnnualRent * Math.pow(1 + assumptions.rentGrowthPercent / 100, year - 1);
    const effectiveRent = grossRent * (1 - assumptions.vacancyPercent / 100);
    const netCashflow = effectiveRent - annualServiceCharge - annualLoanInstallment;
    cumulativeNetCashflow += netCashflow;

    const appreciationGainCumulative = propertyValue - price;
    const totalReturnCumulative = appreciationGainCumulative + cumulativeNetCashflow;
    const roiOnInvestmentPercent =
      initialInvestment > 0 ? (totalReturnCumulative / initialInvestment) * 100 : 0;

    rows.push({
      year,
      propertyValue: round2(propertyValue),
      appreciationGainCumulative: round2(appreciationGainCumulative),
      annualGrossRent: round2(effectiveRent),
      annualServiceCharge: round2(annualServiceCharge),
      annualLoanInstallment: round2(annualLoanInstallment),
      annualNetCashflow: round2(netCashflow),
      cumulativeNetCashflow: round2(cumulativeNetCashflow),
      totalReturnCumulative: round2(totalReturnCumulative),
      roiOnInvestmentPercent: round2(roiOnInvestmentPercent),
    });
  }

  return {
    rows,
    initialInvestment: round2(initialInvestment),
    downPayment: round2(downPayment),
    loanAmount: round2(loanAmount),
    acquisitionCosts: round2(acquisitionCosts),
  };
}

/* -------------------------------------------------------------------------- */
/* Mortgage / loan amortization                                               */
/* -------------------------------------------------------------------------- */

export interface LoanAmortizationResult {
  loanAmount: number;
  monthlyInstallment: number;
  totalPayment: number;
  totalInterest: number;
  balanceAfterMonths: (months: number) => number;
}

/**
 * Standard reducing-balance mortgage amortization.
 */
export function computeLoanAmortization(
  loanAmount: number,
  annualInterestRatePercent: number,
  tenureYears: number
): LoanAmortizationResult {
  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const n = Math.max(1, Math.round(tenureYears * 12));

  const monthlyInstallment =
    monthlyRate === 0
      ? loanAmount / n
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1);

  const totalPayment = monthlyInstallment * n;
  const totalInterest = totalPayment - loanAmount;

  const balanceAfterMonths = (months: number): number => {
    const m = Math.min(Math.max(0, months), n);
    if (monthlyRate === 0) {
      return Math.max(0, loanAmount - monthlyInstallment * m);
    }
    const balance =
      loanAmount * Math.pow(1 + monthlyRate, m) -
      monthlyInstallment * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate);
    return Math.max(0, round2(balance));
  };

  return {
    loanAmount: round2(loanAmount),
    monthlyInstallment: round2(monthlyInstallment),
    totalPayment: round2(totalPayment),
    totalInterest: round2(totalInterest),
    balanceAfterMonths,
  };
}

/* -------------------------------------------------------------------------- */
/* Payment plan schedule                                                      */
/* -------------------------------------------------------------------------- */

export interface PaymentPlanScheduleRow {
  label: string;
  percent: number;
  amount: number;
  estimatedDate: string | null; // formatted date, or null if no launch date given
  triggerType: PaymentMilestoneInput["triggerType"];
}

export interface PaymentPlanScheduleResult {
  rows: PaymentPlanScheduleRow[];
  totalPercent: number;
  totalAmount: number;
  duringConstructionPercent: number;
  onHandoverAndAfterPercent: number;
}

export function computePaymentPlanSchedule(
  price: number,
  milestones: PaymentMilestoneInput[],
  launchDateISO: string | null
): PaymentPlanScheduleResult {
  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const launchDate = launchDateISO ? new Date(launchDateISO) : null;

  const rows: PaymentPlanScheduleRow[] = sorted.map((m) => ({
    label: m.label,
    percent: m.percent,
    amount: round2(price * (m.percent / 100)),
    estimatedDate:
      launchDate && !isNaN(launchDate.getTime())
        ? format(addMonths(launchDate, m.monthsFromLaunch), "MMM yyyy")
        : null,
    triggerType: m.triggerType,
  }));

  const totalPercent = round2(rows.reduce((s, r) => s + r.percent, 0));
  const totalAmount = round2(rows.reduce((s, r) => s + r.amount, 0));
  const duringConstructionPercent = round2(
    rows
      .filter((r) => r.triggerType === "booking" || r.triggerType === "construction")
      .reduce((s, r) => s + r.percent, 0)
  );
  const onHandoverAndAfterPercent = round2(
    rows
      .filter((r) => r.triggerType === "handover" || r.triggerType === "post_handover")
      .reduce((s, r) => s + r.percent, 0)
  );

  return { rows, totalPercent, totalAmount, duringConstructionPercent, onHandoverAndAfterPercent };
}

/* -------------------------------------------------------------------------- */
/* Exit / liquidity plan                                                      */
/* -------------------------------------------------------------------------- */

export interface ExitLiquidityResult {
  exitYear: number;
  projectedSalePrice: number;
  remainingLoanBalance: number;
  sellingCosts: number;
  netProceeds: number;
  totalCashReturnedIncludingRent: number; // netProceeds + cumulative net rent up to exit year
  moneyMultiple: number; // totalCashReturnedIncludingRent / initialInvestment
  annualizedReturnPercent: number; // CAGR-style, based on money multiple and years held
}

export function computeExitLiquidity(
  unit: UnitTypeInput,
  assumptions: FinancialAssumptionsInput,
  projection: YearlyProjectionResult
): ExitLiquidityResult {
  const exitYear = Math.min(
    Math.max(1, assumptions.exitYear),
    Math.max(1, assumptions.projectionYears)
  );
  const row = projection.rows.find((r) => r.year === exitYear) ?? projection.rows[projection.rows.length - 1];

  const projectedSalePrice = row.propertyValue;
  const sellingCosts = round2(projectedSalePrice * (assumptions.exitSellingCostPercent / 100));

  let remainingLoanBalance = 0;
  if (assumptions.loanEnabled && projection.loanAmount > 0) {
    const amortization = computeLoanAmortization(
      projection.loanAmount,
      assumptions.interestRatePercent,
      assumptions.tenureYears
    );
    remainingLoanBalance = amortization.balanceAfterMonths(exitYear * 12);
  }

  const netProceeds = round2(projectedSalePrice - sellingCosts - remainingLoanBalance);
  // netProceeds already represents the investor's full equity value at exit (original
  // down payment + principal paid down + appreciation - selling costs), so we do NOT
  // add initialInvestment again here — that would double-count the capital.
  const totalCashReturnedIncludingRent = round2(netProceeds + row.cumulativeNetCashflow);
  const moneyMultiple =
    projection.initialInvestment > 0
      ? round2(totalCashReturnedIncludingRent / projection.initialInvestment)
      : 0;
  const annualizedReturnPercent =
    moneyMultiple > 0 && exitYear > 0
      ? round2((Math.pow(moneyMultiple, 1 / exitYear) - 1) * 100)
      : 0;

  return {
    exitYear,
    projectedSalePrice,
    remainingLoanBalance,
    sellingCosts,
    netProceeds,
    totalCashReturnedIncludingRent,
    moneyMultiple,
    annualizedReturnPercent,
  };
}

/* -------------------------------------------------------------------------- */
/* Comparable project growth                                                  */
/* -------------------------------------------------------------------------- */

export interface ComparableGrowthResult {
  id: string;
  name: string;
  area: string;
  distanceKm: number;
  firstYear: number | null;
  lastYear: number | null;
  firstPricePerSqft: number | null;
  lastPricePerSqft: number | null;
  cagrPercent: number | null;
  series: { year: number; pricePerSqft: number }[];
}

export function computeComparableGrowth(
  comparable: ComparableProjectInput
): ComparableGrowthResult {
  const series = [...comparable.priceHistory].sort((a, b) => a.year - b.year);
  const first = series[0] ?? null;
  const last = series[series.length - 1] ?? null;

  let cagrPercent: number | null = null;
  if (first && last && first.pricePerSqft > 0 && last.year > first.year) {
    const years = last.year - first.year;
    cagrPercent = round2(
      (Math.pow(last.pricePerSqft / first.pricePerSqft, 1 / years) - 1) * 100
    );
  }

  return {
    id: comparable.id,
    name: comparable.name,
    area: comparable.area,
    distanceKm: comparable.distanceKm,
    firstYear: first?.year ?? null,
    lastYear: last?.year ?? null,
    firstPricePerSqft: first?.pricePerSqft ?? null,
    lastPricePerSqft: last?.pricePerSqft ?? null,
    cagrPercent,
    series,
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: string = "AED"): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}
