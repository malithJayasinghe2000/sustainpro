# GitHub Setup Guide for SustainPro

## 📌 Step-by-Step GitHub Setup

### 1. Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click **+** (top right) → **New repository**
3. Fill in:
   - **Repository name**: `SustainPro` (or your preferred name)
   - **Description**: "IoT Platform for Environmental Monitoring"
   - **Visibility**: Private (recommended) or Public
   - **❌ DO NOT** initialize with README (we already have one)
4. Click **Create repository**

### 2. Connect Local Repository to GitHub

```bash
# Navigate to project directory
cd d:/SustainPro

# Add remote repository (replace USERNAME and REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Check remote is added
git remote -v
```

### 3. Initial Commit and Push

```bash
# Stage all files
git add .

# Commit
git commit -m "Initial commit: SustainPro IoT Platform setup"

# Push to GitHub (main branch)
git push -u origin main
```

If you get an error about `main` vs `master`:
```bash
# Rename branch to main
git branch -M main

# Then push
git push -u origin main
```

---

## 🌐 GitHub Codespaces Setup

### What is Codespaces?
GitHub Codespaces provides a complete, cloud-based development environment. Perfect for:
- ✅ Client demos without local setup
- ✅ Testing on different machines
- ✅ Collaborative development
- ✅ Quick feedback iterations

### Enable Codespaces

1. **Go to your GitHub repository**
2. Click **Code** button (green button)
3. Select **Codespaces** tab
4. Click **Create codespace on main**

### First Launch (takes ~2-3 minutes)
The devcontainer will:
1. ✅ Install Node.js 20
2. ✅ Install backend dependencies (`backend/node_modules`)
3. ✅ Install frontend dependencies (`frontend/node_modules`)
4. ✅ Setup VS Code extensions
5. ✅ Configure port forwarding (3000, 5000)

### Starting Services in Codespaces

Open **two terminals** in Codespaces:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Accessing Your App in Codespaces

1. **Ports Panel** will show forwarded ports
2. Click the **🌐 globe icon** next to port 3000 to open frontend
3. Click the **🌐 globe icon** next to port 5000 to test backend API

**Port Visibility Options:**
- **Private**: Only you can access (default)
- **Public**: Anyone with link can access ← Use this for client demos

---

## 👥 Sharing with Clients

### Method 1: Share Codespace URL (Recommended)

1. In Codespaces, click **Ports** panel
2. Right-click on port **3000**
3. Select **Port Visibility** → **Public**
4. Copy the URL (looks like: `https://username-repo-abc123.github.dev`)
5. Share this URL with your client

**Pros:**
- ✅ Client needs no GitHub account
- ✅ Instant access
- ✅ No local setup required
- ✅ Always shows latest code

**Cons:**
- ⚠️ Codespace auto-stops after 30 min of inactivity
- ⚠️ You need to restart it for client to access

### Method 2: Client Creates Their Own Codespace

1. Make repository **Public** (or invite client as collaborator)
2. Client goes to your repository
3. Client clicks **Code** → **Codespaces** → **Create codespace**
4. Client gets their own instance

**Pros:**
- ✅ Client has full control
- ✅ Can test and experiment

**Cons:**
- ⚠️ Client needs GitHub account
- ⚠️ Uses your Codespaces quota (60 hours/month free)

---

## 🔄 Workflow: Local → GitHub → Codespaces → Azure

### Development Cycle

```
┌─────────────────┐
│ 1. Local Dev    │ ← You develop here
│   (Your PC)     │
└────────┬────────┘
         │
         │ git push
         ▼
┌─────────────────┐
│ 2. GitHub       │ ← Code repository
│   (Repository)  │
└────────┬────────┘
         │
         │ Create Codespace
         ▼
┌─────────────────┐
│ 3. Codespaces   │ ← Client preview & testing
│   (Demo/Test)   │
└────────┬────────┘
         │
         │ After approval
         ▼
┌─────────────────┐
│ 4. Azure Deploy │ ← Production
│   (Live App)    │
└─────────────────┘
```

### Typical Workflow

1. **Day 1-3: Local Development**
   ```bash
   # Work on your PC
   git add .
   git commit -m "Add user authentication"
   git push
   ```

2. **Demo Day: Show Client in Codespaces**
   - Create/start Codespace
   - Make port 3000 public
   - Share URL with client
   - Client tests and provides feedback

3. **After Feedback: Update Code**
   ```bash
   # Fix issues locally
   git add .
   git commit -m "Fix: Update device form validation"
   git push
   ```

4. **Codespace Auto-Updates**
   - Client can `git pull` in their Codespace
   - Or create a fresh Codespace to see changes

5. **Final Approval → Deploy to Azure**

---

## 📝 Best Practices

### Commits
- ✅ Commit often with clear messages
- ✅ Use conventional commits: `feat:`, `fix:`, `docs:`
- ✅ Push to GitHub at end of each work session

### Branches
```bash
# Create feature branch for major changes
git checkout -b feature/device-dashboard
git push -u origin feature/device-dashboard
```

### Environment Variables
- ✅ Never commit `.env` files
- ✅ Use `.env.example` as templates
- ✅ Document required env vars in README

### Database in Codespaces
Since Codespaces doesn't include PostgreSQL:

**Option A: Use Cloud Database**
```env
# In Codespaces .env
DATABASE_URL=postgresql://user:pass@your-cloud-db.com:5432/sustainpro
```

**Option B: Add PostgreSQL to devcontainer**
(See advanced configuration section)

---

## 🆘 Troubleshooting

### "git push" asks for credentials every time
```bash
# Use SSH instead
git remote set-url origin git@github.com:USERNAME/REPO.git
```

### Codespace won't start
- Check GitHub status page
- Try deleting and recreating Codespace
- Check `.devcontainer/devcontainer.json` for errors

### Ports not forwarding
- Restart Codespace
- Manually add ports in Ports panel
- Check firewall settings

### Client can't access public URL
- Verify port visibility is set to **Public**
- Ensure Codespace is running
- Check if URL copied correctly

---

## 📊 Codespaces Limits (Free Tier)

- **60 hours/month** of compute (120 hours for Pro)
- **15 GB** storage per Codespace
- **Auto-stop** after 30 minutes of inactivity
- **Auto-delete** after 30 days of inactivity

**Tip**: Stop Codespaces when not in use to save hours!

---

## ✅ Checklist

- [ ] Created GitHub repository
- [ ] Connected local repo to GitHub
- [ ] Made initial commit and push
- [ ] Verified `.devcontainer/devcontainer.json` exists
- [ ] Created first Codespace and tested it
- [ ] Started backend and frontend in Codespace
- [ ] Tested port forwarding
- [ ] Shared public URL with client
- [ ] Received feedback
- [ ] Ready for Azure deployment

---

**Next Steps**: See `AZURE_DEPLOYMENT.md` for production deployment guide.
