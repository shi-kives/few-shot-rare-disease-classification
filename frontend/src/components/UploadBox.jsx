import { useCallback, useRef, useState } from 'react'

export default function UploadBox({ file, previewUrl, onSelect, label = 'Drag and drop an image here', hint }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (fileList) => {
      const f = fileList?.[0]
      if (!f) return
      if (!f.type.startsWith('image/')) return
      onSelect(f)
    },
    [onSelect]
  )

  return (
    <div
      className={`upload-box${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
      aria-label="Upload image"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {previewUrl ? (
        <div className="upload-preview">
          <img src={previewUrl} alt="Selected upload preview" />
          <p className="upload-filename mono">{file?.name}</p>
          <p className="upload-swap">Click or drop a new image to replace</p>
        </div>
      ) : (
        <>
          <p className="upload-primary">{label}</p>
          <p className="upload-secondary">or click to browse files</p>
        </>
      )}

      <style>{`
        .upload-box {
          border: 2px dashed var(--border-strong);
          border-radius: var(--radius-md);
          background: var(--surface-sunken);
          min-height: 180px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 24px;
          cursor: pointer;
          transition: border-color 140ms ease, background 140ms ease;
        }
        .upload-box:hover, .upload-box.dragging { border-color: var(--teal-500); background: var(--teal-050); }
        .upload-box.has-file { padding: 16px; }
        .upload-primary { font-weight: 600; font-size: 16px; }
        .upload-secondary { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
        .upload-preview img {
          max-height: 220px; max-width: 100%; border-radius: var(--radius-sm);
          box-shadow: var(--shadow-card);
        }
        .upload-filename { font-size: 12px; margin-top: 10px; color: var(--text-secondary); }
        .upload-swap { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      `}</style>
    </div>
  )
}
