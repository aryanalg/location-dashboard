import { Client } from "@microsoft/microsoft-graph-client";
import { Job, normalizeLocation } from "./types";

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
function safeString(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value).trim();
}

function safeInt(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.floor(num);
}

function safeFloat(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

function formatDate(value: any): string {
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

// Check if a sheet name looks like a PO sheet
function isPOSheet(sheetName: string): boolean {
  // Known PO patterns
  const knownPOs = ['40413', '41393', '42147', '43015'];
  if (knownPOs.some(po => sheetName.includes(po))) {
    return true;
  }

  // Check if sheet name starts with 4-5 digits (PO number pattern)
  const match = sheetName.match(/^(\d{4,5})/);
  return match !== null;
}

// Parse a worksheet's data into Job objects
function parseWorksheetData(
  values: any[][],
  sheetName: string
): Job[] {
  if (!values || values.length < 2) return [];

  const jobs: Job[] = [];
  const headers = values[0];

  // Build column index map
  const colIndex: Record<string, number> = {};
  headers.forEach((header: any, idx: number) => {
    const headerStr = safeString(header);
    if (headerStr && COLUMN_MAP[headerStr]) {
      colIndex[COLUMN_MAP[headerStr]] = idx;
    }
  });

  // Process data rows
  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    // Get job number
    const jobNo = safeString(row[colIndex['jobNo']]);

    // Skip empty rows or rows that don't start with 'SO'
    if (!jobNo || !jobNo.startsWith('SO')) continue;

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
    .get();

  const siteId = siteResponse.id;

  // Get all drives and find the one we need
  const drivesResponse = await client.api(`/sites/${siteId}/drives`).get();
  const drives = drivesResponse.value || [];

  // Find the target drive by name
  const targetDrive = drives.find((d: any) => d.name === driveName);
  if (!targetDrive) {
    throw new Error(`Drive "${driveName}" not found. Available drives: ${drives.map((d: any) => d.name).join(', ')}`);
  }
  try {
    // Get file info using direct path
    const itemPath = `/sites/${siteId}/drives/${targetDrive.id}/root:${filePath}`;
    const fileInfo = await client.api(itemPath).get();
    console.log(`Reading: ${fileInfo.name} (modified: ${fileInfo.lastModifiedDateTime})`);

    // Use the file's ID to access the workbook API (more reliable)
    const workbookPath = `/sites/${siteId}/drives/${targetDrive.id}/items/${fileInfo.id}/workbook`;

    // Create a non-persistent session to get fresh data (reduces caching)
    let sessionId: string | null = null;
    try {
      const sessionResponse = await client
        .api(`${workbookPath}/createSession`)
        .post({ persistChanges: false });
      sessionId = sessionResponse.id;
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
      .get();

    const worksheets = worksheetsResponse.value || [];

    // Process each PO sheet
    for (const sheet of worksheets) {
      const sheetName = sheet.name;

      if (!isPOSheet(sheetName)) {
        continue;
      }

      try {
        // Get the used range data for this sheet (with session for fresh data)
        const rangeResponse = await client
          .api(`${workbookPath}/worksheets/${sheet.id}/usedRange`)
          .headers(requestHeaders)
          .get();

        const values = rangeResponse.values;
        const jobs = parseWorksheetData(values, sheetName);
        allJobs.push(...jobs);

      } catch (sheetError) {
        console.error(`Error reading sheet ${sheetName}:`, sheetError);
        // Continue with other sheets
      }
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
    console.error('Error fetching Excel data:', error);
    throw error;
  }
}
