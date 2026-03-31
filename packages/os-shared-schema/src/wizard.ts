export interface WizardBundleMetadata {
  packageId: string;
  title: string;
  shortDescription: string;
  description: string;
  details: string;
  version: string;
  uniqueId: string;
  upgradableFrom: string;
  supportedBuilds: number[];
  requirements: string[];
  useKernelDriver: boolean;
  productCode: number;
  git: string;
  website: string;
  donateLink?: string;
  supportsISO: boolean;
  iso?: WizardIsoConfig;
  oobe?: WizardOobeConfig;
  desktopQuestions?: WizardDesktopQuestion[];
  featurePages: WizardFeaturePage[];
}

export interface WizardIsoConfig {
  disableBitLocker: boolean;
  disableHardwareRequirements: boolean;
  injectPath: string;
}

export interface WizardOobeConfig {
  internet: "Required" | "Request" | "Skip";
  bulletPoints: WizardBulletPoint[];
}

export interface WizardBulletPoint {
  icon: string;
  title: string;
  description: string;
}

export type WizardFeaturePage = WizardRadioPage | WizardCheckboxPage;

export interface WizardFeaturePageBase {
  type: "RadioPage" | "CheckboxPage";
  description: string;
  isRequired?: boolean;
  questionKey?: string;
  visibility?: WizardQuestionVisibility | null;
}

export interface WizardRadioPage extends WizardFeaturePageBase {
  type: "RadioPage";
  defaultOption: string;
  options: WizardRadioOption[];
}

export interface WizardCheckboxPage extends WizardFeaturePageBase {
  type: "CheckboxPage";
  options: WizardCheckboxOption[];
}

export interface WizardRadioOption {
  text: string;
  name: string;
  value?: string | boolean;
  desc?: string;
  badge?: string | null;
  badgeColor?: string | null;
  danger?: boolean;
  behavior?: WizardOptionBehavior | null;
}

export interface WizardCheckboxOption {
  text: string;
  name: string;
  isChecked: boolean;
  mapsTo?: string[];
  mapsToProfiles?: string[];
}

export interface WizardDesktopQuestion {
  key: string;
  icon: string;
  label: string;
  title: string;
  desc: string;
  note?: string;
  visibility?: WizardQuestionVisibility;
  options: WizardDesktopQuestionOption[];
}

export interface WizardDesktopQuestionOption {
  value: string | boolean;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
  behavior?: WizardOptionBehavior;
}

export interface WizardQuestionVisibility {
  minPreset?: string;
  onlyPreset?: string;
  minWindowsBuild?: number;
  excludeLaptop?: boolean;
  excludeWorkPc?: boolean;
}

export interface WizardOptionBehavior {
  value: string | boolean;
  includeActions?: string[];
  blockActions?: string[];
  blockReason?: string;
  warnings?: string[];
  requiresReboot?: boolean;
  estimatedActions?: number;
  estimatedBlocked?: number;
  estimatedPreserved?: number;
  riskLevel?: "safe" | "mixed" | "aggressive" | "expert";
}
