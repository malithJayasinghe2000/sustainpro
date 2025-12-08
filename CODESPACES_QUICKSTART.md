# Quick Start for GitHub Codespaces

When you open this project in Codespaces, follow these steps:

## Option 1: Automated Start (Recommended)

### Backend
```bash
chmod +x start-backend.sh
./start-backend.sh
```

### Frontend (in new terminal)
```bash
chmod +x start-frontend.sh
./start-frontend.sh
```

## Option 2: Manual Start

### Terminal 1 - Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

## Access the Application

- **Frontend**: Click the port 3000 notification or check Ports panel
- **Backend API**: Port 5000

## Share with Client

1. Go to **Ports** panel in VS Code
2. Right-click port **3000**
3. Select "Port Visibility" → "Public"
4. Copy and share the URL

---

**Note**: Backend requires PostgreSQL. For full functionality, connect to a cloud database or add PostgreSQL to devcontainer.
