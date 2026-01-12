"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Job, LOCATION_ORDER, normalizeLocation } from "@/lib/types";

interface DashboardProps {
  user: any;
  onSignOut: () => void;
}

interface Filters {
  po: string;
  sku: string;
  location: string;
  plating: string;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // UI state
  const [filters, setFilters] = useState<Filters>({ po: "", sku: "", location: "", plating: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Job | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [distributionMode, setDistributionMode] = useState<"jobs" | "pieces">("jobs");

  // Modal state
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [analyticsMode, setAnalyticsMode] = useState<"jobs" | "pieces">("jobs");
  const [expandedJobs, setExpandedJobs] = useState(false);

  // Query assistant state
  const [queryInput, setQueryInput] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [showQueryHelp, setShowQueryHelp] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (isManual = false) => {
    try {
      // Use refreshing state for background/manual refreshes, loading for initial
      if (jobs.length > 0) {
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
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobs.length]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchData]);

  // Computed values
  const uniquePOs = useMemo(() => [...new Set(jobs.map(j => j.poNo).filter(Boolean))].sort(), [jobs]);
  const uniquePlatings = useMemo(() => [...new Set(jobs.map(j => j.plating).filter(Boolean))].sort(), [jobs]);
  const uniqueLocations = useMemo(() =>
    LOCATION_ORDER.filter(loc => jobs.some(j => j.normalizedLocation === loc)),
    [jobs]
  );

  // Filtered and sorted data
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Apply filters
    if (filters.po) {
      result = result.filter(j => j.poNo?.toLowerCase().includes(filters.po.toLowerCase()));
    }
    if (filters.sku) {
      result = result.filter(j => j.sku?.toLowerCase().includes(filters.sku.toLowerCase()));
    }
    if (filters.location) {
      result = result.filter(j => j.normalizedLocation === filters.location);
    }
    if (filters.plating) {
      result = result.filter(j => j.plating === filters.plating);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(j =>
        Object.values(j).some(v => v && String(v).toLowerCase().includes(query))
      );
    }

    // Apply sort
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal: any = a[sortColumn];
        let bVal: any = b[sortColumn];

        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";

        if (["batchQty", "totalQty", "weightCasting", "weightPolishing", "weightPlating", "accWt"].includes(sortColumn)) {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [jobs, filters, searchQuery, sortColumn, sortDirection]);

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

  // Clear filters
  const clearFilters = () => {
    setFilters({ po: "", sku: "", location: "", plating: "" });
    setSearchQuery("");
  };

  // Query assistant
  const runQuery = (query: string) => {
    setQueryInput(query);
    const result = processQuery(query, jobs);
    setQueryResult(result);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Job No", "PO No", "SKU", "Plating", "Batch Qty", "Total Qty", "Size", "Location", "Date Sending"];
    const rows = filteredJobs.map(j => [
      j.jobNo, j.poNo, j.sku, j.plating, j.batchQty, j.totalQty, j.size, j.normalizedLocation, j.dateSending
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

  // PO Analytics
  const poJobs = useMemo(() => {
    if (!selectedPO) return [];
    return jobs.filter(j => j.poNo === selectedPO);
  }, [jobs, selectedPO]);

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

  return (
    <div className="app-container">
      {/* Header */}
      <header className="top-bar">
        <div className="logo-section">
          <div className="logo-text">
            <h1>Location Dashboard</h1>
            <span className="subtitle">Job Cart Tracker</span>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill">
            <span className="stat-label">Total Jobs</span>
            <span className="stat-value">{jobs.length}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Active POs</span>
            <span className="stat-value">{uniquePOs.length}</span>
          </div>
          <div className="stat-pill refresh-info">
            <span className="stat-label">Last Refresh</span>
            <span className="stat-value">
              {lastRefresh?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) || "—"}
            </span>
            <button
              className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title={autoRefreshEnabled ? "Auto-refresh: ON (30s)" : "Auto-refresh: OFF"}
            >
              {refreshing ? '↻' : '⟳'}
            </button>
            <button
              className={`auto-refresh-toggle ${autoRefreshEnabled ? 'active' : ''}`}
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? "Disable auto-refresh" : "Enable auto-refresh (30s)"}
            >
              {autoRefreshEnabled ? '⏸' : '▶'}
            </button>
          </div>
          {refreshing && (
            <div className="refresh-indicator">
              <span className="refresh-spinner">↻</span> Updating...
            </div>
          )}
          <div className="po-quick-select">
            <select
              className="po-select"
              value=""
              onChange={(e) => e.target.value && setSelectedPO(e.target.value)}
            >
              <option value="">Analyze PO...</option>
              {uniquePOs.map(po => (
                <option key={po} value={po}>PO {po}</option>
              ))}
            </select>
          </div>
          <div className="query-assistant-wrapper">
            <div className="query-assistant">
              <input
                type="text"
                className="query-input"
                placeholder="Try: How many jobs at polishing?"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runQuery(queryInput)}
              />
              {queryResult && (
                <div className="query-results">
                  <div className="query-answer">
                    <div className="query-answer-main">{queryResult.answer}</div>
                    <div className="query-answer-detail">{queryResult.detail}</div>
                    {queryResult.context && (
                      <div className="query-answer-context">{queryResult.context}</div>
                    )}
                  </div>
                  <button
                    className="query-action-btn"
                    style={{ position: "absolute", top: 8, right: 8, width: "auto", flex: "none" }}
                    onClick={() => setQueryResult(null)}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
            <button
              className="query-help-btn"
              onClick={() => setShowQueryHelp(!showQueryHelp)}
              title="How to ask questions"
            >
              ?
            </button>
          </div>
          <button
            className="refresh-btn"
            onClick={() => fetchData()}
            title="Refresh now"
            disabled={loading}
          >
            {loading ? "..." : "↻"}
          </button>
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

      {/* Quick Actions Bar */}
      <section className="quick-actions-bar">
        <span className="quick-actions-label">Quick Search:</span>
        <div className="quick-actions">
          {[
            { icon: "💎", text: "Polishing", query: "How many jobs at polishing?" },
            { icon: "⚡", text: "Electro", query: "How many jobs at electro?" },
            { icon: "🕯️", text: "Wax", query: "How many jobs at wax?" },
            { icon: "📦", text: "Packing", query: "How many jobs at packing?" },
            { icon: "🏆", text: "Busiest", query: "Busiest location" },
            { icon: "⚠️", text: "Bottleneck", query: "Which PO has bottlenecks?" },
            { icon: "📊", text: "Rank POs", query: "Rank POs by progress" },
            { icon: "✅", text: "Almost Done", query: "Which PO is closest to done?" },
          ].map(({ icon, text, query }) => (
            <button
              key={text}
              className="quick-action-btn"
              onClick={() => runQuery(query)}
              title={query}
            >
              <span className="qa-icon">{icon}</span>
              <span className="qa-text">{text}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="filters-section">
        <div className="filter-group">
          <label htmlFor="filterPO">PO Number</label>
          <input
            type="text"
            id="filterPO"
            className="filter-input"
            placeholder="e.g. 34165"
            value={filters.po}
            onChange={(e) => setFilters(prev => ({ ...prev, po: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="filterSKU">Design / SKU</label>
          <input
            type="text"
            id="filterSKU"
            className="filter-input"
            placeholder="e.g. C8812E"
            value={filters.sku}
            onChange={(e) => setFilters(prev => ({ ...prev, sku: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="filterLocation">Location</label>
          <select
            id="filterLocation"
            className="filter-select"
            value={filters.location}
            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          >
            <option value="">All Locations</option>
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filterPlating">Plating</label>
          <select
            id="filterPlating"
            className="filter-select"
            value={filters.plating}
            onChange={(e) => setFilters(prev => ({ ...prev, plating: e.target.value }))}
          >
            <option value="">All Plating</option>
            {uniquePlatings.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={clearFilters}>
          Clear Filters
        </button>
      </section>

      {/* Location Summary Cards */}
      <section className="location-cards">
        {LOCATION_ORDER.filter(loc => locationCounts[loc]?.jobs > 0 || loc !== "Other").map(loc => (
          <div
            key={loc}
            className={`location-card ${filters.location === loc ? "active" : ""}`}
            data-location={loc}
            onClick={() => setFilters(prev => ({
              ...prev,
              location: prev.location === loc ? "" : loc
            }))}
          >
            <div className="location-name">{loc}</div>
            <div className="location-count">{locationCounts[loc]?.jobs || 0}</div>
          </div>
        ))}
      </section>

      {/* Location Distribution Chart */}
      <section className="distribution-section">
        <div className="section-header">
          <h2>Location Distribution</h2>
          <div className="chart-toggle distribution-toggle">
            <button
              className={`toggle-btn ${distributionMode === "jobs" ? "active" : ""}`}
              onClick={() => setDistributionMode("jobs")}
            >
              Jobs
            </button>
            <button
              className={`toggle-btn ${distributionMode === "pieces" ? "active" : ""}`}
              onClick={() => setDistributionMode("pieces")}
            >
              Pieces
            </button>
          </div>
        </div>
        <div className="distribution-chart">
          <div className="dist-totals">
            <div className="dist-total-item">
              <div className="dist-total-value">{filteredJobs.length}</div>
              <div className="dist-total-label">Total Jobs</div>
            </div>
            <div className="dist-total-item">
              <div className="dist-total-value">
                {filteredJobs.reduce((sum, j) => sum + (j.batchQty || 0), 0).toLocaleString()}
              </div>
              <div className="dist-total-label">Total Pieces</div>
            </div>
          </div>
          {LOCATION_ORDER.filter(loc => locationCounts[loc]?.jobs > 0).map(loc => {
            const count = locationCounts[loc];
            const value = distributionMode === "jobs" ? count.jobs : count.pieces;
            const total = distributionMode === "jobs"
              ? filteredJobs.length
              : filteredJobs.reduce((sum, j) => sum + (j.batchQty || 0), 0);
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;

            return (
              <div key={loc} className="dist-bar-row">
                <div className="dist-bar-label">{loc}</div>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    data-location={loc}
                    style={{ width: `${percent}%` }}
                  >
                    {percent > 10 && <span>{value}</span>}
                  </div>
                </div>
                <div className="dist-bar-value">
                  {value.toLocaleString()}
                  <span className="percent">({percent}%)</span>
                </div>
              </div>
            );
          })}
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
                className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                data-view="table"
                title="Table View"
                onClick={() => setViewMode("table")}
              >
                ☰
              </button>
              <button
                className={`view-btn ${viewMode === "kanban" ? "active" : ""}`}
                data-view="kanban"
                title="Kanban View"
                onClick={() => setViewMode("kanban")}
              >
                ▦
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
                      <div
                        key={job.jobNo}
                        className="kanban-card"
                        onClick={() => setSelectedJob(job)}
                      >
                        <div className="kanban-card-header">
                          <span className="kanban-card-job">{job.jobNo}</span>
                          <span className="kanban-card-qty">{job.batchQty} pcs</span>
                        </div>
                        <div className="kanban-card-sku">{job.sku}</div>
                        <div className="kanban-card-po">
                          PO:{" "}
                          <span onClick={(e) => { e.stopPropagation(); setSelectedPO(job.poNo); }}>
                            {job.poNo}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    { key: "jobNo", label: "Job No" },
                    { key: "poNo", label: "PO No" },
                    { key: "sku", label: "Design/SKU" },
                    { key: "plating", label: "Plating" },
                    { key: "batchQty", label: "Batch Qty" },
                    { key: "totalQty", label: "Total Qty" },
                    { key: "size", label: "Size" },
                    { key: "normalizedLocation", label: "Location" },
                    { key: "dateSending", label: "Date Sending" },
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
                {filteredJobs.map(job => (
                  <tr key={job.jobNo} onClick={() => setSelectedJob(job)}>
                    <td><strong>{job.jobNo}</strong></td>
                    <td>
                      <span
                        className="po-link"
                        onClick={(e) => { e.stopPropagation(); setSelectedPO(job.poNo); }}
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
                    <td>{job.dateSending || "—"}</td>
                  </tr>
                ))}
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
      {selectedPO && poStats && (
        <div className="modal-overlay" onClick={() => setSelectedPO(null)}>
          <div className="modal po-analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>PO {selectedPO} Analytics</h2>
              <button className="modal-close" onClick={() => setSelectedPO(null)}>
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
                        onClick={() => { setSelectedPO(null); setSelectedJob(job); }}
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
