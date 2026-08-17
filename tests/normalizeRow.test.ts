import { describe, it, expect } from "vitest";
import { normalizeRow } from "@/lib/import/normalizeRow";
import type { ColumnDetection } from "@/lib/import/detectColumns";

function mapping(sourceColumn: string, detectedField: string): ColumnDetection {
  return { sourceColumn, detectedField: detectedField as any, confidence: 0.9, method: "deterministic", sampleValues: [] };
}

describe("normalizeRow", () => {
  const mappings = [
    mapping("Cust_Name", "name"),
    mapping("Mob1", "phone"),
    mapping("Lead_Src", "lead_source"),
    mapping("Proj_Int", "interested_project"),
    mapping("Bgt", "budget"),
    mapping("Sales_Rem", "agent_notes"),
    mapping("Created_On", "lead_created_date"),
  ];

  it("normalizes a realistic CRM row end to end", () => {
    const row = {
      Cust_Name: "Ahmed Khan",
      Mob1: "0501234567",
      Lead_Src: "Facebook",
      Proj_Int: "Sobha Hartland, Dubai Hills",
      Bgt: "1.2M",
      Sales_Rem: "Indian investor. Looking south side. Wants 1BR.",
      Created_On: "2025-03-12",
    };
    const result = normalizeRow(row, mappings);
    expect(result.name).toBe("Ahmed Khan");
    expect(result.normalizedPhone).toBe("+971501234567");
    expect(result.source.platform).toBe("meta");
    expect(result.interestedProjects).toEqual(["Sobha Hartland", "Dubai Hills"]);
    expect(result.budget.max).toBe(1_200_000);
    expect(result.purpose).toBe("investment");
    expect(result.leadCreatedDate?.getFullYear()).toBe(2025);
  });

  it("handles missing/empty columns gracefully", () => {
    const result = normalizeRow({ Cust_Name: "Sarah" }, mappings);
    expect(result.name).toBe("Sarah");
    expect(result.normalizedPhone).toBe("");
    expect(result.budget.min).toBeNull();
  });

  it("infers readiness from timeline text", () => {
    const result = normalizeRow(
      { Sales_Rem: "Not interested now maybe after 3 months" },
      mappings
    );
    expect(["warm", "cold"]).toContain(result.purchaseReadiness);
  });
});
