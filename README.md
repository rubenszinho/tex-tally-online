Textally (Online LaTeX manuscript metrics)

Development

1. Start backend
   cd server
   npm install
   npm run dev

2. Start frontend
   cd web
   npm install
   npm run dev

Open the frontend at http://localhost:5173 and upload a .tex file.

Production build

1. Build frontend
   cd web && npm run build

2. Build backend
   cd server && npm run build && npm start

Docker

Build and run both services in one container:

docker build -t tex-counter-online .
docker run -p 4000:4000 tex-counter-online

Cloudflare deployment (Pages + Workers)

1) Create GitHub secrets (Repository Settings → Secrets → Actions):
   - CLOUDFLARE_API_TOKEN: Cloudflare API token with Pages and Workers permissions
   - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
   - WORKER_PUBLIC_URL: Your Worker URL (e.g., https://textally-api.<subdomain>.workers.dev)

2) Push to main. GitHub Actions will:
   - Build `web` with VITE_API_BASE_URL set to WORKER_PUBLIC_URL and deploy to Pages
   - Deploy `worker` to Cloudflare Workers via Wrangler

Local Wrangler usage

Install wrangler and login:
  npm i -g wrangler
  wrangler login

Deploy worker locally (from worker/):
  npx wrangler deploy


