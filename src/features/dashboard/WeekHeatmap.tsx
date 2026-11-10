"use client";

import React, { useState } from "react";
import { Heatmap } from "@/components/charts/Heatmap";
import { Select } from "@/components/ui/Select";
import { useHeatmap, useTanks } from "@/lib/hooks";
import { useUi } from "@/lib/store";

export function WeekHeatmap({ defaultTankId = 1 }: { defaultTankId?: number }) {
  const [tankId, setTankId] = useState<number>(defaultTankId);
  const tz = useUi((s) => s.tz);
  const { data: tanks } = useTanks();
  const { data: heatmapData, error, isLoading } = useHeatmap(tankId, { tz });

  const activeTanks = tanks ?? [];

  return (
    <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline pb-3">
        <div>
          <h3 className="text-base font-semibold text-ink">Weekly Level Heatmap</h3>
          <p className="text-xs text-muted">
            Hourly water level distribution across 7 days to identify recurring consumption patterns
          </p>
        </div>

        {activeTanks.length > 0 ? (
          <div className="w-44">
            <Select
              value={tankId}
              onChange={(e) => setTankId(Number(e.target.value))}
              options={activeTanks.map((t) => ({ value: t.id, label: t.label }))}
            />
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center text-xs text-muted">
          Loading weekly heatmap analysis...
        </div>
      ) : error ? (
        <div role="alert" className="p-4 text-xs text-crit">
          Failed to load heatmap: {error.message}
        </div>
      ) : heatmapData ? (
        <Heatmap data={heatmapData} />
      ) : null}
    </div>
  );
}
