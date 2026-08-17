import { describe, it, expect } from "vitest";
import { detectColumns } from "@/lib/import/detectColumns";

// The exact example from the product spec: a CRM export with cryptic
// abbreviated headers that must map onto our canonical schema without any
// fixed template assumption.
describe("detectColumns — real-world abbreviated CRM headers", () => {
  const headers = ["Cust_Name", "Mob1", "Lead_Src", "Proj_Int", "Bgt", "Sales_Rem", "Created_On", "X_REF"];
  const samples: Record<string, string[]> = {
    Cust_Name: ["Ahmed Khan", "Sarah Malik"],
    Mob1: ["0501234567", "0559998888"],
    Lead_Src: ["Facebook", "Google"],
    Proj_Int: ["Sobha Hartland", "Dubai Hills"],
    Bgt: ["1.2M", "800K"],
    Sales_Rem: ["Indian investor looking south side", "Wants 2BR"],
    Created_On: ["2025-01-15", "2025-02-20"],
    X_REF: ["A9921", "B1023"],
  };

  const results = detectColumns(headers, samples);
  const byHeader = Object.fromEntries(results.map((r) => [r.sourceColumn, r]));

  it("maps Cust_Name -> name with high confidence", () => {
    expect(byHeader["Cust_Name"].detectedField).toBe("name");
    expect(byHeader["Cust_Name"].confidence).toBeGreaterThan(0.9);
  });

  it("maps Mob1 -> phone", () => {
    expect(byHeader["Mob1"].detectedField).toBe("phone");
  });

  it("maps Lead_Src -> lead_source", () => {
    expect(byHeader["Lead_Src"].detectedField).toBe("lead_source");
  });

  it("maps Proj_Int -> interested_project", () => {
    expect(byHeader["Proj_Int"].detectedField).toBe("interested_project");
  });

  it("maps Bgt -> budget", () => {
    expect(byHeader["Bgt"].detectedField).toBe("budget");
  });

  it("maps Sales_Rem -> agent_notes", () => {
    expect(byHeader["Sales_Rem"].detectedField).toBe("agent_notes");
  });

  it("maps Created_On -> lead_created_date", () => {
    expect(byHeader["Created_On"].detectedField).toBe("lead_created_date");
  });

  it("leaves a genuinely unknown column unmapped with low confidence rather than guessing", () => {
    expect(byHeader["X_REF"].detectedField).toBe("unmapped");
    expect(byHeader["X_REF"].confidence).toBeLessThan(0.4);
  });

  it("never silently drops a column — every header gets a detection entry", () => {
    expect(results.length).toBe(headers.length);
  });
});

describe("detectColumns — value inspection rescues an ambiguous header", () => {
  it("detects phone from cell values when the header itself is meaningless", () => {
    const results = detectColumns(["Field1"], {
      Field1: ["0501234567", "0559998888", "0521112233"],
    });
    expect(results[0].detectedField).toBe("phone");
    expect(results[0].method).toBe("value_inspection");
  });
});
