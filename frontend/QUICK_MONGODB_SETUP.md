# Quick MongoDB Setup

## Step 1: Create .env.local file

**Option A: Use the setup script (Easiest)**
```cmd
setup-mongodb.bat
```
Enter your MongoDB password when prompted.

**Option B: Create manually**

1. In the `frontend` folder, create a file named `.env.local`
2. Open it in Notepad and paste this (replace YOUR_PASSWORD with your actual password):

```env
MONGODB_URI=mongodb+srv://asd:YOUR_PASSWORD@<your-cluster-url>.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Cluster0
DATABASE_URL=mongodb+srv://asd:YOUR_PASSWORD@<your-cluster-url>.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Cluster0
PORT=3000
```

**Important:** 
- Replace `YOUR_PASSWORD` with your actual MongoDB password
- If your password has special characters (@, #, %, etc.), you may need to URL-encode them:
  - `@` → `%40`
  - `#` → `%23`
  - `%` → `%25`

## Step 2: Whitelist Your IP in MongoDB Atlas

1. Go to https://cloud.mongodb.com/
2. Click "Network Access" → "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

## Step 3: Restart Server

```cmd
npm run dev
```

Look for: `MongoDB Connected: cluster0...`

## Step 4: Push Database Schema

```cmd
npm run db:generate
npm run db:push
```

Done! Your database should now be connected.
