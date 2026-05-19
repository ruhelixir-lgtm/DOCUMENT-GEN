# 📄 Parshwa Capital — BoE Document Generator

Generates all Bill of Exchange documents in one click — DOCX + XLSX files bundled into a ready-to-download ZIP.

---

## ⚡ HOW TO RUN (3 steps only)

### STEP 1 — Install Node.js (ONE TIME ONLY)

> If you have already done this before, skip to Step 2.

👉 Go to **https://nodejs.org**
Click the big **"LTS"** button and install it like any normal program.

---

### STEP 2 — Download this project

Click the green **`<> Code`** button on GitHub → **Download ZIP**

Unzip the folder anywhere on your computer (Desktop is fine).

---

### STEP 3 — Launch the app

Open the unzipped folder and double-click the launcher for your computer:

| Your Computer | File to Double-Click |
|---|---|
| 🪟 **Windows** | `start.bat` |
| 🍎 **Mac** | `start.sh` (right-click → Open) |
| 🐧 **Linux** | `start.sh` (right-click → Run as Program) |

✅ A black window will open, then **your browser opens automatically** at `http://localhost:3000`

> **⚠️ Keep the black window open** while using the app. Closing it stops the server.

---

## 🖥️ Using the App

1. Fill in **Lender Details** (name, PAN, address)
2. Fill in **Company Details** (borrower company)
3. Fill in **Loan Details** (amount, rate, tenure, dates, RTGS number)
4. Fill in **Director(s)** details (name, Aadhaar, PAN, mobile, address)
5. Add **Post-Dated Cheques** (up to 10)
6. Click **⚡ Generate All Documents**
7. A **ZIP file downloads automatically** containing:

| # | File | Type |
|---|---|---|
| 1 | Request Letter | `.docx` |
| 2 | Authority Letter | `.docx` |
| 3 | Receipt | `.docx` |
| 4 | Bill of Exchange | `.xlsx` |
| 5 | Board Resolution | `.docx` |
| 6+ | Conf. & Undertaking (per director) | `.docx` |
| 9 | Company Undertaking | `.docx` |
| 10 | Promissory Note | `.xlsx` |

---

## ❓ Troubleshooting

**"Node.js is not installed" error**
→ Go to https://nodejs.org, download and install, then try again.

**Browser doesn't open automatically**
→ Open your browser manually and go to: **http://localhost:3000**

**"Port already in use" error**
→ Close any other running instance (look for another black terminal window) and try again.

**Mac says "cannot be opened because it is from an unidentified developer"**
→ Right-click `start.sh` → click **Open** → click **Open** again in the popup.

---

## 🛑 How to Stop the App

Just **close the black terminal window**. That's it.

---

## 📦 What's Inside

```
DOCUMENT-GEN/
├── start.bat        ← Windows launcher (double-click this)
├── start.sh         ← Mac / Linux launcher (double-click this)
├── server.js        ← The app backend
├── index.html       ← The app frontend (form UI)
├── package.json     ← Dependency list
└── node_modules/    ← Auto-installed packages
```
