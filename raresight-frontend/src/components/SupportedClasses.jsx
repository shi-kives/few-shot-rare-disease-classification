import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './SupportedClasses.module.css';

const SupportedClasses = ({ newAddedClass }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('raresight_history');
      const customClasses = JSON.parse(localStorage.getItem('raresight_custom_classes') || '[]');
      
      let classSet = new Set(customClasses);

      if (stored) {
        const history = JSON.parse(stored);
        if (Array.isArray(history)) {
          history.forEach((item) => {
            if (item.prediction) classSet.add(item.prediction);
            if (item.all_class_scores) {
              Object.keys(item.all_class_scores).forEach((k) => classSet.add(k));
            }
          });
        }
      }

      if (newAddedClass) {
        classSet.add(newAddedClass);
      }

      setClasses(Array.from(classSet).sort());
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error deriving supported classes:', err);
      }
    }
  }, [newAddedClass]);

  const isDiagnosticCentre = user?.role === 'Diagnostic Centre';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Supported Disease Classes</h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {classes.length > 0 ? `${classes.length} registered` : ''}
        </span>
      </div>

      {classes.length > 0 ? (
        <div className={styles.badgeList}>
          {classes.map((cls) => (
            <span key={cls} className={styles.pill}>
              {cls}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.emptyNote}>
          Class list available after your first analysis or class addition.
        </p>
      )}

      {isDiagnosticCentre && (
        <div className={styles.diagnosticNotice}>
          <strong>Diagnostic Centre notice:</strong> Batch upload for multiple patients is planned for a future release.
        </div>
      )}
    </div>
  );
};

export default SupportedClasses;
