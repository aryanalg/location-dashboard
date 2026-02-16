import { Client } from "@microsoft/microsoft-graph-client";
import { Job, normalizeLocation } from "./types";
import {
  decideWorksheetByName,
  findHeaderRowIndex,
  getSheetHeaderSet,
  getWorksheetSelectionConfigFromEnv,
  hasRequiredSheetHeaders,
} from "./worksheet-selection";

interface GraphSite {
  id?: string;
  name?: string;
  webUrl?: string;
}

interface GraphDrive {
  id: string;
  name: string;
}

interface GraphDrivesResponse {
  value?: GraphDrive[];
}

interface GraphSitesResponse {
  value?: GraphSite[];
}

interface GraphWorksheet {
  id: string;
  name: string;
}

interface GraphWorksheetsResponse {
  value?: GraphWorksheet[];
}

interface GraphFileInfo {
  id: string;
  name?: string;
  lastModifiedDateTime?: string;
  parentReference?: {
    path?: string;
  };
}

interface GraphSession {
  id?: string;
}

interface GraphRangeResponse {
  values?: unknown[][];
}

interface GraphDriveItemsResponse {
  value?: GraphFileInfo[];
}

function shouldLogImportDiagnostics(): boolean {
  return process.env.NODE_ENV === "development" || process.env.EXCEL_IMPORT_LOG === "true";
}

