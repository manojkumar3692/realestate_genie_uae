"use client";

import { FinancialAssumptionsInput } from "@/lib/types";
import { Field, TextInput, NumberInput } from "./formFields";

export default function StepFinancials({
  financials,
  onChange,
}: {
  financials: FinancialAssumptionsInput;
  onChange: (patch: Partial<FinancialAssumptionsInput>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-primary">Financial Assumptions</h2>
        <p className="text-sm text-brand-muted mt-1">
          These drive every projection, ROI figure and chart in the PDF. Defaults are sensible for Dubai — adjust as needed.
        </p>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-brand-primary mb-3">Growth & Rental</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Projection Horizon (years)">
            <NumberInput value={financials.projectionYears} onChange={(v) => onChange({ projectionYears: v })} min={1} max={15} />
          </Field>
          <Field label="Annual Appreciation (%)">
            <NumberInput value={financials.annualAppreciationPercent} onChange={(v) => onChange({ annualAppreciationPercent: v })} step="0.1" />
          </Field>
          <Field label="Gross Rental Yield (%)">
            <NumberInput value={financials.rentalYieldPercent} onChange={(v) => onChange({ rentalYieldPercent: v })} step="0.1" />
          </Field>
          <Field label="Annual Rent Growth (%)">
            <NumberInput value={financials.rentGrowthPercent} onChange={(v) => onChange({ rentGrowthPercent: v })} step="0.1" />
          </Field>
          <Field label="Vacancy Allowance (%)">
            <NumberInput value={financials.vacancyPercent} onChange={(v) => onChange({ vacancyPercent: v })} step="0.5" />
          </Field>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-semibold text-brand-primary">Bank Financing</h3>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={financials.loanEnabled}
              onChange={(e) => onChange({ loanEnabled: e.target.checked })}
              className="w-3.5 h-3.5 accent-[var(--brand-primary)]"
            />
            Buyer takes a mortgage
          </label>
        </div>
        {financials.loanEnabled && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Bank Name">
              <TextInput value={financials.bankName} onChange={(e) => onChange({ bankName: e.target.value })} placeholder="e.g. Emirates NBD" />
            </Field>
            <Field label="Loan-to-Value (%)">
              <NumberInput value={financials.ltvPercent} onChange={(v) => onChange({ ltvPercent: v })} />
            </Field>
            <Field label="Interest Rate (% p.a.)">
              <NumberInput value={financials.interestRatePercent} onChange={(v) => onChange({ interestRatePercent: v })} step="0.05" />
            </Field>
            <Field label="Tenure (years)">
              <NumberInput value={financials.tenureYears} onChange={(v) => onChange({ tenureYears: v })} />
            </Field>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-primary mb-3">Acquisition Costs</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="DLD Transfer Fee (%)">
            <NumberInput value={financials.dldFeePercent} onChange={(v) => onChange({ dldFeePercent: v })} step="0.1" />
          </Field>
          <Field label="Other Costs (admin, agency, etc.) (%)">
            <NumberInput value={financials.otherAcquisitionCostPercent} onChange={(v) => onChange({ otherAcquisitionCostPercent: v })} step="0.1" />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-brand-primary mb-3">Exit / Liquidity</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Illustrative Exit Year">
            <NumberInput value={financials.exitYear} onChange={(v) => onChange({ exitYear: v })} min={1} max={financials.projectionYears} />
          </Field>
          <Field label="Selling Costs at Exit (%)">
            <NumberInput value={financials.exitSellingCostPercent} onChange={(v) => onChange({ exitSellingCostPercent: v })} step="0.1" />
          </Field>
        </div>
      </section>
    </div>
  );
}
