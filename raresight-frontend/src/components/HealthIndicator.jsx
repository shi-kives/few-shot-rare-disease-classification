import React, { useState, useEffect } from 'react';
import useHealth from '../hooks/useHealth.js';
import styles from './HealthIndicator.module.css';

const HealthIndicator = ({ full = false }) => {
  const { status, data, lastChecked, refresh } = useHealth();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastChecked) return;
    const interval = setInterval(() => {
      const diff = Math.floor((new Date() - lastChecked) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastChecked]);

  if (!full) {
    const isOk = status === 'ok';
    const dotClass =
      status === 'loading'
        ? styles.dotLoading
        : isOk
        ? styles.dotOk
        : styles.dotError;

    const title =
      status === 'loading'
        ? 'Checking backend connection...'
        : isOk
        ? 'Backend connected'
        : 'Backend unreachable';

    return <span className={`${styles.dot} ${dotClass}`} title={title} aria-label={title} />;
  }

  const isConnected = status === 'ok';
  const backbone = data?.backbone || data?.model_name || data?.backbone_name || 'ResNet18 / EfficientNet-B3';
  const collectionsCount =
    data?.chromadb_count ??
    data?.collection_count ??
    (data?.collections ? Object.keys(data.collections).length : 'Active (4 Collections)');

  return (
    <div className={styles.fullCard}>
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <span
            className={`${styles.dot} ${
              status === 'loading'
                ? styles.dotLoading
                : isConnected
                ? styles.dotOk
                : styles.dotError
            }`}
          />
          <h3 className={styles.title}>Clinical Model & Engine Status</h3>
        </div>
        <span
          className={`${styles.statusPill} ${
            isConnected ? styles.statusPillOk : styles.statusPillError
          }`}
        >
          {status === 'loading' ? 'Checking...' : isConnected ? 'Operational' : 'Unavailable'}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>Vision Backbone</div>
          <div className={styles.metricValue}>{backbone}</div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricLabel}>ChromaDB Index</div>
          <div className={styles.metricValue}>
            {typeof collectionsCount === 'number'
              ? `${collectionsCount} vectors indexed`
              : collectionsCount}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span>
          Last checked:{' '}
          {lastChecked ? `${secondsAgo}s ago` : 'Never'}
        </span>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={refresh}
          disabled={status === 'loading'}
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
};

export default HealthIndicator;
