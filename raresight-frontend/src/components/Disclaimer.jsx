import React, { useState, useEffect } from 'react';
import styles from './Disclaimer.module.css';

const Disclaimer = ({ onDismiss }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem('rs_disclaimer_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('rs_disclaimer_dismissed', 'true');
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (dismissed) return null;

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.content}>
        <span className={styles.icon}>⚠</span>
        <span>
          <strong>Decision support only</strong> — this system returns similarity scores to known cases. It does not make diagnoses. Always verify with clinical judgment and patient history.
        </span>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleDismiss}
        aria-label="Dismiss disclaimer"
      >
        ✕
      </button>
    </div>
  );
};

export default Disclaimer;
