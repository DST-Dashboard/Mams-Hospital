export interface AddNodeWizardData {
  // Step 1: Identity
  label: string;
  deviceId: string;
  zone: string;
  location: string;
  status: "draft" | "active" | "maintenance";

  // Step 2: Dimensions
  shape: "cylinder" | "rectangle";
  heightCm: number;
  radiusCm: number;
  widthCm: number;
  lengthCm: number;
  deadZoneCm: number;
  dimsConfirmed: boolean;

  // Step 3: Thresholds
  warnPct: number;
  critPct: number;
  emptyPct: number;

  // Step 4: Recipients
  recipientEmails: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
}

export const INITIAL_WIZARD_DATA: AddNodeWizardData = {
  label: "",
  deviceId: "",
  zone: "Main Hospital",
  location: "Main Rooftop",
  status: "active",
  shape: "cylinder",
  heightCm: 300,
  radiusCm: 100,
  widthCm: 100,
  lengthCm: 100,
  deadZoneCm: 25,
  dimsConfirmed: true,
  warnPct: 40,
  critPct: 20,
  emptyPct: 5,
  recipientEmails: "facilities@mams.local",
  notifyEmail: true,
  notifySms: false,
  notifyInApp: true,
};
