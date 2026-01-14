// Job data from Excel
export interface Job {
  jobNo: string;
  poNo: string;
  sku: string;
  plating: string;
  batchQty: number;
  totalQty: number;
  size: string;
  location: string;
  normalizedLocation: string;
  deliveryDate: string;
  notesPre: string;
  notesNew: string;
  dateSending: string;
  dateReceive: string;
  weightCasting: number | null;
  weightPolishing: number | null;
  weightPlating: number | null;
  accWt: number | null;
}

// API response
export interface LocationJournalResponse {
  jobs: Job[];
  count: number;
  timestamp: string;
  error?: string;
}

// Location normalization
// Maps variations of location names to standard names
// Each standard location has an array of possible variations (lowercase)
export const LOCATION_MAPPINGS: Record<string, string[]> = {
  'Wax': ['wax'],
  'Wax Setting': ['wax setting', 'wax set', 'waxset'],
  'Casting': ['casting', 'cast'],
  'Grinding': ['grinding', 'grind'],
  'Filing/Assembly': ['filing/assembly', 'filing assembly', 'f/a', 'filing', 'assembly'],
  'Filing QC': ['filing qc', 'filing q/c', 'file qc', 'filingqc'],
  'Electro': ['electro', 'electroplating', 'electroplate'],
  'Hand Setting': ['hand setting', 'hand set', 'handset', 'handsetting'],
  'Polishing': ['polishing', 'polish'],
  'Polishing QC': ['polishing qc', 'polish qc', 'pol qc', 'polishingqc'],
  'Plating': ['plating', 'plate'],
  'Packing': ['packing', 'pack', 'shipping', 'ship', 'dispatch'],
  'Stamping NXT': ['stamping nxt', 'stamping', 'stamp nxt', 'nxt stamping'],
  'MKS Volume': ['mks volume', 'mks vol', 'mksvolume'],
  'MKS Stone Room': ['mks stone room', 'stone room', 'mks stone', 'mksstoneroom'],
  'MKS Goldstock': ['mks goldstock', 'goldstock', 'gold stock', 'mksgoldstock'],
  'Outsource': ['outsource', 'outsourced', 'external', 'outside', 'vendor', 'subcontract'],
};

export const LOCATION_ORDER = [
  'Wax',
  'Wax Setting',
  'Casting',
  'Grinding',
  'Filing/Assembly',
  'Filing QC',
  'Electro',
  'Hand Setting',
  'Polishing',
  'Polishing QC',
  'Plating',
  'Packing',
  'Stamping NXT',
  'MKS Volume',
  'MKS Stone Room',
  'MKS Goldstock',
  'Outsource',
  'Other'
];

export function normalizeLocation(rawLocation: string | null | undefined): string {
  if (!rawLocation || typeof rawLocation !== 'string') {
    return 'Other';
  }

  const input = rawLocation.trim().toLowerCase();

  // If empty after trim, return Other
  if (!input) {
    return 'Other';
  }

  // Build a flat list of all variations with their standard names
  // Sort by variation length (longest first) to match more specific patterns first
  const allVariations: { variation: string; standardName: string }[] = [];

  for (const [standardName, variations] of Object.entries(LOCATION_MAPPINGS)) {
    for (const variation of variations) {
      allVariations.push({ variation, standardName });
    }
  }

  // Sort by length descending - longer matches take priority
  allVariations.sort((a, b) => b.variation.length - a.variation.length);

  // First pass: check for exact match
  for (const { variation, standardName } of allVariations) {
    if (input === variation) {
      return standardName;
    }
  }

  // Second pass: check if input contains variation (longest first)
  for (const { variation, standardName } of allVariations) {
    if (input.includes(variation)) {
      return standardName;
    }
  }

  return 'Other';
}

// Display mode for Jobs vs Pieces view
export type DisplayMode = 'jobs' | 'pieces';

// Urgency buckets based on delivery deadline
export type AgeBucket = 'overdue' | 'urgent' | 'soon' | 'normal';

// Calculate days until delivery date
// Returns negative number if overdue
export function getDaysUntilDelivery(deliveryDate: string): number {
  if (!deliveryDate) return Infinity; // No date = treat as not urgent

  // Parse DD/MM/YYYY format
  const parts = deliveryDate.split('/');
  if (parts.length !== 3) return Infinity;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return Infinity;

  const deliveryDateObj = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  const diffTime = deliveryDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Get urgency bucket based on days until delivery
export function getAgeBucket(daysUntil: number): AgeBucket {
  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 14) return 'soon';
  return 'normal';
}

// Get urgency color for styling
export function getUrgencyColor(bucket: AgeBucket): string {
  switch (bucket) {
    case 'overdue': return '#991b1b'; // Dark red
    case 'urgent': return '#ea580c';  // Orange
    case 'soon': return '#ca8a04';    // Yellow
    case 'normal': return '#16a34a';  // Green
  }
}

// Urgency bucket display labels
export const URGENCY_LABELS: Record<AgeBucket, string> = {
  'overdue': 'Overdue',
  'urgent': 'Urgent (≤7 days)',
  'soon': 'Soon (8-14 days)',
  'normal': 'Normal (>14 days)',
};
