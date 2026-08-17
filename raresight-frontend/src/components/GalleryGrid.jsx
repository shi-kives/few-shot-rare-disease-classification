import React, { useState } from 'react';
import styles from './GalleryGrid.module.css';

const buildImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  const staticPrefix = cleanPath.startsWith('static/') ? cleanPath : `static/${cleanPath}`;
  return `/${staticPrefix}`;
};

const getModalityBadgeClass = (modality = '') => {
  const mod = modality.toLowerCase();
  if (mod.includes('derm')) return styles.badgeDerm;
  if (mod.includes('retin')) return styles.badgeRetina;
  if (mod.includes('hist')) return styles.badgeHist;
  if (mod.includes('xray') || mod.includes('x-ray')) return styles.badgeXray;
  return styles.badgeDefault;
};

const GalleryCard = ({ item, prediction }) => {
  const [imageError, setImageError] = useState(false);

  const similarityScore =
    item.similarity_score !== undefined
      ? (item.similarity_score * 100).toFixed(1)
      : item.score !== undefined
      ? (item.score * 100).toFixed(1)
      : '0.0';

  const itemClass = item.class_name || item.condition || item.label || 'Unknown';
  const isMatch = prediction && itemClass.toLowerCase() === prediction.toLowerCase();
  const status = item.status || (item.confirmed ? 'Confirmed' : 'Confirmed');
  const dataset = item.dataset || item.source || 'Reference Index';
  const modality = item.modality || 'Medical Image';

  return (
    <div
      className={`${styles.card} ${
        isMatch ? styles.cardMatch : styles.cardDifferent
      }`}
    >
      <div className={styles.imageWrapper}>
        {!imageError && item.image_path ? (
          <img
            src={buildImageUrl(item.image_path)}
            alt={`Reference ${itemClass}`}
            className={styles.image}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            <span>🖼</span>
            <span>{dataset}</span>
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.scoreRow}>
          <span className={styles.scoreLabel}>Similarity</span>
          <span className={styles.similarityScore}>{similarityScore}%</span>
        </div>

        <div
          className={`${styles.className} ${
            isMatch ? styles.classNameMatch : styles.classNameDifferent
          }`}
          title={itemClass}
        >
          {itemClass}
        </div>

        <div className={styles.cardFooter}>
          <span
            className={`${styles.modalityBadge} ${getModalityBadgeClass(
              modality
            )}`}
          >
            {modality}
          </span>
          <span className={styles.statusText}>{status}</span>
        </div>
      </div>
    </div>
  );
};

const GalleryGrid = ({ cases = [], prediction = '' }) => {
  if (!cases || cases.length === 0) return null;

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Top Reference Matches (k-NN)</h3>
        <span className={styles.countBadge}>{cases.length} similar cases</span>
      </div>

      <div className={styles.grid}>
        {cases.map((c, idx) => (
          <GalleryCard
            key={c.id || c.image_path || idx}
            item={c}
            prediction={prediction}
          />
        ))}
      </div>
    </div>
  );
};

export default GalleryGrid;
