# Database Setup with pgAdmin 4

## ✅ PostgreSQL 18 is Installed and Running

Now create the database using pgAdmin 4 (GUI tool).

---

## 🎨 Step 1: Open pgAdmin 4

```
Start Menu → Search "pgAdmin 4" → Open
```

---

## 🔌 Step 2: Connect to PostgreSQL Server

1. **Left panel:** Expand "Servers"
2. **Click:** "PostgreSQL 18"
3. **Enter password** when prompted
4. Click "OK"

---

## 🗄️ Step 3: Create Database

1. **Right-click** "Databases"
2. Select **"Create" → "Database..."**
3. **Name:** `sustainpro`
4. Click **"Save"**

---

## 📊 Step 4: Run Schema to Create Tables

1. **Click** on `sustainpro` database (left panel)
2. **Top menu:** Tools → **Query Tool**
3. **Click** folder icon 📁 (Open File)
4. **Browse to:** `d:\SustainPro\backend\sql\schema.sql`
5. Click **"Open"**
6. **Click** ▶️ (Execute/Run) button
7. **Wait** for "Query returned successfully"

---

## ✅ Step 5: Verify Tables Created

**Left panel:**
```
sustainpro → Schemas → public → Tables
```

**Should see 5 tables:**
- ✅ sps_users
- ✅ sps_user_profiles
- ✅ sps_devices
- ✅ sps_system_settings
- ✅ sps_telemetry

---

## 🔌 Step 6: Update Backend Connection

**Edit:** `d:\SustainPro\backend\.env`

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/sustainpro
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
```

**Replace `YOUR_PASSWORD` with your PostgreSQL password**

---

## 🧪 Step 7: Restart Backend and Test

### Restart Backend
```bash
# Stop current backend (Ctrl+C in terminal)
cd d:\SustainPro\backend
npm start
```

### Test Connection
```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "OK",
  "message": "SustainPro API is running",
  "database": "Connected",
  "timestamp": "2025-12-08T..."
}
```

✅ **If you see `"database": "Connected"` - SUCCESS!**

---

## 🎯 Quick Reference

**PostgreSQL Details:**
- Host: `localhost`
- Port: `5432`
- Database: `sustainpro`
- Username: `postgres`
- Password: [Your password]

**Connection String Format:**
```
postgresql://postgres:PASSWORD@localhost:5432/sustainpro
```

---

**Follow the steps in pgAdmin 4 and let me know when tables are created!** 🚀
