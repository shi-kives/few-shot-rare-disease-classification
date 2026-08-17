import React from 'react';
import styles from './ConfidenceBand.module.css';

const ConfidenceBand = ({ minSim = 0, maxSim = 100, level = 'MODERATE' }) => {
  // Normalize and clamp percentages
  const safeMin = Math.max(0, Math.min(100, Math.round(minSim)));
  const safeMax = Math.max(safeMin, Math.min(100, Math.round(maxSim)));
  const width = Math.max(2, safeMax - safeMin);

  const normalizedLevel = (level || 'MODERATE').toUpperCase();

  const getFillClass = () => {
    switch (normalizedLevel) {
      case 'HIGH':
        return styles.fillHigh;
      case 'LOW':
        return styles.fillLow;
      case 'MODERATE':
      default:
        return styles.fillModerate;
    }
  };

  const getBadgeClass = () => {
    switch (normalizedLevel) {
      case 'HIGH':
        return styles.badgeLevelHigh;
      case 'LOW':
        return styles.badgeLevelLow;
      case 'MODERATE':
      default:
        return styles.badgeLevelModerate;
    }
  };

  const getInterpretation = () => {
    switch (normalizedLevel) {
      case 'HIGH':
        return 'Strong visual concordance across reference database cases. High confidence in retrieval alignment.';
      case 'LOW':
        return 'Low visual concordance or elevated feature dispersion. The specimen deviates significantly from reference prototypes.';
      case 'MODERATE':
      default:
        return 'Moderate visual concordance. Multiple case clusters present in reference database — secondary review recommended.';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.barRow}>
        <span className={`${styles.percentage} ${styles.percentageLeft}`}>
          {safeMin}%
        </span>
        <div className={styles.track}>
          <div
            className={`${styles.fill} ${getFillClass()}`}
            style={{
              marginLeft: `${safeMin}%`,
              width: `${width}%`,
            }}
          />
        </div>
        <span className={`${styles.percentage} ${styles.percentageRight}`}>
          {safeMax}%
        </span>
      </div>
      <p className={styles.interpretation}>
        <span className={`${styles.badgeLevel} ${getBadgeClass()}`}>
          [{normalizedLevel}]
        </span>
        {getInterpretation()}
      </p>
    </div>
  );
};

export default ConfidenceBand;
