"use client";

import MultiSelect from "./MultiSelect";
import { LOCATION_ORDER, AgeBucket, URGENCY_LABELS, getUrgencyColor } from "@/lib/types";

interface FilterRowProps {
  // SKU filter
  uniqueSKUs: string[];
  selectedSKUs: string[];
  onSKUsChange: (skus: string[]) => void;

  // Location filter
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;

  // Urgency filter
  selectedUrgencies: AgeBucket[];
  onUrgenciesChange: (urgencies: AgeBucket[]) => void;

  // Clear all
  onClearAll: () => void;
}

// Location colors matching the existing theme
const LOCATION_COLORS: Record<string, string> = {
  'Wax': '#f59e0b',
  'Wax Setting': '#d97706',
  'Casting': '#ef4444',
  'Grinding': '#f97316',
  'Filing/Assembly': '#8b5cf6',
  'Filing QC': '#a78bfa',
  'Electro': '#10b981',
  'Hand Setting': '#14b8a6',
  'Polishing': '#3b82f6',
  'Polishing QC': '#60a5fa',
  'Plating': '#ec4899',
  'Packing': '#06b6d4',
  'Stamping NXT': '#6366f1',
  'MKS Volume': '#f43f5e',
  'MKS Stone Room': '#e879f9',
  'MKS Goldstock': '#fbbf24',
  'Outsource': '#6b7280',
  'Other': '#9ca3af',
};

export default function FilterRow({
  uniqueSKUs,
  selectedSKUs,
  onSKUsChange,
  selectedLocations,
  onLocationsChange,
  selectedUrgencies,
  onUrgenciesChange,
  onClearAll,
}: FilterRowProps) {
  // SKU options
  const skuOptions = uniqueSKUs.map(sku => ({
    value: sku,
    label: sku,
  }));

  // Location options with colors
  const locationOptions = LOCATION_ORDER.map(loc => ({
    value: loc,
    label: loc,
    color: LOCATION_COLORS[loc],
  }));

  // Urgency options with colors
  const urgencyOptions: { value: AgeBucket; label: string; color: string }[] = [
    { value: 'overdue', label: URGENCY_LABELS['overdue'], color: getUrgencyColor('overdue') },
    { value: 'urgent', label: URGENCY_LABELS['urgent'], color: getUrgencyColor('urgent') },
    { value: 'soon', label: URGENCY_LABELS['soon'], color: getUrgencyColor('soon') },
    { value: 'normal', label: URGENCY_LABELS['normal'], color: getUrgencyColor('normal') },
  ];

  const hasFilters = selectedSKUs.length > 0 || selectedLocations.length > 0 || selectedUrgencies.length > 0;

  return (
    <div className="filter-row">
      <MultiSelect
        options={skuOptions}
        selected={selectedSKUs}
        onChange={onSKUsChange}
        placeholder="All Designs/SKUs"
        label="Design/SKU"
      />

      <MultiSelect
        options={locationOptions}
        selected={selectedLocations}
        onChange={onLocationsChange}
        placeholder="All Locations"
        label="Location"
      />

      <MultiSelect
        options={urgencyOptions}
        selected={selectedUrgencies}
        onChange={(values) => onUrgenciesChange(values as AgeBucket[])}
        placeholder="All Urgencies"
        label="Delivery Urgency"
      />

      {hasFilters && (
        <button
          type="button"
          className="clear-all-btn"
          onClick={onClearAll}
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
