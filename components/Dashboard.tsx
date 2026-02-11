"use client";

import Image from "next/image";
import type { Session } from "next-auth";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Job,
  LOCATION_ORDER,
  DisplayMode,
  AgeBucket,
  getDaysUntilDelivery,
  getAgeBucket,
} from "@/lib/types";
import KPICards from "./KPICards";
import FilterRow from "./FilterRow";
import AnalyticsPanel from "./AnalyticsPanel";
import MultiSelect from "./MultiSelect";

interface DashboardProps {
  user: Session["user"] | undefined;
  onSignOut: () => void;
}

type QueryResult = ReturnType<typeof processQuery>;
type PORiskBucket = AgeBucket | "missing";

interface PORisk {
  poNo: string;
  dueDate: string | null;
  daysUntil: number;
  bucket: PORiskBucket;
  jobCount: number;
  pieceCount: number;
}

const NUMERIC_SORT_COLUMNS: (keyof Job)[] = [
  "batchQty",
  "totalQty",
  "weightCasting",
  "weightPolishing",
  "weightPlating",
  "accWt",
];

function formatDueText(daysUntil: number): string {
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d late`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "1d left";
  return `${daysUntil}d left`;
}

function getBucketPriority(bucket: PORiskBucket): number {
  switch (bucket) {
    case "overdue":
      return 0;
    case "urgent":
      return 1;
    case "soon":
      return 2;
    case "missing":
      return 3;
    default:
      return 4;
  }
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const hasLoadedOnce = useRef(false);

  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Global display mode (affects all views)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("jobs");

  // Multi-select filter state
  const [selectedPOs, setSelectedPOModals] = useState<string[]>([]);
  const [selectedSKUs, setSelectedSKUs] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedUrgencies, setSelectedUrgencies] = useState<AgeBucket[]>([]);

  // Table row selection
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Job | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");

  // Modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedPOModal, setSelectedPOModal] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState(false);
  const [analyticsMode, setAnalyticsMode] = useState<"jobs" | "pieces">("jobs");

  // Query assistant state
  const [queryInput, setQueryInput] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showQueryHelp, setShowQueryHelp] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (isManual = false) => {
    try {
      // Use refreshing state for background/manual refreshes, loading for initial
      if (isManual || hasLoadedOnce.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch("/api/location-journal");
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setJobs(data.jobs || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchData]);

  // Computed values
  const uniquePOs = useMemo(() => [...new Set(jobs.map(j => j.poNo).filter(Boolean))].sort(), [jobs]);
  const uniqueSKUs = useMemo(() => [...new Set(jobs.map(j => j.sku).filter(Boolean))].sort(), [jobs]);

  // Get delivery date for selected POs
  const selectedPOsDeliveryDate = useMemo(() => {
    if (selectedPOs.length === 0) return null;
    const dates = new Set<string>();
    jobs.forEach(j => {
      if (selectedPOs.includes(j.poNo) && j.deliveryDate) {
        dates.add(j.deliveryDate);
      }
    });
    if (dates.size === 0) return null;
    if (dates.size === 1) return [...dates][0];
    // Return earliest date
    const sortedDates = [...dates].sort((a, b) => {
      const daysA = getDaysUntilDelivery(a);
      const daysB = getDaysUntilDelivery(b);
      return daysA - daysB;
    });
    return sortedDates[0];
  }, [jobs, selectedPOs]);

  const selectedPOsDeliveryRisk = useMemo(() => {
    if (!selectedPOsDeliveryDate) return null;
    const daysUntil = getDaysUntilDelivery(selectedPOsDeliveryDate);
    return {
      daysUntil,
      bucket: getAgeBucket(daysUntil),
    };
  }, [selectedPOsDeliveryDate]);

  const poRisks = useMemo(() => {
    const grouped = new Map<
      string,
      {
        earliestDate: string | null;
        earliestDays: number;
        jobCount: number;
        pieceCount: number;
      }
    >();

    jobs.forEach((job) => {
      if (!job.poNo) return;
      const current = grouped.get(job.poNo) ?? {
        earliestDate: null,
        earliestDays: Number.POSITIVE_INFINITY,
        jobCount: 0,
        pieceCount: 0,
      };

      current.jobCount += 1;
      current.pieceCount += job.batchQty || 0;

      if (job.deliveryDate) {
        const daysUntil = getDaysUntilDelivery(job.deliveryDate);
        if (Number.isFinite(daysUntil) && daysUntil < current.earliestDays) {
          current.earliestDays = daysUntil;
          current.earliestDate = job.deliveryDate;
        }
      }

      grouped.set(job.poNo, current);
    });

    const risks: PORisk[] = Array.from(grouped.entries()).map(([poNo, data]) => {
      if (!data.earliestDate) {
        return {
          poNo,
          dueDate: null,
          daysUntil: Number.POSITIVE_INFINITY,
          bucket: "missing",
          jobCount: data.jobCount,
          pieceCount: data.pieceCount,
        };
      }

      return {
        poNo,
        dueDate: data.earliestDate,
        daysUntil: data.earliestDays,
        bucket: getAgeBucket(data.earliestDays),
        jobCount: data.jobCount,
        pieceCount: data.pieceCount,
      };
    });

    return risks.sort((a, b) => {
      const priorityDiff = getBucketPriority(a.bucket) - getBucketPriority(b.bucket);
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysUntil - b.daysUntil;
    });
  }, [jobs]);

  const deliverySummary = useMemo(() => {
    return {
      overdue: poRisks.filter((po) => po.bucket === "overdue").length,
      urgent: poRisks.filter((po) => po.bucket === "urgent").length,
      soon: poRisks.filter((po) => po.bucket === "soon").length,
      missing: poRisks.filter((po) => po.bucket === "missing").length,
    };
  }, [poRisks]);

  const highestRiskPO = useMemo(
    () => poRisks.find((po) => po.bucket !== "normal"),
    [poRisks]
  );

  // Filtered and sorted data (multi-select filters)
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // PO filter (multi - OR logic)
    if (selectedPOs.length > 0) {
      result = result.filter(j => selectedPOs.includes(j.poNo));
    }

    // SKU filter (multi - OR logic)
    if (selectedSKUs.length > 0) {
      result = result.filter(j => selectedSKUs.includes(j.sku));
    }

    // Location filter (multi - OR logic)
    if (selectedLocations.length > 0) {
      result = result.filter(j => selectedLocations.includes(j.normalizedLocation));
    }

    // Urgency filter (multi - OR logic)
    if (selectedUrgencies.length > 0) {
      result = result.filter(j => {
        const daysUntil = getDaysUntilDelivery(j.deliveryDate);
        const bucket = getAgeBucket(daysUntil);
        return selectedUrgencies.includes(bucket);
      });
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j =>
        Object.values(j).some(v => v && String(v).toLowerCase().includes(query))
      );
    }

    // Apply sort
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal: string | number = a[sortColumn] ?? "";
        let bVal: string | number = b[sortColumn] ?? "";

        if (NUMERIC_SORT_COLUMNS.includes(sortColumn)) {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [jobs, selectedPOs, selectedSKUs, selectedLocations, selectedUrgencies, searchQuery, sortColumn, sortDirection]);

  const scopedPORisks = useMemo(() => {
    const visiblePOs = new Set(filteredJobs.map((job) => job.poNo));
    const visibleRisks = poRisks.filter((risk) => visiblePOs.has(risk.poNo));
    const prioritized = visibleRisks.filter((risk) => risk.bucket !== "normal");
    return (prioritized.length > 0 ? prioritized : visibleRisks).slice(0, 10);
  }, [filteredJobs, poRisks]);

  // Location counts
  const locationCounts = useMemo(() => {
    const counts: Record<string, { jobs: number; pieces: number }> = {};
    LOCATION_ORDER.forEach(loc => counts[loc] = { jobs: 0, pieces: 0 });

    filteredJobs.forEach(j => {
      const loc = j.normalizedLocation || "Other";
      if (!counts[loc]) counts[loc] = { jobs: 0, pieces: 0 };
      counts[loc].jobs++;
      counts[loc].pieces += j.batchQty || 0;
    });

    return counts;
  }, [filteredJobs]);

  // Sort handler
  const handleSort = (column: keyof Job) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedPOModals([]);
    setSelectedSKUs([]);
    setSelectedLocations([]);
    setSelectedUrgencies([]);
    setSearchQuery("");
  };

  // Toggle table row selection
  const toggleJobSelection = (jobNo: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobNo)
        ? prev.filter(id => id !== jobNo)
        : [...prev, jobNo]
    );
  };

  // Select/deselect all visible jobs
  const toggleSelectAll = () => {
    if (selectedJobIds.length === filteredJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(filteredJobs.map(j => j.jobNo));
    }
  };

  // Query assistant
  const runQuery = (query: string) => {
    setQueryInput(query);
    const result = processQuery(query, jobs);
    setQueryResult(result);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Job No", "PO No", "SKU", "Plating", "Batch Qty", "Total Qty", "Size", "Location", "Delivery Date"];
    const rows = filteredJobs.map(j => [
      j.jobNo, j.poNo, j.sku, j.plating, j.batchQty, j.totalQty, j.size, j.normalizedLocation, j.deliveryDate
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `location-dashboard-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PO Analytics (for modal)
  const poJobs = useMemo(() => {
    if (!selectedPOModal) return [];
    return jobs.filter(j => j.poNo === selectedPOModal);
  }, [jobs, selectedPOModal]);

  const poStats = useMemo(() => {
    if (!poJobs.length) return null;

    const locationBreakdown: Record<string, { jobs: number; pieces: number }> = {};
    LOCATION_ORDER.forEach(loc => locationBreakdown[loc] = { jobs: 0, pieces: 0 });

    let totalPieces = 0;
    let packedPieces = 0;

    poJobs.forEach(j => {
      const loc = j.normalizedLocation || "Other";
      if (!locationBreakdown[loc]) locationBreakdown[loc] = { jobs: 0, pieces: 0 };
      locationBreakdown[loc].jobs++;
      locationBreakdown[loc].pieces += j.batchQty || 0;
      totalPieces += j.batchQty || 0;
      if (loc === "Packing") packedPieces += j.batchQty || 0;
    });

    const progress = totalPieces > 0 ? Math.round((packedPieces / totalPieces) * 100) : 0;

    return {
      totalJobs: poJobs.length,
      totalPieces,
      packedPieces,
      progress,
      locationBreakdown,
    };
  }, [poJobs]);

  // Loading state
  if (loading && jobs.length === 0) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading data from Excel...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && jobs.length === 0) {
    return (
      <div className="app-container">
        <div className="error-container">
          <div className="error-icon">!</div>
          <p className="error-message">{error}</p>
          <button className="retry-btn" onClick={() => fetchData()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // PO options for multi-select
  const poOptions = uniquePOs.map(po => ({ value: po, label: `PO ${po}` }));

  return (
    <div className="app-container">
      {/* Header */}
      <header className="top-bar">
        <div className="logo-section">
          <Image
            src="/nxt-logo.png"
            alt="NXT"
            className="logo-icon"
            width={120}
            height={40}
            priority
          />
          <span className="logo-separator" />
          <div className="logo-text">
            <h1>Location Dashboard</h1>
            <span className="subtitle">Production Planning</span>
          </div>
        </div>

        <div className="header-controls">
          {/* Primary PO Filter */}
          <div className="primary-po-filter">
            <MultiSelect
              options={poOptions}
              selected={selectedPOs}
              onChange={setSelectedPOModals}
              placeholder="All POs"
              label="PO"
            />
            {selectedPOs.length > 0 && selectedPOsDeliveryDate && (
              <div className={`delivery-date-display delivery-status-${selectedPOsDeliveryRisk?.bucket || "normal"}`}>
                <span className="delivery-label">Delivery:</span>
                <span className="delivery-value">{selectedPOsDeliveryDate}</span>
                {selectedPOsDeliveryRisk && (
                  <span className="delivery-chip">
                    {formatDueText(selectedPOsDeliveryRisk.daysUntil)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Global Jobs/Pieces Toggle */}
          <div className="display-mode-toggle">
            <button
              className={`mode-btn ${displayMode === "jobs" ? "active" : ""}`}
              onClick={() => setDisplayMode("jobs")}
            >
              Jobs
            </button>
            <button
              className={`mode-btn ${displayMode === "pieces" ? "active" : ""}`}
              onClick={() => setDisplayMode("pieces")}
            >
              Pieces
            </button>
          </div>

          {/* Refresh Controls */}
          <div className="refresh-controls">
            <span className="last-refresh">
              {lastRefresh?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) || "—"}
            </span>
            <button
              className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title="Refresh now"
            >
              {refreshing ? '↻' : '⟳'}
            </button>
            <button
              className={`auto-refresh-toggle ${autoRefreshEnabled ? 'active' : ''}`}
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
            >
              {autoRefreshEnabled ? '⏸' : '▶'}
            </button>
          </div>

          {/* User Menu */}
          <div className="user-menu">
            <div className="user-avatar">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <button className="signout-btn" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {(deliverySummary.overdue > 0 || deliverySummary.urgent > 0 || deliverySummary.soon > 0 || deliverySummary.missing > 0) && (
        <section className="deadline-alert-strip" role="alert" aria-live="polite">
          <div className="deadline-alert-title">Delivery Risk Alert</div>
          <div className="deadline-alert-metrics">
            <span className="alert-pill alert-overdue">{deliverySummary.overdue} overdue</span>
            <span className="alert-pill alert-urgent">{deliverySummary.urgent} due ≤7d</span>
            <span className="alert-pill alert-soon">{deliverySummary.soon} due 8-14d</span>
            <span className="alert-pill alert-missing">{deliverySummary.missing} no date</span>
            {highestRiskPO && (
              <button
                className="deadline-focus-btn"
                onClick={() => setSelectedPOModals([highestRiskPO.poNo])}
              >
                Focus PO {highestRiskPO.poNo}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="po-deadline-section">
        <div className="po-deadline-header">
          <h2>PO Delivery Radar</h2>
          <span>
            {scopedPORisks.length > 0
              ? "Most time-sensitive POs in current view"
              : "No delivery-risk data in current view"}
          </span>
        </div>
        <div className="po-deadline-grid">
          {scopedPORisks.length === 0 && (
            <div className="po-deadline-empty">No POs with delivery-date risk signals in this filter.</div>
          )}
          {scopedPORisks.map((risk) => (
            <button
              key={risk.poNo}
              className={`po-deadline-card bucket-${risk.bucket}`}
              onClick={() => setSelectedPOModals([risk.poNo])}
            >
              <div className="po-deadline-top">
                <span className="po-deadline-po">PO {risk.poNo}</span>
                <span className={`delivery-pill delivery-${risk.bucket}`}>
                  {risk.bucket === "missing" ? "No date" : formatDueText(risk.daysUntil)}
                </span>
              </div>
              <div className="po-deadline-date">
                {risk.dueDate ? `Earliest due: ${risk.dueDate}` : "Earliest due: —"}
              </div>
              <div className="po-deadline-meta">
                {risk.jobCount} jobs | {risk.pieceCount.toLocaleString()} pcs
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="kpi-section">
        <KPICards
          jobs={filteredJobs}
          displayMode={displayMode}
          locationCounts={locationCounts}
        />
      </section>

      {/* Filter Row */}
      <section className="filter-section">
        <FilterRow
          uniqueSKUs={uniqueSKUs}
          selectedSKUs={selectedSKUs}
          onSKUsChange={setSelectedSKUs}
          selectedLocations={selectedLocations}
          onLocationsChange={setSelectedLocations}
          selectedUrgencies={selectedUrgencies}
          onUrgenciesChange={setSelectedUrgencies}
          onClearAll={clearAllFilters}
        />
      </section>

      {/* Analytics Panel */}
      <section className="analytics-section">
        <AnalyticsPanel
          jobs={filteredJobs}
          displayMode={displayMode}
          locationCounts={locationCounts}
        />
      </section>

      {/* Quick Query (collapsed) */}
      <section className="query-section">
        <div className="query-assistant-compact">
          <input
            type="text"
            className="query-input"
            placeholder="Quick query: e.g., 'How many jobs at polishing?'"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runQuery(queryInput)}
          />
          <button
            className="query-help-btn"
            onClick={() => setShowQueryHelp(!showQueryHelp)}
            title="Query help"
          >
            ?
          </button>
          {queryResult && (
            <div className="query-results-inline">
              <span className="query-answer-text">{queryResult.answer}</span>
              <span className="query-detail-text">{queryResult.detail}</span>
              <button
                className="query-close-btn"
                onClick={() => setQueryResult(null)}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Data Table */}
      <section className="table-section">
        <div className="table-header">
          <h2>Job Details</h2>
          <div className="table-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search all fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="result-count">{filteredJobs.length} jobs</span>
            <button className="btn btn-export" onClick={exportToCSV} title="Download as CSV">
              <span className="export-icon">↓</span> Export
            </button>
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === "kanban" ? "active" : ""}`}
                data-view="kanban"
                title="Kanban View"
                onClick={() => setViewMode("kanban")}
              >
                ▦
              </button>
              <button
                className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                data-view="table"
                title="Table View"
                onClick={() => setViewMode("table")}
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {viewMode === "kanban" && (
          <div className="kanban-board">
            {LOCATION_ORDER.filter(loc => locationCounts[loc]?.jobs > 0).map(loc => (
              <div key={loc} className="kanban-column" data-location={loc}>
                <div className="kanban-column-header">
                  <h3>{loc}</h3>
                  <div className="kanban-column-count">
                    <strong>{locationCounts[loc].jobs}</strong> jobs |{" "}
                    {locationCounts[loc].pieces.toLocaleString()} pcs
                  </div>
                </div>
                <div className="kanban-cards">
                  {filteredJobs
                    .filter(j => j.normalizedLocation === loc)
                    .map(job => (
                      (() => {
                        const hasDate = Boolean(job.deliveryDate);
                        const daysUntil = hasDate ? getDaysUntilDelivery(job.deliveryDate) : Number.POSITIVE_INFINITY;
                        const bucket: PORiskBucket = hasDate ? getAgeBucket(daysUntil) : "missing";
                        return (
                      <div
                        key={job.jobNo}
                        className={`kanban-card bucket-${bucket}`}
                        onClick={() => setSelectedJob(job)}
                      >
                        <div className="kanban-card-header">
                          <span className="kanban-card-job">{job.jobNo}</span>
                          <span className="kanban-card-qty">{job.batchQty} pcs</span>
                        </div>
                        <div className="kanban-card-sku">{job.sku}</div>
                        <div className="kanban-card-po">
                          PO:{" "}
                          <span onClick={(e) => { e.stopPropagation(); setSelectedPOModal(job.poNo); }}>
                            {job.poNo}
                          </span>
                        </div>
                        <div className="kanban-card-delivery">
                          <span className={`delivery-pill delivery-${bucket}`}>
                            {hasDate ? `${job.deliveryDate} • ${formatDueText(daysUntil)}` : "No delivery date"}
                          </span>
                        </div>
                      </div>
                      );
                    })()
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="table-container">
            {selectedJobIds.length > 0 && (
              <div className="selection-info">
                {selectedJobIds.length} job{selectedJobIds.length > 1 ? 's' : ''} selected
              </div>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0}
                      onChange={toggleSelectAll}
                      title="Select all"
                    />
                  </th>
                  {[
                    { key: "jobNo", label: "Job No" },
                    { key: "poNo", label: "PO No" },
                    { key: "sku", label: "Design/SKU" },
                    { key: "plating", label: "Plating" },
                    { key: "batchQty", label: "Batch Qty" },
                    { key: "totalQty", label: "Total Qty" },
                    { key: "size", label: "Size" },
                    { key: "normalizedLocation", label: "Location" },
                    { key: "deliveryDate", label: "Delivery Date" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      data-sort={key}
                      className={sortColumn === key ? "sorted" : ""}
                      onClick={() => handleSort(key as keyof Job)}
                    >
                      {label}{" "}
                      <span className="sort-icon">
                        {sortColumn === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const hasDate = Boolean(job.deliveryDate);
                  const daysUntil = hasDate ? getDaysUntilDelivery(job.deliveryDate) : Number.POSITIVE_INFINITY;
                  const bucket: PORiskBucket = hasDate ? getAgeBucket(daysUntil) : "missing";
                  return (
                  <tr
                    key={job.jobNo}
                    className={`${selectedJobIds.includes(job.jobNo) ? "selected" : ""} row-${bucket}`.trim()}
                    onClick={() => setSelectedJob(job)}
                  >
                    <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedJobIds.includes(job.jobNo)}
                        onChange={() => toggleJobSelection(job.jobNo)}
                      />
                    </td>
                    <td><strong>{job.jobNo}</strong></td>
                    <td>
                      <span
                        className="po-link"
                        onClick={(e) => { e.stopPropagation(); setSelectedPOModal(job.poNo); }}
                      >
                        {job.poNo}
                      </span>
                    </td>
                    <td>{job.sku}</td>
                    <td>{job.plating}</td>
                    <td>{job.batchQty}</td>
                    <td>{job.totalQty}</td>
                    <td>{job.size}</td>
                    <td>
                      <span className="location-badge" data-location={job.normalizedLocation}>
                        {job.normalizedLocation}
                      </span>
                    </td>
                    <td>
                      <div className="delivery-cell">
                        <span>{job.deliveryDate || "—"}</span>
                        <span className={`delivery-pill delivery-${bucket}`}>
                          {hasDate ? formatDueText(daysUntil) : "No date"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <span>Showing {filteredJobs.length} of {jobs.length}</span>
        </div>
      </section>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal job-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Job Details</h2>
              <button className="modal-close" onClick={() => setSelectedJob(null)}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Job Number</span>
                  <span className="detail-value large">{selectedJob.jobNo}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">PO Number</span>
                  <span className="detail-value">{selectedJob.poNo}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Design / SKU</span>
                  <span className="detail-value">{selectedJob.sku}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Plating</span>
                  <span className="detail-value">{selectedJob.plating}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Batch Qty</span>
                  <span className="detail-value">{selectedJob.batchQty}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Qty</span>
                  <span className="detail-value">{selectedJob.totalQty}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Size</span>
                  <span className="detail-value">{selectedJob.size || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">
                    <span className="location-badge" data-location={selectedJob.normalizedLocation}>
                      {selectedJob.normalizedLocation}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Delivery Date</span>
                  <span className="detail-value">{selectedJob.deliveryDate || "—"}</span>
                </div>
                {selectedJob.notesPre && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Notes (Pre-Production)</span>
                    <span className="detail-value">{selectedJob.notesPre}</span>
                  </div>
                )}
                {selectedJob.notesNew && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Notes (Production)</span>
                    <span className="detail-value">{selectedJob.notesNew}</span>
                  </div>
                )}
                {selectedJob.weightCasting && (
                  <div className="detail-item">
                    <span className="detail-label">Weight (Casting)</span>
                    <span className="detail-value">{selectedJob.weightCasting}g</span>
                  </div>
                )}
                {selectedJob.weightPolishing && (
                  <div className="detail-item">
                    <span className="detail-label">Weight (Polishing)</span>
                    <span className="detail-value">{selectedJob.weightPolishing}g</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PO Analytics Modal */}
      {selectedPOModal && poStats && (
        <div className="modal-overlay" onClick={() => setSelectedPOModal(null)}>
          <div className="modal po-analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>PO {selectedPOModal} Analytics</h2>
              <button className="modal-close" onClick={() => setSelectedPOModal(null)}>
                &times;
              </button>
            </div>
            <div className="modal-content">
              {/* Summary Stats */}
              <div className="po-summary">
                <div className="summary-stat">
                  <div className="stat-value">{poStats.totalJobs}</div>
                  <div className="stat-label">Jobs</div>
                </div>
                <div className="summary-stat">
                  <div className="stat-value">{poStats.totalPieces.toLocaleString()}</div>
                  <div className="stat-label">Total Pieces</div>
                </div>
                <div className="summary-stat">
                  <div className="stat-value">{poStats.packedPieces.toLocaleString()}</div>
                  <div className="stat-label">Packed</div>
                </div>
                <div className="summary-stat">
                  <div className="stat-value">{poStats.progress}%</div>
                  <div className="stat-label">Progress</div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Completion Progress</span>
                    <span className="progress-percent">{poStats.progress}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${poStats.progress}%`,
                        background: poStats.progress >= 75
                          ? "var(--status-electro)"
                          : poStats.progress >= 50
                          ? "var(--status-polishing)"
                          : "var(--status-wax)",
                      }}
                    />
                  </div>
                  <div className="progress-detail">
                    {poStats.packedPieces.toLocaleString()} of {poStats.totalPieces.toLocaleString()} pieces packed
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <div className="chart-toggle">
                <button
                  className={`toggle-btn ${analyticsMode === "jobs" ? "active" : ""}`}
                  onClick={() => setAnalyticsMode("jobs")}
                >
                  Jobs
                </button>
                <button
                  className={`toggle-btn ${analyticsMode === "pieces" ? "active" : ""}`}
                  onClick={() => setAnalyticsMode("pieces")}
                >
                  Pieces
                </button>
              </div>

              {/* Bar Chart */}
              <div className="bar-chart">
                {LOCATION_ORDER.filter(loc => poStats.locationBreakdown[loc]?.jobs > 0).map(loc => {
                  const data = poStats.locationBreakdown[loc];
                  const value = analyticsMode === "jobs" ? data.jobs : data.pieces;
                  const max = analyticsMode === "jobs" ? poStats.totalJobs : poStats.totalPieces;
                  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

                  return (
                    <div key={loc} className="bar-row">
                      <div className="bar-label">{loc}</div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          data-location={loc}
                          style={{ width: `${percent}%` }}
                        >
                          {percent > 15 && <span>{value}</span>}
                        </div>
                      </div>
                      <div className="bar-value">
                        {value}
                        <span className="bar-percent"> ({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Jobs List */}
              <div className="po-jobs-section">
                <button
                  className={`expand-jobs-btn ${expandedJobs ? "expanded" : ""}`}
                  onClick={() => setExpandedJobs(!expandedJobs)}
                >
                  <span>View All Jobs ({poJobs.length})</span>
                  <span className="expand-icon">▼</span>
                </button>
                {expandedJobs && (
                  <div className="po-jobs-list">
                    {poJobs.map(job => (
                      <div
                        key={job.jobNo}
                        className="po-job-item"
                        onClick={() => { setSelectedPOModal(null); setSelectedJob(job); }}
                      >
                        <span className="job-no">{job.jobNo}</span>
                        <span className="job-sku">{job.sku}</span>
                        <span className="location-badge" data-location={job.normalizedLocation}>
                          {job.normalizedLocation}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Query Help Panel */}
      {showQueryHelp && (
        <div
          className="query-help-panel"
          style={{ position: "fixed", top: 80, right: 24 }}
        >
          <div className="query-help-header">
            <h3>Quick Search Guide</h3>
            <button className="query-help-close" onClick={() => setShowQueryHelp(false)}>
              &times;
            </button>
          </div>
          <div className="query-help-content">
            <div className="help-section">
              <h4>Count Jobs or Pieces</h4>
              <ul>
                <li onClick={() => { runQuery("How many jobs at polishing?"); setShowQueryHelp(false); }}>
                  How many jobs at polishing?
                </li>
                <li onClick={() => { runQuery("Total pieces in electro"); setShowQueryHelp(false); }}>
                  Total pieces in electro
                </li>
                <li onClick={() => { runQuery("Count jobs in PO 41393"); setShowQueryHelp(false); }}>
                  Count jobs in PO 41393
                </li>
              </ul>
            </div>
            <div className="help-section">
              <h4>Find Items</h4>
              <ul>
                <li onClick={() => { runQuery("Where is C8493E?"); setShowQueryHelp(false); }}>
                  Where is C8493E?
                </li>
                <li onClick={() => { runQuery("Find PO 41393"); setShowQueryHelp(false); }}>
                  Find PO 41393
                </li>
                <li onClick={() => { runQuery("Show jobs at wax"); setShowQueryHelp(false); }}>
                  Show jobs at wax
                </li>
              </ul>
            </div>
            <div className="help-section">
              <h4>Compare & Rank</h4>
              <ul>
                <li onClick={() => { runQuery("Which PO has most at polishing?"); setShowQueryHelp(false); }}>
                  Which PO has most at polishing?
                </li>
                <li onClick={() => { runQuery("Busiest location"); setShowQueryHelp(false); }}>
                  Busiest location
                </li>
                <li onClick={() => { runQuery("Rank POs by progress"); setShowQueryHelp(false); }}>
                  Rank POs by progress
                </li>
              </ul>
            </div>
            <div className="help-tip">
              <strong>Tip:</strong> Use location names: &quot;polishing&quot;, &quot;electro&quot;, &quot;wax&quot;, &quot;packing&quot;, &quot;QC&quot;
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Query processing function
function processQuery(query: string, jobs: Job[]): { answer: string; detail: string; context?: string } {
  const q = query.toLowerCase();

  // Count jobs at location
  const locationMatch = q.match(/(?:how many|count|total)\s+(?:jobs?|items?)\s+(?:at|in|@)\s+(\w+)/i);
  if (locationMatch) {
    const loc = locationMatch[1].toLowerCase();
    const matchingLoc = LOCATION_ORDER.find(l => l.toLowerCase().includes(loc));
    if (matchingLoc) {
      const count = jobs.filter(j => j.normalizedLocation === matchingLoc).length;
      const pieces = jobs.filter(j => j.normalizedLocation === matchingLoc).reduce((sum, j) => sum + (j.batchQty || 0), 0);
      return {
        answer: `${count} jobs`,
        detail: `at ${matchingLoc}`,
        context: `${pieces.toLocaleString()} total pieces`,
      };
    }
  }

  // Total pieces at location
  const piecesMatch = q.match(/(?:total|how many)\s+pieces?\s+(?:at|in|@)\s+(\w+)/i);
  if (piecesMatch) {
    const loc = piecesMatch[1].toLowerCase();
    const matchingLoc = LOCATION_ORDER.find(l => l.toLowerCase().includes(loc));
    if (matchingLoc) {
      const pieces = jobs.filter(j => j.normalizedLocation === matchingLoc).reduce((sum, j) => sum + (j.batchQty || 0), 0);
      const count = jobs.filter(j => j.normalizedLocation === matchingLoc).length;
      return {
        answer: `${pieces.toLocaleString()} pieces`,
        detail: `at ${matchingLoc}`,
        context: `Across ${count} jobs`,
      };
    }
  }

  // Busiest location
  if (q.includes("busiest") || q.includes("most jobs") || q.includes("highest")) {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const loc = j.normalizedLocation;
      counts[loc] = (counts[loc] || 0) + 1;
    });
    const busiest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (busiest) {
      return {
        answer: busiest[0],
        detail: `with ${busiest[1]} jobs`,
        context: "Most active location right now",
      };
    }
  }

  // Which PO has bottlenecks
  if (q.includes("bottleneck")) {
    const poGroups: Record<string, Job[]> = {};
    jobs.forEach(j => {
      if (!poGroups[j.poNo]) poGroups[j.poNo] = [];
      poGroups[j.poNo].push(j);
    });

    let worstPO = "";
    let worstRatio = 0;
    Object.entries(poGroups).forEach(([po, poJobs]) => {
      const atPacking = poJobs.filter(j => j.normalizedLocation === "Packing").length;
      const ratio = poJobs.length > 0 ? (poJobs.length - atPacking) / poJobs.length : 0;
      if (ratio > worstRatio) {
        worstRatio = ratio;
        worstPO = po;
      }
    });

    if (worstPO) {
      const stuck = poGroups[worstPO].filter(j => j.normalizedLocation !== "Packing").length;
      return {
        answer: `PO ${worstPO}`,
        detail: `${stuck} jobs not yet packed`,
        context: `${Math.round(worstRatio * 100)}% still in production`,
      };
    }
  }

  // Closest to done
  if (q.includes("closest to done") || q.includes("almost done") || q.includes("nearest complete")) {
    const poGroups: Record<string, Job[]> = {};
    jobs.forEach(j => {
      if (!poGroups[j.poNo]) poGroups[j.poNo] = [];
      poGroups[j.poNo].push(j);
    });

    let bestPO = "";
    let bestProgress = -1;
    Object.entries(poGroups).forEach(([po, poJobs]) => {
      const packedPieces = poJobs.filter(j => j.normalizedLocation === "Packing").reduce((sum, j) => sum + (j.batchQty || 0), 0);
      const totalPieces = poJobs.reduce((sum, j) => sum + (j.batchQty || 0), 0);
      const progress = totalPieces > 0 ? packedPieces / totalPieces : 0;
      if (progress > bestProgress && progress < 1) {
        bestProgress = progress;
        bestPO = po;
      }
    });

    if (bestPO) {
      return {
        answer: `PO ${bestPO}`,
        detail: `${Math.round(bestProgress * 100)}% complete`,
        context: "Closest to shipping",
      };
    }
  }

  // Rank POs by progress
  if (q.includes("rank") && q.includes("progress")) {
    const poGroups: Record<string, Job[]> = {};
    jobs.forEach(j => {
      if (!poGroups[j.poNo]) poGroups[j.poNo] = [];
      poGroups[j.poNo].push(j);
    });

    const ranked = Object.entries(poGroups).map(([po, poJobs]) => {
      const packedPieces = poJobs.filter(j => j.normalizedLocation === "Packing").reduce((sum, j) => sum + (j.batchQty || 0), 0);
      const totalPieces = poJobs.reduce((sum, j) => sum + (j.batchQty || 0), 0);
      return { po, progress: totalPieces > 0 ? Math.round((packedPieces / totalPieces) * 100) : 0 };
    }).sort((a, b) => b.progress - a.progress);

    const top3 = ranked.slice(0, 3).map((r, i) => `${i + 1}. PO ${r.po}: ${r.progress}%`).join("\n");
    return {
      answer: "PO Rankings",
      detail: top3,
      context: "By completion percentage",
    };
  }

  // Default: no match
  return {
    answer: "Could not understand",
    detail: "Try asking about jobs, locations, or POs",
    context: "Click ? for examples",
  };
}
