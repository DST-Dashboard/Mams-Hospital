"use client";

import React, { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, ScatterChart } from "echarts/charts";
import {
  BrushComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";
import clsx from "clsx";

// Register only tree-shaken components used across OHTMS charts
echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkAreaComponent,
  BrushComponent,
  TitleComponent,
  CanvasRenderer,
]);

export interface EChartProps {
  option: EChartsCoreOption;
  height?: number;
  label: string;
  onEvents?: Record<string, (params: unknown) => void>;
  onReady?: (chartInstance: echarts.ECharts) => void;
  className?: string;
}

export function EChart({
  option,
  height = 330,
  label,
  onEvents,
  onReady,
  className,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const latestOption = useRef(option);
  latestOption.current = option;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Zero-size guard
    if (el.clientWidth === 0 && el.clientHeight === 0) {
      // Delay initialization until layout renders
    }

    const chartInstance = echarts.init(el, undefined, {
      renderer: "canvas",
    });
    chartRef.current = chartInstance;
    chartInstance.setOption(latestOption.current, true);

    if (onReady) {
      onReady(chartInstance);
    }

    // Attach custom event handlers
    if (onEvents) {
      for (const [eventName, handler] of Object.entries(onEvents)) {
        chartInstance.on(eventName, handler);
      }
    }

    // Responsive container resize observer
    let rafId: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (el.clientWidth > 0 && el.clientHeight > 0) {
          chartInstance.resize();
        }
      });
    });
    ro.observe(el);

    // Re-theme when data-theme changes on <html>
    const mo = new MutationObserver(() => {
      chartInstance.setOption(latestOption.current, true);
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
      if (onEvents) {
        for (const [eventName, handler] of Object.entries(onEvents)) {
          chartInstance.off(eventName, handler);
        }
      }
      chartInstance.dispose();
      chartRef.current = null;
    };
  }, [onReady, onEvents]);

  // Update options when prop changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      style={{ height }}
      className={clsx("plot w-full", className)}
    />
  );
}

// Re-export token accessor for backward compatibility
export const token = (name: string, alpha = 1) => {
  if (typeof window === "undefined" || !document?.documentElement) return "#888";
  const val = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return alpha < 1 ? `rgba(${val}, ${alpha})` : val;
};
