import { useEffect, useMemo, useState } from 'react'
import UploadBox from '../components/UploadBox.jsx'
import ResultsDisplay from '../components/ResultsDisplay.jsx'
import Gallery from '../components/Gallery.jsx'
import FeedbackForm from '../components/FeedbackForm.jsx'
import { diagnose, ApiError } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useHistory } from '../hooks/useHistory.js'

export default function Diagnose() {
  const { user } = useAuth()
  const { addEntry, updateEntry } = useHistory(user?.email)

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [historyId, setHistoryId] = useState(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleSelect(f) {
    setFile(f)
    setResult(null)
    setError('')
  }

  async function handleGenerate() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const res = await diagnose(file)
      setResult(res)
      const entry = addEntry({
        fileName: file.name,
        prediction: res.prediction,
        confidence: res.confidence,
        confidenceLevel: res.confidence_level,
        thumbnail: previewUrl,
      })
      setHistoryId(entry?.id)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not reach the backend. Confirm the API is running and VITE_API_BASE_URL is set correctly.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = Boolean(file) && !loading

  return (
    <div className="diagnose-page">
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Diagnose an image</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, marginBottom: 28 }}>
        Upload an image to get a prototype-based prediction, similar reference cases, and record clinician feedback.
      </p>

      <div className="diagnose-card">
        <p className="diagnose-step-label">1. Upload image</p>
        <p className="diagnose-step-hint">JPG or PNG. The image is embedded and compared against known classes.</p>

        <UploadBox file={file} previewUrl={previewUrl} onSelect={handleSelect} />

        <button className="generate-btn" disabled={!canGenerate} onClick={handleGenerate}>
          {loading ? 'Generating prediction…' : 'Generate prediction'}
        </button>

        {error && (
          <p role="alert" style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>
            {error}
          </p>
        )}
      </div>

      {result && (
        <div style={{ marginTop: 28 }}>
          <ResultsDisplay result={result} previewUrl={previewUrl} />
          <Gallery cases={result.similar_cases} predictedClass={result.prediction} />
          <FeedbackForm
            result={result}
            imageFile={file}
            onRecorded={(_res, correctClass) => {
              if (historyId) updateEntry(historyId, { feedback: correctClass })
            }}
          />
        </div>
      )}

      <style>{`
        .diagnose-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: 28px;
        }
        .diagnose-step-label { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
        .diagnose-step-hint { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
        .generate-btn {
          width: 100%; margin-top: 18px; padding: 13px;
          border-radius: var(--radius-sm); background: var(--teal-500);
          color: var(--text-on-teal); font-weight: 600; font-size: 15px;
          transition: background 120ms ease;
        }
        .generate-btn:hover:not(:disabled) { background: var(--teal-600); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
