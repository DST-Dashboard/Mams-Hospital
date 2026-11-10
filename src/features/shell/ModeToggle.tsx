"use client";

import clsx from "clsx";
import { Database, Radio } from "lucide-react";
import React from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useSystemStatus } from "@/lib/hooks";

export function ModeToggle() {
  const { data: status } = useSystemStatus();

  const isLive = status?.clockMode === "live";

  return (
    <Tooltip
      content={
        isLive
          ? "System is receiving live IoT sensor uplinks from TTS gateway."
          : "System is running in Anchored Demo mode replaying hospital sensor dataset. Hardware uplinks are simulated/offline."
      }
      side="bottom"
    >
      <div
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border hairline px-2.5 py-1 text-xs font-medium select-none transition-colors",
          isLive ? "bg-ok/10 text-ok border-ok/30" : "bg-info/10 text-info border-info/30"
        )}
      >
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ok" />
            </span>
            <Radio size={12} className="shrink-0" />
            <span>LIVE</span>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full h-2 w-2 bg-info" />
            <Database size={12} className="shrink-0" />
            <span>DEMO / ANCHORED</span>
          </>
        )}
      </div>
    </Tooltip>
  );
}
