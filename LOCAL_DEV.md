# Local Development Setup (No Docker Image Rebuilds)

This guide allows you to develop the frontend and backend locally without needing Docker image rebuilds on every change.

## Frontend (Cockpit) — Vite Dev Server with HMR

For rapid frontend development without Docker rebuilds:

```bash
# Terminal 1: Start Vite dev server (watches for changes, HMR enabled)
cd aegis_cockpit
npm install
npm run dev
# This starts on http://localhost:5173 with hot module reload
```

The dev server automatically reloads when you edit `.jsx`, `.css`, or `.js` files.

**To connect to the running backend API:**
- Vite dev proxy is pre-configured in `vite.config.js` to forward `/api` requests to the backend.
- Open http://localhost:5173 and it will proxy API calls to `http://localhost:8001`.

## Backend (Agent) — Local Python Dev

For backend development without Docker:

```bash
# Terminal 2: Run the FastAPI agent locally
cd aegis_core
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
# The --reload flag watches for changes and auto-restarts
```

## Full Stack Local (no Docker at all)

1. **Start backend** (Terminal 1):
   ```bash
   cd aegis_core
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   ```

2. **Start Vite frontend** (Terminal 2):
   ```bash
   cd aegis_cockpit
   npm install
   npm run dev
   ```

3. **Open UI**: http://localhost:5173

## Docker Deployment (Production)

Only rebuild Docker images when you're ready to deploy:

```bash
# Full rebuild (if Docker registry access is available)
docker compose build --no-cache
docker compose up -d

# Or use the fast local build (copy pre-built assets)
cd aegis_cockpit
npm install
npm run build
docker cp dist/. aegis-cockpit:/usr/share/nginx/html
docker exec aegis-cockpit nginx -s reload
```

## Why This Approach?

- **No Docker rebuilds**: Vite dev server and uvicorn reload instantly (~100-500ms).
- **HMR**: Hot module reload in the browser — your changes appear immediately.
- **Faster debugging**: Edit, see results immediately. No multi-minute Docker build cycles.
- **Node_modules shared**: npm packages installed locally; no re-fetching in every image rebuild.

## Troubleshooting

- **Port 5173 in use**: Change Vite port in `vite.config.js` or kill the process: `lsof -i :5173`.
- **Port 8001 in use**: Change FastAPI port in the uvicorn command or kill: `pkill -f "uvicorn app.main"`.
- **API calls fail**: Ensure backend is running on 8001 and Vite proxy is set up in `vite.config.js`.
