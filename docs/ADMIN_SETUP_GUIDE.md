# Location Dashboard - Azure Admin Setup Guide

This document contains the steps required to complete the Azure App Registration setup for the Location Dashboard application.

**App Name:** Location Dashboard
**Application (Client) ID:** `4eb24fd9-21b4-46e8-9faf-1fb020a03523`
**Purpose:** Read-only dashboard to view job cart locations from an Excel workbook stored in SharePoint/OneDrive

---

## Overview

There are **3 tasks** to complete:

| Task | Time Required | Section |
|------|---------------|---------|
| 1. Create Client Secret | 2 minutes | [Jump to Task 1](#task-1-create-client-secret) |
| 2. Add API Permissions | 3 minutes | [Jump to Task 2](#task-2-add-api-permissions) |
| 3. Configure Redirect URIs | 2 minutes | [Jump to Task 3](#task-3-configure-redirect-uris) |

---

## Task 1: Create Client Secret

A client secret is required for the application to authenticate with Microsoft.

### Steps:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** (formerly Azure Active Directory)
3. Click **App registrations** in the left sidebar
4. Find and click on **"Location Dashboard"**
5. In the left sidebar, click **Certificates & secrets**
6. Click **+ New client secret**
7. Enter a description: `Location Dashboard Production`
8. Select expiration: **24 months** (recommended)
9. Click **Add**

### ⚠️ Important:
**Copy the "Value" immediately** - it will only be shown once. This is the client secret that needs to be sent to the developer.

> **What to send:** The client secret **Value** (not the Secret ID)

---

## Task 2: Add API Permissions

The application needs permission to read files from SharePoint/OneDrive using Microsoft Graph.

### Steps:

1. In the **Location Dashboard** app registration, click **API permissions** in the left sidebar
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Search for and check the following permissions:

| Permission | Description |
|------------|-------------|
| `Files.Read.All` | Allows the app to read all files the signed-in user can access |
| `Sites.Read.All` | Allows the app to read SharePoint sites the signed-in user can access |
| `User.Read` | Allows users to sign in (may already be added) |

6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization Name]**
8. Confirm by clicking **Yes**

### Verification:
After granting consent, all permissions should show a green checkmark with "Granted for [Your Organization]" status.

---

## Task 3: Configure Redirect URIs

Redirect URIs tell Azure where to send users after they sign in.

### Steps:

1. In the **Location Dashboard** app registration, click **Authentication** in the left sidebar
2. Under **Platform configurations**, click **+ Add a platform** (if no web platform exists)
3. Select **Web**
4. Add the following **Redirect URIs**:

**For Local Development:**
```
http://localhost:3000/api/auth/callback/azure-ad
```

**For Production (Vercel):**
```
https://location-dashboard.vercel.app/api/auth/callback/azure-ad
```

> **Note:** The production URL may change. The developer will confirm the final URL after deployment.

5. Scroll down and ensure **ID tokens** is checked under "Implicit grant and hybrid flows"
6. Click **Save**

---

## Summary - Information to Send Back

Please send the following information to the developer:

### Required:
| Item | Value | Status |
|------|-------|--------|
| Client Secret Value | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | ⬜ |
| Permissions Granted | Files.Read.All, Sites.Read.All, User.Read | ⬜ |
| Redirect URIs Added | localhost + production URLs | ⬜ |

### Already Configured (for reference):
| Item | Value |
|------|-------|
| Application (Client) ID | `4eb24fd9-21b4-46e8-9faf-1fb020a03523` |
| Directory (Tenant) ID | `706e795f-d487-46df-a332-e4edbfcfb2ee` |

---

## Security Notes

- The client secret should be transmitted securely (not via email if possible)
- The application only requests **read** permissions - it cannot modify any files
- Only users within your organization can sign in (configured as "Single tenant")
- The secret will expire after the selected period and will need to be renewed

---

## Troubleshooting

**"AADSTS65001: The user or administrator has not consented to use the application"**
→ Admin consent was not granted. Return to Task 2, step 7.

**"AADSTS50011: The reply URL specified in the request does not match"**
→ Redirect URI is missing or incorrect. Return to Task 3.

**"AADSTS7000215: Invalid client secret provided"**
→ Client secret is incorrect or expired. Create a new one in Task 1.

---

## Questions?

Contact the developer if you have any questions about this setup process.
