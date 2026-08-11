import { BASE_URL } from '../api/client.js'

function resolveImageSrc(path) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${BASE_URL}${cleanPath}`
}

export default function Gallery({ cases = [], predictedClass }) {
  if (!cases.length) return null

  const matchCount = cases.filter((c) => c.class_name === predictedClass).length
  const tally = cases.reduce((acc, c) => {
    acc[c.class_name] = (acc[c.class_name] || 0) + 1
    return acc
  }, {})
  const majority = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <div className="gallery-card">
      <div className="gallery-header">
        <h3 style={{ fontSize: 16 }}>Similar reference cases</h3>
        <p className="gallery-summary mono">
          {matchCount}/{cases.length} retrieved cases match predicted class · retrieval majority: {majority}
        </p>
      </div>

      <div className="gallery-grid">
        {cases.map((c, i) => {
          const isMatch = c.class_name === predictedClass
          const src = resolveImageSrc(c.image_path)
          return (
            <div className="gallery-item" key={`${c.class_name}-${i}`}>
              <div className="gallery-thumb">
                {src ? <img src={src} alt={c.class_name} /> : <div className="gallery-thumb-fallback">No preview</div>}
              </div>
              <span className={`gallery-label ${isMatch ? 'label-match' : 'label-diff'}`}>{c.class_name}</span>
              <span className="gallery-score mono">{(c.similarity_score * 100).toFixed(1)}% similar</span>
            </div>
          )
        })}
      </div>

      <style>{`
        .gallery-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: 24px;
          margin-top: 20px;
        }
        .gallery-header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .gallery-summary { font-size: 12px; color: var(--text-secondary); }
        .gallery-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .gallery-item { display: flex; flex-direction: column; gap: 6px; }
        .gallery-thumb {
          aspect-ratio: 1; border-radius: var(--radius-sm); overflow: hidden;
          background: var(--surface-sunken); border: 1px solid var(--border);
        }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-thumb-fallback {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: var(--text-muted);
        }
        .gallery-label {
          font-size: 12px; font-weight: 600; padding: 2px 0;
          border-left: 3px solid transparent; padding-left: 6px;
        }
        .label-match { color: var(--green); border-left-color: var(--green); }
        .label-diff { color: var(--red); border-left-color: var(--red); }
        .gallery-score { font-size: 11px; color: var(--text-muted); }

        @media (max-width: 780px) {
          .gallery-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}
