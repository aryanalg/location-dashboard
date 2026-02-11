const REQUIRED_SHEET_HEADERS = ["Job No", "Location"] as const;
const REQUIRED_SHEET_HEADERS_ANY_OF = ["Batch Qty", "Total Qty"] as const;
const REQUIRED_HEADERS_NORMALIZED = REQUIRED_SHEET_HEADERS.map((header) => normalizeHeader(header));
const REQUIRED_HEADERS_ANY_OF_NORMALIZED = REQUIRED_SHEET_HEADERS_ANY_OF.map((header) => normalizeHeader(header));
const ALWAYS_INCLUDED_SHEET_NAMES = new Set(["samples"]);
const DEFAULT_PO_SHEET_REGEX = /^C[A-Z0-9]+-[A-Z0-9]+$/i;
const LEGACY_PO_SHEET_REGEX = /^\d{5}(?:\s*\([^)]*\))?$/;

const NON_DATA_SHEET_PATTERNS = [
  /^sheet\d+$/i,
  /\b(summary|dashboard|pivot|chart|readme|note|instruction|template|mapping|lookup|legend|config|setup|archive|old)\b/i,
];

export interface WorksheetSelectionConfig {
  includeSheetNames: Set<string>;
  excludeSheetNames: Set<string>;
  includeRegex: RegExp | null;
  excludeRegex: RegExp | null;
  poSheetRegex: RegExp;
  allowLegacyPOSheets: boolean;
}

export interface WorksheetNameDecision {
  shouldProcess: boolean;
  reason: string;
}

function normalizeSheetName(name: string): string {
  return name.trim().toLowerCase();
}

function parseSheetList(rawValue: string | undefined): Set<string> {
  if (!rawValue) return new Set();
  return new Set(
    rawValue
      .split(",")
      .map((sheet) => normalizeSheetName(sheet))
      .filter(Boolean)
  );
}

function parseSheetRegex(rawValue: string | undefined, envVarName: string): RegExp | null {
  if (!rawValue) return null;
  try {
    return new RegExp(rawValue, "i");
  } catch {
    throw new Error(`Invalid regex in ${envVarName}: "${rawValue}"`);
  }
}

function parseBooleanEnv(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (!rawValue) return defaultValue;
  const normalized = rawValue.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function getWorksheetSelectionConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): WorksheetSelectionConfig {
  return {
    includeSheetNames: parseSheetList(env.EXCEL_SHEET_INCLUDE_LIST),
    excludeSheetNames: parseSheetList(env.EXCEL_SHEET_EXCLUDE_LIST),
    includeRegex: parseSheetRegex(env.EXCEL_SHEET_INCLUDE_REGEX, "EXCEL_SHEET_INCLUDE_REGEX"),
    excludeRegex: parseSheetRegex(env.EXCEL_SHEET_EXCLUDE_REGEX, "EXCEL_SHEET_EXCLUDE_REGEX"),
    poSheetRegex: parseSheetRegex(env.EXCEL_PO_SHEET_REGEX, "EXCEL_PO_SHEET_REGEX") ?? DEFAULT_PO_SHEET_REGEX,
    allowLegacyPOSheets: parseBooleanEnv(env.EXCEL_ALLOW_LEGACY_PO_SHEETS, true),
  };
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function getSheetHeaderSet(values: unknown[][]): Set<string> {
  if (!Array.isArray(values) || values.length === 0 || !Array.isArray(values[0])) {
    return new Set();
  }

  return new Set(values[0].map(normalizeCell).filter(Boolean));
}

export function getNormalizedHeaderSetForRow(row: unknown[]): Set<string> {
  if (!Array.isArray(row)) return new Set();
  return new Set(
    row
      .map((header) => normalizeHeader(normalizeCell(header)))
      .filter(Boolean)
  );
}

export function hasRequiredSheetHeaders(headers: Set<string>): boolean {
  const normalizedHeaders = new Set(
    Array.from(headers).map((header) => normalizeHeader(header))
  );
  const hasAllRequired = REQUIRED_HEADERS_NORMALIZED.every((header) => normalizedHeaders.has(header));
  const hasAnyQuantityHeader = REQUIRED_HEADERS_ANY_OF_NORMALIZED.some((header) =>
    normalizedHeaders.has(header)
  );
  return hasAllRequired && hasAnyQuantityHeader;
}

export function findHeaderRowIndex(values: unknown[][], maxRowsToScan: number = 12): number {
  if (!Array.isArray(values) || values.length === 0) return -1;
  const scanLimit = Math.min(values.length, Math.max(1, maxRowsToScan));

  for (let i = 0; i < scanLimit; i++) {
    const row = values[i];
    if (!Array.isArray(row)) continue;
    const normalizedHeaderSet = getNormalizedHeaderSetForRow(row);
    const hasAllRequired = REQUIRED_HEADERS_NORMALIZED.every((header) => normalizedHeaderSet.has(header));
    const hasAnyQuantity = REQUIRED_HEADERS_ANY_OF_NORMALIZED.some((header) =>
      normalizedHeaderSet.has(header)
    );
    if (hasAllRequired && hasAnyQuantity) {
      return i;
    }
  }

  return -1;
}

export function decideWorksheetByName(
  sheetName: string,
  config: WorksheetSelectionConfig
): WorksheetNameDecision {
  const normalizedName = normalizeSheetName(sheetName);

  if (config.excludeSheetNames.has(normalizedName)) {
    return { shouldProcess: false, reason: "excluded by EXCEL_SHEET_EXCLUDE_LIST" };
  }

  if (config.excludeRegex?.test(sheetName)) {
    return { shouldProcess: false, reason: "excluded by EXCEL_SHEET_EXCLUDE_REGEX" };
  }

  if (config.includeSheetNames.has(normalizedName)) {
    return { shouldProcess: true, reason: "included by EXCEL_SHEET_INCLUDE_LIST" };
  }

  if (config.includeRegex?.test(sheetName)) {
    return { shouldProcess: true, reason: "included by EXCEL_SHEET_INCLUDE_REGEX" };
  }

  if (ALWAYS_INCLUDED_SHEET_NAMES.has(normalizedName)) {
    return { shouldProcess: true, reason: "always-included worksheet" };
  }

  if (config.poSheetRegex.test(sheetName.trim())) {
    return { shouldProcess: true, reason: "matched PO naming pattern" };
  }

  if (config.allowLegacyPOSheets && LEGACY_PO_SHEET_REGEX.test(sheetName.trim())) {
    return { shouldProcess: true, reason: "matched legacy PO naming pattern (migration mode)" };
  }

  if (NON_DATA_SHEET_PATTERNS.some((pattern) => pattern.test(sheetName))) {
    return { shouldProcess: false, reason: "matched non-data sheet name pattern" };
  }

  return { shouldProcess: false, reason: "did not match Samples/PO naming rules" };
}
