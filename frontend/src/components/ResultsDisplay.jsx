import ConfidenceGauge from './ConfidenceGauge.jsx'

export default function ResultsDisplay({ result, previewUrl }) {
  if (!result) return null

  const { prediction, confidence, confidence_level, all_class_scores = {}, agrees, uncertainty } = result

  const sortedScores = Object.entries(all_class_scores).sort((a, b) => b[1] - a[1])
  const maxScore = sortedScores.length ? sortedScores[0][1] : 1

  return (
    <div className="results-card">
      <div className="results-top">
        <div className="results-image">
          {previewUrl && <img src={previewUrl} alt="Diagnosed sample" />}
        </div>

        <div className="results-summary">
          <p className="results-eyebrow">Predicted class</p>
          <h3 className="results-prediction">{prediction}</h3>
          <ConfidenceGauge confidence={confidence} level={confidence_level} uncertainty={uncertainty} />
        </div>

        <div
          className={`agreement-banner agreement-${agrees ? 'yes' : 'no'}`}
          role="status"
        >
          <p className="agreement-title">{agrees ? 'Prototype and retrieval agree' : 'Prototype and retrieval disagree'}</p>
          <p className="agreement-body">
            {agrees
              ? 'The nearest-prototype classifier and the retrieved similar cases point to the same class.'
              : 'The nearest-prototype classifier and the retrieved similar cases point to different classes — treat this prediction with extra caution.'}
          </p>
        </div>
      </div>

      <div className="score-list">
        <p className="score-list-title">Class score distribution</p>
        {sortedScores.map(([label, score]) => (
          <div className="score-row" key={label}>
            <span className="score-label">{label}</span>
            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{
                  width: `${(score / maxScore) * 100}%`,
                  background: label === prediction ? 'var(--teal-600)' : 'var(--border-strong)',
                }}
              />
            </div>
            <span className="score-value mono">{(score * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <style>{`
        .results-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: 28px;
        }
        .results-top {
          display: grid;
          grid-template-columns: 140px 1fr 240px;
          gap: 28px;
          align-items: start;
        }
        .results-image img {
          width: 140px; height: 140px; object-fit: cover;
          border-radius: var(--radius-sm); border: 1px solid var(--border);
        }
        .results-eyebrow { font-size: 12px; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600; }
        .results-prediction { font-size: 26px; margin: 4px 0 16px; }
        .agreement-banner {
          border-radius: var(--radius-md);
          padding: 16px;
          border: 1px solid transparent;
        }
        .agreement-yes { background: var(--green-bg); border-color: color-mix(in srgb, var(--green) 25%, transparent); }
        .agreement-no { background: var(--amber-bg); border-color: color-mix(in srgb, var(--amber) 25%, transparent); }
        .agreement-title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
        .agreement-yes .agreement-title { color: var(--green); }
        .agreement-no .agreement-title { color: var(--amber); }
        .agreement-body { font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }

        .score-list { margin-top: 28px; border-top: 1px solid var(--border); padding-top: 20px; }
        .score-list-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px; }
        .score-row { display: grid; grid-template-columns: 140px 1fr 60px; align-items: center; gap: 12px; padding: 6px 0; }
        .score-label { font-size: 13px; font-weight: 500; }
        .score-bar-track { height: 8px; background: var(--surface-sunken); border-radius: 999px; overflow: hidden; }
        .score-bar-fill { height: 100%; border-radius: 999px; transition: width 400ms ease; }
        .score-value { font-size: 12px; color: var(--text-secondary); text-align: right; }

        @media (max-width: 720px) {
          .results-top { grid-template-columns: 1fr; }
          .results-image img { width: 100%; height: auto; max-height: 200px; }
        }
      `}</style>
    </div>
  )
}
