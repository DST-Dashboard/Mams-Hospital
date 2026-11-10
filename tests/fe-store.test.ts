import { beforeEach, describe, expect, it } from "vitest";
import { useUi } from "../src/lib/store";

describe("fe-store ui store operations", () => {
  beforeEach(() => {
    useUi.setState({
      tz: "IST",
      theme: "light",
      textSize: 16,
      lastTankId: null,
      range: "24h",
    });
  });

  it("updates timezone correctly", () => {
    expect(useUi.getState().tz).toBe("IST");
    useUi.getState().setTz("UTC");
    expect(useUi.getState().tz).toBe("UTC");
  });

  it("toggles and updates theme cleanly", () => {
    expect(useUi.getState().theme).toBe("light");
    useUi.getState().toggleTheme();
    expect(useUi.getState().theme).toBe("dark");
    useUi.getState().setTheme("light");
    expect(useUi.getState().theme).toBe("light");
  });

  it("sets text size and lastTankId", () => {
    useUi.getState().setTextSize(18);
    expect(useUi.getState().textSize).toBe(18);

    useUi.getState().setLastTankId(4);
    expect(useUi.getState().lastTankId).toBe(4);
  });
});

