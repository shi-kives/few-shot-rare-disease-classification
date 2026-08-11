import { useState } from 'react'
import { submitFeedback } from '../api/client.js'

export default function FeedbackForm({ result, imageFile, onRecorded }) {
  const [mode, setMode] = useState('idle') // idle | correcting | submitting | done
  const [selectedClass, setSelectedClass] = useState('')
  const [error, setError] = useState('')
  const [recordedAs, setRecordedAs] = useState(null)

  const classOptions = Object.keys(result.all_class_scores || {})

  async function send(correctClass) {
    setMode('submitting')
    setError('')
    try {
      const res = await submitFeedback({ embedding: result.embedding, correctClass, imageFile })
      setRecordedAs(correctClass)
      setMode('done')
      onRecorded?.(res, correctClass)
    } catch (err) {
      setError(err.message || 'Could not save feedback. Try again.')
      setMode(correctClass === result.prediction ? 'idle' : 'correcting')
    }
  }

  if (mode === 'done') {
    return (
      <div className="feedback-card feedback-done">
        <span className="feedback-check">✓</span>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Feedback recorded</p>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Logged as <strong>{recordedAs}</strong>. This case has been added to the support set.
          </p>
        </div>
        <style>{feedbackStyles}</style>
      </div>
    )
  }

  return (
    <div className="feedback-card">
      <p className="feedback-question">Is this prediction correct?</p>

      {mode !== 'correcting' && (
        <div className="feedback-actions">
          <button className="fb-btn fb-btn-correct" disabled={mode === 'submitting'} onClick={() => send(result.prediction)}>
            Correct
          </button>
          <button className="fb-btn fb-btn-incorrect" disabled={mode === 'submitting'} onClick={() => setMode('correcting')}>
            Incorrect
          </button>
        </div>
      )}

      {mode === 'correcting' && (
        <div className="feedback-correct-form">
          <label htmlFor="correct-class" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            What's the correct class?
          </label>
          <select
            id="correct-class"
            className="fb-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="" disabled>
              Select a class…
            </option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="feedback-actions">
            <button
              className="fb-btn fb-btn-confirm"
              disabled={!selectedClass}
              onClick={() => send(selectedClass)}
            >
              Confirm
            </button>
            <button className="fb-btn fb-btn-cancel" onClick={() => setMode('idle')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 10 }}>{error}</p>}

      <style>{feedbackStyles}</style>
    </div>
  )
}

const feedbackStyles = `
  .feedback-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: 22px 24px;
    margin-top: 20px;
  }
  .feedback-question { font-weight: 600; font-size: 14px; margin-bottom: 14px; }
  .feedback-actions { display: flex; gap: 10px; }
  .fb-btn { padding: 9px 18px; border-radius: var(--radius-sm); font-size: 13.5px; font-weight: 600; transition: filter 120ms ease; }
  .fb-btn:hover:not(:disabled) { filter: brightness(0.95); }
  .fb-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .fb-btn-correct { background: var(--green-bg); color: var(--green); }
  .fb-btn-incorrect { background: var(--red-bg); color: var(--red); }
  .fb-btn-confirm { background: var(--teal-600); color: var(--text-on-teal); }
  .fb-btn-cancel { background: var(--surface-sunken); color: var(--text-secondary); }
  .fb-select {
    display: block; width: 100%; margin: 8px 0 14px;
    padding: 10px 12px; border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong); background: var(--surface-sunken); font-size: 14px;
  }
  .feedback-done { display: flex; align-items: center; gap: 14px; }
  .feedback-check {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: var(--green-bg); color: var(--green);
    display: flex; align-items: center; justify-content: center; font-weight: 700;
  }
`
