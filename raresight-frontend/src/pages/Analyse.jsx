import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { diagnoseApi } from '../api/diagnose.js';
import { useToast } from '../context/ToastContext.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import ConfidenceBand from '../components/ConfidenceBand.jsx';
import GateStatus from '../components/GateStatus.jsx';
import AgreementBanner from '../components/AgreementBanner.jsx';
import GalleryGrid from '../components/GalleryGrid.jsx';
import FeedbackForm from '../components/FeedbackForm.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import styles from './Analyse.module.css';

const MODALITIES = [
  'Auto-detect',
  'Dermoscopy',
  'X-ray',
  'Retinal fundus',
  'Histopathology',
];

const createThumbnail = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 48, 48);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve('');
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

const getModalityBadgeClass = (modality = '') => {
  const mod = modality.toLowerCase();
  if (mod.includes('derm')) return styles.badgeDerm;
  if (mod.includes('retin')) return styles.badgeRetina;
  if (mod.includes('hist')) return styles.badgeHist;
  if (mod.includes('xray') || mod.includes('x-ray')) return styles.badgeXray;
  return styles.badgeDefault;
};

const Analyse = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [modality, setModality] = useState('Histopathology');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [queryId, setQueryId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [historyId, setHistoryId] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  // Check welcome card condition
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('raresight_history');
      const isWelcomeDismissed = localStorage.getItem('rs_welcome_dismissed') === 'true';
      const historyList = storedHistory ? JSON.parse(storedHistory) : [];
      if ((!historyList || historyList.length === 0) && !isWelcomeDismissed) {
        setShowWelcome(true);
      }
    } catch {
      setShowWelcome(false);
    }
  }, []);

  const handleDismissWelcome = () => {
    localStorage.setItem('rs_welcome_dismissed', 'true');
    setShowWelcome(false);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      showToast('Only PNG and JPG files are accepted', 'error');
      return;
    }

    // Validate size (20 MB limit)
    const maxSize = 20 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      showToast('File size exceeds 20 MB limit', 'error');
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setResult(null); // Clear previous results
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAnalyse = async () => {
    if (!file || isLoading) return;

    setIsLoading(true);
    const newQueryId = crypto.randomUUID();
    const now = new Date();
    const formattedDate = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${String(
      now.getDate()
    ).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}/${now.getFullYear()}`;

    setQueryId(newQueryId);
    setTimestamp(formattedDate);

    try {
      let data;
      try {
        data = await diagnoseApi(file, modality);
      } catch (err) {
        if (!err.response && import.meta.env.DEV) {
          // Dev mock fallback for testing without running backend
          data = {
            prediction: 'Colorectal Adenocarcinoma Epithelium',
            confidence_level: 'HIGH',
            agrees: true,
            modality: 'Histopathology',
            embedding: [0.12, 0.45, 0.78, 0.33, 0.91],
            gates: {
              similarity_threshold_passed: true,
              prototype_dispersion_passed: true,
              ood_status_passed: true,
            },
            similar_cases: [
              {
                id: 'path-case-01',
                image_path: '/static/pathmnist/colorectal_adenocarcinoma_epithelium/sample_0000.png',
                similarity_score: 0.942,
                class_name: 'Colorectal Adenocarcinoma Epithelium',
                dataset: 'PathMNIST (Histopathology)',
                modality: 'Histopathology',
                confirmed: true,
              },
              {
                id: 'path-case-02',
                image_path: '/static/pathmnist/colorectal_adenocarcinoma_epithelium/sample_0001.png',
                similarity_score: 0.918,
                class_name: 'Colorectal Adenocarcinoma Epithelium',
                dataset: 'PathMNIST (Histopathology)',
                modality: 'Histopathology',
                confirmed: true,
              },
              {
                id: 'path-case-03',
                image_path: '/static/pathmnist/cancer_associated_stroma/sample_0000.png',
                similarity_score: 0.884,
                class_name: 'Cancer-Associated Stroma',
                dataset: 'PathMNIST (Histopathology)',
                modality: 'Histopathology',
                confirmed: true,
              },
              {
                id: 'path-case-04',
                image_path: '/static/pathmnist/normal_colon_mucosa/sample_0000.png',
                similarity_score: 0.865,
                class_name: 'Normal Colon Mucosa',
                dataset: 'PathMNIST (Histopathology)',
                modality: 'Histopathology',
                confirmed: true,
              },
              {
                id: 'path-case-05',
                image_path: '/static/pathmnist/lymphocytes/sample_0000.png',
                similarity_score: 0.832,
                class_name: 'Lymphocytes',
                dataset: 'PathMNIST (Histopathology)',
                modality: 'Histopathology',
                confirmed: true,
              },
            ],
            all_class_scores: {
              'Colorectal Adenocarcinoma Epithelium': 0.94,
              'Cancer-Associated Stroma': 0.78,
              'Normal Colon Mucosa': 0.71,
              'Lymphocytes': 0.32,
            },
          };
        } else {
          throw err;
        }
      }

      setResult(data);
      setHistoryId(newQueryId);

      // Create thumbnail for history storage
      const thumbUrl = await createThumbnail(file);

      // Calculate confidence range for history
      const scores = (data.similar_cases || []).map(
        (c) => (c.similarity_score ?? c.score ?? 0) * 100
      );
      const minSim = scores.length ? Math.min(...scores) : 0;
      const maxSim = scores.length ? Math.max(...scores) : 100;

      // Append to raresight_history in localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('raresight_history') || '[]');
        const newHistoryItem = {
          id: newQueryId,
          timestamp: formattedDate,
          prediction: data.prediction || 'Unclassified',
          minSim: Math.round(minSim),
          maxSim: Math.round(maxSim),
          modality: data.modality || modality,
          status: 'No action',
          imageDataUrl: thumbUrl,
          all_class_scores: data.all_class_scores,
          embedding: data.embedding,
        };
        const updatedHistory = [newHistoryItem, ...existing];
        localStorage.setItem('raresight_history', JSON.stringify(updatedHistory));
        setShowWelcome(false);
      } catch (storageErr) {
        if (import.meta.env.DEV) {
          console.warn('Could not update history storage:', storageErr);
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Analysis failed. Please check backend connection and try again.';
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (e) => {
    e.preventDefault();
    window.print();
  };

  // Derive min/max similarity for ConfidenceBand
  const similarScores = (result?.similar_cases || []).map(
    (c) => (c.similarity_score ?? c.score ?? 0) * 100
  );
  const minSim = similarScores.length ? Math.min(...similarScores) : 0;
  const maxSim = similarScores.length ? Math.max(...similarScores) : 100;

  const isNoConfidentMatch =
    result &&
    result.confidence_level === 'LOW' &&
    (!result.prediction || result.prediction === 'Unknown' || result.prediction === 'None');

  const resolvedModality =
    result?.modality || (modality === 'Auto-detect' ? 'Dermoscopy' : modality);

  return (
    <div className={styles.container}>
      {/* Top Clinical Disclaimer */}
      <Disclaimer />

      {/* Welcome Card */}
      {showWelcome && (
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeContent}>
            <h3>Welcome to RareSight</h3>
            <p>
              Upload a medical image to find visually similar confirmed cases. Your feedback after each result helps the AI keep learning.
            </p>
          </div>
          <button
            type="button"
            className={styles.dismissButton}
            onClick={handleDismissWelcome}
            aria-label="Dismiss welcome card"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Section */}
      <section className={styles.uploadSection} aria-labelledby="upload-heading">
        <h2 id="upload-heading" className={styles.sectionHeading}>
          Upload Specimen Image
        </h2>

        <div
          className={`${styles.dropzone} ${
            isDragging ? styles.dropzoneDragging : ''
          } ${previewUrl ? styles.dropzoneWithPreview : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload specimen image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />

          {previewUrl ? (
            <div className={styles.previewContainer} onClick={(e) => e.stopPropagation()}>
              <img
                src={previewUrl}
                alt="Specimen Preview"
                className={styles.previewImage}
              />
              <div className={styles.previewMeta}>
                <strong>{file?.name}</strong> ({(file?.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
              <span
                className={styles.changeImageNote}
                onClick={() => fileInputRef.current?.click()}
              >
                Change image
              </span>
            </div>
          ) : (
            <>
              <span className={styles.uploadIcon}>⬆</span>
              <span className={styles.dropText}>
                {isDragging ? 'Drop to upload' : 'Drop image here or click to browse'}
              </span>
              <span className={styles.dropSubtext}>PNG or JPG · max 20 MB</span>
            </>
          )}
        </div>

        {/* Modality Chips */}
        <div className={styles.modalitySection}>
          <span className={styles.modalityLabel}>Acquisition Modality:</span>
          <div className={styles.chipsRow} role="radiogroup" aria-label="Modality Selection">
            {MODALITIES.map((mod) => {
              const isSupported = mod === 'Histopathology';
              return (
                <button
                  key={mod}
                  type="button"
                  role="radio"
                  disabled={!isSupported}
                  aria-checked={modality === mod}
                  aria-disabled={!isSupported}
                  title={
                    isSupported
                      ? 'Histopathology modality (Active)'
                      : `${mod} is temporarily disabled for demo — model is trained on Histopathology`
                  }
                  className={`${styles.chip} ${
                    modality === mod ? styles.chipActive : ''
                  } ${!isSupported ? styles.chipDisabled : ''}`}
                  onClick={() => isSupported && setModality(mod)}
                >
                  {mod}
                  {!isSupported && <span className={styles.chipTag}>Demo</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.analyseButton}
            onClick={handleAnalyse}
            disabled={!file || isLoading}
          >
            {isLoading && <span className={styles.spinner} />}
            <span>{isLoading ? 'Extracting Embeddings & Searching...' : 'Analyse image'}</span>
          </button>
        </div>
      </section>

      {/* Loading Skeleton */}
      {isLoading && <SkeletonCard />}

      {/* Results Section */}
      {!isLoading && result && (
        <section className={styles.resultsSection} aria-label="Diagnostic Results">
          {isNoConfidentMatch ? (
            <div className={styles.noMatchCard}>
              <span className={styles.noMatchIcon}>🔍</span>
              <h3 className={styles.noMatchHeading}>No confident match found</h3>
              <p className={styles.noMatchText}>
                The image did not match any known class with sufficient confidence. Consider using Add Class if this is a new rare condition.
              </p>
              <Link to="/add-class" className={styles.noMatchButton}>
                + Add New Class
              </Link>
            </div>
          ) : (
            <div className={styles.resultCard}>
              <div className={styles.resultGrid}>
                {/* Left Image Panel */}
                <div className={styles.imagePanel}>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Analyzed Specimen"
                      className={styles.specimenImage}
                    />
                  )}
                  <span
                    className={`${styles.modalityBadge} ${getModalityBadgeClass(
                      resolvedModality
                    )}`}
                  >
                    {resolvedModality}
                  </span>
                  <span className={styles.detectedLabel}>
                    {modality === 'Auto-detect' ? 'Auto-detected' : 'Selected Modality'}
                  </span>
                </div>

                {/* Right Prediction Panel */}
                <div className={styles.predictionPanel}>
                  <div className={styles.topPredictionHeader}>
                    <span className={styles.topPredictionLabel}>Top prediction</span>
                  </div>

                  <h3 className={styles.classNameTitle}>{result.prediction}</h3>

                  <ConfidenceBand
                    minSim={minSim}
                    maxSim={maxSim}
                    level={result.confidence_level}
                  />

                  <GateStatus gates={result.gates || result.gate_status} />

                  <AgreementBanner agrees={result.agrees} />
                </div>
              </div>

              {/* k-NN Gallery Grid */}
              <GalleryGrid
                cases={result.similar_cases}
                prediction={result.prediction}
              />

              {/* Feedback Form */}
              <FeedbackForm
                queryEmbedding={result.embedding}
                predictedClass={result.prediction}
                imageFile={file}
                allClasses={
                  result.all_class_scores ? Object.keys(result.all_class_scores) : []
                }
                historyId={historyId}
              />

              {/* Single Result Export */}
              <div className={styles.utilitiesRow}>
                <button
                  type="button"
                  onClick={handlePrint}
                  className={styles.printLink}
                >
                  <span>🖨</span>
                  <span>Print / Export result</span>
                </button>
              </div>

              {/* Audit Trail Row */}
              <div className={styles.auditTrail}>
                <span>Query ID: {queryId}</span>
                <span>Timestamp: {timestamp}</span>
                <span>File: {file?.name}</span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Analyse;
