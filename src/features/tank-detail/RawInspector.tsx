"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Binary } from "lucide-react";
import { DistanceChart } from "@/components/charts/DistanceChart";
import { Button } from "@/components/ui/Button";
import { fmtCm, fmtFill, fmtLitres, stampSeconds } from "@/lib/format";
import { useUi } from "@/lib/store";
import type { Win } from "@/lib/windows";

export interface RawReadingItem {
  t: number;
  distanceCm: number | null;
  levelCm: number | null;
  levelPct: number | null;
  volumeL: number | null;
  quality: string;
  source?: string;
}

export interface RawInspectorProps {
  points: RawReadingItem[];
  win: Win;
  className?: string;
  onOpenManualEntry?: () => void;
}

export function RawInspector({ points, win, className, onOpenManualEntry }: RawInspectorProps) {
  const tz = useUi((s) => s.tz);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const totalPages = Math.ceil(points.length / pageSize);
  const paginated = points.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-4">
        {/* Accordion Trigger Header */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full text-left focus:outline-none"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--accent-500)] border border-[var(--bd-soft)]">
              <Binary size={16} />
            </div>
            <div>
              <h3 className="card-title text-[18px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
                Raw sensor readings & telemetry inspector
              </h3>
              <p className="text-[12px] text-[var(--tx-quiet)]">
                Inverted distance graph and raw packet table with second-level timestamps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--brand-800)]">
            <span>{open ? "Hide raw inspector" : "Open raw inspector"}</span>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </button>

        {/* Collapsible Content */}
        {open && (
          <div className="flex flex-col gap-6 pt-4 border-t border-[var(--bd-soft)]">
            {/* Inverted Distance Chart */}
            <DistanceChart
              title="Raw distance to water (inverted axis)"
              points={points}
              win={win}
              height={280}
            />

            {/* Paged Raw Table */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[var(--tx-head)]">
                  Telemetry frame log ({points.length} readings recorded)
                </span>

                <div className="flex items-center gap-2">
                  {onOpenManualEntry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenManualEntry}
                      className="text-[11.5px] h-7 px-2.5"
                    >
                      + Record Reading
                    </Button>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Prev
                      </Button>
                      <span className="font-mono text-[11px] text-[var(--tx-quiet)]">
                        {page + 1}/{totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(page + 1)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="table-wrap max-h-[360px] overflow-auto border border-[var(--bd)] rounded-lg">
                <table className="table w-full text-[12px]">
                  <thead>
                    <tr className="bg-[var(--bg-th)] border-b border-[var(--bd-table)]">
                      <th className="p-2 text-left">Time ({tz})</th>
                      <th className="p-2 text-center">Source</th>
                      <th className="p-2 text-right">Distance</th>
                      <th className="p-2 text-right">Level</th>
                      <th className="p-2 text-right">Fill %</th>
                      <th className="p-2 text-right">Volume</th>
                      <th className="p-2 text-right">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p, idx) => (
                      <tr key={`${p.t}-${idx}`} className="border-b border-[var(--bd-table)]">
                        <td className="p-2 font-mono text-[11px]">{stampSeconds(p.t, tz)}</td>
                        <td className="p-2 text-center">
                          {p.source === "manual" ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--accent-100)] text-[var(--accent-800)] border border-[var(--accent-200)]">
                              Manual
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--bg-subtle)] text-[var(--tx-quiet)] border border-[var(--bd-soft)]">
                              IoT
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-[var(--accent-700)]">
                          {fmtCm(p.distanceCm)}
                        </td>
                        <td className="p-2 text-right font-mono">{fmtCm(p.levelCm)}</td>
                        <td className="p-2 text-right font-mono font-bold text-[var(--tx-head)]">
                          {fmtFill(p.levelPct)}
                        </td>
                        <td className="p-2 text-right font-mono">{fmtLitres(p.volumeL)}</td>
                        <td className="p-2 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.quality === "good" || p.quality === "ok"
                                ? "bg-[var(--ok-bg)] text-[var(--ok-tx)]"
                                : "bg-[var(--warn-bg)] text-[var(--warn-tx)]"
                            }`}
                          >
                            {p.quality}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
