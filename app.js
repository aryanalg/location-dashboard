/**
 * Location Dashboard
 * Job Cart Tracker - Next Manufacturing
 * Milestone 2: Live Excel Connection via Local Server
 */

// ============================================
// Configuration
// ============================================

const CONFIG = {
    API_URL: 'http://localhost:5050/api/data',
    REFRESH_INTERVAL: 10000,  // 10 seconds
    USE_MOCK_DATA: false      // Set to true to force mock data
};

// ============================================
// Location Normalization
// ============================================

const LOCATION_MAPPINGS = {
    'Wax': ['wax', 'waxing', 'wax dept', 'wax department'],
    'Casting': ['casting', 'cast', 'casted', 'cast dept'],
    'Filing/Assembly': ['filing', 'assembly', 'file', 'filing/assembly', 'f/a', 'assemble', 'assembled'],
    'Polishing': ['polishing', 'polish', 'pol', 'buffing', 'buff', 'polished'],
    'Electro': ['electro', 'electroplating', 'electroplate'],
    'Plating': ['plating', 'plate', 'plated'],
    'Packing': ['packing', 'pack', 'packed', 'shipping', 'ship', 'shipped', 'dispatch'],
    'MKS Setting': ['mks', 'mks set', 'mks xset', 'mks setting', 'setting', 'stone setting', 'stone set', 'xset', 'head factory'],
    'Outsource': ['outsource', 'outsourced', 'external', 'outside', 'vendor', 'subcontract'],
    'QC': ['qc', 'quality', 'quality control', 'inspection', 'inspect', 'checking']
};

// Standard location order for display (production flow order)
const LOCATION_ORDER = [
    'Wax',
    'Casting',
    'Filing/Assembly',
    'Polishing',
    'Electro',
    'Plating',
    'Packing',
    'MKS Setting',
    'Outsource',
    'QC',
    'Other'
];

/**
 * Normalize a raw location string to a standard category
 * @param {string} rawLocation - The raw location from Excel
 * @returns {string} - Normalized location name
 */
function normalizeLocation(rawLocation) {
    if (!rawLocation || typeof rawLocation !== 'string') {
        return 'Other';
    }

    const input = rawLocation.trim().toLowerCase();

    for (const [standardName, variations] of Object.entries(LOCATION_MAPPINGS)) {
        for (const variation of variations) {
            if (input.includes(variation)) {
                return standardName;
            }
        }
    }

    return 'Other';
}

// ============================================
// Mock Data
// ============================================

