# Run Post.Ink on your MacBook

## 1. Install Node.js (if you don’t have it)

**Option A – Homebrew (recommended):**
```bash
brew install node
```

**Option B – From nodejs.org:**  
Download the LTS installer from https://nodejs.org and run it.

Then check:
```bash
node -v   # should show v18 or higher
npm -v
```

---

## 2. One-time setup

Open **Terminal** and run:

```bash
cd ~/Documents/post.ink

# Install root + backend
npm install
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
cd ..

# Install frontend
cd frontend
npm install
cd ..
```

---

## 2b. (Optional) Seed example content

Add 3 example artists with photos and availability:

```bash
cd ~/Documents/post.ink
npm run db:seed
```

## 3. Run the app and open in browser

From the project folder:

```bash
cd ~/Documents/post.ink
npm run dev:open
```

Your browser will open to **http://localhost:5173** when the app is ready.

**Or** run without auto-open:

```bash
npm run dev
```

Then open Safari or Chrome and go to: **http://localhost:5173**

---

## 4. Stop the app

In the terminal where it’s running, press **Ctrl + C** (once or twice).

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| `command not found: node` | Install Node (step 1). |
| `EADDRINUSE` or “port in use” | Something else is using 3001 or 5173. Quit that app or run: `lsof -i :5173` then `kill -9 <PID>` |
| Blank page at localhost:5173 | Make sure both backend and frontend are running (you should see two processes in the terminal). |
| API errors in browser | Backend must be running on port 3001. Run `npm run dev` from project root so both start. |

---

## Quick reference

- **App (frontend):** http://localhost:5173  
- **API (backend):** http://localhost:3001  
- **Start both:** `npm run dev` or `npm run dev:open`  
- **Open app in browser (macOS):** `npm run open`
