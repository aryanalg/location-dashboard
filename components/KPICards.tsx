"use client";

import { Job, DisplayMode, LOCATION_ORDER } from "@/lib/types";

interface LocationCounts {
  [key: string]: { jobs: number; pieces: number };
}

interface KPICardsProps {
  jobs: Job[];
  displayMode: DisplayMode;
  locationCounts: LocationCounts;
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

export default function KPICards({ jobs, displayMode, locationCounts }: KPICardsProps) {
  // Calculate totals
  const totalJobs = jobs.length;
  const totalPieces = jobs.reduce((sum, job) => sum + (job.batchQty || 0), 0);
  const activePOs = new Set(jobs.map(job => job.poNo)).size;

  // Calculate total for distribution bar
  const total = displayMode === 'jobs' ? totalJobs : totalPieces;

  // Get locations with data, sorted by LOCATION_ORDER
  const locationsWithData = LOCATION_ORDER.filter(loc => {
    const count = locationCounts[loc];
    return count && (displayMode === 'jobs' ? count.jobs > 0 : count.pieces > 0);
  });

  return (
    <div className="kpi-cards">
      {/* Total Jobs Card */}
      <div className="kpi-card">
        <div className="kpi-label">Total Jobs</div>
        <div className="kpi-value">{totalJobs.toLocaleString()}</div>
      </div>

      {/* Total Pieces Card */}
      <div className="kpi-card">
        <div className="kpi-label">Total Pieces</div>
        <div className="kpi-value">{totalPieces.toLocaleString()}</div>
      </div>

      {/* Active POs Card */}
      <div className="kpi-card">
        <div className="kpi-label">Active POs</div>
        <div className="kpi-value">{activePOs}</div>
      </div>

      {/* Distribution Bar Card */}
      <div className="kpi-card kpi-distribution-card">
        <div className="kpi-label">
          {displayMode === 'jobs' ? 'Jobs' : 'Pieces'} by Location
        </div>
        <div className="distribution-bar-container">
          <div className="distribution-bar">
            {locationsWithData.map(loc => {
              const count = locationCounts[loc];
              const value = displayMode === 'jobs' ? count.jobs : count.pieces;
              const percent = total > 0 ? (value / total) * 100 : 0;

              if (percent < 1) return null; // Skip tiny segments

              return (
                <div
                  key={loc}
                  className="distribution-segment"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: LOCATION_COLORS[loc] || '#9ca3af',
                  }}
                  title={`${loc}: ${value.toLocaleString()} ${displayMode} (${percent.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="distribution-legend">
            {locationsWithData.slice(0, 5).map(loc => {
              const count = locationCounts[loc];
              const value = displayMode === 'jobs' ? count.jobs : count.pieces;
              const percent = total > 0 ? (value / total) * 100 : 0;

              if (percent < 3) return null; // Only show significant locations in legend

              return (
                <div key={loc} className="legend-item">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: LOCATION_COLORS[loc] || '#9ca3af' }}
                  />
                  <span className="legend-label">{loc}</span>
                  <span className="legend-value">{percent.toFixed(0)}%</span>
                </div>
              );
            })}
            {locationsWithData.length > 5 && (
              <div className="legend-item legend-more">
                +{locationsWithData.length - 5} more
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
