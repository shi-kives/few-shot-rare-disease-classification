import React from 'react';
import styles from './SkeletonCard.module.css';

export const SkeletonPrediction = () => {
  return (
    <div className={styles.resultSkeleton}>
      <div className={`${styles.leftImagePlaceholder} ${styles.skeletonPulse}`} />
      <div className={styles.rightPanelPlaceholder}>
        <div className={`${styles.lineSm} ${styles.skeletonPulse}`} />
        <div className={`${styles.lineLg} ${styles.skeletonPulse}`} />
        <div className={`${styles.bandPlaceholder} ${styles.skeletonPulse}`} />
        <div className={styles.pillsRow}>
          <div className={`${styles.pillPlaceholder} ${styles.skeletonPulse}`} />
          <div className={`${styles.pillPlaceholder} ${styles.skeletonPulse}`} />
          <div className={`${styles.pillPlaceholder} ${styles.skeletonPulse}`} />
        </div>
      </div>
    </div>
  );
};

export const SkeletonGallery = () => {
  return (
    <div className={styles.gallerySkeletonGrid}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={styles.galleryCardSkeleton}>
          <div className={`${styles.cardImagePlaceholder} ${styles.skeletonPulse}`} />
          <div className={`${styles.lineSm} ${styles.skeletonPulse}`} style={{ width: '80%' }} />
          <div className={`${styles.lineSm} ${styles.skeletonPulse}`} style={{ width: '50%' }} />
        </div>
      ))}
    </div>
  );
};

const SkeletonCard = () => {
  return (
    <div>
      <SkeletonPrediction />
      <SkeletonGallery />
    </div>
  );
};

export default SkeletonCard;
