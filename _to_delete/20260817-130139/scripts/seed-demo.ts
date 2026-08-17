/**
 * Seeds a realistic demo project (Marina Horizon Residences) with sample firm
 * branding, unit types, payment plan, comparables and financial assumptions,
 * then generates a sample PDF — so the app has something to look at on first run.
 *
 * Run with: npm run db:seed
 * Safe to re-run; each run adds a new demo project rather than overwriting.
 *
 * (Env vars come from `.env.local` via the `tsx --env-file` flag in the
 * `db:seed` npm script — a plain `import "dotenv/config"` here wouldn't work,
 * since ESM hoists all imports above this file's own top-level code, so
 * everything below would already have been evaluated against an empty env.)
 */
import { createDraftProject, saveProjectBundle, updateFirmSettings, insertGeneratedReport } from "../src/db/repo";
import { buildComputedReportData, renderReportHtml } from "../src/lib/pdf-template";
import { htmlToPdfBuffer } from "../src/lib/pdf-generate";
import { uploadPdf } from "../src/lib/pdf-storage";

async function main() {
  await updateFirmSettings({
    firmName: "Palm Coast Realty",
    agentName: "Sara Al Mansoori",
    agentTitle: "Senior Investment Consultant",
    agentPhone: "+971 50 123 4567",
    agentWhatsapp: "+971501234567",
    agentEmail: "sara@palmcoastrealty.ae",
    reraBrokerNumber: "12345",
    primaryColor: "#0B3B37",
    accentColor: "#C9A24B",
  });

  const id = await createDraftProject("Marina Horizon Residences");

  const bundle = await saveProjectBundle(id, {
    project: {
      name: "Marina Horizon Residences",
      developer: "Emaar Coastal Developments",
      area: "Dubai Maritime City",
      subLocation: "Waterfront District",
      description:
        "A landmark waterfront tower offering studio to 2-bedroom residences with direct marina access, resort-style amenities, and panoramic sea views — minutes from Downtown Dubai.",
      status: "off_plan",
      reraNumber: "DXB-RERA-98213",
      escrowBank: "Emirates NBD",
      handoverDate: "2028-06-01",
      launchDate: "2025-01-01",
      totalUnits: 420,
      amenities: ["Infinity Pool", "Private Beach Access", "Marina Promenade", "Kids Play Area", "Gym & Spa", "Co-working Lounge", "24/7 Concierge", "Retail Boulevard"],
      heroImageDataUrl: null,
      currency: "AED",
      goldenVisaEligible: true,
    },
    unitTypes: [
      { typeLabel: "Studio", sizeSqftMin: 420, sizeSqftMax: 460, priceFrom: 780000, priceTo: 850000, representativePrice: 810000, serviceChargePerSqft: 14 },
      { typeLabel: "1 Bedroom", sizeSqftMin: 720, sizeSqftMax: 780, priceFrom: 1200000, priceTo: 1350000, representativePrice: 1270000, serviceChargePerSqft: 15 },
      { typeLabel: "2 Bedroom", sizeSqftMin: 1100, sizeSqftMax: 1220, priceFrom: 1850000, priceTo: 2100000, representativePrice: 1950000, serviceChargePerSqft: 16 },
    ] as any,
    paymentMilestones: [
      { label: "On Booking", percent: 10, monthsFromLaunch: 0, triggerType: "booking" },
      { label: "1st Installment", percent: 10, monthsFromLaunch: 6, triggerType: "construction" },
      { label: "2nd Installment", percent: 10, monthsFromLaunch: 12, triggerType: "construction" },
      { label: "3rd Installment", percent: 10, monthsFromLaunch: 18, triggerType: "construction" },
      { label: "4th Installment", percent: 10, monthsFromLaunch: 24, triggerType: "construction" },
      { label: "On Handover", percent: 30, monthsFromLaunch: 30, triggerType: "handover" },
      { label: "Post-Handover (Yr 1)", percent: 20, monthsFromLaunch: 42, triggerType: "post_handover" },
    ] as any,
    comparableProjects: [
      {
        name: "Marina Gate Residences",
        area: "Dubai Marina",
        distanceKm: 2.1,
        priceHistory: [
          { year: 2021, pricePerSqft: 1450 },
          { year: 2022, pricePerSqft: 1580 },
          { year: 2023, pricePerSqft: 1720 },
          { year: 2024, pricePerSqft: 1890 },
        ],
        notes: "Comparable waterfront community, fully handed over.",
      },
      {
        name: "Bluewaters Bay",
        area: "Bluewaters Island",
        distanceKm: 4.5,
        priceHistory: [
          { year: 2021, pricePerSqft: 1600 },
          { year: 2022, pricePerSqft: 1750 },
          { year: 2023, pricePerSqft: 1980 },
          { year: 2024, pricePerSqft: 2150 },
        ],
        notes: "",
      },
    ] as any,
    financials: {
      projectionYears: 5,
      annualAppreciationPercent: 7.5,
      rentalYieldPercent: 7,
      rentGrowthPercent: 4,
      vacancyPercent: 5,
      loanEnabled: true,
      ltvPercent: 50,
      interestRatePercent: 4.25,
      tenureYears: 20,
      bankName: "Emirates NBD",
      dldFeePercent: 4,
      otherAcquisitionCostPercent: 2,
      exitYear: 5,
      exitSellingCostPercent: 4,
    },
  });

  console.log("Project created:", id);
  console.log("Unit types:", bundle.unitTypes.map((u) => u.typeLabel));

  const clientInfo: import("../src/lib/types").ReportClientInfo = {
    clientName: "Mr. Rajesh Kumar",
    clientPhone: "+91 98765 43210",
    clientEmail: "rajesh.kumar@example.com",
    focusUnitTypeId: bundle.unitTypes.find((u) => u.typeLabel === "1 Bedroom")!.id,
    clientType: "investor",
    flipExitYear: null,
  };

  const computed = buildComputedReportData(bundle, clientInfo);
  const html = renderReportHtml(bundle, clientInfo, computed);

  console.log("HTML length:", html.length);

  const pdfBuffer = await htmlToPdfBuffer(html);
  const fileName = `marina-horizon-demo-${Date.now()}.pdf`;
  const objectPath = `${id}/${fileName}`;
  await uploadPdf(objectPath, pdfBuffer);

  await insertGeneratedReport({
    projectId: id,
    clientName: clientInfo.clientName,
    clientPhone: clientInfo.clientPhone,
    clientEmail: clientInfo.clientEmail,
    focusUnitTypeId: clientInfo.focusUnitTypeId,
    snapshotJson: JSON.stringify({ bundle, clientInfo }),
    pdfFileName: objectPath,
  });

  console.log(`\nDemo project ready: "${bundle.project.name}"`);
  console.log(`Sample PDF uploaded to Supabase Storage at: ${objectPath} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
  console.log(`\nRun "npm run dev" and open http://localhost:3000 to see it in the dashboard.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
