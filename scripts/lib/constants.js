export const MODULE_ID = "tashas-madness-tracker";

export const FLAGS = {
  AFFLICTIONS: "afflictions"
};

export const MADNESS_TYPES = {
  short: { key: "short", labelKey: "MADNESS.Type.Short", tableSetting: "shortTermTableUuid", durationSetting: "shortTermDurationFormula", durationUnit: "minutes" },
  long: { key: "long", labelKey: "MADNESS.Type.Long", tableSetting: "longTermTableUuid", durationSetting: "longTermDurationFormula", durationUnit: "hours" },
  indefinite: { key: "indefinite", labelKey: "MADNESS.Type.Indefinite", tableSetting: "indefiniteTableUuid", durationSetting: null, durationUnit: null }
};

export const SETTINGS = {
  DEFAULT_DC: "defaultDC",
  DEFAULT_ABILITY: "defaultAbility",
  SHORT_TABLE_UUID: "shortTermTableUuid",
  LONG_TABLE_UUID: "longTermTableUuid",
  INDEFINITE_TABLE_UUID: "indefiniteTableUuid",
  SHORT_DURATION_FORMULA: "shortTermDurationFormula",
  LONG_DURATION_FORMULA: "longTermDurationFormula",
  RECOVERY_DC: "recoveryDC",
  PLACEHOLDER_TABLES_CREATED: "placeholderTablesCreated",
  PROMPT_RECOVERY_ON_REST: "promptRecoveryOnRest"
};
