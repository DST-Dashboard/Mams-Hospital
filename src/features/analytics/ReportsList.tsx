"use client";

import React, { useState } from "react";
import { FileText, Table } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ICON } from "@/components/ui/icons";

interface ReportItem {
  id: string;
  title: string;
  period: string;
  description: string;
  endpoint: string;
}

const REPORTS: ReportItem[] = [
  {
    id: "weekly",
    title: "Weekly Operations Summary",
    period: "Last 7 Days",
    description: "7-day fleet consumption, fill cycles, water volume totals, and anomaly log.",
    endpoint: "/api/reports/weekly",
  },
  {
    id: "monthly",
    title: "Monthly Compliance Package",
    period: "Last 30 Days",
    description: "30-day clinical compliance record, daily consumption averages, and sensor uptime audit.",
    endpoint: "/api/reports/monthly",
  },
  {
    id: "incident",
    title: "Incident Diagnostic Log",
    period: "Recent Incident",
    description: "High-resolution telemetry surrounding recent threshold anomalies and alarms.",
    endpoint: "/api/reports/incident",
  },
];

export function ReportsList() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (endpoint: string, format: "pdf" | "csv", id: string) => {
    setDownloading(`${id}-${format}`);
    const url = `${endpoint}?format=${format}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(null), 1000);
  };

  return (
    <Card
      id="reports"
      eyebrow={{ icon: ICON.download, text: "AUDIT & COMPLIANCE" }}
      title="Scheduled Reports & Exports"
      footnote="Reports are generated on demand from authoritative PostgreSQL readings and telemetry events."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        {REPORTS.map((rep) => (
          <div
            key={rep.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--sp-3)",
              padding: "var(--sp-4)",
              background: "var(--bg-subtle)",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--bd-soft)",
            }}
          >
            <div style={{ maxWidth: "600px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--tx-head)" }}>
                  {rep.title}
                </span>
                <span className="chip chip--neutral text-[10px] py-0 px-1.5 font-bold">
                  {rep.period}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: "var(--tx-quiet)" }}>
                {rep.description}
              </p>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                loading={downloading === `${rep.id}-pdf`}
                onClick={() => handleDownload(rep.endpoint, "pdf", rep.id)}
                title={`Generate ${rep.title} as PDF`}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Table}
                loading={downloading === `${rep.id}-csv`}
                onClick={() => handleDownload(rep.endpoint, "csv", rep.id)}
                title={`Export ${rep.title} as CSV`}
              >
                CSV
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
