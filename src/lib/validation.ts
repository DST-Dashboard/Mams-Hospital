import type { TankInput, TankRow } from "@/lib/types";
import { tankToInput, ApiError } from "@/lib/api";

export interface TankFormValues {
  label: string;
  deviceId?: string | null;
  zone?: string | null;
  location?: string | null;
  status: "active" | "draft" | "maintenance" | "offline" | "decommissioned";
  shape: "cylinder" | "rectangle";
  heightCm: number | string;
  radiusCm?: number | string;
  widthCm?: number | string;
  lengthCm?: number | string;
  deadZoneCm: number | string;
  warnPct: number | string;
  critPct: number | string;
  emptyPct: number | string;
  dimsConfirmed?: boolean;
}

export interface ValidationResult {
  ok: boolean;
  fieldErrors: Record<string, string>;
}

/**
 * 16-hex Device EUI validator.
 */
export function validateDeviceEui(
  eui: string | null | undefined,
  existingTanks?: { deviceId?: string | null; label: string; id?: number }[],
  currentId?: number
): string | null {
  if (!eui || !eui.trim()) {
    return null; // deviceId is optional (allowed null for drafts)
  }
  const clean = eui.trim();
  const hex16Regex = /^[0-9a-fA-F]{16}$/;
  if (!hex16Regex.test(clean)) {
    return "Enter the 16-character Device EUI.";
  }
  if (existingTanks) {
    const conflict = existingTanks.find(
      (t) => t.deviceId?.toLowerCase() === clean.toLowerCase() && t.id !== currentId
    );
    if (conflict) {
      return `This EUI is already used by ${conflict.label}.`;
    }
  }
  return null;
}

/**
 * Height validator (> 0).
 */
export function validateHeight(h: number | null | undefined): string | null {
  if (h == null || isNaN(h) || h <= 0) {
    return "Height must be greater than 0 cm.";
  }
  return null;
}

/**
 * Radius validator (> 0).
 */
export function validateRadius(r: number | null | undefined): string | null {
  if (r == null || isNaN(r) || r <= 0) {
    return "Radius must be greater than 0 cm.";
  }
  return null;
}

/**
 * Rectangle dimensions validator (> 0).
 */
export function validateRectDim(dim: number | null | undefined, name: "Width" | "Length"): string | null {
  if (dim == null || isNaN(dim) || dim <= 0) {
    return `${name} must be greater than 0 cm.`;
  }
  return null;
}

/**
 * Dead zone validator (>= 0 and < height).
 */
export function validateDeadZone(dz: number | null | undefined, height: number | null | undefined): string | null {
  if (dz == null || isNaN(dz) || dz < 0) {
    return "Dead zone must be between 0 and tank height.";
  }
  if (height != null && !isNaN(height) && height > 0 && dz >= height) {
    return "Dead zone must be smaller than the tank height.";
  }
  return null;
}

/**
 * Threshold order validator: Emergency < Critical < Warning < 100.
 */
export function validateThresholds(
  warn: number,
  crit: number,
  empty: number
): { warnError?: string; critError?: string; emptyError?: string; general?: string } {
  const res: { warnError?: string; critError?: string; emptyError?: string; general?: string } = {};
  if (warn >= 100) {
    res.warnError = "Warning must be below 100%.";
  }
  if (crit >= warn) {
    res.critError = "Critical must be lower than Warning.";
  }
  if (empty >= crit) {
    res.emptyError = "Emergency must be lower than Critical.";
  }
  if (empty <= 0) {
    res.emptyError = "Emergency must be greater than 0%.";
  }
  if (res.warnError || res.critError || res.emptyError) {
    res.general = "Emergency must be below Critical, and Critical below Warning.";
  }
  return res;
}

/**
 * Custom range validator: From <= To.
 */
export function validateDateRange(from: number | string | Date, to: number | string | Date): string | null {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (isNaN(fromMs) || isNaN(toMs)) {
    return "Enter valid dates.";
  }
  if (fromMs > toMs) {
    return "Choose a start date on or before the end date.";
  }
  return null;
}

/**
 * Email validator.
 */
