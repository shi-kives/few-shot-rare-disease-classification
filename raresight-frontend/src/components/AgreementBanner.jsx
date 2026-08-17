import React from 'react';
import styles from './AgreementBanner.module.css';

const AgreementBanner = ({ agrees = true }) => {
  if (agrees === false) {
    return (
      <div className={`${styles.banner} ${styles.disagree}`} role="alert">
        <span className={styles.icon}>⚠</span>
        <span>
          The prototype classifier and retrieval engine disagree on this result — treat with extra caution and do not rely on this prediction alone.
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.banner} ${styles.agree}`}>
      <span className={styles.icon}>✓</span>
      <span>Both classifiers agree on this prediction.</span>
    </div>
  );
};

export default AgreementBanner;
