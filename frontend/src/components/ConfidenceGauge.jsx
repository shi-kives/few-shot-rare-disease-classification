const LEVEL_COLOR = {
  HIGH: 'var(--green)',
  MODERATE: 'var(--amber)',
  LOW: 'var(--red)',
}

export default function ConfidenceGauge({ confidence, level, uncertainty }) {
  const pct = Math.max(0, Math.min(1, confidence))
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const color = LEVEL_COLOR[level] || 'var(--text-muted)'

  return (
    <div className="gauge">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--surface-sunken)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 500ms ease, stroke 300ms ease' }}
        />
        <text x="70" y="66" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="24" fontWeight="600" fill="var(--text-primary)">
          {(pct * 100).toFixed(1)}%
        </text>
        <text x="70" y="86" textAnchor="middle" fontFamily="var(--font-body)" fontSize="10" letterSpacing="0.08em" fill="var(--text-muted)">
          CONFIDENCE
        </text>
      </svg>

      <div className="gauge-meta">
        <span className="gauge-level" style={{ color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
          {level}
        </span>
        {uncertainty !== undefined && uncertainty !== null && (
          <p className="gauge-uncertainty mono">
            epistemic uncertainty <strong>{Number(uncertainty).toFixed(4)}</strong>
          </p>
        )}
      </div>

      <style>{`
        .gauge { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .gauge-meta { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .gauge-level {
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
          padding: 4px 10px; border-radius: 999px;
        }
        .gauge-uncertainty { font-size: 12px; color: var(--text-secondary); }
        .gauge-uncertainty strong { color: var(--text-primary); }
      `}</style>
    </div>
  )
}
