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

# SharePoint/OneDrive - Excel File Location
SHAREPOINT_SITE_ID=your-site-id
SHAREPOINT_DRIVE_ID=your-drive-id
EXCEL_FILE_PATH=/path/to/your/workbook.xlsx
```

### Getting SharePoint IDs

1. Go to your SharePoint site
2. Open browser developer tools (F12) > Console
3. Run: `_spPageContextInfo.siteId` for Site ID
4. Or use Microsoft Graph Explorer to query your sites

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
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
| `SHAREPOINT_SITE_ID` | SharePoint site GUID |
| `SHAREPOINT_DRIVE_ID` | OneDrive/SharePoint drive GUID |
| `EXCEL_FILE_PATH` | Path to Excel file in drive |

## Tech Stack

- Next.js 14 (App Router)
- NextAuth.js with Azure AD provider
- Microsoft Graph API for Excel access
- TypeScript
- CSS (custom, no framework)
