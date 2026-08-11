# Diagnosis Assistant — Frontend

React + Vite frontend for the prototype-based diagnosis backend (`api/main.py`,
`routes/diagnose.py`, `routes/feedback.py`, `routes/add_class.py`).

## What's included

- **Login** (`/login`) — temporary email-based access. Any well-formed email
  starts a local session (stored in `localStorage`). Swap this for real auth
  once the backend exposes one; see `src/context/AuthContext.jsx`.
- **Diagnose** (`/diagnose`) — upload an image, call `POST /diagnose`, and see:
  - predicted class + confidence gauge (with epistemic uncertainty if the
    backend returns it)
  - the full class score distribution
  - the prototype-vs-retrieval agreement banner
  - the top-K similar reference cases, color-coded by match
  - a clinician feedback form (`Correct` / `Incorrect` → `POST /feedback`)
- **Add class** (`/add-class`) — register a new class with support images
  (`POST /add_class`), shows whether an EWC fine-tune was triggered and the
  backward-transfer metrics if so.
- **History** (`/history`) — local, per-user log of past diagnoses and the
  feedback given on each (stored in `localStorage`, not the backend).
- **Profile / settings** (`/profile`) — account info, backend URL, sign out.
- **Top-right account menu** — avatar dropdown with Profile / Search history /
  Settings / Sign out, plus a live `BACKEND ONLINE` / `BACKEND OFFLINE` pill in
  the navbar polling `GET /health`.

## Getting started

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE_URL to your FastAPI host
npm run dev                # http://localhost:3000
```

By default the app expects the backend at `http://localhost:8000`. Change
`VITE_API_BASE_URL` in `.env` if your API runs elsewhere. CORS must be enabled
on the backend for the frontend's origin (already noted as a `main.py`
responsibility in the spec).

## Backend contract this UI assumes

- `GET /health` → `{ status, model_loaded, chroma_collections }`
- `POST /diagnose` (multipart `file`) → `DiagnosisResponse`:
  `{ prediction, confidence, confidence_level, all_class_scores, similar_cases, agrees, embedding, uncertainty? }`
  - `similar_cases[]`: `{ class_name, similarity_score, image_path }`
  - `image_path` can be an absolute URL or a path served by the backend
    (resolved against `VITE_API_BASE_URL` in `src/components/Gallery.jsx`)
- `POST /feedback` (multipart `embedding` (JSON string), `correct_class`,
  optional `file`) → confirmation + updated class count
- `POST /add_class` (multipart `class_name`, `files[]`) → `AddClassResponse`:
  `{ class_name, n_support, finetuned, backward_transfer }`

If your backend's field names differ slightly, the mapping points are:
`src/api/client.js` (requests) and `src/components/ResultsDisplay.jsx`,
`src/components/Gallery.jsx`, `src/pages/AddClass.jsx` (response rendering).

## Project structure

```
src/
  api/client.js          fetch wrappers for /health, /diagnose, /feedback, /add_class
  context/AuthContext.jsx  temporary email-login session
  hooks/useBackendStatus.js  polls /health for the navbar pill
  hooks/useHistory.js       per-user local diagnosis history
  components/
    Navbar.jsx, UserMenu.jsx
    UploadBox.jsx, ConfidenceGauge.jsx, ResultsDisplay.jsx, Gallery.jsx, FeedbackForm.jsx
    ProtectedRoute.jsx
  pages/
    Login.jsx, Diagnose.jsx, AddClass.jsx, History.jsx, Profile.jsx
  index.css               design tokens (color, type, radius, shadow)
```

## Notes on the "temporary" login

This is intentionally not real authentication — it's a placeholder so the
rest of the UI (protected routes, per-user history, the account menu) has
something to key off of. Before going anywhere near real patient data, add:

- a real auth backend route (magic link / SSO / OAuth),
- server-side session verification instead of trusting `localStorage`,
- and move diagnosis history server-side so it's tied to the account, not the
  device.
