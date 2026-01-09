# Data Requirements

## Confirmed Information

### 1. Excel File Location
**OneDrive for Business (SharePoint)**
- Host: mksbkkth-my.sharepoint.com
- Share link: Available (view-only)

### 2. Excel Structure

| Column | Type | Notes |
|--------|------|-------|
| Job No | ID | Primary identifier |
| PO No | ID | Purchase Order number |
| Internal SKU | Text | Design/product code |
| Plating | Text | Plating type |
| Batch Qty | Number | Quantity in batch |
| Total Qty | Number | Total pieces |
| Size | Text | Product size |
| Location | Text | Current station |
| Notes (Pre Production Gan) | Text | Pre-production notes |
| Notes (Production New) | Text | Production notes |
| Date Sending | Date | Sent date |
| Date Receive | Date | Received date |
| Weight after Casting (Gan) | Number | Weight post-casting |
| Weight after Polishing (New) | Number | Weight post-polishing |
| Weight after Plating (Bow) | Number | Weight post-plating |
| ACC wt | Number | Accessory weight |

### 3. Location Stations (Production Flow)

**Standard Flow:**
1. Wax
2. Casting
3. Filing/Assembly
4. Polishing
5. Electro (Plating)
6. Packing

**Edge Cases:**
- Outsource
- Head Factory
- Stone Setting

### 4. Data Connection Strategy

**Option A: CSV Export (Simple)**
- Manual export, upload to dashboard
- No auth required
- Stale data between exports

**Option B: Microsoft Graph API (Live)**
- Real-time data
- Requires Azure AD app registration
- More complex setup

**Decision:** TBD in Milestone 2