export function validateEmail(email: string): string | null {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !re.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

/**
 * Password validator (min 8 chars).
 */
export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

/**
 * Live form preview capacity calculator.
 * Strictly used for form preview feedback only (labeled "Estimated capacity").
 */
export function capacityLitres(
  shape: "cylinder" | "rectangle",
  heightCm: number,
  radiusOrWidthCm: number,
  lengthCm?: number
): number {
  if (heightCm <= 0 || radiusOrWidthCm <= 0) return 0;
  if (shape === "cylinder") {
    const volCm3 = Math.PI * Math.pow(radiusOrWidthCm, 2) * heightCm;
    return Math.round(volCm3 / 1000);
  } else {
    const l = lengthCm ?? radiusOrWidthCm;
    if (l <= 0) return 0;
    const volCm3 = radiusOrWidthCm * l * heightCm;
    return Math.round(volCm3 / 1000);
  }
}

/**
 * Comprehensive tank form validation.
 */
export function validateTankForm(
  values: TankFormValues,
  existingTanks?: TankRow[],
  currentId?: number
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!values.label || !values.label.trim()) {
    fieldErrors.label = "Enter a tank label.";
  }

  if (values.deviceId) {
    const euiErr = validateDeviceEui(values.deviceId, existingTanks, currentId);
    if (euiErr) fieldErrors.deviceId = euiErr;
  }

  const h = typeof values.heightCm === "string" ? parseFloat(values.heightCm) : values.heightCm;
  const hErr = validateHeight(h);
  if (hErr) fieldErrors.heightCm = hErr;

  if (values.shape === "cylinder") {
    const r = typeof values.radiusCm === "string" ? parseFloat(values.radiusCm) : values.radiusCm;
    const rErr = validateRadius(r);
    if (rErr) fieldErrors.radiusCm = rErr;
  } else {
    const w = typeof values.widthCm === "string" ? parseFloat(values.widthCm) : values.widthCm;
    const l = typeof values.lengthCm === "string" ? parseFloat(values.lengthCm) : values.lengthCm;
    const wErr = validateRectDim(w, "Width");
    const lErr = validateRectDim(l, "Length");
    if (wErr) fieldErrors.widthCm = wErr;
    if (lErr) fieldErrors.lengthCm = lErr;
  }

  const dz = typeof values.deadZoneCm === "string" ? parseFloat(values.deadZoneCm) : values.deadZoneCm;
  const dzErr = validateDeadZone(dz, h);
  if (dzErr) fieldErrors.deadZoneCm = dzErr;

  const warn = typeof values.warnPct === "string" ? parseFloat(values.warnPct) : values.warnPct;
  const crit = typeof values.critPct === "string" ? parseFloat(values.critPct) : values.critPct;
  const empty = typeof values.emptyPct === "string" ? parseFloat(values.emptyPct) : values.emptyPct;

  const thRes = validateThresholds(warn, crit, empty);
  if (thRes.warnError) fieldErrors.warnPct = thRes.warnError;
  if (thRes.critError) fieldErrors.critPct = thRes.critError;
  if (thRes.emptyError) fieldErrors.emptyPct = thRes.emptyError;

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

/**
 * Converts form values to a complete TankInput payload.
 */
export function formToTankInput(values: TankFormValues, baseRow?: TankRow): TankInput {
  const h = typeof values.heightCm === "string" ? parseFloat(values.heightCm) : values.heightCm;
  const dz = typeof values.deadZoneCm === "string" ? parseFloat(values.deadZoneCm) : values.deadZoneCm;
  const warn = typeof values.warnPct === "string" ? parseFloat(values.warnPct) : values.warnPct;
  const crit = typeof values.critPct === "string" ? parseFloat(values.critPct) : values.critPct;
  const empty = typeof values.emptyPct === "string" ? parseFloat(values.emptyPct) : values.emptyPct;

  const isCyl = values.shape === "cylinder";
  const r = typeof values.radiusCm === "string" ? parseFloat(values.radiusCm || "0") : values.radiusCm;
  const w = typeof values.widthCm === "string" ? parseFloat(values.widthCm || "0") : values.widthCm;
  const l = typeof values.lengthCm === "string" ? parseFloat(values.lengthCm || "0") : values.lengthCm;

  const payload: TankInput = {
    label: values.label.trim(),
    deviceId: values.deviceId?.trim() || null,
    zone: values.zone?.trim() || null,
    location: values.location?.trim() || null,
    status: values.status,
    shape: values.shape,
    heightCm: h,
    deadZoneCm: dz,
    dimsConfirmed: values.dimsConfirmed ?? baseRow?.dimsConfirmed ?? true,
    warnPct: warn,
    critPct: crit,
    emptyPct: empty,
    ...(isCyl ? { radiusCm: r ?? 0 } : { widthCm: w ?? 0, lengthCm: l ?? 0 }),
  };

  if (baseRow) {
    return tankToInput(baseRow, payload);
  }
  return payload;
}

/**
 * Extracts field-level errors from an ApiError or unknown exception.
 */
export function extractFieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError) {
    return err.fieldErrors();
  }
  return {};
}

