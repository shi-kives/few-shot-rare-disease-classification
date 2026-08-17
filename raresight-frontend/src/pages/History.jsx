import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import styles from './History.module.css';

const getModalityBadgeClass = (modality = '') => {
  const mod = modality.toLowerCase();
  if (mod.includes('derm')) return styles.badgeDerm;
  if (mod.includes('retin')) return styles.badgeRetina;
  if (mod.includes('hist')) return styles.badgeHist;
  if (mod.includes('xray') || mod.includes('x-ray')) return styles.badgeXray;
  return styles.badgeDefault;
};

const getStatusPillClass = (status = '') => {
  switch (status.toLowerCase()) {
    case 'accepted':
      return styles.statusAccepted;
    case 'rejected':
      return styles.statusRejected;
    case 'flagged':
      return styles.statusFlagged;
    case 'no action':
    default:
      return styles.statusNoAction;
  }
};

const History = () => {
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  // Filter States
  const [modalityFilter, setModalityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('raresight_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error reading history:', err);
      }
    }
  }, []);

  const handleClearHistory = () => {
    localStorage.removeItem('raresight_history');
    setHistory([]);
    setShowClearConfirm(false);
    showToast('Analysis history cleared', 'info');
  };

  // Client-side filtering
  const filteredHistory = history.filter((item) => {
    // Modality filter
    if (modalityFilter !== 'All') {
      if (
        !item.modality ||
        !item.modality.toLowerCase().includes(modalityFilter.toLowerCase())
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (!item.status || item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrediction = item.prediction?.toLowerCase().includes(q);
      const matchId = item.id?.toLowerCase().includes(q);
      if (!matchPrediction && !matchId) return false;
    }

    // Date range filter
    if (startDate || endDate) {
      // Parse timestamp string e.g. "14:30:00 16/08/2026"
      try {
        const parts = item.timestamp?.split(' ');
        if (parts && parts[1]) {
          const [d, m, y] = parts[1].split('/');
          const itemDate = new Date(`${y}-${m}-${d}`);

          if (startDate) {
            const start = new Date(startDate);
            if (itemDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            if (itemDate > end) return false;
          }
        }
      } catch {
        // pass through if unparseable
      }
    }

    return true;
  });

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) {
      showToast('No records to export', 'info');
      return;
    }

    const headers = [
      'Query ID',
      'Timestamp',
      'Prediction',
      'Min Similarity (%)',
      'Max Similarity (%)',
      'Modality',
      'Review Status',
    ];

    const rows = filteredHistory.map((row) => [
      `"${row.id || ''}"`,
      `"${row.timestamp || ''}"`,
      `"${row.prediction || ''}"`,
      row.minSim ?? '',
      row.maxSim ?? '',
      `"${row.modality || ''}"`,
      `"${row.status || 'No action'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `raresight_history_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully', 'success');
  };

  const modalitiesList = [
    'All',
    'Dermoscopy',
    'X-ray',
    'Retinal fundus',
    'Histopathology',
  ];
  const statusesList = ['All', 'Accepted', 'Rejected', 'Flagged', 'No action'];

  if (!history || history.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Case Analysis History</h1>
        </div>

        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}>📋</span>
          <h2 className={styles.emptyHeading}>No analyses yet</h2>
          <p className={styles.emptyText}>
            Upload an image on the Analyse page to get started with rare pathology matching.
          </p>
          <Link to="/analyse" className={styles.emptyButton}>
            Go to Analyse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Case Analysis History</h1>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnAction}
            onClick={handleExportCSV}
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
          {!showClearConfirm && (
            <button
              type="button"
              className={`${styles.btnAction} ${styles.btnClear}`}
              onClick={() => setShowClearConfirm(true)}
            >
              <span>🗑</span>
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {showClearConfirm && (
        <div className={styles.confirmClearRow} role="alert">
          <span>Are you sure? This cannot be undone.</span>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.btnConfirm}
              onClick={handleClearHistory}
            >
              Confirm Clear
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <div className={styles.filterInputGroup}>
          <label htmlFor="filter-search" className={styles.filterLabel}>
            Search Condition
          </label>
          <input
            id="filter-search"
            type="text"
            placeholder="e.g. Melanoma..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.filterInput}
          />
        </div>

        <div className={styles.filterInputGroup}>
          <label htmlFor="filter-modality" className={styles.filterLabel}>
            Modality
          </label>
          <select
            id="filter-modality"
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {modalitiesList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterInputGroup}>
          <label htmlFor="filter-status" className={styles.filterLabel}>
            Review Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            {statusesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterInputGroup}>
          <label htmlFor="filter-from-date" className={styles.filterLabel}>
            From Date
          </label>
          <input
            id="filter-from-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.filterInput}
          />
        </div>

        <div className={styles.filterInputGroup}>
          <label htmlFor="filter-to-date" className={styles.filterLabel}>
            To Date
          </label>
          <input
            id="filter-to-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.filterInput}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Timestamp</th>
                <th>Prediction</th>
                <th>Confidence Range</th>
                <th>Modality</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.thumbnailWrapper}>
                        {item.imageDataUrl ? (
                          <img
                            src={item.imageDataUrl}
                            alt={item.prediction}
                            className={styles.thumbnail}
                          />
                        ) : (
                          <span>🖼</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.timestamp}>{item.timestamp}</td>
                    <td className={styles.predictionTitle}>
                      {item.prediction || 'Unclassified'}
                    </td>
                    <td className={styles.confidenceRange}>
                      {item.minSim ?? 0}% – {item.maxSim ?? 0}%
                    </td>
                    <td>
                      <span
                        className={`${styles.modalityBadge} ${getModalityBadgeClass(
                          item.modality
                        )}`}
                      >
                        {item.modality || 'Medical'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${getStatusPillClass(
                          item.status
                        )}`}
                      >
                        {item.status || 'No action'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.btnView}
                        onClick={() => setSelectedCase(item)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No analysis records matching your active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCase && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCase(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Analysis Record Details</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedCase(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {selectedCase.imageDataUrl && (
                <img
                  src={selectedCase.imageDataUrl}
                  alt={selectedCase.prediction}
                  style={{ width: '80px', height: '80px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', objectFit: 'cover' }}
                />
              )}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedCase.prediction}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {selectedCase.id}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Recorded: {selectedCase.timestamp}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Modality:</strong> {selectedCase.modality}</div>
              <div><strong>Confidence Range:</strong> {selectedCase.minSim}% – {selectedCase.maxSim}%</div>
              <div><strong>Clinician Decision:</strong> {selectedCase.status}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
