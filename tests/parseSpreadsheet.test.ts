import { describe, it, expect } from "vitest";
import { parseSpreadsheet } from "@/lib/import/parseSpreadsheet";

const CSV_SAMPLE = `Cust_Name,Mob1,Lead_Src,Bgt
Ahmed Khan,0501234567,Facebook,1.2M
Sarah Malik,0559998888,Google,800K
`;

describe("parseSpreadsheet — CSV", () => {
  it("parses headers and rows", () => {
    const result = parseSpreadsheet(Buffer.from(CSV_SAMPLE), "leads.csv", "text/csv");
    expect(result.fileType).toBe("csv");
    expect(result.sheets).toHaveLength(1);
    const sheet = result.sheets[0];
    expect(sheet.headers).toEqual(["Cust_Name", "Mob1", "Lead_Src", "Bgt"]);
    expect(sheet.rowCount).toBe(2);
    expect(sheet.rows[0]["Cust_Name"]).toBe("Ahmed Khan");
  });

  it("throws a clear error on an empty file", () => {
    expect(() => parseSpreadsheet(Buffer.from(""), "empty.csv", "text/csv")).toThrow();
  });

  it("skips a leading title row and finds the real header", () => {
    const csvWithTitle = `My Agency Lead Export\n\nCust_Name,Mob1,Bgt\nAhmed,0501234567,1M\n`;
    const result = parseSpreadsheet(Buffer.from(csvWithTitle), "leads.csv", "text/csv");
    expect(result.sheets[0].headers).toContain("Cust_Name");
  });

  it("detects duplicate and empty columns", () => {
    const csv = `Name,Phone,Phone,Notes\nAhmed,050,051,\nSarah,052,053,\n`;
    const result = parseSpreadsheet(Buffer.from(csv), "leads.csv", "text/csv");
    const sheet = result.sheets[0];
    expect(sheet.headers).toContain("Phone (2)");
    expect(sheet.emptyColumns).toContain("Notes");
  });
});
