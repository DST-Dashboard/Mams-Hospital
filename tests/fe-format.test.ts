import { describe, expect, it } from "vitest";
import {
  ago,
  cm,
  dayKey,
  dayLabel,
  fmt1,
  fmtCm,
  fmtDbm,
  fmtFill,
  fmtLitres,
  fmtSnr,
  litres,
  pct,
  stamp,
  stampSeconds,
} from "../src/lib/format";

describe("fe-format pure formatters", () => {
  it("fmtFill formats with 1 decimal place and handles null/NaN honestly", () => {
    expect(fmtFill(null)).toBe("—");
    expect(fmtFill(undefined)).toBe("—");
    expect(fmtFill(Number.NaN)).toBe("—");
    expect(fmtFill(32.74)).toBe("32.7 %");
    expect(fmtFill(0)).toBe("0.0 %");
    expect(fmtFill(100)).toBe("100.0 %");
  });

  it("fmtLitres formats kL above 1000 and whole L below", () => {
    expect(fmtLitres(null)).toBe("—");
    expect(fmtLitres(undefined)).toBe("—");
    expect(fmtLitres(Number.NaN)).toBe("—");
    expect(fmtLitres(500)).toBe("500 L");
    expect(fmtLitres(1000)).toBe("1.0 kL");
    expect(fmtLitres(6340)).toBe("6.3 kL");
  });

  it("fmtCm, fmtDbm, fmtSnr, fmt1 handle valid and missing numbers", () => {
    expect(fmtCm(null)).toBe("—");
    expect(fmtCm(202)).toBe("202 cm");

    expect(fmtDbm(null)).toBe("—");
    expect(fmtDbm(-84.3)).toBe("-84 dBm");

    expect(fmtSnr(null)).toBe("—");
    expect(fmtSnr(8.53)).toBe("8.5 dB");

    expect(fmt1(null)).toBe("—");
    expect(fmt1(12.36)).toBe("12.4");
  });

  it("ago computes age relative to asOf without relying on local machine clock", () => {
    const asOf = 1730286780000; // 30 Oct 11:13 IST
    expect(ago(null, asOf)).toBe("no data");
    expect(ago(asOf, asOf)).toBe("just now");
    expect(ago(asOf - 2 * 60_000, asOf)).toBe("2 min ago");
    expect(ago(asOf - 120 * 60_000, asOf)).toBe("2 h ago");
    expect(ago(asOf - 72 * 3600_000, asOf)).toBe("3 d ago");
  });

  it("stamp and stampSeconds format in IST and UTC accurately", () => {
    // 2026-10-26T08:35:12Z = 2026-10-26 14:05:12 IST (+5:30)
    const t = Date.UTC(2026, 9, 26, 8, 35, 12);
    expect(stamp(t, "IST", true)).toBe("26 Oct, 14:05 IST");
    expect(stamp(t, "IST", false)).toBe("14:05 IST");
    expect(stamp(t, "UTC", true)).toBe("26 Oct, 08:35 UTC");
    expect(stampSeconds(t, "IST")).toBe("26 Oct 14:05:48".replace("48", "12"));
    expect(stamp(null)).toBe("—");
  });

  it("dayKey and dayLabel work seamlessly", () => {
    const t = Date.UTC(2026, 9, 26, 8, 35, 12); // 26 Oct 2026
    const key = dayKey(t, "IST");
    expect(key).toBe("2026-10-26");
    expect(dayLabel(key)).toBe("Mon 26 Oct");
  });

  it("legacy formatters preserve backward compatibility", () => {
    expect(pct(32.7)).toBe("33%");
    expect(pct(null)).toBe("—");
    expect(litres(6340)).toBe("6.3 kL");
    expect(cm(202)).toBe("202 cm");
  });
});

