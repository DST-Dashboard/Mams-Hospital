// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AlertTable } from "@/features/alerts/AlertTable";
import { AlertFilters } from "@/features/alerts/AlertFilters";
import { AckDialog } from "@/features/alerts/AckDialog";
import { ToastProvider } from "@/components/ui/Toast";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock hooks
vi.mock("@/lib/hooks", () => ({
  useMe: () => ({ data: { uid: 1, role: "operator", name: "Operator Suresh" } }),
  useDashboard: () => ({
    data: {
      asOf: 1730268780000,
      tanks: [
        { id: 1, label: "Tank 1", dimsConfirmed: true },
        { id: 2, label: "Tank 2", dimsConfirmed: true },
      ],
    },
  }),
  useAlerts: () => ({
    data: [
      {
        id: 1,
        tankId: 1,
        type: "LOW_LEVEL",
        severity: "warning",
        state: "active",
        message: "Tank 1 at 33 % — below 40 % threshold",
        value: 33,
        openedAt: 1730268000000,
        acknowledgedAt: null,
        ackNote: null,
        resolvedAt: null,
        triggerT: 1730268000000,
        triggerDistanceCm: 202,
        simulated: false,
      },
    ],
    isLoading: false,
    mutate: vi.fn(),
  }),
}));

describe("Alerts components", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders AlertFilters and allows resetting", () => {
    const onReset = vi.fn();
    const onChange = vi.fn();
    render(
      <AlertFilters
        values={{ severity: "warning", state: "open" }}
        tanks={[{ id: 1, label: "Tank 1" }]}
        onChange={onChange}
        onReset={onReset}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalled();
  });

  it("renders AlertTable with the alert row and Acknowledge button for operator", () => {
    render(
      <ToastProvider>
        <AlertTable />
      </ToastProvider>
    );
    expect(screen.getByText("Tank 1 at 33 % — below 40 % threshold")).toBeDefined();
    expect(screen.getByRole("button", { name: "Acknowledge" })).toBeDefined();
  });

  it("renders AckDialog when open", () => {
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <AckDialog
          open={true}
          onClose={onClose}
          alertId={1}
          alertTitle="Tank 1 at 33 %"
        />
      </ToastProvider>
    );
    expect(screen.getByText("Acknowledge Alert")).toBeDefined();
    expect(screen.getByPlaceholderText(/Switched to backup/i)).toBeDefined();
  });
});
