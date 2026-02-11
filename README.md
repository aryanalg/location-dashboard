# Location Dashboard - Next Manufacturing

A read-only dashboard for tracking job cart locations in silver production, connected to a live Excel workbook via Microsoft Graph API.

## Features

- Real-time data from SharePoint/OneDrive Excel workbook
- Microsoft Entra ID authentication (organization accounts only)
- Location-based job tracking with visual distribution charts
- Kanban and table views
- Natural language query assistant
- PO analytics with progress tracking
- CSV export

## Prerequisites

1. **Azure App Registration** with:
   - Application (client) ID
   - Client secret
   - Tenant ID
   - API permissions: `Files.Read.All`, `Sites.Read.All`
   - Redirect URI: `https://your-domain.vercel.app/api/auth/callback/azure-ad`

2. **SharePoint/OneDrive** Excel workbook with job data

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Azure AD / Microsoft Entra ID
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-32-char-string

# Optional shared rate limiting (recommended in production)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# SharePoint/OneDrive - Excel File Location
SHAREPOINT_HOSTNAME=your-company.sharepoint.com
SHAREPOINT_SITE_PATH=/sites/YourSite
# Optional exact IDs (recommended if site/path lookup is unreliable)
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_NAME=Documents
# Optional exact drive ID
SHAREPOINT_DRIVE_ID=
EXCEL_FILE_PATH=/path/to/your/workbook.xlsx

# Optional worksheet selection overrides
EXCEL_SHEET_INCLUDE_LIST=
EXCEL_SHEET_EXCLUDE_LIST=
EXCEL_SHEET_INCLUDE_REGEX=
EXCEL_SHEET_EXCLUDE_REGEX=
EXCEL_PO_SHEET_REGEX=^C[A-Z0-9]+-[A-Z0-9]+$
EXCEL_ALLOW_LEGACY_PO_SHEETS=true
EXCEL_IMPORT_LOG=false
```

### Getting SharePoint Path Details

1. Go to your SharePoint site
2. Copy the hostname (e.g. `contoso.sharepoint.com`)
3. Copy the site path from the URL (e.g. `/sites/ProductionOps`)
4. Use your document library display name for `SHAREPOINT_DRIVE_NAME` (usually `Documents`)

If hostname/path lookup fails, set `SHAREPOINT_SITE_ID` (and optionally `SHAREPOINT_DRIVE_ID`) to bypass path resolution completely.

### Worksheet Selection Logic

By default, the importer only considers worksheets that match your current business rule:

1. `Samples` tab (always included).
2. PO tabs in `CUSTOMER-PO` format, e.g. `C0640-40413` or `C0553F-VPO12`.
3. Then validates structure: headers must include `Job No`, `Location`, and one of `Batch Qty`/`Total Qty`.
4. Then validates data: at least one row with `Job No` starting with `SO`.

Migration support:

- Keep `EXCEL_ALLOW_LEGACY_PO_SHEETS=true` while old tabs still use legacy names like `40413` or `40413 (P)`.
- Set `EXCEL_ALLOW_LEGACY_PO_SHEETS=false` after all tabs are renamed to `CUSTOMER-PO`.

Optional overrides:

- `EXCEL_SHEET_INCLUDE_LIST`: Exact tab names to always consider (comma-separated)
- `EXCEL_SHEET_EXCLUDE_LIST`: Exact tab names to always skip (comma-separated)
- `EXCEL_SHEET_INCLUDE_REGEX`: Regex to include matching tab names
- `EXCEL_SHEET_EXCLUDE_REGEX`: Regex to skip matching tab names
- `EXCEL_PO_SHEET_REGEX`: Main PO tab pattern (default `CUSTOMER-PO`)
- `EXCEL_ALLOW_LEGACY_PO_SHEETS`: Temporary acceptance of old 5-digit PO tab names
- `EXCEL_IMPORT_LOG`: Set `true` to log included/skipped worksheet reasons in server logs

Priority order:

1. Explicit exclude list/regex
2. Explicit include list/regex
3. Built-in `Samples` + PO pattern logic
4. Non-data name guardrails
5. Header + row validation

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push code to GitHub repository
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Update Azure AD app with production redirect URI:
   `https://your-app.vercel.app/api/auth/callback/azure-ad`

### Required Vercel Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_AD_CLIENT_ID` | Azure app client ID |
| `AZURE_AD_CLIENT_SECRET` | Azure app client secret |
| `AZURE_AD_TENANT_ID` | Azure tenant ID |
| `NEXTAUTH_URL` | Production URL (e.g., `https://location-dashboard.vercel.app`) |
| `NEXTAUTH_SECRET` | Random 32+ character string |
| `UPSTASH_REDIS_REST_URL` | Optional Redis URL for shared rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional Redis token for shared rate limiting |
| `SHAREPOINT_HOSTNAME` | SharePoint host, e.g. `contoso.sharepoint.com` |
| `SHAREPOINT_SITE_PATH` | SharePoint site path, e.g. `/sites/ProductionOps` |
| `SHAREPOINT_SITE_ID` | Optional exact Graph site ID to bypass path lookup |
| `SHAREPOINT_DRIVE_NAME` | Drive/library display name, usually `Documents` |
| `SHAREPOINT_DRIVE_ID` | Optional exact Graph drive ID to bypass drive-name lookup |
| `EXCEL_FILE_PATH` | Path to Excel file in drive |
| `EXCEL_PO_SHEET_REGEX` | Optional PO tab naming regex for multi-customer patterns |

## Tech Stack

- Next.js 16 (App Router)
- NextAuth.js with Azure AD provider
- Microsoft Graph API for Excel access
- TypeScript
- CSS (custom, no framework)
