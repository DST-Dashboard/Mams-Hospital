"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, DataZoomComponent, CanvasRenderer]); // tree-shaken: only what we draw

/** Thin wrapper: resizes with its container, re-themes on [data-theme] change, disposes on unmount. */
export function EChart({ option, height = 320, label }: { option: EChartsCoreOption; height?: number; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const latest = useRef(option); latest.current = option;

  useEffect(() => {
    const c = (chart.current = echarts.init(el.current!));
    const ro = new ResizeObserver(() => c.resize()); ro.observe(el.current!);
    const mo = new MutationObserver(() => c.setOption(latest.current, true)); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { ro.disconnect(); mo.disconnect(); c.dispose(); chart.current = null; };
  }, []);
  useEffect(() => { chart.current?.setOption(option, true); }, [option]);

  return <div ref={el} role="img" aria-label={label} style={{ height }} className="w-full" />;
}

/** Read a design token at draw time so charts follow the active theme. */
export const token = (name: string, alpha = 1) =>
  typeof window === "undefined" ? "#888" : `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).join(" ")} / ${alpha})`;
