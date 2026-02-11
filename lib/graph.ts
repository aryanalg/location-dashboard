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
}

interface GraphDrive {
  id: string;
  name: string;
}

interface GraphDrivesResponse {
  value?: GraphDrive[];
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
}

interface GraphSession {
  id?: string;
}

interface GraphRangeResponse {
  values?: unknown[][];
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

// Parse a worksheet's data into Job objects
function parseWorksheetData(
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
    if (headerStr && COLUMN_MAP[headerStr]) {
      colIndex[COLUMN_MAP[headerStr]] = idx;
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

    // Skip empty rows or rows that don't start with 'SO'
    if (!jobNo || !normalizedJobNo.startsWith('SO')) continue;

    // Extract PO number
    let poNo = safeString(row[colIndex['poNo']]).replace('.0', '');
    if (!poNo) {
      // Try to extract from job number (e.g., SO40413-001-J1 -> 40413)
      const parts = jobNo.replace('SO', '').split('-');
      if (parts.length > 0) {
        poNo = parts[0];
      }
    }

    const location = safeString(row[colIndex['location']]);

    const job: Job = {
      jobNo,
      poNo,
      sku: safeString(row[colIndex['sku']]),
      plating: safeString(row[colIndex['plating']]),
      batchQty: safeInt(row[colIndex['batchQty']]),
      totalQty: safeInt(row[colIndex['totalQty']]),
      size: safeString(row[colIndex['size']]),
      location,
      normalizedLocation: normalizeLocation(location),
      deliveryDate: formatDateDMY(row[colIndex['deliveryDate']]),
      notesPre: safeString(row[colIndex['notesPre']]),
      notesNew: safeString(row[colIndex['notesNew']]),
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
  const filePath = process.env.EXCEL_FILE_PATH;
  const driveName = process.env.SHAREPOINT_DRIVE_NAME || 'Documents';

  if (!hostname || !sitePath || !filePath) {
    throw new Error('SharePoint configuration missing. Check SHAREPOINT_HOSTNAME, SHAREPOINT_SITE_PATH, and EXCEL_FILE_PATH.');
  }

  const allJobs: Job[] = [];

  // First, get the site ID
  const siteResponse = await client
    .api(`/sites/${hostname}:${sitePath}`)
    .get() as GraphSite;

  const siteId = siteResponse.id;
  if (!siteId) {
    throw new Error("Failed to resolve SharePoint site ID.");
  }

  // Get all drives and find the one we need
  const drivesResponse = await client.api(`/sites/${siteId}/drives`).get() as GraphDrivesResponse;
  const drives = drivesResponse.value || [];

  // Find the target drive by name
  const targetDrive = drives.find((d) => d.name === driveName);
  if (!targetDrive) {
    throw new Error(`Drive "${driveName}" not found. Available drives: ${drives.map((d) => d.name).join(', ')}`);
  }
  try {
    // Get file info using direct path
    const itemPath = `/sites/${siteId}/drives/${targetDrive.id}/root:${filePath}`;
    const fileInfo = await client.api(itemPath).get() as GraphFileInfo;
    // Debug log only in development
    if (shouldLogImportDiagnostics()) {
      console.log(`Reading: ${fileInfo.name} (modified: ${fileInfo.lastModifiedDateTime})`);
    }

    // Use the file's ID to access the workbook API (more reliable)
    const workbookPath = `/sites/${siteId}/drives/${targetDrive.id}/items/${fileInfo.id}/workbook`;

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
