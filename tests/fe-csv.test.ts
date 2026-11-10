import { describe, it, expect } from "vitest";
import { escapeCsvCell, toCsvString } from "@/lib/csv";

describe("fe-csv: RFC-4180 escaping & formula injection mitigation", () => {
  it("escapes null, undefined, and simple values", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell(123)).toBe("123");
    expect(escapeCsvCell("Normal text")).toBe("Normal text");
  });

  it("neutralizes formula triggers (=, +, -, @)", () => {
    expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(escapeCsvCell("+12345")).toBe("'+12345");
    expect(escapeCsvCell("-50")).toBe("'-50");
    expect(escapeCsvCell("@hyperlink")).toBe("'@hyperlink");
  });

  it("escapes quotes, commas, and newlines per RFC-4180", () => {
    expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    expect(escapeCsvCell("One, Two")).toBe('"One, Two"');
    expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("converts rows to CSV string with headers", () => {
    const rows = [
      { id: 1, name: "Tank 1", pct: 65.2 },
      { id: 2, name: "Tank 2, East", pct: 18.0 },
    ];
    const csv = toCsvString(rows, ["id", "name", "pct"]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("id,name,pct");
    expect(lines[1]).toBe("1,Tank 1,65.2");
    expect(lines[2]).toBe('2,"Tank 2, East",18');
  });
});
