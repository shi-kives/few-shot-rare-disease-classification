# RareSight — Clinical AI Decision-Support Frontend

RareSight is a production-ready, clinical-grade React 18 frontend designed for AI-assisted rare pathology decision support. Built with Vite, React Router v6, Axios, and CSS Modules adhering strictly to medical color theory principles.

---

## 🔒 Zero-Exposure Proxy Architecture

The frontend uses an internal reverse proxy architecture ensuring that the actual FastAPI backend URL is **never exposed or accessible to the browser** at any point:

- **Development**: The browser sends all requests to `/api/...` and `/static/...` on the frontend dev server (`http://localhost:3000`). Vite transparently proxies these requests to `http://localhost:8000` internally.
- **Production**: Nginx serves the React single-page application and forwards all `/api/` and `/static/` requests to the internal `api:8000` container over an isolated Docker bridge network (`raresight_net`). FastAPI has no exposed host ports and is unreachable outside the private network.

---

## 🚀 Quick Start

### 1. Environment Configuration
Copy the example environment file if you wish to configure optional public client IDs (such as Google OAuth):

```bash
# On Linux/macOS:
cp .env.example .env

# On Windows (PowerShell):
Copy-Item .env.example .env
```

*(Note: No backend URL is required in `.env` — all API calls use relative `/api` paths handled by the proxy).*

### 2. Development Setup

```bash
# Install dependencies
npm install

# Start the development server (proxies to http://localhost:8000 internally)
npm run dev
```

The application will be accessible at: `http://localhost:3000`.

### 3. Production Deployment with Docker Compose

Run both the UI (Nginx) and API (FastAPI) on the isolated internal network:

```bash
docker compose up --build
```

- UI is exposed on host port `80` (or configured port).
- API is strictly internal to Docker and completely hidden from public access.

---

## 🛠 Technology Stack

- **Framework**: React 18 (with Fast Refresh via `@vitejs/plugin-react`)
- **Build Tool**: Vite 5 with built-in development proxy
- **Production Server**: Nginx Alpine Reverse Proxy
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with relative `/api` baseURL, global JWT request interceptor, and 401 session expiry handling
- **Styling**: CSS Modules with CSS Custom Properties exclusively (Zero-Hex inline standard)
- **Typography**: Inter (Google Fonts) and JetBrains Mono for tabular metrics

---

## 📁 Project Structure

```
raresight-frontend/
├── .env.example
├── docker-compose.yml # Docker Compose with isolated network
├── Dockerfile         # Multi-stage build & Nginx deployment
├── index.html
├── nginx.conf         # Nginx reverse proxy configuration
├── package.json
├── README.md
├── vite.config.js     # Vite dev server with /api and /static proxy
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api/
    │   ├── client.js       # Axios instance with baseURL: '/api'
    │   ├── auth.js         # Authentication API calls
    │   ├── diagnose.js     # Multipart POST /diagnose handler
    │   ├── feedback.js     # POST /feedback submission
    │   ├── addClass.js     # POST /add_class multi-image prototype registration
    │   └── health.js       # GET /health system telemetry
    ├── context/
    │   ├── AuthContext.jsx # Global auth session & token management
    │   └── ToastContext.jsx# Floating stacked notification toast system
    ├── hooks/
    │   ├── useHealth.js    # Backend connectivity & metrics hook
    │   ├── useOutsideClick.js # Click-away handler for menus/dropdowns
    │   └── useLocalStorage.js# Resilient JSON-synced storage hook
    ├── components/
    │   ├── Navbar.jsx + .module.css
    │   ├── Disclaimer.jsx + .module.css
    │   ├── ConfidenceBand.jsx + .module.css
    │   ├── GalleryGrid.jsx + .module.css
    │   ├── FeedbackForm.jsx + .module.css
    │   ├── GateStatus.jsx + .module.css
    │   ├── AgreementBanner.jsx + .module.css
    │   ├── Toast.jsx + .module.css
    │   ├── ToastContainer.jsx
    │   ├── HealthIndicator.jsx + .module.css
    │   ├── PasswordStrength.jsx + .module.css
    │   ├── SupportedClasses.jsx + .module.css
    │   ├── SkeletonCard.jsx + .module.css
    │   ├── ProtectedRoute.jsx
    │   └── ErrorBoundary.jsx
    ├── pages/
    │   ├── Login.jsx + .module.css
    │   ├── Signup.jsx + .module.css
    │   ├── Analyse.jsx + .module.css
    │   ├── History.jsx + .module.css
    │   ├── AddClass.jsx + .module.css
    │   └── Settings.jsx + .module.css
    └── styles/
        ├── variables.css   # Medical color palette tokens and layout variables
        └── global.css      # Baseline CSS reset, print styles, and scrollbars
```

---

## 🎨 Medical Color Palette

All colors are maintained centrally in `src/styles/variables.css`:

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `--bg` | `#F0F4F7` | Medical slate background |
| `--surface` | `#FFFFFF` | Clean clinical card surface |
| `--primary` | `#0B6B72` | Deep surgical teal |
| `--primary-light` | `#E0F3F4` | Soft teal active state |
| `--success` | `#15803D` | High confidence / concordance |
| `--warning` | `#D97706` | Secondary review / caution |
| `--danger` | `#B91C1C` | Low confidence / critical alerts |
| `--badge-derm-*` | `#FBEAF0` / `#72243E` | Dermoscopy modality badges |
| `--badge-retina-*`| `#E1F5EE` / `#085041` | Retinal fundus modality badges |
| `--badge-hist-*` | `#EEEDFE` / `#3C3489` | Histopathology modality badges |
| `--badge-xray-*` | `#E6F1FB` / `#0C447C` | X-ray modality badges |
