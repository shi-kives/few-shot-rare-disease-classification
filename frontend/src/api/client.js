const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* non-json error body */
    }
    throw new ApiError(detail, res.status)
  }
  return res.json()
}

// GET /health -> { status, model_loaded, chroma_collections: {...} }
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`)
  return handle(res)
}

// POST /diagnose (multipart: file) -> DiagnosisResponse
export async function diagnose(imageFile) {
  const form = new FormData()
  form.append('file', imageFile)
  const res = await fetch(`${BASE_URL}/diagnose`, { method: 'POST', body: form })
  return handle(res)
}

// POST /feedback { embedding, correct_class } -> confirmation + updated class count
export async function submitFeedback({ embedding, correctClass, imageFile }) {
  const form = new FormData()
  form.append('embedding', JSON.stringify(embedding))
  form.append('correct_class', correctClass)
  if (imageFile) form.append('file', imageFile)
  const res = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: form })
  return handle(res)
}

// POST /add_class (multipart: class_name, files[]) -> AddClassResponse
export async function addClass({ className, files }) {
  const form = new FormData()
  form.append('class_name', className)
  files.forEach((f) => form.append('files', f))
  const res = await fetch(`${BASE_URL}/add_class`, { method: 'POST', body: form })
  return handle(res)
}

export { BASE_URL, ApiError }
