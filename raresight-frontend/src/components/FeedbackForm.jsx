import React, { useState } from 'react';
import { submitFeedbackApi } from '../api/feedback.js';
import { useToast } from '../context/ToastContext.jsx';
import styles from './FeedbackForm.module.css';

const FeedbackForm = ({
  queryEmbedding,
  predictedClass,
  imageFile,
  allClasses = [],
  historyId,
  onFeedbackComplete,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [notes, setNotes] = useState('');

  // Sort classes alphabetically, ensure predictedClass is present if classes array is empty
  const classOptions = Array.from(
    new Set([
      ...allClasses,
      predictedClass,
      'Melanoma',
      'Basal Cell Carcinoma',
      'Diabetic Retinopathy',
      'Pneumothorax',
      'Normal',
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const updateHistoryStatus = (status) => {
    try {
      const stored = localStorage.getItem('raresight_history');
      if (stored) {
        const history = JSON.parse(stored);
        if (Array.isArray(history) && history.length > 0) {
          const updated = history.map((item) => {
            if (historyId && item.id === historyId) {
              return { ...item, status };
            }
            return item;
          });
          // If no specific historyId match, update the newest one (index 0)
          if (!historyId && updated.length > 0) {
            updated[0].status = status;
          }
          localStorage.setItem('raresight_history', JSON.stringify(updated));
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to update history status:', err);
      }
    }
  };

  const handleCorrect = async () => {
    if (submitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitFeedbackApi({
        query_embedding: queryEmbedding,
        predicted_class: predictedClass,
        correct_class: predictedClass,
        is_correct: true,
        notes: 'Confirmed by clinician',
      });
      showToast('Feedback recorded — thank you', 'success');
      setSubmitted(true);
      updateHistoryStatus('Accepted');
      if (onFeedbackComplete) onFeedbackComplete('Accepted');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to record feedback';
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncorrectClick = () => {
    setShowCorrection(true);
    if (!selectedClass && classOptions.length > 0) {
      // Pick first non-predicted class
      const firstAlt = classOptions.find((c) => c !== predictedClass) || classOptions[0];
      setSelectedClass(firstAlt);
    }
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (submitted || isSubmitting) return;
    if (!selectedClass) {
      showToast('Please select the true condition', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedbackApi({
        query_embedding: queryEmbedding,
        predicted_class: predictedClass,
        correct_class: selectedClass,
        is_correct: false,
        notes,
      });
      showToast('Correction submitted', 'success');
      setSubmitted(true);
      setShowCorrection(false);
      updateHistoryStatus('Rejected');
      if (onFeedbackComplete) onFeedbackComplete('Rejected');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to submit correction';
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.confirmationCard}>
          <span>✓</span>
          <span>Feedback recorded — model support index updated.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.infoBox}>
        <span>ℹ </span>
        <span>
          Your feedback is used to update the model's support index — confirmed cases improve future predictions for this condition.
        </span>
      </div>

      {!showCorrection ? (
        <div>
          <div className={styles.formHeader}>
            <span className={styles.questionLabel}>Is this prediction correct?</span>
          </div>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnCorrect}`}
              onClick={handleCorrect}
              disabled={isSubmitting}
            >
              ✓ Correct
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnIncorrect}`}
              onClick={handleIncorrectClick}
              disabled={isSubmitting}
            >
              ✗ Incorrect
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitCorrection} className={styles.correctionSection}>
          <div className={styles.inputGroup}>
            <label htmlFor="correct-class-select" className={styles.label}>
              Select true condition:
            </label>
            <select
              id="correct-class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={styles.select}
              required
            >
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c} {c === predictedClass ? '(Current prediction)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="feedback-notes" className={styles.label}>
              Additional notes (optional):
            </label>
            <textarea
              id="feedback-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Subtype variant, subtle morphology details..."
              className={styles.textarea}
            />
          </div>

          <div className={styles.buttonRow}>
            <button
              type="submit"
              className={styles.btnSubmitCorrection}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit correction'}
            </button>
            <button
              type="button"
              className={styles.btn}
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => setShowCorrection(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FeedbackForm;
