"use client";

import { useMemo } from "react";
import {
  Job,
  DisplayMode,
  LOCATION_ORDER,
  AgeBucket,
  getDaysUntilDelivery,
  getAgeBucket,
  getUrgencyColor,
  URGENCY_LABELS,
} from "@/lib/types";

interface LocationCounts {
  [key: string]: { jobs: number; pieces: number };
}

interface AnalyticsPanelProps {
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

export default function AnalyticsPanel({
  jobs,
  displayMode,
  locationCounts,
}: AnalyticsPanelProps) {
  // Calculate urgency counts
  const urgencyCounts = useMemo(() => {
    const counts: Record<AgeBucket, { jobs: number; pieces: number }> = {
      overdue: { jobs: 0, pieces: 0 },
      urgent: { jobs: 0, pieces: 0 },
      soon: { jobs: 0, pieces: 0 },
      normal: { jobs: 0, pieces: 0 },
    };

    jobs.forEach(job => {
      const daysUntil = getDaysUntilDelivery(job.deliveryDate);
      const bucket = getAgeBucket(daysUntil);
      counts[bucket].jobs++;
      counts[bucket].pieces += job.batchQty || 0;
    });

    return counts;
  }, [jobs]);

  // Locations with data
  const locationsWithData = LOCATION_ORDER.filter(loc => {
    const count = locationCounts[loc];
    return count && (count.jobs > 0 || count.pieces > 0);
  });

  // Calculate totals
  const totalJobs = jobs.length;
  const totalPieces = jobs.reduce((sum, job) => sum + (job.batchQty || 0), 0);
  const total = displayMode === 'jobs' ? totalJobs : totalPieces;

  // Calculate pie chart data
  const pieData = useMemo(() => {
    const data: { location: string; value: number; percent: number; color: string }[] = [];
    let cumulative = 0;

    locationsWithData.forEach(loc => {
      const count = locationCounts[loc];
      const value = displayMode === 'jobs' ? count.jobs : count.pieces;
      const percent = total > 0 ? (value / total) * 100 : 0;

      if (value > 0) {
        data.push({
          location: loc,
          value,
          percent,
          color: LOCATION_COLORS[loc] || '#9ca3af',
        });
      }
    });

    // Sort by value descending for better visualization
    data.sort((a, b) => b.value - a.value);

    return data;
  }, [locationsWithData, locationCounts, displayMode, total]);

  // Generate conic gradient for pie chart
  const pieGradient = useMemo(() => {
    if (pieData.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';

    const segments: string[] = [];
    let currentAngle = 0;

    pieData.forEach(item => {
      const angle = (item.percent / 100) * 360;
      segments.push(`${item.color} ${currentAngle}deg ${currentAngle + angle}deg`);
      currentAngle += angle;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [pieData]);

  return (
    <div className="analytics-panel">
      <div className="analytics-content">
        {/* Location Breakdown - Pie Chart */}
        <div className="analytics-section location-breakdown">
          <h3 className="analytics-section-title">Location Breakdown</h3>
          <div className="pie-chart-container">
            {/* Pie Chart */}
            <div className="pie-chart-wrapper">
              <div
                className="pie-chart"
                style={{ background: pieGradient }}
              >
                <div className="pie-chart-center">
                  <div className="pie-center-value">{total.toLocaleString()}</div>
                  <div className="pie-center-label">{displayMode === 'jobs' ? 'Jobs' : 'Pieces'}</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="pie-legend">
              {pieData.map(item => (
                <div key={item.location} className="pie-legend-item">
                  <span
                    className="pie-legend-color"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="pie-legend-location">{item.location}</span>
                  <span className="pie-legend-percent">{item.percent.toFixed(1)}%</span>
                  <span className="pie-legend-value">
                    {item.value.toLocaleString()} {displayMode === 'jobs' ? 'jobs' : 'pcs'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="location-total">
            Total: {totalJobs.toLocaleString()} jobs / {totalPieces.toLocaleString()} pieces
          </div>
        </div>

        {/* Urgency Analysis */}
        <div className="analytics-section urgency-analysis">
          <h3 className="analytics-section-title">Delivery Urgency</h3>
          <div className="urgency-cards">
            {(['overdue', 'urgent', 'soon', 'normal'] as AgeBucket[]).map(bucket => {
              const count = urgencyCounts[bucket];
              const value = displayMode === 'jobs' ? count.jobs : count.pieces;
              const secondaryValue = displayMode === 'jobs' ? count.pieces : count.jobs;

              return (
                <div
                  key={bucket}
                  className="urgency-card"
                  style={{ borderLeftColor: getUrgencyColor(bucket) }}
                >
                  <div
                    className="urgency-indicator"
                    style={{ backgroundColor: getUrgencyColor(bucket) }}
                  />
                  <div className="urgency-content">
                    <div className="urgency-label">{URGENCY_LABELS[bucket].split(' ')[0]}</div>
                    <div className="urgency-value">{value.toLocaleString()}</div>
                    <div className="urgency-secondary">
                      {secondaryValue.toLocaleString()} {displayMode === 'jobs' ? 'pcs' : 'jobs'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