const MOCK_DATA = [
    // PO 40413 - C8809E Earrings (Gold Vermeil) - 166 pcs total
    { jobNo: 'SO40413-001-J1', poNo: '40413', sku: 'C8809E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 166, size: '', location: 'Polishing', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 150.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-001-J2', poNo: '40413', sku: 'C8809E', plating: 'Gold Vermeil', batchQty: 66, totalQty: 166, size: '', location: 'Polishing', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 99.4, weightPolishing: null, weightPlating: null, accWt: 0 },

    // PO 40413 - C8492E Earrings (Gold Vermeil) - 878 pcs total
    { jobNo: 'SO40413-002-J1', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Filing/Assembly', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 140.3, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J2', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Casting', notesPre: 'good 64 pcs/ repair stn 36 pcs', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J3', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J4', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J5', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J6', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J7', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J8', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-002-J9', poNo: '40413', sku: 'C8492E', plating: 'Gold Vermeil', batchQty: 78, totalQty: 878, size: '', location: 'Wax', notesPre: 'wax setting', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },

    // PO 40413 - C8795E Earrings (Rhodium) - 2162 pcs total
    { jobNo: 'SO40413-003-J1', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Packing', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J2', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Packing', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J3', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Polishing', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J4', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Polishing', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J5', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Plating', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J6', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Packing', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J7', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Polishing', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO40413-003-J19', poNo: '40413', sku: 'C8795E', plating: 'Rhodium', batchQty: 100, totalQty: 2162, size: '', location: 'Electro', notesPre: '1st step black media with Blue machine', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },

    // PO 41393 - C8493E Earrings (Gold Vermeil) - 1624 pcs total
    { jobNo: 'SO41393-001-J1', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: 'Hand setting finished /mounting filing', notesNew: 'For Assemble', dateSending: '', dateReceive: '', weightCasting: 142.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J2', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: 'Hand setting finished /mounting filing', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 141.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J3', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 142.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J4', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 142.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J5', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 143.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J6', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 142.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J7', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 142.0, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO41393-001-J8', poNo: '41393', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1624, size: '', location: 'Filing/Assembly', notesPre: 'Hand setting /mounting filing', notesNew: '', dateSending: '', dateReceive: '', weightCasting: 141.5, weightPolishing: null, weightPlating: null, accWt: 0 },

    // PO 42147 - C8493E Earrings (Gold Vermeil) - 2000 pcs total
    { jobNo: 'SO42147-001-J1', poNo: '42147', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 2000, size: '', location: 'Wax', notesPre: 'pulling', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO42147-001-J2', poNo: '42147', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 2000, size: '', location: 'Wax', notesPre: 'pulling', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO42147-001-J3', poNo: '42147', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 2000, size: '', location: 'Wax', notesPre: 'pulling', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO42147-001-J4', poNo: '42147', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 2000, size: '', location: 'Wax', notesPre: 'pulling', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO42147-001-J5', poNo: '42147', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 2000, size: '', location: 'Wax', notesPre: 'pulling', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO42147-001-J6', poNo: '42147', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 2000, size: '', location: 'Wax', notesPre: 'pulling', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },

    // PO 43015 - C8493E Earrings (Gold Vermeil) - 1400 pcs total
    { jobNo: 'SO43015-001-J1', poNo: '43015', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1400, size: '', location: 'Wax', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO43015-001-J2', poNo: '43015', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1400, size: '', location: 'Wax', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO43015-001-J3', poNo: '43015', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1400, size: '', location: 'Wax', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO43015-001-J4', poNo: '43015', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1400, size: '', location: 'Wax', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO43015-001-J5', poNo: '43015', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1400, size: '', location: 'Wax', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 },
    { jobNo: 'SO43015-001-J6', poNo: '43015', sku: 'C8493E', plating: 'Gold Vermeil', batchQty: 100, totalQty: 1400, size: '', location: 'Wax', notesPre: '', notesNew: '', dateSending: '', dateReceive: '', weightCasting: null, weightPolishing: null, weightPlating: null, accWt: 0 }
];

// ============================================
// State
// ============================================

let state = {
    data: [],
    filteredData: [],
    sortColumn: null,
    sortDirection: 'asc',
    filters: {
        po: '',
        sku: '',
        location: '',
        plating: ''
    },
    searchQuery: '',
    isConnected: false,
    lastUpdate: null,
    refreshInterval: null,
    // PO Analytics
    selectedPO: null,
    analyticsMode: 'jobs', // 'jobs' or 'pieces'
    // Distribution chart
    distributionMode: 'jobs', // 'jobs' or 'pieces'
    // View mode
    viewMode: 'table' // 'table' or 'kanban'
};

// ============================================
// DOM Elements
// ============================================

const elements = {};

function initElements() {
    elements.totalJobs = document.getElementById('totalJobs');
    elements.activePOs = document.getElementById('activePOs');
    elements.lastRefresh = document.getElementById('lastRefresh');

    elements.filterPO = document.getElementById('filterPO');
    elements.filterSKU = document.getElementById('filterSKU');
    elements.filterLocation = document.getElementById('filterLocation');
    elements.filterPlating = document.getElementById('filterPlating');
    elements.clearFilters = document.getElementById('clearFilters');
    elements.poQuickSelect = document.getElementById('poQuickSelect');

    elements.locationCards = document.getElementById('locationCards');
    elements.searchInput = document.getElementById('searchInput');
    elements.resultCount = document.getElementById('resultCount');
    elements.tableBody = document.getElementById('tableBody');
    elements.showingCount = document.getElementById('showingCount');

    elements.jobModal = document.getElementById('jobModal');
    elements.modalJobTitle = document.getElementById('modalJobTitle');
    elements.modalContent = document.getElementById('modalContent');
    elements.closeJobModal = document.getElementById('closeJobModal');

    // PO Analytics Modal
    elements.poAnalyticsModal = document.getElementById('poAnalyticsModal');
    elements.poAnalyticsTitle = document.getElementById('poAnalyticsTitle');
    elements.poSummary = document.getElementById('poSummary');
    elements.poBarChart = document.getElementById('poBarChart');
    elements.poJobsList = document.getElementById('poJobsList');
    elements.closePoAnalytics = document.getElementById('closePoAnalytics');
    elements.expandJobsBtn = document.getElementById('expandJobsBtn');

    // Distribution Chart
    elements.distributionChart = document.getElementById('distributionChart');

    // Kanban Board
    elements.kanbanBoard = document.getElementById('kanbanBoard');
    elements.tableContainer = document.querySelector('.table-container');

    // Query Assistant
    elements.queryInput = document.getElementById('queryInput');
    elements.queryResults = document.getElementById('queryResults');
}

// ============================================
// Data Processing
// ============================================

function processData(rawData) {
    return rawData.map(row => ({
        ...row,
        normalizedLocation: normalizeLocation(row.location)
    }));
}

function getUniqueValues(data, key) {
    return [...new Set(data.map(row => row[key]).filter(Boolean))].sort();
}

function getLocationCounts(data) {
    const counts = {};
    LOCATION_ORDER.forEach(loc => counts[loc] = 0);

    data.forEach(row => {
        const loc = row.normalizedLocation;
        if (counts[loc] !== undefined) {
            counts[loc]++;
        } else {
            counts['Other']++;
        }
    });

    return counts;
}

// ============================================
// Filtering & Sorting
// ============================================

function applyFilters() {
    let filtered = [...state.data];

    // PO filter
    if (state.filters.po) {
        const poSearch = state.filters.po.toLowerCase();
        filtered = filtered.filter(row =>
            row.poNo && row.poNo.toLowerCase().includes(poSearch)
        );
    }

    // SKU filter
    if (state.filters.sku) {
        const skuSearch = state.filters.sku.toLowerCase();
        filtered = filtered.filter(row =>
            row.sku && row.sku.toLowerCase().includes(skuSearch)
        );
    }

    // Location filter
    if (state.filters.location) {
        filtered = filtered.filter(row =>
            row.normalizedLocation === state.filters.location
        );
    }

    // Plating filter
    if (state.filters.plating) {
        filtered = filtered.filter(row =>
            row.plating === state.filters.plating
        );
    }

    // Search query
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(row =>
            Object.values(row).some(val =>
                val && String(val).toLowerCase().includes(query)
            )
        );
    }

    // Apply sort
    if (state.sortColumn) {
        filtered.sort((a, b) => {
            let aVal = a[state.sortColumn];
            let bVal = b[state.sortColumn];

            // Handle nulls
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            // Numeric comparison for quantities
            if (['batchQty', 'totalQty', 'weightCasting', 'weightPolishing', 'weightPlating', 'accWt'].includes(state.sortColumn)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            if (aVal < bVal) return state.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return state.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    state.filteredData = filtered;
}

// ============================================
// Rendering
// ============================================

function renderStats() {
    elements.totalJobs.textContent = state.data.length;
    elements.activePOs.textContent = getUniqueValues(state.data, 'poNo').length;
    elements.lastRefresh.textContent = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderLocationCards() {
    const counts = getLocationCounts(state.filteredData);

    elements.locationCards.innerHTML = LOCATION_ORDER
        .filter(loc => counts[loc] > 0 || loc !== 'Other')
        .map(loc => `
            <div class="location-card ${state.filters.location === loc ? 'active' : ''}"
                 data-location="${loc}"
                 onclick="filterByLocation('${loc}')">
                <div class="location-name">${loc}</div>
                <div class="location-count">${counts[loc]}</div>
            </div>
        `).join('');
}

function renderFilters() {
    // Populate location dropdown
    const locations = LOCATION_ORDER.filter(loc =>
        state.data.some(row => row.normalizedLocation === loc)
    );
    elements.filterLocation.innerHTML = `
        <option value="">All Locations</option>
        ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
    `;

    // Populate plating dropdown
    const platings = getUniqueValues(state.data, 'plating');
    elements.filterPlating.innerHTML = `
        <option value="">All Plating</option>
        ${platings.map(p => `<option value="${p}">${p}</option>`).join('')}
    `;

    // Populate PO quick select dropdown
    const pos = getUniqueValues(state.data, 'poNo');
    elements.poQuickSelect.innerHTML = `
        <option value="">Analyze PO...</option>
        ${pos.map(po => `<option value="${po}">PO ${po}</option>`).join('')}
    `;
}

function renderTable() {
    const data = state.filteredData;

    elements.tableBody.innerHTML = data.map(row => `
        <tr onclick="showJobDetail('${row.jobNo}')">
            <td><strong>${row.jobNo}</strong></td>
            <td><span class="po-link" onclick="event.stopPropagation(); showPoAnalytics('${row.poNo}')">${row.poNo}</span></td>
            <td>${row.sku}</td>
            <td>${row.plating}</td>
            <td>${row.batchQty}</td>
            <td>${row.totalQty}</td>
            <td>${row.size}</td>
            <td>
                <span class="location-badge" data-location="${row.normalizedLocation}">
                    ${row.normalizedLocation}
                </span>
            </td>
            <td>${row.dateSending || '—'}</td>
        </tr>
    `).join('');

    elements.resultCount.textContent = `${data.length} jobs`;
    elements.showingCount.textContent = `Showing ${data.length} of ${state.data.length}`;

    // Update sort indicators
    document.querySelectorAll('.data-table th').forEach(th => {
        th.classList.remove('sorted');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
    });

    if (state.sortColumn) {
        const th = document.querySelector(`[data-sort="${state.sortColumn}"]`);
        if (th) {
            th.classList.add('sorted');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.textContent = state.sortDirection === 'asc' ? '↑' : '↓';
        }
    }
}

function renderDistributionChart() {
    const data = state.filteredData;
    const mode = state.distributionMode;

    // Calculate totals per location
    const locationData = {};
    LOCATION_ORDER.forEach(loc => {
        locationData[loc] = { jobs: 0, pieces: 0 };
    });

    data.forEach(job => {
        const loc = job.normalizedLocation;
        if (locationData[loc]) {
            locationData[loc].jobs++;
            locationData[loc].pieces += job.batchQty || 0;
        } else {
            locationData['Other'].jobs++;
            locationData['Other'].pieces += job.batchQty || 0;
        }
    });

    // Get total for percentage calculation
    const totalJobs = data.length;
    const totalPieces = data.reduce((sum, job) => sum + (job.batchQty || 0), 0);
    const total = mode === 'jobs' ? totalJobs : totalPieces;

    // Filter to only locations with data and find max
    const activeLocations = LOCATION_ORDER.filter(loc => locationData[loc][mode] > 0);
    const values = activeLocations.map(loc => locationData[loc][mode]);
    const maxValue = Math.max(...values, 1);

    // Add totals row first
    const totalJobsAll = data.length;
    const totalPiecesAll = data.reduce((sum, job) => sum + (job.batchQty || 0), 0);

    const totalsHtml = `
        <div class="dist-totals">
            <div class="dist-total-item">
                <span class="dist-total-value">${totalJobsAll}</span>
                <span class="dist-total-label">Total Jobs</span>
            </div>
            <div class="dist-total-item">
                <span class="dist-total-value">${totalPiecesAll.toLocaleString()}</span>
                <span class="dist-total-label">Total Pieces</span>
            </div>
        </div>
    `;

    const barsHtml = activeLocations.map(loc => {
        const value = locationData[loc][mode];
        const percentage = (value / maxValue) * 100;
        const ofTotal = total > 0 ? Math.round((value / total) * 100) : 0;

        return `
            <div class="dist-bar-row">
                <div class="dist-bar-label">${loc}</div>
                <div class="dist-bar-track">
                    <div class="dist-bar-fill" data-location="${loc}" style="width: ${percentage}%"></div>
                </div>
                <div class="dist-bar-value">
                    ${value.toLocaleString()}
                    <span class="percent">(${ofTotal}%)</span>
                </div>
            </div>
        `;
    }).join('');

    elements.distributionChart.innerHTML = totalsHtml + barsHtml;
}

function renderKanbanBoard() {
    const data = state.filteredData;

    // Group jobs by location
    const jobsByLocation = {};
    LOCATION_ORDER.forEach(loc => {
        jobsByLocation[loc] = [];
    });

    data.forEach(job => {
        const loc = job.normalizedLocation;
        if (jobsByLocation[loc]) {
            jobsByLocation[loc].push(job);
        } else {
            jobsByLocation['Other'].push(job);
        }
    });

    // Filter to only locations with jobs
    const activeLocations = LOCATION_ORDER.filter(loc => jobsByLocation[loc].length > 0);

    elements.kanbanBoard.innerHTML = activeLocations.map(loc => {
        const jobs = jobsByLocation[loc];
        const totalPieces = jobs.reduce((sum, job) => sum + (job.batchQty || 0), 0);

        return `
            <div class="kanban-column" data-location="${loc}">
                <div class="kanban-column-header">
                    <h3>${loc}</h3>
                    <div class="kanban-column-count">
                        <strong>${jobs.length}</strong> jobs · ${totalPieces.toLocaleString()} pcs
                    </div>
                </div>
                <div class="kanban-cards">
                    ${jobs.map(job => `
                        <div class="kanban-card" onclick="showJobDetail('${job.jobNo}')">
                            <div class="kanban-card-header">
                                <span class="kanban-card-job">${job.jobNo}</span>
                                <span class="kanban-card-qty">${job.batchQty} pcs</span>
                            </div>
                            <div class="kanban-card-sku">${job.sku} · ${job.plating}</div>
                            <div class="kanban-card-po">PO: <span onclick="event.stopPropagation(); showPoAnalytics('${job.poNo}')">${job.poNo}</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleViewMode(mode) {
    state.viewMode = mode;

    // Update toggle buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });

    // Toggle visibility
    if (mode === 'kanban') {
        elements.kanbanBoard.classList.remove('hidden');
        elements.tableContainer.classList.add('hidden');
        document.querySelector('.table-footer').classList.add('hidden');
        renderKanbanBoard();
    } else {
        elements.kanbanBoard.classList.add('hidden');
        elements.tableContainer.classList.remove('hidden');
        document.querySelector('.table-footer').classList.remove('hidden');
    }
}

function toggleDistributionMode(mode) {
    state.distributionMode = mode;

    // Update toggle buttons
    document.querySelectorAll('.distribution-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.distMode === mode);
    });

    renderDistributionChart();
}

function renderAll() {
    applyFilters();
    renderStats();
    renderLocationCards();
    renderDistributionChart();
    renderTable();

    // Re-render kanban if it's active
    if (state.viewMode === 'kanban') {
        renderKanbanBoard();
    }
}

// ============================================
// Event Handlers
// ============================================

function filterByLocation(location) {
    if (state.filters.location === location) {
        state.filters.location = '';
        elements.filterLocation.value = '';
    } else {
        state.filters.location = location;
        elements.filterLocation.value = location;
    }
    renderAll();
}

function showJobDetail(jobNo) {
    const job = state.data.find(row => row.jobNo === jobNo);
    if (!job) return;

    elements.modalJobTitle.textContent = `Job ${job.jobNo}`;
    elements.modalContent.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">Job Number</span>
                <span class="detail-value large">${job.jobNo}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">PO Number</span>
                <span class="detail-value large">${job.poNo}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Design / SKU</span>
                <span class="detail-value">${job.sku}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Plating</span>
                <span class="detail-value">${job.plating}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Batch Qty</span>
                <span class="detail-value">${job.batchQty}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Total Qty</span>
                <span class="detail-value">${job.totalQty}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Size</span>
                <span class="detail-value">${job.size}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Current Location</span>
                <span class="detail-value">
                    <span class="location-badge" data-location="${job.normalizedLocation}">${job.normalizedLocation}</span>
                    ${job.location !== job.normalizedLocation ? `<br><small style="color: var(--text-muted)">Raw: "${job.location}"</small>` : ''}
                </span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date Sending</span>
                <span class="detail-value">${job.dateSending || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date Receive</span>
                <span class="detail-value">${job.dateReceive || '—'}</span>
            </div>
            <div class="detail-item full-width">
                <span class="detail-label">Notes (Pre-Production)</span>
                <span class="detail-value">${job.notesPre || '—'}</span>
            </div>
            <div class="detail-item full-width">
                <span class="detail-label">Notes (Production)</span>
                <span class="detail-value">${job.notesNew || '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Weight after Casting</span>
                <span class="detail-value">${job.weightCasting ? job.weightCasting + ' g' : '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Weight after Polishing</span>
                <span class="detail-value">${job.weightPolishing ? job.weightPolishing + ' g' : '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Weight after Plating</span>
                <span class="detail-value">${job.weightPlating ? job.weightPlating + ' g' : '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Accessory Weight</span>
                <span class="detail-value">${job.accWt ? job.accWt + ' g' : '—'}</span>
            </div>
        </div>
    `;

    elements.jobModal.classList.remove('hidden');
}

function setupEventListeners() {
    // Filters
    elements.filterPO.addEventListener('input', (e) => {
        state.filters.po = e.target.value;
        renderAll();
    });

    elements.filterSKU.addEventListener('input', (e) => {
        state.filters.sku = e.target.value;
        renderAll();
    });

    elements.filterLocation.addEventListener('change', (e) => {
        state.filters.location = e.target.value;
        renderAll();
    });

    elements.filterPlating.addEventListener('change', (e) => {
        state.filters.plating = e.target.value;
        renderAll();
    });

    elements.clearFilters.addEventListener('click', () => {
        state.filters = { po: '', sku: '', location: '', plating: '' };
        state.searchQuery = '';
        elements.filterPO.value = '';
        elements.filterSKU.value = '';
        elements.filterLocation.value = '';
        elements.filterPlating.value = '';
        elements.searchInput.value = '';
        renderAll();
    });

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderAll();
    });

    // Sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (state.sortColumn === column) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = column;
                state.sortDirection = 'asc';
            }
            renderAll();
        });
    });

    // Modal
    elements.closeJobModal.addEventListener('click', () => {
        elements.jobModal.classList.add('hidden');
    });

    elements.jobModal.addEventListener('click', (e) => {
        if (e.target === elements.jobModal) {
            elements.jobModal.classList.add('hidden');
        }
    });

    // PO Analytics Modal
    elements.closePoAnalytics.addEventListener('click', () => {
        elements.poAnalyticsModal.classList.add('hidden');
        elements.poQuickSelect.value = ''; // Reset dropdown
    });

    elements.poAnalyticsModal.addEventListener('click', (e) => {
        if (e.target === elements.poAnalyticsModal) {
            elements.poAnalyticsModal.classList.add('hidden');
            elements.poQuickSelect.value = ''; // Reset dropdown
        }
    });

    // Toggle buttons for Jobs/Pieces
    document.querySelectorAll('.chart-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleAnalyticsMode(btn.dataset.mode);
        });
    });

    // Expand jobs list button
    elements.expandJobsBtn.addEventListener('click', toggleJobsList);

    // Distribution chart toggle
    document.querySelectorAll('.distribution-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleDistributionMode(btn.dataset.distMode);
        });
    });

    // View mode toggle (Table/Kanban)
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleViewMode(btn.dataset.view);
        });
    });

    // Query Assistant
    let queryTimeout;
    elements.queryInput.addEventListener('input', (e) => {
        clearTimeout(queryTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            elements.queryResults.classList.add('hidden');
            return;
        }

        // Debounce the query processing
        queryTimeout = setTimeout(() => {
            const result = processQuery(query);
            renderQueryResults(result);
        }, 300);
    });

    elements.queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(queryTimeout);
            const query = e.target.value.trim();
            const result = processQuery(query);
            renderQueryResults(result);
        } else if (e.key === 'Escape') {
            hideQueryResults();
        }
    });

    // Close query results and help panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.query-assistant-wrapper')) {
            elements.queryResults.classList.add('hidden');
            const helpPanel = document.getElementById('queryHelpPanel');
            if (helpPanel) helpPanel.classList.add('hidden');
        }
    });
}

// ============================================
// PO Analytics
// ============================================

function showPoAnalytics(poNo) {
    state.selectedPO = poNo;
    state.analyticsMode = 'jobs';

    // Get all jobs for this PO
    const poJobs = state.data.filter(job => job.poNo === poNo);

    if (poJobs.length === 0) return;

    // Update title
    elements.poAnalyticsTitle.textContent = `PO ${poNo} Analytics`;

    // Render summary stats
    renderPoSummary(poJobs);

    // Render bar chart
    renderPoChart(poJobs);

    // Render jobs list
    renderPoJobsList(poJobs);

    // Reset toggle buttons
    document.querySelectorAll('.chart-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === 'jobs');
    });

    // Reset expand button
    elements.expandJobsBtn.classList.remove('expanded');
    elements.poJobsList.classList.add('hidden');

    // Show modal
    elements.poAnalyticsModal.classList.remove('hidden');
}

// Define which locations are considered "complete" (ready for shipping)
const COMPLETE_LOCATIONS = ['Packing', 'QC'];

// Define production stage order (for pipeline visualization)
const STAGE_ORDER = {
    'Wax': 1,
    'Casting': 2,
    'MKS Setting': 3,
    'Filing/Assembly': 4,
    'Polishing': 5,
    'Electro': 6,
    'Plating': 6,
    'Packing': 7,
    'QC': 8,
    'Outsource': 5,
    'Other': 0
};

function calculateProgress(poJobs) {
    if (poJobs.length === 0) return {
        completionPercent: 0,
        completedJobs: 0,
        completedPieces: 0,
        totalJobs: 0,
        totalPieces: 0,
        stageCounts: {}
    };

    const totalJobs = poJobs.length;
    const totalPieces = poJobs.reduce((sum, job) => sum + (job.batchQty || 0), 0);

    // Jobs/pieces in final stages (Packing/QC) = actually complete
    const completedJobs = poJobs.filter(job => COMPLETE_LOCATIONS.includes(job.normalizedLocation)).length;
    const completedPieces = poJobs
        .filter(job => COMPLETE_LOCATIONS.includes(job.normalizedLocation))
        .reduce((sum, job) => sum + (job.batchQty || 0), 0);

    // Completion % is based on pieces at Packing/QC
    const completionPercent = totalPieces > 0 ? Math.round((completedPieces / totalPieces) * 100) : 0;

    // Count jobs at each stage for pipeline view
    const stageCounts = {};
    poJobs.forEach(job => {
        const loc = job.normalizedLocation;
        if (!stageCounts[loc]) {
            stageCounts[loc] = { jobs: 0, pieces: 0 };
        }
        stageCounts[loc].jobs++;
        stageCounts[loc].pieces += job.batchQty || 0;
    });

    return {
        completionPercent,
        completedJobs,
        completedPieces,
        totalJobs,
        totalPieces,
        stageCounts
    };
}

function renderPoSummary(poJobs) {
    const totalJobs = poJobs.length;
    const totalPieces = poJobs.reduce((sum, job) => sum + (job.batchQty || 0), 0);
    const uniqueSKUs = [...new Set(poJobs.map(job => job.sku))].length;
    const progress = calculateProgress(poJobs);

    // Determine progress bar color
    let progressColor = 'var(--status-casting)'; // red for low
    if (progress.completionPercent >= 70) progressColor = 'var(--status-electro)'; // green
    else if (progress.completionPercent >= 40) progressColor = 'var(--status-wax)'; // amber

    elements.poSummary.innerHTML = `
        <div class="summary-stat">
            <div class="stat-value">${totalJobs}</div>
            <div class="stat-label">Total Jobs</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">${totalPieces.toLocaleString()}</div>
            <div class="stat-label">Total Pieces</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">${uniqueSKUs}</div>
            <div class="stat-label">SKUs</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">${progress.completedJobs}/${totalJobs}</div>
            <div class="stat-label">At Packing</div>
        </div>
        <div class="progress-section">
            <div class="progress-header">
                <span class="progress-label">Overall Progress</span>
                <span class="progress-percent">${progress.completionPercent}%</span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: ${progress.completionPercent}%; background: ${progressColor}"></div>
            </div>
            <div class="progress-detail">
                ${progress.completedPieces.toLocaleString()} of ${totalPieces.toLocaleString()} pieces ready for shipping
            </div>
        </div>
    `;
}

function detectBottlenecks(poJobs) {
    const totalJobs = poJobs.length;
    const locationCounts = {};

    poJobs.forEach(job => {
        const loc = job.normalizedLocation;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const bottlenecks = [];
    for (const [loc, count] of Object.entries(locationCounts)) {
        const percent = (count / totalJobs) * 100;
        // Flag as bottleneck if >40% of jobs are stuck at one early/mid location
        if (percent >= 40 && !COMPLETE_LOCATIONS.includes(loc)) {
            bottlenecks.push({
                location: loc,
                jobs: count,
                percent: Math.round(percent),
                severity: percent >= 60 ? 'high' : 'medium'
            });
        }
    }

    return bottlenecks.sort((a, b) => b.percent - a.percent);
}

function renderPoChart(poJobs) {
    const mode = state.analyticsMode;
    const totalJobs = poJobs.length;
    const totalPieces = poJobs.reduce((sum, job) => sum + (job.batchQty || 0), 0);

    // Calculate data per location
    const locationData = {};
    LOCATION_ORDER.forEach(loc => {
        locationData[loc] = { jobs: 0, pieces: 0 };
    });

    poJobs.forEach(job => {
        const loc = job.normalizedLocation;
        if (locationData[loc]) {
            locationData[loc].jobs++;
            locationData[loc].pieces += job.batchQty || 0;
        } else {
            locationData['Other'].jobs++;
            locationData['Other'].pieces += job.batchQty || 0;
        }
    });

    // Detect bottlenecks
    const bottlenecks = detectBottlenecks(poJobs);
    const bottleneckLocs = bottlenecks.map(b => b.location);

    // Find max value for scaling
    const values = Object.values(locationData).map(d => d[mode]);
    const maxValue = Math.max(...values, 1);

    // Filter to only show locations with data
    const activeLocations = LOCATION_ORDER.filter(loc => locationData[loc][mode] > 0);

    // Render bottleneck alert if any
    let alertHtml = '';
    if (bottlenecks.length > 0) {
        const topBottleneck = bottlenecks[0];
        alertHtml = `
            <div class="bottleneck-alert ${topBottleneck.severity}">
                <span class="alert-icon">⚠</span>
                <span class="alert-text">
                    <strong>Bottleneck Detected:</strong> ${topBottleneck.percent}% of jobs stuck at ${topBottleneck.location}
                </span>
            </div>
        `;
    }

    elements.poBarChart.innerHTML = alertHtml + activeLocations.map(loc => {
        const value = locationData[loc][mode];
        const percentage = (value / maxValue) * 100;
        const isBottleneck = bottleneckLocs.includes(loc);
        const jobPercent = mode === 'jobs' ? Math.round((value / totalJobs) * 100) : Math.round((value / totalPieces) * 100);

        return `
            <div class="bar-row ${isBottleneck ? 'bottleneck' : ''}">
                <div class="bar-label">
                    ${loc}
                    ${isBottleneck ? '<span class="bottleneck-badge">!</span>' : ''}
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${isBottleneck ? 'bottleneck-fill' : ''}" data-location="${loc}" style="width: ${percentage}%"></div>
                </div>
                <div class="bar-value">${value.toLocaleString()} <span class="bar-percent">(${jobPercent}%)</span></div>
            </div>
        `;
    }).join('');
}

function renderPoJobsList(poJobs) {
    // Sort by location order
    const sortedJobs = [...poJobs].sort((a, b) => {
        const aIndex = LOCATION_ORDER.indexOf(a.normalizedLocation);
        const bIndex = LOCATION_ORDER.indexOf(b.normalizedLocation);
        return aIndex - bIndex;
    });

    elements.poJobsList.innerHTML = sortedJobs.map(job => `
        <div class="po-job-item" onclick="showJobDetail('${job.jobNo}'); elements.poAnalyticsModal.classList.add('hidden');">
            <span class="job-no">${job.jobNo}</span>
            <span class="job-sku">${job.sku} · ${job.batchQty} pcs</span>
            <span class="location-badge" data-location="${job.normalizedLocation}">${job.normalizedLocation}</span>
        </div>
    `).join('');

    // Update button text
    elements.expandJobsBtn.querySelector('span:first-child').textContent = `View All Jobs (${poJobs.length})`;
}

function toggleAnalyticsMode(mode) {
    state.analyticsMode = mode;

    // Update toggle buttons
    document.querySelectorAll('.chart-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Re-render chart with new mode
    const poJobs = state.data.filter(job => job.poNo === state.selectedPO);
    renderPoChart(poJobs);
}

function toggleJobsList() {
    elements.expandJobsBtn.classList.toggle('expanded');
    elements.poJobsList.classList.toggle('hidden');
}

// ============================================
// Data Fetching
// ============================================

async function fetchLiveData() {
    if (CONFIG.USE_MOCK_DATA) {
        console.log('Using mock data (CONFIG.USE_MOCK_DATA = true)');
        return { jobs: MOCK_DATA, fromServer: false };
    }

    try {
        const response = await fetch(CONFIG.API_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        console.log(`Fetched ${data.count} jobs from server at ${data.timestamp}`);
        return { jobs: data.jobs, fromServer: true, timestamp: data.timestamp };

    } catch (error) {
        console.warn('Server not available, using mock data:', error.message);
        return { jobs: MOCK_DATA, fromServer: false, error: error.message };
    }
}

async function refreshData() {
    const result = await fetchLiveData();

    state.data = processData(result.jobs);
    state.filteredData = [...state.data];
    state.isConnected = result.fromServer;
    state.lastUpdate = new Date();

    renderFilters();
    renderAll();
    updateConnectionStatus(result.fromServer, result.error);
}

function updateConnectionStatus(isConnected, error) {
    const statusText = elements.lastRefresh;

    if (isConnected) {
        statusText.textContent = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        statusText.style.color = '';
    } else {
        statusText.textContent = 'Offline';
        statusText.style.color = '#ef4444';
    }
}

function startAutoRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
    }

    state.refreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
        refreshData();
    }, CONFIG.REFRESH_INTERVAL);

    console.log(`Auto-refresh enabled: every ${CONFIG.REFRESH_INTERVAL / 1000} seconds`);
}

function stopAutoRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }
}

// ============================================
// Initialization
// ============================================

async function init() {
    initElements();
    setupEventListeners();

    // Show loading state
    elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">Loading data...</td></tr>';

    // Fetch data (from server or fallback to mock)
    await refreshData();

    // Start auto-refresh
    startAutoRefresh();

    console.log('Location Dashboard initialized');
    console.log('Connected to server:', state.isConnected);
    console.log('Loaded', state.data.length, 'jobs');
}

// ============================================
// Query Assistant - Enhanced with Decision Tree
// ============================================

const QUERY_SUGGESTIONS = [
    "Where is C8493E?",
    "How many pieces left in PO 41393?",
    "Which PO has the most at polishing?",
    "Rank POs by progress",
    "Jobs not at packing",
    "Average pieces per job"
];

// Entity extraction patterns
const ENTITY_PATTERNS = {
    po: /(?:po\s*#?\s*|purchase\s*order\s*)(\d{4,6})|(?:^|\s)(\d{5})(?:\s|$)/gi,
    sku: /\b([A-Z]\d{3,5}[A-Z]?)\b/gi,
    location: null, // Will match against LOCATION_ORDER
    plating: /\b(gold\s*vermeil|rhodium|rose\s*gold|silver|platinum)\b/gi,
    quantity: /(\d+)\s*(?:pcs|pieces?|jobs?|units?)/gi
};

// Intent keywords for decision tree
const INTENT_KEYWORDS = {
    count: ['how many', 'count', 'number of', 'total', 'amount'],
    list: ['show', 'list', 'display', 'what are'],
    compare: ['compare', 'versus', 'vs', 'difference', 'between'],
    progress: ['progress', 'status', 'completion', 'complete', 'done', 'ready', 'finished', 'closest to', 'furthest from', 'ahead', 'behind'],
    bottleneck: ['bottleneck', 'stuck', 'blocked', 'slow', 'delay', 'problem', 'issue'],
    largest: ['most', 'largest', 'biggest', 'highest', 'maximum', 'max', 'busiest'],
    smallest: ['least', 'smallest', 'fewest', 'lowest', 'minimum', 'min', 'emptiest'],
    remaining: ['remaining', 'left', 'to go', 'not done', 'pending', 'incomplete', 'unfinished'],
    notAt: ['not at', 'not in', 'outside', 'except', 'excluding', 'besides'],
    ranking: ['rank', 'order', 'sort', 'by progress', 'by size', 'by pieces', 'by jobs'],
    whereIs: ['where is', 'where are', 'find', 'locate', 'which location'],
    empty: ['empty', 'no jobs', 'zero', 'none', 'nothing'],
    location: ['where', 'location', 'at', 'in'],
    pieces: ['pieces', 'pcs', 'units', 'quantity', 'qty'],
    jobs: ['jobs', 'batches', 'orders'],
    average: ['average', 'avg', 'mean', 'per job', 'per po']
};

/**
 * Extract all entities from a query string
 */
function extractEntities(query) {
    const q = query.toLowerCase();
    const entities = {
        pos: [],
        skus: [],
        locations: [],
        platings: [],
        quantities: []
    };

    // Extract PO numbers
    let match;
    const poRegex = /(?:po\s*#?\s*|purchase\s*order\s*)(\d{4,6})|(?:^|\s)(\d{5})(?:\s|$)/gi;
    while ((match = poRegex.exec(q)) !== null) {
        const po = match[1] || match[2];
        if (po && !entities.pos.includes(po)) {
            entities.pos.push(po);
        }
    }

    // Extract SKUs
    const skuRegex = /\b([A-Z]\d{3,5}[A-Z]?)\b/gi;
    while ((match = skuRegex.exec(query)) !== null) {
        const sku = match[1].toUpperCase();
        if (!entities.skus.includes(sku)) {
            entities.skus.push(sku);
        }
    }

    // Extract locations by matching against known locations
    // First check location mappings (more specific variations)
    for (const [standardName, variations] of Object.entries(LOCATION_MAPPINGS)) {
        for (const variation of variations) {
            // Use word boundary matching for short terms to avoid false positives
            const regex = variation.length <= 3
                ? new RegExp(`\\b${variation}\\b`, 'i')
                : new RegExp(variation, 'i');
            if (regex.test(q) && !entities.locations.includes(standardName)) {
                entities.locations.push(standardName);
                break;
            }
        }
    }

    // Also check standard location names
    for (const loc of LOCATION_ORDER) {
        if (entities.locations.includes(loc)) continue; // Already found
        const locLower = loc.toLowerCase();
        // Handle special cases like "Filing/Assembly"
        const variations = [locLower, locLower.replace('/', ' '), locLower.replace('/', ''), locLower.split('/')[0]];
        for (const variation of variations) {
            if (variation.length >= 3 && q.includes(variation) && !entities.locations.includes(loc)) {
                entities.locations.push(loc);
                break;
            }
        }
    }

    // Extract platings
    const platings = ['gold vermeil', 'rhodium', 'rose gold', 'silver', 'platinum'];
    for (const plating of platings) {
        if (q.includes(plating)) {
            entities.platings.push(plating.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        }
    }

    return entities;
}

/**
 * Determine what type of entity the user wants as the answer
 */
function determineAnswerType(query) {
    const q = query.toLowerCase();

    // Check what the user is asking for
    if (/which\s+po|what\s+po|po\s+has|pos?\s+have|pos?\s+with/.test(q)) {
        return 'po';
    }
    if (/which\s+location|what\s+location|where\s+(is|are)|at\s+which/.test(q)) {
        return 'location';
    }
    if (/which\s+sku|what\s+sku|which\s+design/.test(q)) {
        return 'sku';
    }
    return null; // Let the intent handler decide
}

/**
 * Determine the intent of the query
 */
function determineIntent(query) {
    const q = query.toLowerCase();
    const answerType = determineAnswerType(q);

    // Check for comparison intent first (has multiple POs or "vs"/"compare")
    if (q.includes(' vs ') || q.includes('compare') || q.includes('versus')) {
        return 'compare';
    }

    // Check for "where is" SKU queries
    for (const keyword of INTENT_KEYWORDS.whereIs) {
        if (q.includes(keyword)) return 'where_is';
    }

    // Check for ranking queries
    for (const keyword of INTENT_KEYWORDS.ranking) {
        if (q.includes(keyword)) return 'ranking';
    }

    // Check for remaining/left queries
    for (const keyword of INTENT_KEYWORDS.remaining) {
        if (q.includes(keyword)) return 'remaining';
    }

    // Check for "not at" queries
    for (const keyword of INTENT_KEYWORDS.notAt) {
        if (q.includes(keyword)) return 'not_at';
    }

    // Check for empty location queries
    for (const keyword of INTENT_KEYWORDS.empty) {
        if (q.includes(keyword)) return 'empty';
    }

    // Check for average queries
    for (const keyword of INTENT_KEYWORDS.average) {
        if (q.includes(keyword)) return 'average';
    }

    // Check for bottleneck - but consider what user wants to know
    for (const keyword of INTENT_KEYWORDS.bottleneck) {
        if (q.includes(keyword)) {
            if (answerType === 'po') return 'bottleneck_po';
            return 'bottleneck';
        }
    }

    // Check for progress/status - but consider what user wants to know
    for (const keyword of INTENT_KEYWORDS.progress) {
        if (q.includes(keyword)) {
            if (answerType === 'po') return 'progress_po';
            return 'progress';
        }
    }

    // Check for superlative queries - consider what user wants
    const hasLargest = INTENT_KEYWORDS.largest.some(k => q.includes(k));
    const hasSmallest = INTENT_KEYWORDS.smallest.some(k => q.includes(k));

    if (hasLargest || hasSmallest) {
        return hasLargest ? 'largest' : 'smallest';
    }

    // Check for list intent
    for (const keyword of INTENT_KEYWORDS.list) {
        if (q.includes(keyword)) return 'list';
    }

    // Default to count for "how many" etc
    for (const keyword of INTENT_KEYWORDS.count) {
        if (q.includes(keyword)) return 'count';
    }

    // If asking "which PO" without clear intent, default to info about POs
    if (answerType === 'po' && q.includes('which')) {
        return 'list_pos';
    }

    // Determine metric preference
    const wantsPieces = INTENT_KEYWORDS.pieces.some(k => q.includes(k));
    const wantsJobs = INTENT_KEYWORDS.jobs.some(k => q.includes(k));

    return wantsPieces ? 'count_pieces' : (wantsJobs ? 'count_jobs' : 'info');
}

/**
 * Filter data based on extracted entities
 */
function filterByEntities(data, entities) {
    let filtered = [...data];

    if (entities.pos.length > 0) {
        filtered = filtered.filter(j => entities.pos.includes(j.poNo));
    }

    if (entities.skus.length > 0) {
        filtered = filtered.filter(j =>
            entities.skus.some(sku => j.sku && j.sku.toUpperCase().includes(sku))
        );
    }

    if (entities.locations.length > 0) {
        filtered = filtered.filter(j => entities.locations.includes(j.normalizedLocation));
    }

    if (entities.platings.length > 0) {
        filtered = filtered.filter(j =>
            entities.platings.some(p => j.plating && j.plating.toLowerCase().includes(p.toLowerCase()))
        );
    }

    return filtered;
}

/**
 * Build context string from entities
 */
function buildContextString(entities) {
    const parts = [];
    if (entities.locations.length > 0) parts.push(`at ${entities.locations.join(', ')}`);
    if (entities.pos.length > 0) parts.push(`in PO ${entities.pos.join(', ')}`);
    if (entities.skus.length > 0) parts.push(`for ${entities.skus.join(', ')}`);
    if (entities.platings.length > 0) parts.push(`(${entities.platings.join(', ')})`);
    return parts.join(' ');
}

/**
 * Build filter actions based on entities
 */
function buildFilterActions(entities) {
    const actions = [];

    if (entities.pos.length === 1) {
        const po = entities.pos[0];
        actions.push({
            label: 'View PO Analytics',
            action: () => showPoAnalytics(po)
        });
        actions.push({
            label: 'Filter to PO',
            action: () => {
                state.filters.po = po;
                elements.filterPO.value = po;
                renderAll();
            }
        });
    }

    if (entities.locations.length === 1) {
        const loc = entities.locations[0];
        actions.push({
            label: 'Filter to ' + loc,
            action: () => {
                state.filters.location = loc;
                elements.filterLocation.value = loc;
                renderAll();
            }
        });
    }

    if (entities.skus.length === 1) {
        const sku = entities.skus[0];
        actions.push({
            label: 'Filter to ' + sku,
            action: () => {
                state.filters.sku = sku;
                elements.filterSKU.value = sku;
                renderAll();
            }
        });
    }

    return actions;
}

/**
 * Main query processor using decision tree
 */
function processQuery(query) {
    if (!query || query.length < 2) {
        return null;
    }

    const data = state.data;
    const q = query.toLowerCase().trim();

    // Step 1: Extract all entities
    const entities = extractEntities(query);

    // Step 2: Determine intent
    const intent = determineIntent(q);

    // Step 3: Execute based on intent (decision tree)
    switch (intent) {
        case 'compare':
            return executeCompareQuery(data, entities, q);

        case 'largest':
        case 'smallest':
            return executeSuperlativeQuery(data, entities, q, intent);

        case 'bottleneck_po':
            return executeBottleneckPoQuery(data, entities);

        case 'bottleneck':
            return executeBottleneckQuery(data, entities);

        case 'progress_po':
            return executeProgressPoQuery(data, entities);

        case 'progress':
            return executeProgressQuery(data, entities);

        case 'where_is':
            return executeWhereIsQuery(data, entities);

        case 'ranking':
            return executeRankingQuery(data, entities, q);

        case 'remaining':
            return executeRemainingQuery(data, entities);

        case 'not_at':
            return executeNotAtQuery(data, entities);

        case 'empty':
            return executeEmptyQuery(data, entities);

        case 'average':
            return executeAverageQuery(data, entities);

        case 'list':
            return executeListQuery(data, entities);

        case 'list_pos':
            return executeListPosQuery(data, entities);

        case 'count_pieces':
            return executeCountQuery(data, entities, 'pieces');

        case 'count_jobs':
        case 'count':
            return executeCountQuery(data, entities, 'jobs');

        case 'info':
        default:
            return executeInfoQuery(data, entities);
    }
}

/**
 * Execute a count query (how many jobs/pieces)
 */
function executeCountQuery(data, entities, metric) {
    const filtered = filterByEntities(data, entities);
    const contextStr = buildContextString(entities);

    const jobCount = filtered.length;
    const pieceCount = filtered.reduce((sum, j) => sum + (j.batchQty || 0), 0);

    // Calculate percentage of filtered vs total (accounting for entity filters)
    let baseData = data;
    if (entities.pos.length > 0) {
        baseData = data.filter(j => entities.pos.includes(j.poNo));
    }
    const baseTotal = metric === 'pieces'
        ? baseData.reduce((sum, j) => sum + (j.batchQty || 0), 0)
        : baseData.length;
    const percent = baseTotal > 0 ? Math.round((metric === 'pieces' ? pieceCount : jobCount) / baseTotal * 100) : 0;

    if (metric === 'pieces') {
        return {
            main: `${pieceCount.toLocaleString()} pieces`,
            detail: `${jobCount} jobs ${contextStr}`,
            context: `${percent}% of ${entities.pos.length > 0 ? 'PO' : 'total'}`,
            actions: buildFilterActions(entities)
        };
    } else {
        return {
            main: `${jobCount} jobs`,
            detail: `${pieceCount.toLocaleString()} pieces ${contextStr}`,
            context: `${percent}% of ${entities.pos.length > 0 ? 'PO' : 'total'}`,
            actions: buildFilterActions(entities)
        };
    }
}

/**
 * Execute an info query (general information)
 */
function executeInfoQuery(data, entities) {
    const filtered = filterByEntities(data, entities);

    if (filtered.length === 0) {
        return {
            main: 'No results',
            detail: `No jobs found ${buildContextString(entities)}`,
            context: 'Try different search terms',
            actions: []
        };
    }

    const jobCount = filtered.length;
    const pieceCount = filtered.reduce((sum, j) => sum + (j.batchQty || 0), 0);
    const locations = [...new Set(filtered.map(j => j.normalizedLocation))];
    const contextStr = buildContextString(entities);

    return {
        main: `${jobCount} jobs`,
        detail: `${pieceCount.toLocaleString()} pieces ${contextStr}`,
        context: `Locations: ${locations.join(', ')}`,
        actions: buildFilterActions(entities)
    };
}

/**
 * Execute a list query
 */
function executeListQuery(data, entities) {
    const filtered = filterByEntities(data, entities);
    const contextStr = buildContextString(entities);

    if (filtered.length === 0) {
        return {
            main: 'No results',
            detail: `No jobs found ${contextStr}`,
            context: '',
            actions: []
        };
    }

    const preview = filtered.slice(0, 5).map(j => `${j.jobNo} (${j.batchQty}pcs)`).join(', ');
    const more = filtered.length > 5 ? `... +${filtered.length - 5} more` : '';

    return {
        main: `${filtered.length} jobs`,
        detail: contextStr || 'matching your query',
        context: preview + more,
        actions: buildFilterActions(entities)
    };
}

/**
 * Execute a list POs query - lists all POs with summary
 */
function executeListPosQuery(data, entities) {
    const poList = [...new Set(data.map(j => j.poNo))];

    const poSummaries = poList.map(po => {
        const jobs = data.filter(j => j.poNo === po);
        const pieces = jobs.reduce((sum, j) => sum + (j.batchQty || 0), 0);
        const progress = calculateProgress(jobs);
        return { po, jobs: jobs.length, pieces, progress: progress.completionPercent };
    });

    // Sort by number of jobs
    poSummaries.sort((a, b) => b.jobs - a.jobs);

    return {
        main: `${poList.length} POs`,
        detail: poSummaries.map(p => `PO ${p.po}: ${p.jobs} jobs, ${p.progress}% done`).join(' | '),
        context: `Total: ${data.length} jobs, ${data.reduce((s,j) => s + (j.batchQty||0), 0).toLocaleString()} pieces`,
        actions: poList.length > 0 ? [
            { label: `View ${poSummaries[0].po}`, action: () => showPoAnalytics(poSummaries[0].po) }
        ] : []
    };
}

/**
 * Execute a progress query
 */
function executeProgressQuery(data, entities) {
    let filtered = filterByEntities(data, entities);

    // If no filters, use all data
    if (entities.pos.length === 0 && entities.skus.length === 0) {
        filtered = data;
    }

    const progress = calculateProgress(filtered);
    const contextStr = buildContextString(entities) || 'Overall';

    return {
        main: `${progress.completionPercent}%`,
        detail: `${progress.completedPieces.toLocaleString()} of ${progress.totalPieces.toLocaleString()} pieces ready`,
        context: `${contextStr} - ${progress.completedJobs}/${progress.totalJobs} jobs at Packing/QC`,
        actions: entities.pos.length === 1
            ? [{ label: 'View Analytics', action: () => showPoAnalytics(entities.pos[0]) }]
            : []
    };
}

/**
 * Execute a bottleneck query - finds the bottleneck location
 */
function executeBottleneckQuery(data, entities) {
    let filtered = filterByEntities(data, entities);

    if (entities.pos.length === 0 && entities.skus.length === 0) {
        filtered = data;
    }

    const bottlenecks = detectBottlenecks(filtered);
    const contextStr = buildContextString(entities) || 'Overall';

    if (bottlenecks.length === 0) {
        return {
            main: 'No bottlenecks',
            detail: `Jobs are well distributed ${contextStr}`,
            context: 'No single location has >40% of jobs',
            actions: entities.pos.length === 1
                ? [{ label: 'View Analytics', action: () => showPoAnalytics(entities.pos[0]) }]
                : []
        };
    }

    const top = bottlenecks[0];
    return {
        main: `${top.location}`,
        detail: `${top.percent}% of jobs stuck here (${top.jobs} jobs)`,
        context: bottlenecks.length > 1
            ? `Also: ${bottlenecks.slice(1).map(b => `${b.location} (${b.percent}%)`).join(', ')}`
            : contextStr,
        actions: [
            { label: 'Filter to ' + top.location, action: () => {
                state.filters.location = top.location;
                elements.filterLocation.value = top.location;
                renderAll();
            }},
            ...(entities.pos.length === 1
                ? [{ label: 'View Analytics', action: () => showPoAnalytics(entities.pos[0]) }]
                : [])
        ]
    };
}

/**
 * Execute a bottleneck PO query - finds which PO has the worst bottleneck
 */
function executeBottleneckPoQuery(data, entities) {
    // Get unique POs
    const poList = [...new Set(data.map(j => j.poNo))];

    // Calculate bottleneck severity for each PO
    const poBottlenecks = [];
    for (const po of poList) {
        const poJobs = data.filter(j => j.poNo === po);
        const bottlenecks = detectBottlenecks(poJobs);

        if (bottlenecks.length > 0) {
            const worst = bottlenecks[0];
            poBottlenecks.push({
                po,
                location: worst.location,
                percent: worst.percent,
                jobs: worst.jobs,
                totalJobs: poJobs.length,
                severity: worst.severity
            });
        }
    }

    if (poBottlenecks.length === 0) {
        return {
            main: 'No bottlenecks',
            detail: 'All POs have well-distributed jobs',
            context: 'No PO has >40% of jobs at one location',
            actions: []
        };
    }

    // Sort by severity (percent)
    poBottlenecks.sort((a, b) => b.percent - a.percent);
    const worst = poBottlenecks[0];

    return {
        main: `PO ${worst.po}`,
        detail: `${worst.percent}% of jobs stuck at ${worst.location}`,
        context: poBottlenecks.length > 1
            ? `Also: PO ${poBottlenecks.slice(1, 3).map(p => `${p.po} (${p.percent}% at ${p.location})`).join(', ')}`
            : `${worst.jobs} of ${worst.totalJobs} jobs at ${worst.location}`,
        actions: [
            { label: 'View Analytics', action: () => showPoAnalytics(worst.po) },
            { label: 'Filter to PO', action: () => {
                state.filters.po = worst.po;
                elements.filterPO.value = worst.po;
                renderAll();
            }}
        ]
    };
}

/**
 * Execute a progress PO query - finds which PO is closest to completion
 */
function executeProgressPoQuery(data, entities) {
    // Get unique POs
    const poList = [...new Set(data.map(j => j.poNo))];

    // Calculate progress for each PO
    const poProgress = [];
    for (const po of poList) {
        const poJobs = data.filter(j => j.poNo === po);
        const progress = calculateProgress(poJobs);
        poProgress.push({
            po,
            percent: progress.completionPercent,
            completedPieces: progress.completedPieces,
            totalPieces: progress.totalPieces,
            completedJobs: progress.completedJobs,
            totalJobs: progress.totalJobs
        });
    }

    // Sort by progress (highest first)
    poProgress.sort((a, b) => b.percent - a.percent);

    const best = poProgress[0];
    const worst = poProgress[poProgress.length - 1];

    return {
        main: `PO ${best.po} leads`,
        detail: `${best.percent}% complete (${best.completedPieces.toLocaleString()}/${best.totalPieces.toLocaleString()} pcs)`,
        context: `Furthest behind: PO ${worst.po} at ${worst.percent}%`,
        actions: [
            { label: `View ${best.po}`, action: () => showPoAnalytics(best.po) },
            { label: `View ${worst.po}`, action: () => showPoAnalytics(worst.po) }
        ]
    };
}

/**
 * Execute a compare query (PO vs PO)
 */
function executeCompareQuery(data, entities, query) {
    if (entities.pos.length < 2) {
        // Try to find two PO numbers in the query
        const poMatches = query.match(/\d{5}/g);
        if (poMatches && poMatches.length >= 2) {
            entities.pos = poMatches.slice(0, 2);
        }
    }

    if (entities.pos.length < 2) {
        return {
            main: 'Need 2 POs',
            detail: 'Please specify two PO numbers to compare',
            context: 'e.g., "Compare PO 40413 vs 41393"',
            actions: []
        };
    }

    const [po1, po2] = entities.pos;
    const jobs1 = data.filter(j => j.poNo === po1);
    const jobs2 = data.filter(j => j.poNo === po2);

    const pieces1 = jobs1.reduce((sum, j) => sum + (j.batchQty || 0), 0);
    const pieces2 = jobs2.reduce((sum, j) => sum + (j.batchQty || 0), 0);

    const progress1 = calculateProgress(jobs1);
    const progress2 = calculateProgress(jobs2);

    return {
        main: `PO ${po1} vs ${po2}`,
        detail: `${jobs1.length} jobs (${pieces1.toLocaleString()}pcs) vs ${jobs2.length} jobs (${pieces2.toLocaleString()}pcs)`,
        context: `Progress: ${progress1.completionPercent}% vs ${progress2.completionPercent}%`,
        actions: [
            { label: `View ${po1}`, action: () => showPoAnalytics(po1) },
            { label: `View ${po2}`, action: () => showPoAnalytics(po2) }
        ]
    };
}

/**
 * Execute a "where is" query - find where a SKU/PO is located
 */
function executeWhereIsQuery(data, entities) {
    let filtered = filterByEntities(data, entities);

    if (filtered.length === 0) {
        const searchTerm = entities.skus.length > 0 ? entities.skus[0] : (entities.pos.length > 0 ? `PO ${entities.pos[0]}` : 'item');
        return {
            main: 'Not found',
            detail: `${searchTerm} not found in system`,
            context: '',
            actions: []
        };
    }

    // Group by location
    const locationCounts = {};
    filtered.forEach(j => {
        const loc = j.normalizedLocation;
        if (!locationCounts[loc]) locationCounts[loc] = { jobs: 0, pieces: 0 };
        locationCounts[loc].jobs++;
        locationCounts[loc].pieces += j.batchQty || 0;
    });

    const sortedLocs = Object.entries(locationCounts).sort((a, b) => b[1].jobs - a[1].jobs);
    const searchTerm = entities.skus.length > 0 ? entities.skus[0] : `PO ${entities.pos[0]}`;

    return {
        main: sortedLocs.map(([loc]) => loc).join(', '),
        detail: `${searchTerm} is at ${sortedLocs.length} location(s)`,
        context: sortedLocs.map(([loc, data]) => `${loc}: ${data.jobs} jobs`).join(' | '),
        actions: buildFilterActions(entities)
    };
}

/**
 * Execute a ranking query - rank POs by progress/size
 */
function executeRankingQuery(data, entities, query) {
    const q = query.toLowerCase();
    const poList = [...new Set(data.map(j => j.poNo))];

    // Determine ranking criteria
    const byProgress = q.includes('progress') || q.includes('completion') || q.includes('done');
    const byPieces = q.includes('pieces') || q.includes('size');

    const poData = poList.map(po => {
        const jobs = data.filter(j => j.poNo === po);
        const pieces = jobs.reduce((sum, j) => sum + (j.batchQty || 0), 0);
        const progress = calculateProgress(jobs);
        return { po, jobs: jobs.length, pieces, progress: progress.completionPercent };
    });

    // Sort based on criteria
    if (byProgress) {
        poData.sort((a, b) => b.progress - a.progress);
    } else if (byPieces) {
        poData.sort((a, b) => b.pieces - a.pieces);
    } else {
        poData.sort((a, b) => b.jobs - a.jobs);
    }

    const criterion = byProgress ? 'progress' : (byPieces ? 'pieces' : 'jobs');

    return {
        main: `${poList.length} POs ranked`,
        detail: poData.slice(0, 4).map((p, i) =>
            `${i + 1}. PO ${p.po}: ${byProgress ? p.progress + '%' : (byPieces ? p.pieces.toLocaleString() + ' pcs' : p.jobs + ' jobs')}`
        ).join(' | '),
        context: `Ranked by ${criterion}`,
        actions: [
            { label: `View #1: ${poData[0].po}`, action: () => showPoAnalytics(poData[0].po) }
        ]
    };
}

/**
 * Execute a remaining/left query - how much is left to complete
 */
function executeRemainingQuery(data, entities) {
    let filtered = filterByEntities(data, entities);

    if (entities.pos.length === 0 && entities.skus.length === 0) {
        filtered = data;
    }

    const progress = calculateProgress(filtered);
    const remainingJobs = progress.totalJobs - progress.completedJobs;
    const remainingPieces = progress.totalPieces - progress.completedPieces;
    const remainingPercent = 100 - progress.completionPercent;

    const contextStr = buildContextString(entities) || 'Overall';

    return {
        main: `${remainingPieces.toLocaleString()} pieces left`,
        detail: `${remainingJobs} jobs still in progress ${contextStr}`,
        context: `${remainingPercent}% remaining to complete`,
        actions: entities.pos.length === 1
            ? [{ label: 'View Analytics', action: () => showPoAnalytics(entities.pos[0]) }]
            : []
    };
}

/**
 * Execute a "not at" query - jobs NOT at a specific location
 */
function executeNotAtQuery(data, entities) {
    // Get jobs NOT at the specified locations
    const excludeLocations = entities.locations.length > 0 ? entities.locations : COMPLETE_LOCATIONS;

    let filtered = data;
    if (entities.pos.length > 0) {
        filtered = filtered.filter(j => entities.pos.includes(j.poNo));
    }

    const notAtJobs = filtered.filter(j => !excludeLocations.includes(j.normalizedLocation));
    const pieces = notAtJobs.reduce((sum, j) => sum + (j.batchQty || 0), 0);

    const excludeStr = excludeLocations.join(', ');
    const contextStr = entities.pos.length > 0 ? `in PO ${entities.pos.join(', ')}` : '';

    return {
        main: `${notAtJobs.length} jobs`,
        detail: `${pieces.toLocaleString()} pieces not at ${excludeStr} ${contextStr}`,
        context: `Locations: ${[...new Set(notAtJobs.map(j => j.normalizedLocation))].join(', ')}`,
        actions: entities.pos.length === 1
            ? [{ label: 'View Analytics', action: () => showPoAnalytics(entities.pos[0]) }]
            : []
    };
}

/**
 * Execute an empty query - find locations/POs with no jobs
 */
function executeEmptyQuery(data, entities) {
    // Find locations with no jobs
    const locationCounts = {};
    LOCATION_ORDER.forEach(loc => locationCounts[loc] = 0);

    data.forEach(j => {
        const loc = j.normalizedLocation;
        if (locationCounts[loc] !== undefined) {
            locationCounts[loc]++;
        }
    });

    const emptyLocations = LOCATION_ORDER.filter(loc => locationCounts[loc] === 0);

    if (emptyLocations.length === 0) {
        return {
            main: 'All locations active',
            detail: 'Every location has at least one job',
            context: `${LOCATION_ORDER.length} locations in use`,
            actions: []
        };
    }

    return {
        main: `${emptyLocations.length} empty`,
        detail: `Empty locations: ${emptyLocations.join(', ')}`,
        context: 'These locations have no jobs currently',
        actions: []
    };
}

/**
 * Execute an average query - average pieces per job, etc.
 */
function executeAverageQuery(data, entities) {
    let filtered = filterByEntities(data, entities);

    if (filtered.length === 0) {
        return {
            main: 'No data',
            detail: 'No jobs found for average calculation',
            context: '',
            actions: []
        };
    }

    const totalJobs = filtered.length;
    const totalPieces = filtered.reduce((sum, j) => sum + (j.batchQty || 0), 0);
    const avgPiecesPerJob = Math.round(totalPieces / totalJobs);

    // Calculate by PO if relevant
    const poList = [...new Set(filtered.map(j => j.poNo))];
    const avgJobsPerPo = Math.round(totalJobs / poList.length);
    const avgPiecesPerPo = Math.round(totalPieces / poList.length);

    const contextStr = buildContextString(entities) || '';

    return {
        main: `${avgPiecesPerJob} pcs/job`,
        detail: `Average across ${totalJobs} jobs ${contextStr}`,
        context: `${avgJobsPerPo} jobs/PO | ${avgPiecesPerPo.toLocaleString()} pcs/PO`,
        actions: buildFilterActions(entities)
    };
}

/**
 * Execute a superlative query (most/least)
 */
function executeSuperlativeQuery(data, entities, query, intent) {
    const isLargest = intent === 'largest';
    const q = query.toLowerCase();
    const answerType = determineAnswerType(q);

    // Determine what we're finding the most/least of
    const wantsPieces = INTENT_KEYWORDS.pieces.some(k => q.includes(k));
    const wantsLocation = q.includes('location') || q.includes('where');

    // If asking "which PO" with location filters, find PO with most/least at those locations
    if (answerType === 'po' && entities.locations.length > 0) {
        // Filter data to only the specified locations
        const locationFiltered = data.filter(j => entities.locations.includes(j.normalizedLocation));

        // Group by PO
        const poCounts = {};
        locationFiltered.forEach(j => {
            if (!poCounts[j.poNo]) poCounts[j.poNo] = { jobs: 0, pieces: 0 };
            poCounts[j.poNo].jobs++;
            poCounts[j.poNo].pieces += j.batchQty || 0;
        });

        const metric = wantsPieces ? 'pieces' : 'jobs';
        const sorted = Object.entries(poCounts).sort((a, b) =>
            isLargest ? b[1][metric] - a[1][metric] : a[1][metric] - b[1][metric]
        );

        if (sorted.length === 0) {
            return {
                main: 'No data',
                detail: `No jobs found at ${entities.locations.join(' + ')}`,
                context: '',
                actions: []
            };
        }

        const [topPo, topData] = sorted[0];
        const locationsStr = entities.locations.join(' + ');

        return {
            main: `PO ${topPo}`,
            detail: `${topData[metric].toLocaleString()} ${metric} at ${locationsStr}`,
            context: sorted.length > 1
                ? `Next: PO ${sorted[1][0]} (${sorted[1][1][metric].toLocaleString()})`
                : '',
            actions: [
                { label: 'View Analytics', action: () => showPoAnalytics(topPo) },
                { label: 'Filter to PO', action: () => {
                    state.filters.po = topPo;
                    elements.filterPO.value = topPo;
                    renderAll();
                }}
            ]
        };
    }

    // If looking for location with most/least (within a specific PO)
    if (wantsLocation || (entities.pos.length > 0 && answerType !== 'po')) {
        let filtered = entities.pos.length > 0
            ? data.filter(j => entities.pos.includes(j.poNo))
            : data;

        const locationCounts = {};
        filtered.forEach(j => {
            const loc = j.normalizedLocation;
            if (!locationCounts[loc]) locationCounts[loc] = { jobs: 0, pieces: 0 };
            locationCounts[loc].jobs++;
            locationCounts[loc].pieces += j.batchQty || 0;
        });

        const metric = wantsPieces ? 'pieces' : 'jobs';
        const sorted = Object.entries(locationCounts).sort((a, b) =>
            isLargest ? b[1][metric] - a[1][metric] : a[1][metric] - b[1][metric]
        );

        if (sorted.length === 0) {
            return { main: 'No data', detail: 'No jobs found', context: '', actions: [] };
        }

        const [topLoc, topData] = sorted[0];
        const contextStr = entities.pos.length > 0 ? `in PO ${entities.pos.join(', ')}` : '';

        return {
            main: topLoc,
            detail: `${topData[metric].toLocaleString()} ${metric} ${contextStr}`,
            context: sorted.length > 1
                ? `Next: ${sorted[1][0]} (${sorted[1][1][metric].toLocaleString()})`
                : '',
            actions: [
                { label: 'Filter to ' + topLoc, action: () => {
                    state.filters.location = topLoc;
                    elements.filterLocation.value = topLoc;
                    renderAll();
                }}
            ]
        };
    }

    // Find PO with most/least jobs or pieces (optionally filtered by locations)
    let filteredData = data;
    if (entities.locations.length > 0) {
        filteredData = data.filter(j => entities.locations.includes(j.normalizedLocation));
    }

    const poCounts = {};
    filteredData.forEach(j => {
        if (!poCounts[j.poNo]) poCounts[j.poNo] = { jobs: 0, pieces: 0 };
        poCounts[j.poNo].jobs++;
        poCounts[j.poNo].pieces += j.batchQty || 0;
    });

    const metric = wantsPieces ? 'pieces' : 'jobs';
    const sorted = Object.entries(poCounts).sort((a, b) =>
        isLargest ? b[1][metric] - a[1][metric] : a[1][metric] - b[1][metric]
    );

    if (sorted.length === 0) {
        return { main: 'No data', detail: 'No POs found', context: '', actions: [] };
    }

    const [topPo, topData] = sorted[0];
    const locContext = entities.locations.length > 0 ? ` at ${entities.locations.join(' + ')}` : '';

    return {
        main: `PO ${topPo}`,
        detail: `${topData[metric].toLocaleString()} ${metric}${locContext} (${isLargest ? 'most' : 'least'})`,
        context: sorted.length > 1
            ? `Next: PO ${sorted[1][0]} (${sorted[1][1][metric].toLocaleString()})`
            : '',
        actions: [
            { label: 'View Analytics', action: () => showPoAnalytics(topPo) },
            { label: 'Filter to PO', action: () => {
                state.filters.po = topPo;
                elements.filterPO.value = topPo;
                renderAll();
            }}
        ]
    };
}

function renderQueryResults(result) {
    if (!result) {
        elements.queryResults.innerHTML = `
            <div class="query-no-results">
                I didn't understand that query. Try something like:
            </div>
            <div class="query-suggestions">
                ${QUERY_SUGGESTIONS.map(s => `<span class="query-suggestion" onclick="runSuggestion('${s}')">${s}</span>`).join('')}
            </div>
        `;
        elements.queryResults.classList.remove('hidden');
        return;
    }

    const actionsHtml = result.actions && result.actions.length > 0
        ? `<div class="query-action-btns">
            ${result.actions.map((a, i) => `<button class="query-action-btn" onclick="executeQueryAction(${i})">${a.label}</button>`).join('')}
           </div>`
        : '';

    // Store actions for later execution
    window._queryActions = result.actions || [];

    elements.queryResults.innerHTML = `
        <div class="query-answer">
            <div class="query-answer-main">${result.main}</div>
            <div class="query-answer-detail">${result.detail}</div>
            ${result.context ? `<div class="query-answer-context">${result.context}</div>` : ''}
            ${actionsHtml}
        </div>
    `;
    elements.queryResults.classList.remove('hidden');
}

function executeQueryAction(index) {
    if (window._queryActions && window._queryActions[index]) {
        window._queryActions[index].action();
        hideQueryResults();
    }
}

function runSuggestion(query) {
    elements.queryInput.value = query;
    const result = processQuery(query);
    renderQueryResults(result);
}

function hideQueryResults() {
    elements.queryResults.classList.add('hidden');
    elements.queryInput.value = '';
}

function toggleQueryHelp() {
    const helpPanel = document.getElementById('queryHelpPanel');
    helpPanel.classList.toggle('hidden');

    // Close query results if open
    elements.queryResults.classList.add('hidden');
}

function runHelpExample(query) {
    // Close help panel
    document.getElementById('queryHelpPanel').classList.add('hidden');

    // Run the query
    elements.queryInput.value = query;
    const result = processQuery(query);
    renderQueryResults(result);
}

// ============================================
// Export Functions
// ============================================

function exportToCSV() {
    const data = state.filteredData;

    if (data.length === 0) {
        alert('No data to export');
        return;
    }

    // Define columns for export
    const columns = [
        { key: 'jobNo', label: 'Job No' },
        { key: 'poNo', label: 'PO No' },
        { key: 'sku', label: 'SKU' },
        { key: 'plating', label: 'Plating' },
        { key: 'batchQty', label: 'Batch Qty' },
        { key: 'totalQty', label: 'Total Qty' },
        { key: 'size', label: 'Size' },
        { key: 'normalizedLocation', label: 'Location' },
        { key: 'dateSending', label: 'Date Sending' },
        { key: 'notesPre', label: 'Notes (Pre-Production)' },
        { key: 'notesNew', label: 'Notes (Production)' }
    ];

    // Build CSV content
    const header = columns.map(c => `"${c.label}"`).join(',');
    const rows = data.map(row => {
        return columns.map(c => {
            let value = row[c.key] || '';
            // Escape quotes and wrap in quotes
            value = String(value).replace(/"/g, '""');
            return `"${value}"`;
        }).join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    // Generate filename with date and filter info
    const date = new Date().toISOString().split('T')[0];
    let filename = `location-dashboard-${date}`;
    if (state.filters.po) filename += `-PO${state.filters.po}`;
    if (state.filters.location) filename += `-${state.filters.location}`;
    filename += '.csv';

    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Exported ${data.length} rows to ${filename}`);
}

// Make functions available globally for onclick handlers
window.filterByLocation = filterByLocation;
window.showJobDetail = showJobDetail;
window.refreshData = refreshData;
window.showPoAnalytics = showPoAnalytics;
window.toggleAnalyticsMode = toggleAnalyticsMode;
window.exportToCSV = exportToCSV;
window.toggleViewMode = toggleViewMode;
window.toggleDistributionMode = toggleDistributionMode;
window.executeQueryAction = executeQueryAction;
window.runSuggestion = runSuggestion;
window.hideQueryResults = hideQueryResults;
window.toggleQueryHelp = toggleQueryHelp;
window.runHelpExample = runHelpExample;

document.addEventListener('DOMContentLoaded', init);
