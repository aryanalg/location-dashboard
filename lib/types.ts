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
export const LOCATION_MAPPINGS: Record<string, string[]> = {
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

export const LOCATION_ORDER = [
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

export function normalizeLocation(rawLocation: string | null | undefined): string {
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
