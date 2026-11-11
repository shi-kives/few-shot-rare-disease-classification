import React, { useState, useRef, useEffect } from 'react';
import { addClassApi } from '../api/addClass.js';
import { useToast } from '../context/ToastContext.jsx';
import SupportedClasses from '../components/SupportedClasses.jsx';
import styles from './AddClass.module.css';

const MODALITIES = [
  'Histopathology',
  'Dermoscopy',
  'X-ray',
  'Retinal fundus',
  'General Clinical',
];

const AddClass = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [modality, setModality] = useState('Histopathology');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [newAddedClass, setNewAddedClass] = useState('');

  // Collect known classes to validate against duplicates
  const [knownClasses, setKnownClasses] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('raresight_history');
      const custom = JSON.parse(
        localStorage.getItem('raresight_custom_classes') || '[]'
      );
      const set = new Set(custom);
      if (stored) {
        const history = JSON.parse(stored);
        if (Array.isArray(history)) {
          history.forEach((h) => {
            if (h.prediction) set.add(h.prediction);
            if (h.all_class_scores) {
              Object.keys(h.all_class_scores).forEach((k) => set.add(k));
            }
          });
        }
      }
      setKnownClasses(Array.from(set));
    } catch {
      setKnownClasses([]);
    }
  }, [newAddedClass]);

  const handleFiles = (incomingFiles) => {
    setValidationError('');
    const validFiles = [];
    const validPreviews = [];

    Array.from(incomingFiles).forEach((f) => {
      if (['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) {
        validFiles.push(f);
        validPreviews.push({
          file: f,
          url: URL.createObjectURL(f),
          name: f.name,
        });
      }
    });

    if (validFiles.length < incomingFiles.length) {
      showToast('Some files were ignored because they are not PNG/JPG', 'info');
    }

    setImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...validPreviews]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviews((prev) => {
      const target = prev[indexToRemove];
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleClearImages = () => {
    imagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    setImages([]);
    setImagePreviews([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const trimmedName = className.trim();
    if (!trimmedName) {
      setValidationError('Please specify a class name.');
      return;
    }

    // Check if class already exists
    const duplicate = knownClasses.some(
      (c) => c.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setValidationError(
        `Class "${trimmedName}" already exists in the system index.`
      );
      return;
    }

    // Must have at least 5 images
    if (images.length < 5) {
      setValidationError(
        `At least 5 support images are required to register a new condition (currently selected: ${images.length}).`
      );
      return;
    }

    setIsLoading(true);
    try {
      let data;
      try {
        data = await addClassApi({
          className: trimmedName,
          description,
          modality,
          images,
        });
      } catch (err) {
        if (!err.response && import.meta.env.DEV) {
          // Dev mock fallback
          data = {
            class_name: trimmedName,
            support_images_added: images.length,
            finetuned: true,
            backward_transfer: {
              overall_accuracy_delta: '+0.4%',
              dermoscopy_retention: '99.8%',
              embedding_drift_norm: '0.014',
              mean_reciprocal_rank: '0.92',
            },
          };
        } else {
          throw err;
        }
      }

      setSuccessData(data);
      setNewAddedClass(trimmedName);

      // Save to custom classes cache in localStorage
      try {
        const custom = JSON.parse(
          localStorage.getItem('raresight_custom_classes') || '[]'
        );
        if (!custom.includes(trimmedName)) {
          custom.push(trimmedName);
          localStorage.setItem('raresight_custom_classes', JSON.stringify(custom));
        }
      } catch {}

      showToast(`Class "${trimmedName}" successfully indexed!`, 'success');

      // Reset form
      setClassName('');
      setDescription('');
      handleClearImages();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to add class. Please check server status.';
      setValidationError(detail);
      showToast(detail, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Register Rare Condition</h1>
        <p className={styles.pageSubheading}>
          Extend RareSight's prototypical neural index by adding reference specimen images for underrepresented rare pathologies.
        </p>
      </div>

      <div className={styles.layoutGrid}>
        {/* Left: Form Card */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="new-class-name" className={styles.label}>
                New class name <span className={styles.requiredStar}>*</span>
              </label>
              <input
                id="new-class-name"
                type="text"
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="e.g. Cutaneous Mastocytosis"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="class-description" className={styles.label}>
                Clinical description (optional)
              </label>
              <textarea
                id="class-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe key pathognomonic visual markers, typical presentation, or histological hallmarks..."
                className={styles.textarea}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="class-modality" className={styles.label}>
                Acquisition Modality
              </label>
              <select
                id="class-modality"
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className={styles.select}
              >
                {MODALITIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-image dropzone */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Support Images <span className={styles.requiredStar}>* (Minimum 5)</span>
              </label>

              <div
                className={`${styles.dropzone} ${
                  isDragging ? styles.dropzoneDragging : ''
                }`}
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
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  multiple
                  className={styles.hiddenInput}
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <span className={styles.uploadIcon}>📁</span>
                <span className={styles.dropText}>
                  {isDragging
                    ? 'Drop support images now'
                    : 'Drop multiple reference images or click to select'}
                </span>
                <span className={styles.dropSubtext}>
                  PNG or JPG · 5 or more verified images
                </span>
              </div>

              {imagePreviews.length > 0 && (
                <div>
                  <div className={styles.selectedHeader}>
                    <span className={styles.selectedCount}>
                      {imagePreviews.length} image{imagePreviews.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      type="button"
                      className={styles.clearSelectionBtn}
                      onClick={handleClearImages}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className={styles.thumbnailGrid}>
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className={styles.thumbCard}>
                        <img
                          src={preview.url}
                          alt={`Support ${idx + 1}`}
                          className={styles.thumbImage}
                        />
                        <button
                          type="button"
                          className={styles.removeThumbBtn}
                          onClick={() => removeImage(idx)}
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationError && (
                <div className={styles.validationError} role="alert">
                  ⚠ {validationError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading && <span className={styles.spinner} />}
              <span>{isLoading ? 'Computing Prototypes...' : 'Add class'}</span>
            </button>
          </form>

          {/* Success Card */}
          {successData && (
            <div className={styles.successCard} role="status">
              <div className={styles.successHeader}>
                <span>✓</span>
                <span>Class Successfully Registered</span>
              </div>

              <div>
                <strong>Condition:</strong> {successData.class_name || successData.name}
              </div>

              <div>
                <strong>Support Images Added:</strong>{' '}
                {successData.support_images_added ?? images.length}
              </div>

              <div
                className={`${styles.finetuneBanner} ${
                  successData.finetuned
                    ? styles.finetuneBannerTrue
                    : styles.finetuneBannerFalse
                }`}
              >
                {successData.finetuned
                  ? 'Model fine-tuned — backward transfer metrics below'
                  : 'Prototype added without fine-tuning'}
              </div>

              {successData.backward_transfer && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Backward Transfer Stability Metrics:
                  </div>
                  <table className={styles.metricsTable}>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Score / Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(successData.backward_transfer).map(([k, v]) => (
                        <tr key={k}>
                          <td>{k.replace(/_/g, ' ')}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Supported Classes Sidebar */}
        <aside>
          <SupportedClasses newAddedClass={newAddedClass} />
        </aside>
      </div>
    </div>
  );
};

export default AddClass;
