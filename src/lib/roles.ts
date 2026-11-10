import type { Role } from "@/lib/types";

export type NavTabId = "overview" | "tank" | "analytics" | "alerts" | "settings" | "admin";

/**
 * Returns whether a role can perform alert acknowledgement.
 * Operator and Admin only; Viewer cannot.
 */
export function canAcknowledgeAlerts(role: Role | null | undefined): boolean {
  return role === "operator" || role === "admin";
}

/**
 * Returns whether a role can mutate tank records (thresholds, geometry, nodes).
 * Admin only due to backend PATCH /api/tanks authorization.
 */
export function canMutateTanks(role: Role | null | undefined): boolean {
  return role === "admin";
}

/**
 * Returns whether a role can access administrative surfaces (/admin/*, users, audit, system).
 */
export function canAccessAdmin(role: Role | null | undefined): boolean {
  return role === "admin";
}

/**
 * Returns whether a role can access the settings surface.
 * Operator and Admin can view/access Settings; Viewer cannot.
 */
export function canAccessSettings(role: Role | null | undefined): boolean {
  return role === "operator" || role === "admin";
}

/**
 * Returns the list of navigation tabs visible to a given role.
 */
export function getVisibleTabs(role: Role | null | undefined): NavTabId[] {
  const base: NavTabId[] = ["overview", "tank", "analytics", "alerts"];
  if (!role || role === "viewer") {
    return base;
  }
  if (role === "operator") {
    return [...base, "settings"];
  }
  if (role === "admin") {
    return [...base, "settings", "admin"];
  }
  return base;
}

