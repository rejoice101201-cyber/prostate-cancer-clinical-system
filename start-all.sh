#!/bin/bash
set -e
echo "🔬 Starting ProstateScan AI..."

# 1. Start FastAPI backend
echo "🐍 Starting Python backend (FastAPI)..."
cd backend
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "   FastAPI → http://localhost:8000"
cd ..

# 2. Wait for backend
sleep 3

# 3. Build & start Next.js
echo "⚛️  Building Next.js frontend..."
cd frontend 2>/dev/null || true
npm run build
npm start &
FRONTEND_PID=$!
echo "   Next.js → http://localhost:3000"

# 4. Start ngrok tunnel
echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 &
sleep 3
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null || echo "(ngrok not available)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ProstateScan AI is running!"
echo ""
echo "  Local:  http://localhost:3000"
echo "  Public: $PUBLIC_URL"
echo ""
echo "  Update .env.local → INFERENCE_API_URL if using Colab"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Press Ctrl+C to stop all services"

wait