// Create an authenticated Graph client
export function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeSitePath(sitePath: string): string {
  const trimmed = sitePath.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeDriveName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeGraphPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getPathFileName(path: string): string {
  const parts = normalizeGraphPath(path).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function isGraphItemNotFound(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "itemNotFound";
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("File not found in SharePoint drive");
}

function getPathCandidatesForDrive(filePath: string, driveName: string): string[] {
  const normalized = normalizeGraphPath(filePath);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return [normalized];

  const first = normalizeDriveName(parts[0]);
  const driveAliases = new Set<string>([
    normalizeDriveName(driveName),
    "documents",
    "business - documents",
    "เอกสาร",
    "shared documents",
  ]);

  const stripped = driveAliases.has(first) ? `/${parts.slice(1).join("/")}` : "";
  return uniqueNonEmpty([normalized, stripped]);
}

async function tryGetFileByPath(
  client: Client,
  siteId: string,
  driveId: string,
  filePath: string
): Promise<GraphFileInfo | null> {
  try {
    return await client.api(`/sites/${siteId}/drives/${driveId}/root:${filePath}`).get() as GraphFileInfo;
  } catch (error) {
    if (isGraphItemNotFound(error)) return null;
    throw error;
  }
}

async function resolveWorkbookFileInfo(
  client: Client,
  siteId: string,
  driveId: string,
  driveName: string,
  configuredFilePath: string
): Promise<GraphFileInfo> {
  const pathCandidates = getPathCandidatesForDrive(configuredFilePath, driveName);

  for (const candidate of pathCandidates) {
    const info = await tryGetFileByPath(client, siteId, driveId, candidate);
    if (info) {
      if (shouldLogImportDiagnostics() && candidate !== normalizeGraphPath(configuredFilePath)) {
        console.log(`Resolved workbook path via fallback candidate: ${candidate}`);
      }
      return info;
    }
  }

  // Fallback to drive search by file name.
  const fileName = getPathFileName(configuredFilePath);
  if (fileName) {
    const escaped = fileName.replace(/'/g, "''");
    const searchResponse = await client
      .api(`/sites/${siteId}/drives/${driveId}/root/search(q='${escaped}')`)
      .get() as GraphDriveItemsResponse;
    const items = searchResponse.value || [];
    if (items.length > 0) {
      const exactNameMatches = items.filter(
        (item) => (item.name || "").toLowerCase() === fileName.toLowerCase()
      );
      if (exactNameMatches.length === 0) {
        const similar = items
          .map((item) => item.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 5)
          .join(", ");
        throw new Error(
          `File not found in SharePoint drive "${driveName}". Checked path "${configuredFilePath}". ` +
          `Found similar file names: ${similar || "none"}.`
        );
      }

      const targetFolderPath = normalizeGraphPath(configuredFilePath)
        .split("/")
        .filter(Boolean)
        .slice(0, -1)
        .join("/")
        .toLowerCase();

      const scored = exactNameMatches
        .map((item) => {
          let score = 0;
          const parentPath = (item.parentReference?.path || "").toLowerCase();
          if (targetFolderPath && parentPath.includes(targetFolderPath)) score += 10;
          return { item, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0]?.item;
      if (best?.id) {
        if (shouldLogImportDiagnostics()) {
          console.log(
            `Resolved workbook via search: ${best.name || best.id} (${best.parentReference?.path || "unknown path"})`
          );
        }
        return best;
      }
    }
  }

  throw new Error(
    `File not found in SharePoint drive "${driveName}". Checked path "${configuredFilePath}".`
  );
}

function siteHostFromWebUrl(webUrl?: string): string {
  if (!webUrl) return "";
  try {
    return new URL(webUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function sitePathFromWebUrl(webUrl?: string): string {
  if (!webUrl) return "";
  try {
    return new URL(webUrl).pathname.toLowerCase();
  } catch {
    return "";
  }
}

async function tryResolveSiteIdByPath(
  client: Client,
  hostname: string,
  sitePath: string
): Promise<string | null> {
  try {
    const site = await client.api(`/sites/${hostname}:${sitePath}`).get() as GraphSite;
    return site.id ?? null;
  } catch {
    return null;
  }
}

async function resolveSharePointSiteId(
  client: Client,
  hostname: string,
  sitePath: string
): Promise<string> {
  const normalizedPath = normalizeSitePath(sitePath);
  const strippedParenthesesPath = normalizedPath.replace(/[()]/g, "");
  const pathCandidates = uniqueNonEmpty([
    normalizedPath,
    strippedParenthesesPath !== normalizedPath ? strippedParenthesesPath : undefined,
  ]);

  const normalizedHost = hostname.trim().toLowerCase();
  const hostCandidates = uniqueNonEmpty([
    normalizedHost,
    normalizedHost.includes("-my.") ? normalizedHost.replace("-my.", ".") : undefined,
  ]);

  // 1) Fast path: direct site lookup with configured/fallback host and path variants.
  for (const hostCandidate of hostCandidates) {
    for (const pathCandidate of pathCandidates) {
      const siteId = await tryResolveSiteIdByPath(client, hostCandidate, pathCandidate);
      if (siteId) {
        if (shouldLogImportDiagnostics() && (hostCandidate !== normalizedHost || pathCandidate !== normalizedPath)) {
          console.log(
            `Resolved SharePoint site with fallback host/path: ${hostCandidate}${pathCandidate}`
          );
        }
        return siteId;
      }
    }
  }

  // 2) Fallback: tenant-wide site search and best-match scoring.
  const rawSiteSegment = normalizedPath.split("/").filter(Boolean).pop() || "";
  const cleanedSiteSegment = rawSiteSegment.replace(/[^a-zA-Z0-9]/g, "");
  const searchTerms = uniqueNonEmpty([rawSiteSegment, cleanedSiteSegment]);
  const discoveredSites: GraphSite[] = [];
  const seenIds = new Set<string>();

  for (const term of searchTerms) {
    try {
      const searchResponse = await client
        .api(`/sites?search=${encodeURIComponent(term)}`)
        .get() as GraphSitesResponse;
      for (const site of searchResponse.value || []) {
        if (!site.id || seenIds.has(site.id)) continue;
        seenIds.add(site.id);
        discoveredSites.push(site);
      }
    } catch {
      // continue to next term
    }
  }

  if (discoveredSites.length > 0) {
    const scoreSite = (site: GraphSite): number => {
      let score = 0;
      const webHost = siteHostFromWebUrl(site.webUrl);
      const webPath = sitePathFromWebUrl(site.webUrl);
      const normalizedName = (site.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedWanted = cleanedSiteSegment.toLowerCase();

      if (hostCandidates.includes(webHost)) score += 30;
      if (rawSiteSegment && webPath.includes(rawSiteSegment.toLowerCase())) score += 20;
      if (normalizedWanted && webPath.replace(/[^a-z0-9]/g, "").includes(normalizedWanted)) score += 12;
      if (normalizedWanted && normalizedName.includes(normalizedWanted)) score += 8;

      return score;
    };

    const ranked = discoveredSites
      .map((site) => ({ site, score: scoreSite(site) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (best?.site.id && best.score > 0) {
      if (shouldLogImportDiagnostics()) {
        console.log(
          `Resolved SharePoint site via search: ${best.site.webUrl || best.site.name || best.site.id}`
        );
      }
      return best.site.id;
    }
  }

  throw new Error(
    `SharePoint site could not be resolved for hostname "${hostname}" and site path "${sitePath}". ` +
    `Check SHAREPOINT_HOSTNAME/SHAREPOINT_SITE_PATH or set SHAREPOINT_SITE_ID directly.`
  );
}

// Column mappings from Excel headers to our job properties
const COLUMN_MAP: Record<string, keyof Job> = {
  'Job No': 'jobNo',
  'PO No': 'poNo',
  'Internal SKU': 'sku',
  'Plating': 'plating',
  'Batch Qty': 'batchQty',
  'Total Qty': 'totalQty',
  'Size': 'size',
  'Location': 'location',
  'Delivery Date': 'deliveryDate',
  'Notes ( Pre Production Gan )': 'notesPre',
  'Notes (  Production New)': 'notesNew',
  'Date Sending': 'dateSending',
  'Date Receive': 'dateReceive',
  'Weight after Casting (Gan)': 'weightCasting',
  'Weight after Polishing (New)': 'weightPolishing',
  'Weight after Plating (Bow)': 'weightPlating',
  'ACC wt': 'accWt',
};

const NORMALIZED_COLUMN_MAP = new Map<string, keyof Job>(
  Object.entries(COLUMN_MAP).map(([header, column]) => [normalizeHeaderKey(header), column])
);

const COLUMN_ALIAS_MAP = new Map<string, keyof Job>([
  [normalizeHeaderKey("External Document No"), "poNo"],
  [normalizeHeaderKey("External Document No."), "poNo"],
  [normalizeHeaderKey("External Document Number"), "poNo"],
  [normalizeHeaderKey("External Doc No"), "poNo"],
  [normalizeHeaderKey("External Doc Number"), "poNo"],
  [normalizeHeaderKey("External PO No"), "poNo"],
  [normalizeHeaderKey("External PO Number"), "poNo"],
]);

// Safe value extractors
function safeString(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value).trim();
}

function safeInt(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number.parseFloat(String(value));
  return isNaN(num) ? 0 : Math.floor(num);
}

function safeFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number.parseFloat(String(value));
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  // Excel dates might come as serial numbers
  if (typeof value === 'number') {
    // Excel serial date to JS date
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // Try to parse as string date
  const str = String(value).trim();
  if (str === 'NaT' || str === 'nan') return '';

  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Return first 10 chars if it looks like a date string
    return str.substring(0, 10);
  }

  return '';
}

// Format date as dd/mm/yyyy (e.g., 6/2/2026 for 6th February 2026)
function formatDateDMY(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  // Excel dates come as serial numbers when stored as actual Date values
  // The Excel file has US locale (MM/DD/YYYY), but users entered dates in DD/MM/YYYY format
  // Excel mis-interpreted "6/2/2026" (Feb 6) as June 2nd and stored serial 46175
  // We need to swap day/month to recover the user's original DD/MM/YYYY intent
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    const storedDay = date.getUTCDate();
    const storedMonth = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    // Swap: Excel stored month as day and day as month due to locale mismatch
    return `${storedMonth}/${storedDay}/${year}`;
  }

  // Handle string values
  const str = String(value).trim();
  if (str === 'NaT' || str === 'nan' || str === '') return '';

  // Check for yyyy-mm-dd format (ISO format) - convert to dd/mm/yyyy
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]);
    const day = parseInt(isoMatch[3]);
    return `${day}/${month}/${year}`;
  }

  // Graph API returns dates in the same format as Excel displays them
  // For DD/MM/YYYY formatted cells, the string is already correct - return as-is
  const dateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateMatch) {
    // Already in DD/MM/YYYY format, return as-is
    return str;
  }

  return str;
}

function isNonDataJobToken(normalizedJobNo: string): boolean {
  return /^(job no|total|subtotal|grand total|nan|null|-|n\/a)$/i.test(normalizedJobNo);
}

function normalizeHeaderKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveColumnKey(header: string): keyof Job | undefined {
  if (!header) return undefined;
  const exactMatch = COLUMN_MAP[header];
  if (exactMatch) return exactMatch;
  const normalized = normalizeHeaderKey(header);
  return COLUMN_ALIAS_MAP.get(normalized) ?? NORMALIZED_COLUMN_MAP.get(normalized);
}

export function derivePoFromSheetName(sheetName: string): string {
  const trimmed = sheetName.trim();
  if (/^samples$/i.test(trimmed)) {
    return "Samples";
  }
  const customerFormatMatch = trimmed.match(/^C[A-Z0-9]+-([A-Z0-9]+)/i);
  if (customerFormatMatch?.[1]) {
    return customerFormatMatch[1];
  }
  const legacyMatch = trimmed.match(/^(\d{5})/);
  if (legacyMatch?.[1]) {
    return legacyMatch[1];
  }
  if (/^C[A-Z0-9]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return "";
}

function derivePoFromJobNo(jobNo: string): string {
  const normalized = jobNo.toUpperCase();
  if (!normalized.startsWith("SO")) return "";
  const parts = normalized.replace("SO", "").split("-");
  return parts.length > 0 ? parts[0] : "";
}

// Parse a worksheet's data into Job objects
export function parseWorksheetData(
  values: unknown[][],
  sheetName: string,
  headerRowIndex: number
): Job[] {
  if (!values || values.length <= headerRowIndex + 1) return [];

  const jobs: Job[] = [];
  const headers = values[headerRowIndex];

  // Build column index map
  const colIndex: Record<string, number> = {};
  headers.forEach((header, idx) => {
    const headerStr = safeString(header);
    const columnKey = resolveColumnKey(headerStr);
    if (columnKey) {
      colIndex[columnKey] = idx;
    }
  });

  // Debug: log if deliveryDate column was found (once per sheet)
  if (shouldLogImportDiagnostics() && colIndex['deliveryDate'] === undefined) {
    console.log(`Sheet ${sheetName}: deliveryDate column NOT found. Headers: ${headers.slice(0, 15).map((h) => safeString(h)).join(', ')}`);
  }

  // Process data rows
  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i];
    if (!Array.isArray(row)) continue;

    // Get job number
    const jobNo = safeString(row[colIndex['jobNo']]);
    const normalizedJobNo = jobNo.toUpperCase();

    // Skip obvious non-data rows.
    if (!jobNo || isNonDataJobToken(normalizedJobNo)) continue;

    // Extract PO number
    let poNo = safeString(row[colIndex['poNo']]).replace(/\.0$/, "");
    if (!poNo) {
      // Prefer explicit sheet conventions first, then SO-derived fallback.
      poNo = derivePoFromSheetName(sheetName) || derivePoFromJobNo(jobNo);
    }

    const location = safeString(row[colIndex['location']]);
    const sku = safeString(row[colIndex['sku']]);
    const notesPre = safeString(row[colIndex['notesPre']]);
    const notesNew = safeString(row[colIndex['notesNew']]);
    const batchQty = safeInt(row[colIndex['batchQty']]);
    const totalQty = safeInt(row[colIndex['totalQty']]);

    const isStrictSO = normalizedJobNo.startsWith('SO');
    const hasOperationalData = Boolean(
      location || sku || poNo || batchQty > 0 || totalQty > 0 || notesPre || notesNew
    );

    // New tabs/samples may use non-SO job prefixes; include only if row still looks like real data.
    if (!isStrictSO && !hasOperationalData) continue;

    const job: Job = {
      jobNo,
      poNo,
      sku,
      plating: safeString(row[colIndex['plating']]),
      batchQty,
      totalQty,
      size: safeString(row[colIndex['size']]),
      location,
      normalizedLocation: normalizeLocation(location),
      deliveryDate: formatDateDMY(row[colIndex['deliveryDate']]),
      notesPre,
      notesNew,
      dateSending: formatDate(row[colIndex['dateSending']]),
      dateReceive: formatDate(row[colIndex['dateReceive']]),
      weightCasting: safeFloat(row[colIndex['weightCasting']]),
      weightPolishing: safeFloat(row[colIndex['weightPolishing']]),
      weightPlating: safeFloat(row[colIndex['weightPlating']]),
      accWt: safeFloat(row[colIndex['accWt']]),
    };

    jobs.push(job);
  }

  return jobs;
}

// Main function to fetch all job data from Excel
export async function fetchLocationJournalData(accessToken: string): Promise<Job[]> {
  const client = getGraphClient(accessToken);

  const hostname = process.env.SHAREPOINT_HOSTNAME;
  const sitePath = process.env.SHAREPOINT_SITE_PATH;
  const explicitSiteId = process.env.SHAREPOINT_SITE_ID?.trim();
  const explicitDriveId = process.env.SHAREPOINT_DRIVE_ID?.trim();
  const filePath = process.env.EXCEL_FILE_PATH;
  const driveName = process.env.SHAREPOINT_DRIVE_NAME || 'Documents';

  if (!hostname || !sitePath || !filePath) {
    throw new Error('SharePoint configuration missing. Check SHAREPOINT_HOSTNAME, SHAREPOINT_SITE_PATH, and EXCEL_FILE_PATH.');
  }

  const allJobs: Job[] = [];

  // First, resolve the site ID.
  const siteId = explicitSiteId || await resolveSharePointSiteId(client, hostname, sitePath);

  // Get all drives and find the one we need
  const drivesResponse = await client.api(`/sites/${siteId}/drives`).get() as GraphDrivesResponse;
  const drives = drivesResponse.value || [];

  // Find target drive by explicit ID first, then configured name, then default "Documents".
  let targetDrive: GraphDrive | undefined;
  if (explicitDriveId) {
    targetDrive = drives.find((d) => d.id === explicitDriveId);
  }
  if (!targetDrive) {
    const wanted = normalizeDriveName(driveName);
    targetDrive = drives.find((d) => normalizeDriveName(d.name) === wanted);
  }
  if (!targetDrive && driveName !== "Documents") {
    targetDrive = drives.find((d) => normalizeDriveName(d.name) === "documents");
  }
  // Final safety fallback: if there is only one drive visible, use it.
  if (!targetDrive && drives.length === 1) {
    targetDrive = drives[0];
    if (shouldLogImportDiagnostics()) {
      console.log(`Falling back to only available drive: ${targetDrive.name}`);
    }
  }
  if (!targetDrive) {
    throw new Error(`Drive "${driveName}" not found. Available drives: ${drives.map((d) => d.name).join(', ')}`);
  }
  try {
    let activeDrive = targetDrive;
    let fileInfo: GraphFileInfo | null = null;

    try {
      fileInfo = await resolveWorkbookFileInfo(
        client,
        siteId,
        activeDrive.id,
        activeDrive.name,
        filePath
      );
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }

      // Fallback: workbook may exist in another library/drive.
      for (const drive of drives) {
        if (drive.id === activeDrive.id) continue;
        try {
          const candidate = await resolveWorkbookFileInfo(
            client,
            siteId,
            drive.id,
            drive.name,
            filePath
          );
          fileInfo = candidate;
          activeDrive = drive;
          if (shouldLogImportDiagnostics()) {
            console.log(`Resolved workbook in fallback drive: ${drive.name}`);
          }
          break;
        } catch (driveError) {
          if (!isFileNotFoundError(driveError)) {
            throw driveError;
          }
        }
      }

      if (!fileInfo) {
        throw error;
      }
    }
    // Debug log only in development
    if (shouldLogImportDiagnostics()) {
      console.log(`Reading: ${fileInfo.name} (modified: ${fileInfo.lastModifiedDateTime})`);
    }

    // Use the file's ID to access the workbook API (more reliable)
    const workbookPath = `/sites/${siteId}/drives/${activeDrive.id}/items/${fileInfo.id}/workbook`;

    // Create a non-persistent session to get fresh data (reduces caching)
    let sessionId: string | null = null;
    try {
      const sessionResponse = await client
        .api(`${workbookPath}/createSession`)
        .post({ persistChanges: false }) as GraphSession;
      sessionId = sessionResponse.id ?? null;
    } catch {
      // Continue without session
    }

    // Build headers for requests (include session if available)
    const requestHeaders: Record<string, string> = {};
    if (sessionId) {
      requestHeaders['workbook-session-id'] = sessionId;
    }

    const worksheetsResponse = await client
      .api(`${workbookPath}/worksheets`)
      .headers(requestHeaders)
      .get() as GraphWorksheetsResponse;

    const worksheets = worksheetsResponse.value || [];

    const worksheetSelectionConfig = getWorksheetSelectionConfigFromEnv();
    const includedSheets: string[] = [];
    const skippedSheets: string[] = [];

    // Process each worksheet
    for (const sheet of worksheets) {
      const sheetName = sheet.name;
      const nameDecision = decideWorksheetByName(sheetName, worksheetSelectionConfig);

      if (!nameDecision.shouldProcess) {
        skippedSheets.push(`${sheetName} (${nameDecision.reason})`);
        continue;
      }

      try {
        // Get the used range data for this sheet (with session for fresh data)
        const rangeResponse = await client
          .api(`${workbookPath}/worksheets/${sheet.id}/usedRange`)
          .headers(requestHeaders)
          .get() as GraphRangeResponse;

        const values = Array.isArray(rangeResponse.values) ? rangeResponse.values : [];
        const headerRowIndex = findHeaderRowIndex(values);
        const headers = headerRowIndex >= 0 ? getSheetHeaderSet([values[headerRowIndex]]) : new Set<string>();

        if (headerRowIndex < 0 || !hasRequiredSheetHeaders(headers)) {
          const foundHeadersPreview = Array.from(headers).slice(0, 10).join(', ') || 'none';
          skippedSheets.push(
            `${sheetName} (missing required headers in top rows: need Job No + Location + one of [Batch Qty, Total Qty]; found: ${foundHeadersPreview})`
          );
          continue;
        }

        const jobs = parseWorksheetData(values, sheetName, headerRowIndex);
        if (jobs.length === 0) {
          skippedSheets.push(`${sheetName} (no valid SO job rows after parsing)`);
          continue;
        }

        allJobs.push(...jobs);
        includedSheets.push(`${sheetName} (${jobs.length} jobs; ${nameDecision.reason})`);

      } catch (sheetError) {
        // Log sheet errors in development only
        if (shouldLogImportDiagnostics()) {
          console.error(`Error reading sheet ${sheetName}:`, sheetError);
        }
        skippedSheets.push(`${sheetName} (read error)`);
        // Continue with other sheets
      }
    }

    if (shouldLogImportDiagnostics()) {
      console.log(`[Excel] Included sheets (${includedSheets.length}/${worksheets.length}): ${includedSheets.join('; ') || 'none'}`);
      console.log(`[Excel] Skipped sheets (${skippedSheets.length}/${worksheets.length}): ${skippedSheets.join('; ') || 'none'}`);
    }

    // Close the session to free resources
    if (sessionId) {
      try {
        await client.api(`${workbookPath}/closeSession`).headers(requestHeaders).post({});
      } catch {
        // Ignore close errors
      }
    }

    return allJobs;

  } catch (error) {
    // Log in development only - production errors are logged at API level
    if (shouldLogImportDiagnostics()) {
      console.error('Error fetching Excel data:', error);
    }
    throw error;
  }
}
