import { useState } from 'react'
import { addClass, ApiError } from '../api/client.js'

export default function AddClass() {
  const [className, setClassName] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function handleFiles(fileList) {
    const imgs = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    setFiles(imgs)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!className.trim() || files.length === 0) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await addClass({ className: className.trim(), files })
      setResult(res)
      setClassName('')
      setFiles([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the backend to add this class.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Add a new class</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, marginBottom: 28 }}>
        Register a new diagnostic class with a handful of reference images. The system computes a prototype and,
        if it's too close to an existing class, runs an EWC fine-tune to make room for it.
      </p>

      <form className="add-class-card" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="class-name">
          Class name
        </label>
        <input
          id="class-name"
          className="field-input"
          placeholder="e.g. melanocytic_nevus"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />

        <p className="field-label" style={{ marginTop: 22 }}>
          Support images
        </p>
        <p className="field-hint">Upload several representative images (K images) for this class.</p>

        <label className="file-drop">
          <input type="file" accept="image/png, image/jpeg" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          {files.length === 0 ? (
            <span>Click to choose images, or drag them here</span>
          ) : (
            <span>{files.length} image{files.length > 1 ? 's' : ''} selected</span>
          )}
        </label>

        {files.length > 0 && (
          <div className="thumb-row">
            {files.slice(0, 10).map((f, i) => (
              <img key={i} src={URL.createObjectURL(f)} alt={f.name} />
            ))}
            {files.length > 10 && <span className="thumb-more mono">+{files.length - 10}</span>}
          </div>
        )}

        <button className="submit-btn" type="submit" disabled={loading || !className.trim() || files.length === 0}>
          {loading ? 'Adding class…' : 'Add class'}
        </button>

        {error && (
          <p role="alert" style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="result-banner">
          <p style={{ fontWeight: 700, fontSize: 15 }}>
            "{result.class_name}" added with {result.n_support} support image{result.n_support === 1 ? '' : 's'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {result.finetuned
              ? 'This class was close to existing prototypes, so an incremental EWC fine-tune ran to make room for it.'
              : 'The new prototype was distinct enough from existing classes — added directly, no fine-tune needed.'}
          </p>

          {result.finetuned && result.backward_transfer && (
            <div className="bt-grid">
              {Object.entries(result.backward_transfer).map(([k, v]) => (
                <div key={k} className="bt-item">
                  <span className="bt-key mono">{k}</span>
                  <span className="bt-value mono">{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .add-class-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: 28px;
        }
        .field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
        .field-hint { font-size: 12.5px; color: var(--text-muted); margin: 2px 0 10px; }
        .field-input {
          width: 100%; margin-top: 6px; padding: 11px 14px;
          border-radius: var(--radius-sm); border: 1px solid var(--border-strong);
          background: var(--surface-sunken); font-size: 14.5px;
        }
        .field-input:focus { outline: none; border-color: var(--teal-500); background: var(--surface); }
        .file-drop {
          display: flex; align-items: center; justify-content: center;
          border: 2px dashed var(--border-strong); border-radius: var(--radius-md);
          background: var(--surface-sunken); min-height: 90px; cursor: pointer;
          font-size: 13.5px; color: var(--text-secondary); text-align: center; padding: 16px;
          transition: border-color 140ms ease, background 140ms ease;
        }
        .file-drop:hover { border-color: var(--teal-500); background: var(--teal-050); }
        .thumb-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
        .thumb-row img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
        .thumb-more { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 8px; background: var(--surface-sunken); font-size: 12px; color: var(--text-secondary); }
        .submit-btn {
          width: 100%; margin-top: 22px; padding: 13px; border-radius: var(--radius-sm);
          background: var(--teal-500); color: var(--text-on-teal); font-weight: 600; font-size: 15px;
        }
        .submit-btn:hover:not(:disabled) { background: var(--teal-600); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .result-banner {
          margin-top: 20px; background: var(--teal-050); border: 1px solid var(--teal-100);
          border-radius: var(--radius-lg); padding: 20px 24px;
        }
        .bt-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 16px; }
        .bt-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
        .bt-key { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .bt-value { display: block; font-size: 14px; font-weight: 600; margin-top: 2px; }
      `}</style>
    </div>
  )
}
