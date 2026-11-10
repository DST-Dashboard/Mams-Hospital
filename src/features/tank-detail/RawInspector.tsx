"use client";

import { ChevronDown, ChevronUp, Download, Eye, Table as TableIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { exportToCsv } from "@/lib/csv";
import { cm, litres, pct, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import type { ReadingsResponse } from "@/lib/types";

export function RawInspector({
  readings,
  tankLabel,
}: {
  readings: ReadingsResponse | undefined;
  tankLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const tz = useUi((s) => s.tz);

  const points = readings?.points ?? [];

  const handleExport = () => {
    exportToCsv(
      `${tankLabel.toLowerCase().replace(/\s+/g, "_")}_telemetry_raw`,
      [
        { key: "t", label: "Timestamp (Epoch UTC)" },
        {
          key: "t",
          label: `Timestamp (${tz})`,
          format: (val) => stamp(val as number, tz),
        },
        { key: "distanceCm", label: "Ultrasonic Distance (cm)" },
        { key: "levelCm", label: "Water Level (cm)" },
        { key: "levelPct", label: "Water Level (%)" },
        { key: "volumeL", label: "Estimated Volume (L)" },
        { key: "quality", label: "Quality Assessment" },
      ],
      points as unknown as Record<string, unknown>[]
    );
  };

  return (
    <div className="rounded-xl border hairline bg-surface overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-raised/30">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-left font-semibold text-sm text-ink hover:text-tide transition-colors"
        >
          <TableIcon size={16} className="text-tide" />
          <span>Raw Sensor Telemetry Inspector</span>
          <span className="rounded bg-raised px-2 py-0.5 text-xs font-mono font-normal text-muted">
            {points.length} readings in window
          </span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <div className="flex items-center gap-2">
          {points.length > 0 ? (
            <Button
              variant="quiet"
              size="sm"
              onClick={handleExport}
              icon={<Download size={14} />}
            >
              Export CSV
            </Button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="border-t hairline p-4 space-y-3">
          <p className="text-xs text-muted">
            Inspect raw ultrasonic distance values and mathematically derived level metrics.
          </p>

          <div className="max-h-96 overflow-y-auto rounded-lg border hairline">
            <Table containerClassName="border-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Time ({tz})</TableHead>
                  <TableHead>Raw Sensor Distance</TableHead>
                  <TableHead>Derived Water Depth</TableHead>
                  <TableHead>Level %</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted">
                      No readings found in the selected time range.
                    </TableCell>
                  </TableRow>
                ) : (
                  points
                    .slice()
                    .reverse()
                    .slice(0, 100)
                    .map((p, idx) => (
                      <TableRow key={p.t ?? idx}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {stamp(p.t, tz)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-ink">
                          {cm(p.distanceCm)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cm(p.levelCm)}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-tide">
                          {pct(p.levelPct)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{litres(p.volumeL)}</TableCell>
                        <TableCell>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              p.quality === "ok"
                                ? "bg-ok/10 text-ok"
                                : p.quality === "dead_zone"
                                ? "bg-warn/15 text-warn"
                                : "bg-crit/15 text-crit"
                            }`}
                          >
                            {p.quality}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>

          {points.length > 100 ? (
            <p className="text-[11px] text-muted text-right font-mono">
              Showing latest 100 of {points.length} records. Use &ldquo;Export CSV&rdquo; for complete dataset.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
