// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Segmented } from "../src/components/ui/primitives";
import { Dialog } from "../src/components/ui/Dialog";
import { ConfirmDialog } from "../src/components/ui/ConfirmDialog";
import { DataTable } from "../src/components/ui/Table";
import { Stepper } from "../src/components/ui/Tabs";
import {
  FreshnessPill,
  SeverityChip,
  AlertStateChip,
  NodeStatusChip,
} from "../src/components/status/badges";

describe("fe-components UI tests", () => {
  it("Segmented control switches values and calls onChange", () => {
    const handleChange = vi.fn();
    const options = [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
    ];

    render(
      <Segmented
        value="day"
        onChange={handleChange}
        options={options}
        ariaLabel="Range"
      />
    );

    const weekBtn = screen.getByRole("radio", { name: /week/i });
    expect(weekBtn).toBeDefined();
    fireEvent.click(weekBtn);
    expect(handleChange).toHaveBeenCalledWith("week");
  });

  it("Dialog renders when open and handles escape/close", () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Dialog open={true} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Dialog>
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Test Modal")).toBeDefined();

    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(handleClose).toHaveBeenCalled();

    rerender(
      <Dialog open={false} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Dialog>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ConfirmDialog requires exact text confirmation when requireText is set", () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="Delete Node"
        body="Are you sure?"
        confirmLabel="Delete"
        requireText="CONFIRM"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    expect(deleteBtn.hasAttribute("disabled")).toBe(true);

    const input = screen.getByPlaceholderText("CONFIRM");
    fireEvent.change(input, { target: { value: "CONFIRM" } });
    expect(deleteBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(deleteBtn);
    expect(handleConfirm).toHaveBeenCalled();
  });

  it("DataTable renders rows, columns, and sorts data", () => {
    const columns = [
      { key: "id", header: "ID", sortable: true },
      { key: "name", header: "Tank Name", sortable: true },
    ];
    const rows = [
      { id: 2, name: "Tank B" },
      { id: 1, name: "Tank A" },
    ];

    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
      />
    );

    expect(screen.getByText("Tank A")).toBeDefined();
    expect(screen.getByText("Tank B")).toBeDefined();
  });

  it("Stepper displays steps with active and done states", () => {
    const steps = [
      { label: "Identity", state: "done" as const },
      { label: "Dimensions", state: "current" as const },
      { label: "Review", state: "todo" as const },
    ];

    render(<Stepper steps={steps} />);
    expect(screen.getByText("Identity")).toBeDefined();
    expect(screen.getByText("Dimensions")).toBeDefined();
    expect(screen.getByText("Review")).toBeDefined();
  });

  it("FreshnessPill applies correct thresholds", () => {
    // green <= 10m
    const { container: fresh } = render(<FreshnessPill ageMin={5} />);
    expect(fresh.querySelector(".bg-\\[var\\(--live\\)\\]")).toBeDefined();

    // amber 10-15m
    const { container: delayed } = render(<FreshnessPill ageMin={12} />);
    expect(delayed.querySelector(".bg-\\[var\\(--gold-500\\)\\]")).toBeDefined();

    // red > 15m
    const { container: offline } = render(<FreshnessPill ageMin={20} />);
    expect(offline.querySelector(".bg-\\[var\\(--err-tx\\)\\]")).toBeDefined();
  });

  it("SeverityChip renders proper classes", () => {
    const { container } = render(<SeverityChip severity="emergency" />);
    expect(container.querySelector(".chip--emg")).toBeDefined();
  });

  it("AlertStateChip renders escalated and acknowledged states", () => {
    const { container: ack } = render(<AlertStateChip state="acknowledged" />);
    expect(ack.textContent).toContain("Acknowledged");

    const { container: esc } = render(<AlertStateChip state="escalated" />);
    expect(esc.textContent).toContain("Escalated");
  });

  it("NodeStatusChip renders active, maintenance, offline", () => {
    const { container: active } = render(<NodeStatusChip status="active" />);
    expect(active.textContent).toContain("Active");

    const { container: maint } = render(<NodeStatusChip status="maintenance" />);
    expect(maint.textContent).toContain("Maintenance");
  });
});

