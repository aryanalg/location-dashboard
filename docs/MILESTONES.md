# Milestones

## Milestone 0: Discovery (No Code)
- [x] Create project structure
- [x] Document key decisions
- [ ] Gather data requirements from stakeholder
- [ ] Define Excel connection strategy

**Deliverables:** /docs folder with project plan

---

## Milestone 1: Static Prototype ✓
- [x] Build UI with mock data
- [x] Implement filters (PO, Design Number, Location, Plating)
- [x] Table view with search and sorting
- [x] Location summary cards (clickable)
- [x] Job detail modal
- [x] Location normalization (fuzzy matching)
- [x] Mock data based on actual Excel structure (4 POs: 40413, 41393, 42147, 43015)
- No Excel connection yet

**Deliverables:** Working prototype with realistic sample data from Excel

---

## Milestone 2: Excel Connection ✓
- [x] Connect to live Excel file via local Python server
- [x] Implement data refresh (auto-refresh every 30 seconds)
- [x] Error handling for connection issues (fallback to mock data)
- [x] OneDrive sync for real-time updates

**Deliverables:** Live data flowing into dashboard via local server

---

## Milestone 3: Visualizations ✓
- [x] PO Analytics modal (click PO number to open)
- [x] Horizontal bar chart showing jobs/pieces per location
- [x] Toggle between Jobs and Pieces view
- [x] Color-coded bars by location (bottleneck visualization)
- [x] Summary stats (total jobs, pieces, SKUs, locations)
- [x] Expandable jobs list within modal
- [x] Location distribution chart (landing page)
- [x] Kanban-style board (toggle view)

**Deliverables:** PO bottleneck analysis with visual charts

---

## Milestone 3.5: Query Assistant & Accessibility ✓
- [x] Query Assistant (keyword-based, no AI cost)
- [x] Quick Action Buttons (icon-based, no typing needed)
- [x] Burmese translations in help guide
- [x] 13 intent types supported (count, find, rank, bottleneck, etc.)

**Deliverables:** Natural language search with multilingual support

---

## Milestone 4: Polish & Deploy
- [ ] Loading states
- [ ] Mobile responsiveness
- [ ] Deploy to production

**Deliverables:** Production-ready dashboard
