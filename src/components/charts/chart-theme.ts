import type { EChartsCoreOption } from "echarts/core";

/**
 * Reads a CSS variable value at runtime from document.documentElement.
 */
export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined" || !document?.documentElement) return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

/**
 * Three perceptually uniform 9-stop scales (cmocean: thermal, balance, amp)
 * from spec §13.4.
 */
export const scales = {
  // thermal (sequential: fill % from 0% to 100%)
  thermal: [
    "#042333",
    "#19337c",
    "#563b9c",
    "#83508f",
    "#ae5e83",
    "#de7065",
    "#f99242",
    "#f9c441",
    "#e8fa5b",
  ],
  // balance (diverging: anomalies / differences, zero-centered)
  balance: [
    "#181c43",
    "#2548b0",
    "#3888ba",
    "#98bac5",
    "#eeeaea",
    "#d8a493",
    "#c05a3c",
    "#901029",
    "#3c0912",
  ],
  // amp (magnitude: consumption)
  amp: [
    "#f1edec",
    "#e2c7bf",
    "#d7a291",
    "#cc7e64",
    "#c05b3d",
    "#af3024",
    "#901029",
    "#650f24",
    "#3c0912",
  ],
};

/**
 * Derives the stable colorIndex (1..8) from a tankId.
 * Formula: ((id - 1) % 8) + 1
 */
export function colorIndexOf(tankId: number): number {
  return ((Math.abs(tankId) - 1) % 8) + 1;
}

/**
 * Resolves the CSS variable for a specific series color.
 */
export function seriesColor(colorIndex: number): string {
  const safeIndex = Math.max(1, Math.min(8, colorIndex));
  return cssVar(`--series-${safeIndex}`, "#087e83");
}

const axisTheme = () => ({
  axisLine: {
    lineStyle: {
      color: cssVar("--bd-strong", "#cbd5e0"),
    },
  },
  axisTick: {
    show: true,
    length: 4,
    lineStyle: {
      color: cssVar("--bd-strong", "#cbd5e0"),
    },
  },
  axisLabel: {
    fontSize: 10,
    color: cssVar("--tx-chart", "#294654"),
    fontFamily: "Inter, system-ui, sans-serif",
  },
  splitLine: {
    lineStyle: {
      color: cssVar("--bd-soft", "#edf2f7"),
      type: "solid" as const,
    },
  },
  nameTextStyle: {
    fontSize: 11,
    color: cssVar("--tx-chart", "#294654"),
    fontFamily: "Inter, system-ui, sans-serif",
  },
});

/**
 * Standard base ECharts option with token-driven styles.
 */
export function baseOption(title = ""): EChartsCoreOption {
  return {
    animation: false, // Charts update in place per spec §13.2
    backgroundColor: cssVar("--bg-card", "#ffffff"),
    textStyle: {
      fontFamily: "Inter, system-ui, sans-serif",
      color: cssVar("--tx-chart", "#294654"),
      fontSize: 11,
    },
    title: {
      show: false, // In-chart title hidden; cards have visible semantic HTML headings
      text: title,
    },
    grid: {
      left: 56,
      right: 32,
      top: 52,
      bottom: 56,
      containLabel: true,
    },
    legend: {
      top: 12,
      left: 16,
      right: 120, // Leave room for toolbox icons on the right
      type: "scroll",
      orient: "horizontal",
      itemWidth: 14,
      itemHeight: 10,
      textStyle: {
        fontSize: 11,
        color: cssVar("--tx-chart", "#294654"),
      },
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: cssVar("--bg-card", "#ffffff"),
      borderColor: cssVar("--bd", "#e2e8f0"),
      textStyle: {
        fontSize: 12,
        color: cssVar("--tx-main", "#2c3e50"),
      },
      extraCssText: "border-radius:12px;box-shadow:var(--sh-shell);",
    },
    toolbox: {
      right: 16,
      top: 10,
      itemSize: 15,
      iconStyle: {
        borderColor: cssVar("--tx-quiet", "#627985"),
        opacity: 0.7,
      },
      feature: {
        dataZoom: { yAxisIndex: "none" },
        restore: {},
        saveAsImage: { pixelRatio: 2, name: "mams-figure" },
      },
    },
    xAxis: {
      type: "time",
      ...axisTheme(),
    },
    yAxis: {
      type: "value",
      nameLocation: "middle",
      nameGap: 56,
      ...axisTheme(),
    },
  };
}

/**
 * Generates standard dotted threshold markLines (Warning, Critical, Emergency).
 */
export function thresholdMarkLines(th: {
  warnPct: number;
  critPct: number;
  emptyPct: number;
}) {
  return {
    silent: true,
    symbol: "none",
    data: [
      {
        yAxis: th.warnPct,
        name: "Warning",
        lineStyle: {
          color: cssVar("--warn-tx", "#795314"),
          type: "dotted" as const,
          width: 1.5,
        },
        label: {
          formatter: `Warning ${th.warnPct} %`,
          position: "insideEndTop",
          distance: 6,
          padding: [0, 4],
          fontSize: 10,
          color: cssVar("--warn-tx", "#795314"),
        },
      },
      {
        yAxis: th.critPct,
        name: "Critical",
        lineStyle: {
          color: cssVar("--err-tx", "#933629"),
          type: "dotted" as const,
          width: 1.5,
        },
        label: {
          formatter: `Critical ${th.critPct} %`,
          position: "insideEndTop",
          distance: 6,
          padding: [0, 4],
          fontSize: 10,
          color: cssVar("--err-tx", "#933629"),
        },
      },
      {
        yAxis: th.emptyPct,
        name: "Emergency",
        lineStyle: {
          color: cssVar("--emg-bg", "#933629"),
          type: "dotted" as const,
          width: 1.5,
        },
        label: {
          formatter: `Emergency ${th.emptyPct} %`,
          position: "insideEndTop",
          distance: 6,
          padding: [0, 4],
          fontSize: 10,
          color: cssVar("--emg-bg", "#933629"),
        },
      },
    ],
  };
}

/**
 * Full fixed time axis bounds (min/max) enforcing honest zero-shrink charts per O2.
 */
export function fullAxis(win: { from: number; to: number }) {
  return {
    type: "time" as const,
    min: win.from,
    max: win.to,
    ...axisTheme(),
  };
}

/**
 * MarkArea generator to visually mark missing data gaps with a hatched "No data" area.
 */
export function noDataArea(from: number, to: number) {
  return {
    silent: true,
    itemStyle: {
      color: "rgba(100, 116, 139, 0.12)",
    },
    data: [
      [
        {
          name: "No data",
          xAxis: from,
          label: {
            position: "inside",
            color: cssVar("--tx-quiet", "#627985"),
            fontSize: 10,
          },
        },
        {
          xAxis: to,
        },
      ],
    ],
  };
}

