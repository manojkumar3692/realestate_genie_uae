/**
 * Seeds a realistic demo agency so the product is understandable immediately
 * after setup — a messy synthetic CRM export run through the real import
 * pipeline (not hand-inserted rows), plus a few demo projects with matching
 * already run. Safe to re-run: skips generation if the demo org already has
 * customers.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { organizations, users, customers } from "../src/db/schema";
import { newId } from "../src/lib/id";
import { hashPassword } from "../src/lib/auth/password";
import { detectColumns } from "../src/lib/import/detectColumns";
import {
  createImportJob,
  storeRawImportRows,
  saveColumnMappings,
  runImportPipeline,
} from "../src/db/repo";
import { runAiEnrichmentForImport, runMatchingForProject } from "../src/db/repoMatching";
import { createProject } from "../src/db/repoProjects";

const DEMO_EMAIL = "demo@realestategenie.local";
const DEMO_PASSWORD = "demo12345";
const ROW_COUNT = 600;

const FIRST_NAMES = [
  "Ahmed", "Rahul", "Sarah", "Mohammed", "Priya", "John", "Fatima", "Imran", "Elena", "David",
  "Aisha", "Rajesh", "Layla", "Omar", "Anjali", "Hassan", "Natasha", "Yusuf", "Meera", "Khalid",
  "Sofia", "Arjun", "Noor", "Michael", "Divya", "Bilal", "Olga", "Zainab", "Vikram", "Grace",
];
const LAST_NAMES = [
  "Khan", "Sharma", "Malik", "Al Mansoori", "Patel", "Smith", "Hussain", "Ivanova", "Ali", "Nair",
  "Ahmed", "Gupta", "Rashid", "Petrov", "Fernandes", "Siddiqui", "Kapoor", "Johnson", "Qureshi", "Rao",
];
const NATIONALITIES = ["Indian", "British", "Emirati", "Pakistani", "Russian", "Egyptian", "Filipino", "French", "Nigerian", "Chinese"];
const LOCATIONS = ["JVC", "Dubai South", "Arjan", "Business Bay", "Dubai Marina", "Dubai Hills", "Sobha Hartland", "JLT", "Al Furjan", "Dubailand", "Downtown Dubai"];
const SOURCES = ["Facebook", "FB", "Meta Lead Ads", "Instagram", "Google Ads", "Bayut", "Property Finder", "Referral", "Website", ""];
const CAMPAIGNS = ["JVC Investors March 2025", "Dubai South Launch Q1", "Investor Retargeting", "Ready Homes Push", "", "", ""];
const BEDROOMS = ["Studio", "1BR", "1BR", "2BR", "2BR", "3BR"];
const PROPERTY_TYPES = ["Apartment", "Apartment", "Apartment", "Townhouse", "Villa"];
const PURPOSES = ["Investment", "Investment", "End use", "Investment", ""];
const TIMELINES = ["1-3 months", "3-6 months", "6-12 months", "Not sure yet", ""];
const PAYMENT_PREFS = ["Wants low upfront payment", "Flexible payment plan preferred", "Cash buyer", ""];
const STATUSES = ["New", "Contacted", "Lost", "Lost", "New", "Contacted"];
const LOST_REASONS = ["Too expensive", "Payment plan not good", "Wanted ready property", "Went cold", "", "", ""];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPhone(): string {
  const prefixes = ["50", "52", "54", "55", "56", "58"];
  const num = `${pick(prefixes)}${randomInt(1000000, 9999999)}`;
  const style = randomInt(0, 3);
  if (style === 0) return `0${num}`;
  if (style === 1) return `+971${num}`;
  if (style === 2) return `971${num}`;
  return `0${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
}
function randomBudgetText(): string {
  const styles = [
    () => `${randomInt(6, 20) * 100}K`,
    () => `${(randomInt(8, 30) / 10).toFixed(1)}M`,
    () => `AED ${(randomInt(700, 2500) * 1000).toLocaleString()}`,
    () => `${randomInt(6, 15) * 100}K - ${randomInt(16, 25) * 100}K`,
    () => `under ${randomInt(8, 15) * 100}k`,
    () => `can stretch to ${(randomInt(10, 18) / 10).toFixed(1)}m if good payment plan`,
  ];
  return pick(styles)();
}
function randomDate(monthsAgoMax: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, monthsAgoMax * 30));
  return d.toISOString().slice(0, 10);
}
function buildNote(nationality: string, location: string, budget: string, bedroom: string, objection: string): string {
  const templates = [
    `${nationality} investor. Looking ${location} side. ${budget} ideally. Wants ${bedroom}. ${objection ? `Previously said: "${objection}".` : ""}`,
    `Client is interested in ${bedroom} units around ${location}. Budget roughly ${budget}. Investment purpose, wants good rental yield.`,
    `Spoke on WhatsApp — ${nationality} buyer, mentioned budget ${budget}, prefers ${location} or similar community. ${objection ? `Objection: ${objection}.` : "No objections raised yet."}`,
    `${nationality} family looking to buy ${bedroom} for own use near ${location}. Not in a rush, timeline flexible.`,
    "",
  ];
  return pick(templates);
}

async function main() {
  const existingUser = await db.query.users.findFirst({ where: eq(users.normalizedEmail, DEMO_EMAIL) });
  let orgId: string;
  let userId: string;

  if (existingUser) {
    orgId = existingUser.orgId;
    userId = existingUser.id;
    console.log(`Demo account already exists (${DEMO_EMAIL}).`);
  } else {
    orgId = newId("org");
    await db.insert(organizations).values({ id: orgId, name: "Skyline Properties (Demo)" });
    userId = newId("user");
    await db.insert(users).values({
      id: userId,
      orgId,
      email: DEMO_EMAIL,
      normalizedEmail: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: "Demo Agent",
      role: "admin",
    });
    console.log(`Created demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }

  const existingCustomerCount = await db.$count(customers, eq(customers.orgId, orgId));
  if (existingCustomerCount > 0) {
    console.log(`Demo org already has ${existingCustomerCount} customers — skipping data generation (safe re-run).`);
    console.log(`Log in at /login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    process.exit(0);
  }

  console.log(`Generating ${ROW_COUNT} synthetic messy CRM rows…`);
  const headers = [
    "Cust_Name", "Mob1", "Email", "Nationality", "Lead_Src", "Campaign", "Proj_Int",
    "Preferred_Location", "Bgt", "Bedrooms", "Property_Type", "Purpose", "Timeline",
    "Payment_Pref", "Status", "Lost_Reason", "Sales_Rem", "Created_On", "Last_Contact",
  ];
  const rows: Record<string, string>[] = [];
  const usedPhones: string[] = [];

  for (let i = 0; i < ROW_COUNT; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const nationality = pick(NATIONALITIES);
    const location = pick(LOCATIONS);
    const budget = randomBudgetText();
    const bedroom = pick(BEDROOMS);
    const objection = pick(LOST_REASONS);
    const leadDate = randomDate(30);

    // ~6% of rows are intentional duplicates of an earlier phone (same lead re-entered by another agent).
    const isDuplicate = i > 20 && Math.random() < 0.06 && usedPhones.length > 0;
    const phone = isDuplicate ? pick(usedPhones) : randomPhone();
    if (!isDuplicate) usedPhones.push(phone);

    rows.push({
      Cust_Name: isDuplicate ? name : name, // duplicates may have a slightly different name spelling in real life; kept simple here
      Mob1: phone,
      Email: Math.random() < 0.6 ? `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, "")}${i}@example.com` : "",
      Nationality: nationality,
      Lead_Src: pick(SOURCES),
      Campaign: pick(CAMPAIGNS),
      Proj_Int: pick(["Sobha Hartland", "Dubai Hills Views", "Marina Horizon", "", ""]),
      Preferred_Location: location,
      Bgt: budget,
      Bedrooms: bedroom,
      Property_Type: pick(PROPERTY_TYPES),
      Purpose: pick(PURPOSES),
      Timeline: pick(TIMELINES),
      Payment_Pref: pick(PAYMENT_PREFS),
      Status: pick(STATUSES),
      Lost_Reason: objection,
      Sales_Rem: buildNote(nationality, location, budget, bedroom, objection),
      Created_On: leadDate,
      Last_Contact: Math.random() < 0.7 ? randomDate(18) : "",
    });
  }

  const importJobId = await createImportJob({
    orgId,
    createdBy: userId,
    fileName: "demo-crm-export.csv",
    fileType: "csv",
    sheetName: "Sheet1",
    headerRowIndex: 0,
    rowCount: rows.length,
  });
  await storeRawImportRows(importJobId, rows);

  const columnSamples: Record<string, string[]> = {};
  for (const h of headers) columnSamples[h] = rows.slice(0, 10).map((r) => r[h]).filter(Boolean);
  const detections = detectColumns(headers, columnSamples);
  await saveColumnMappings(importJobId, detections);

  console.log("Running the real import pipeline (normalize, dedupe, build timelines)…");
  const stats = await runImportPipeline(orgId, importJobId, detections);
  console.log(stats);

  console.log("Running AI enrichment (no-op if OPENAI_API_KEY isn't set — deterministic layer still works)…");
  await runAiEnrichmentForImport(importJobId, orgId);

  console.log("Creating demo projects…");
  const azuraId = await createProject({
    orgId,
    createdBy: userId,
    name: "Azura Residences",
    developer: "Meraas",
    city: "Dubai",
    community: "Dubai South",
    location: "Dubai South",
    nearbyAreas: ["Arjan"],
    propertyTypes: ["Apartment"],
    bedroomTypes: ["Studio", "1BR", "2BR"],
    startingPrice: 750_000,
    maxPrice: 1_450_000,
    currency: "AED",
    paymentPlanSummary: "20/50/30 — 20% down, 50% during construction, 30% on handover",
    downPaymentPercent: 20,
    constructionStatus: "off_plan",
    expectedHandover: "Q4 2029",
    expectedRentalYieldPercent: 7.2,
    expectedAppreciationPercent: 6,
    targetBuyerType: "investor",
    freeholdStatus: true,
    amenities: ["Infinity pool", "Co-working lounge", "Retail podium", "Near Al Maktoum Airport"],
    sellingPoints: ["Low initial payment", "Near airport", "Affordable entry point"],
    notes: "Demo seed project from the product spec's own example.",
    rawPastedText: "",
    unitTypes: [
      { typeLabel: "Studio", bedrooms: 0, sizeSqftMin: 380, sizeSqftMax: 420, priceFrom: 750_000, priceTo: 820_000 },
      { typeLabel: "1BR", bedrooms: 1, sizeSqftMin: 650, sizeSqftMax: 750, priceFrom: 995_000, priceTo: 1_150_000 },
      { typeLabel: "2BR", bedrooms: 2, sizeSqftMin: 950, sizeSqftMax: 1100, priceFrom: 1_250_000, priceTo: 1_450_000 },
    ],
  });

  const hillsId = await createProject({
    orgId,
    createdBy: userId,
    name: "Dubai Hills Grove",
    developer: "Emaar",
    city: "Dubai",
    community: "Dubai Hills Estate",
    location: "Dubai Hills Estate",
    nearbyAreas: ["Sobha Hartland"],
    propertyTypes: ["Apartment"],
    bedroomTypes: ["1BR", "2BR", "3BR"],
    startingPrice: 1_150_000,
    maxPrice: 2_600_000,
    currency: "AED",
    paymentPlanSummary: "10/70/20 post-handover flexible plan",
    downPaymentPercent: 10,
    constructionStatus: "off_plan",
    expectedHandover: "Q2 2028",
    expectedRentalYieldPercent: 6.1,
    expectedAppreciationPercent: 8,
    targetBuyerType: "both",
    freeholdStatus: true,
    amenities: ["Golf course views", "Community park", "International school nearby"],
    sellingPoints: ["Premium community", "Flexible post-handover plan", "Strong appreciation track record"],
    notes: "",
    rawPastedText: "",
    unitTypes: [
      { typeLabel: "1BR", bedrooms: 1, sizeSqftMin: 700, sizeSqftMax: 780, priceFrom: 1_150_000, priceTo: 1_350_000 },
      { typeLabel: "2BR", bedrooms: 2, sizeSqftMin: 1050, sizeSqftMax: 1200, priceFrom: 1_700_000, priceTo: 2_000_000 },
      { typeLabel: "3BR", bedrooms: 3, sizeSqftMin: 1500, sizeSqftMax: 1700, priceFrom: 2_200_000, priceTo: 2_600_000 },
    ],
  });

  console.log("Running the matching engine for both demo projects…");
  const azuraSummary = await runMatchingForProject(azuraId, orgId, userId);
  const hillsSummary = await runMatchingForProject(hillsId, orgId, userId);
  console.log("Azura Residences:", azuraSummary);
  console.log("Dubai Hills Grove:", hillsSummary);

  console.log("\nDone. Log in with:");
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
