# Location Dashboard

## Project Overview
READ-ONLY dashboard for tracking job cart locations in the silver production factory. Connected to a live Excel cloud file ("Location Tracker").

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data source | Excel (cloud) | Existing operator workflow |
| Dashboard mode | Read-only | Prevent accidental edits, maintain single source of truth |
| Refresh strategy | TBD | Depends on hosting (OneDrive/SharePoint/Google) |
| Hosting | TBD | Likely Vercel (static) or needs backend for Excel API |

## Architecture (Proposed)

```
Excel Cloud File (Source of Truth)
        │
        ▼
   Excel API / Export
        │
        ▼
   Dashboard (Web App)
        │
        ├── Filters (PO, Design, Location, Status)
        ├── Table View (searchable, sortable)
        └── Visual Status (Kanban / Progress bars)
```

## Open Questions
See [DATA_REQUIREMENTS.md](./DATA_REQUIREMENTS.md)
