Prompt to use -

Hi Google Antigravity, please refer to this attached Master Rebrief file. This defines:

\- All my collaboration rules with you

\- My coding and logic structure

\- The current project's background

Please load this master file and use it as context.

Read the full file first, confirm, and ask what we do next.

\# 🔐 Universal Rebrief Template – Tech / Coding Projects

\> Start Version: 1.0

\> Current Version: 2.0

\> Last Updated: 2025-12-29 23:03 IST

\> Use Case: Use this with ChatGPT to collaborate on technical, coding, or automation projects

in a structured and secure way.

\---

\## ✅ SESSION RULES & COLLABORATION GUIDELINES

You are acting as a senior technical expert. Follow these rules at all times:

1\. Respond step-by-step only. Do not skip steps or group multiple instructions.

2\. Share clean, copy-ready code blocks only.

3\. Always mention the filename before sharing code.

4\. Wait for confirmation before proceeding to the next step.

5\. Ask whether the last step succeeded or failed before continuing.

6\. After every task, ask:

✅ "Do you want me to update the Rebrief with this progress?"

7\. Every 30 minutes, ask:

⏰ "Rebrief check-in. Please upload your latest file if modified."

8\. Each task should include a short description of what was done, which files it touched, and its

purpose.

9\. Maintain clean structure, modularity, and naming consistency.

10\. Prioritize error handling and test coverage.

11\. Never mix unrelated logic in the same code snippet or reply.

12\. Use consistent naming, casing, and folder logic.

13\. Follow best practices for the given language/framework.

14\. This file is treated as the \*\*single source of truth\*\*.

15\. Always share a clear, copy-pasteable version of the file in plain text to avoid download

errors or data loss.

16\. Always track version updates in this section.

\---

\## 🔐 CONFIDENTIALITY & SECURITY

\- This project is private and must not be shared or exposed publicly.

\- Do not publish code to public repos or expose any credentials.

\- Always avoid any third-party logging unless specified.

\- Verification Keyword: \`Parzival\`

\---

\## 📌 PROJECT OVERVIEW

\### Project Name:

\> AI Tally Sync

\### Description:

\> AI-powered accounting web application with OpenAI GPT-4o-mini integration and Tally Prime connector for automated bank statement processing (CSV, Excel, PDF), transaction categorization, and voucher creation. Full SaaS platform with Firebase Auth, Firestore database, and multi-tier subscription plans.

\### Objective:

\- Automate bank statement categorization using AI (Hybrid: Rule-based + GPT-4o-mini)

\- Push categorized transactions as vouchers to Tally Prime

\- Full Sales & Purchase module with GST voucher creation

\- Provide a modern, professional accounting dashboard

\- Full end-to-end sync: Companies, Ledgers, Vouchers, Sales, Purchases

\- Smart learning from user corrections (IndexedDB)

\- Multi-tier SaaS plans with usage tracking and limits

\---

\## 🧩 SYSTEM ARCHITECTURE

\### Tech Stack:

\- JavaScript (React 18 + Vite)

\- OpenAI GPT-4o-mini, Chart.js, PapaParse, SheetJS, Lucide React, pdfjs-dist

\- Firebase Auth + Firestore (user management, transaction storage)

\- LocalStorage + IndexedDB (client-side state + learning persistence)

\- Tally Prime XML HTTP API (via Vite proxy)

\### Runtime Environment:

\- Local (Vite Dev Server on port 5173)

\- Tally Prime on port 9000

\- Firebase (Auth + Firestore) for backend

\---

\## 🧱 FILE / FOLDER STRUCTURE

\`\`\`

c:\scripts\last\ai-tally-sync\

├── src/components/layout/ (Sidebar, Header, Layout)

├── src/components/common/ (Toast, FileUpload, PlanGate, ProtectedRoute)

├── src/pages/ (Dashboard, Banking, Purchase, Sales, TallyConnector, Settings, Profile, BankReconciliation, Reports)

├── src/pages/auth/ (Login, Signup, ResetPassword)

├── src/services/ (openaiService, fileParser, tallyService, pdfParser, learningService, dataService, firebaseClient)

├── src/config/ (plans.js - centralized plan definitions)

├── src/utils/ (constants, helpers, logger)

├── src/context/ (AppContext, AuthContext - with Firebase + usage tracking)

├── vite.config.js (Tally proxy /api/tally → localhost:9000)

└── .env (API keys: VITE_OPENAI_API_KEY, Firebase config)

\`\`\`

\---

\## 📥 PROJECT EXPECTATIONS

\- Code must return clear and predictable outputs

\- All errors must be handled or logged

\- System must support incremental development

\- Code must be testable and version-controlled

\- Retry logic should be planned and documented (even if not implemented yet)

\- Notes or assumptions must be added during each new logic branch

\---

\## 🔁 VERSION CONTROL & UPDATES

\- AI must never update this file without explicit user confirmation

\- Always ask:

✅ "Do you want me to update the Rebrief file with this progress?"

\---

\## 🔧 TASK NOTES (SESSION-ACTIVE)

\### Current Task:

\> Full Tally Integration - Sales & Purchase modules with GST support - COMPLETE ✅

\### Last Confirmed Step:

\> Implemented full Sales & Purchase Tally integration with GST voucher creation, ledger selection, batch push, and Firestore transaction storage.

\---

\## 📂 MODULE/LOGIC TRACKER

\> Use this section to track work progress

| Task Name | Status | Last Updated | Notes |
|-------------------------------|----------|--------------|-------|
| Project Setup | ✅ Complete | 2025-12-22 | Vite + React initialized |
| Design System CSS | ✅ Complete | 2025-12-27 | Premium dark theme, Tailwind |
| Dashboard Module | ✅ Complete | 2025-12-22 | Charts and stats |
| Banking Module | ✅ Complete | 2025-12-28 | AI + grouping + bulk edit + Firestore sync |
| **Purchase Module** | ✅ Complete | 2025-12-28 | **Full Tally integration with GST** |
| **Sales Module** | ✅ Complete | 2025-12-28 | **Full Tally integration with GST** |
| Tally Connector | ✅ Complete | 2025-12-22 | Real connection, ledger creation, full sync |
| Settings/Profile | ✅ Complete | 2025-12-22 | API config UI |
| Dashboard Analytics | ✅ Complete | 2025-12-22 | Real-time data from transactions |
| Import/Export | ✅ Complete | 2025-12-22 | CSV/JSON export, Tally refresh |
| AI Categorization | ✅ Complete | 2025-12-22 | Hybrid rule + GPT, faster response |
| Date Parsing | ✅ Complete | 2025-12-22 | Multiple formats, table display fixed |
| Bank Templates | ✅ Complete | 2025-12-22 | 14 banks, smart column aliases |
| Create Ledger | ✅ Complete | 2025-12-22 | In TallyConnector + Banking inline |
| Create Company | ⚠️ Limited | 2025-12-22 | Tally API limitation - manual only |
| Full Sync | ✅ Complete | 2025-12-22 | One-click sync: ledgers + vouchers |
| Voucher Push Fix | ✅ Complete | 2025-12-22 | Proper Tally Prime XML format |
| localStorage Persistence | ✅ Complete | 2025-12-22 | Transactions, companies, ledgers |
| PDF Processing | ✅ Complete | 2025-12-22 | pdfParser.js with 13 bank detection |
| Transaction Grouping | ✅ Complete | 2025-12-22 | Similar transactions, bulk select |
| Smart Learning | ✅ Complete | 2025-12-22 | IndexedDB patterns, corrections |
| Bulk Editing UI | ✅ Complete | 2025-12-22 | Toolbar, category/ledger dropdowns |
| Checkbox Selection | ✅ Complete | 2025-12-22 | Table checkboxes, row highlighting |
| PDF Password Input | ✅ Complete | 2025-12-22 | FileUpload with Lock icon |
| Bank Reconciliation | ✅ Complete | 2025-12-22 | Auto-match, BRS summary, export |
| Reports & Analytics | ✅ Complete | 2025-12-28 | Charts, trends, Chart.js Filler fix |
| Ledger Auto-Creation Fix | ✅ Complete | 2025-12-26 | batchPushToTally with verification |
| Firebase Migration | ✅ Complete | 2025-12-27 | Auth + Firestore, replaced Supabase |
| Plan System | ✅ Complete | 2025-12-28 | Centralized plans.js, multi-tier |
| Usage Tracking | ✅ Complete | 2025-12-28 | Real-time transactions/companies sync |
| Transaction Limits | ✅ Complete | 2025-12-28 | Banking enforces plan limits |
| Feature Gates | ✅ Complete | 2025-12-28 | PlanGate on Reconciliation/Reports |
| Tally Free Access | ✅ Complete | 2025-12-28 | Unlocked for Free plan users |
| **Firestore Transactions** | ✅ Complete | 2025-12-28 | Save/Load transactions from Firebase |
| **Enterprise User Script** | ✅ Complete | 2025-12-28 | create-enterprise-user.mjs |
| **Header Plan Display Fix** | ✅ Complete | 2025-12-28 | Fixed displayName property |
| **Sales Tally Integration** | ✅ Complete | 2025-12-28 | pushSalesEntry, GST vouchers |
| **Purchase Tally Integration** | ✅ Complete | 2025-12-28 | pushPurchaseEntry, GST input credit |
| **GST Ledger Auto-Creation** | ✅ Complete | 2025-12-28 | Output/Input CGST/SGST/IGST |
| **Netlify Deployment** | ✅ Complete | 2026-01-01 | netlify.toml, SPA redirects, security headers |
| **Tally CORS Proxy** | ✅ Complete | 2026-01-01 | tally-proxy.mjs, port 9001 |
| **TallyProxy.exe** | ✅ Complete | 2026-01-01 | Windows executable, pkg build |
| **Landing Page Download** | ✅ Complete | 2026-01-01 | Download section, setup instructions |
| **GitHub Push** | ✅ Complete | 2026-01-01 | Parzival048/booksneo |

Legend: ✅ Complete | ⏳ In Progress | ⬜ To Do | ⚠️ Limited

\---

\## 🧪 TEST & DEBUG POLICY

\- Log every critical action

\- Print request/response summaries (without exposing credentials)

\- Always timestamp log entries

\- Simulate edge cases wherever possible

\- Add basic assertions if no test framework exists

\---

\## 🗣 TONE & LANGUAGE FORMAT

\- Use first-person or neutral tone

\- Avoid referring to ChatGPT or third-person instructions

\- Prefer "We will now…" instead of "ChatGPT should…"

\---

\## 🛡 VERIFICATION KEY

Parzival

> Use this to verify file identity during re-uploads

---

## 📋 RECENT SESSION CHANGES (2026-01-01 23:53 IST)

### Netlify Deployment & Tally Proxy - COMPLETE ✅

#### New Features Implemented:

1. **Netlify Deployment Setup**
   - Created `netlify.toml` with build configuration
   - Build command: `npm run build`, publish: `dist`
   - Node.js version: 20.19.0
   - SPA redirects for React Router
   - Security headers (X-Frame-Options, X-XSS-Protection)
   - Static asset caching
   - Created `public/_redirects` for backup SPA routing

2. **Tally CORS Proxy Server** (`tally-proxy.mjs`)
   - Standalone Node.js proxy server for CORS handling
   - Runs on port 9001, forwards to Tally on port 9000
   - Adds CORS headers for cross-origin requests
   - Real-time logging of requests/responses
   - Graceful error handling for Tally connection issues

3. **TallyProxy.exe** - Windows Executable
   - Built using `pkg` - standalone Windows executable
   - No Node.js required on user's machine
   - 36 MB, Windows 10/11 compatible
   - Located in `public/TallyProxy.exe`

4. **TallyService Production Mode** (`src/services/tallyService.js`)
   - Environment detection (development vs production)
   - Development: Uses Vite proxy `/api/tally`
   - Production: Connects to CORS proxy on port 9001
   - Console logging of connection mode

5. **Landing Page Tally Connector Section** (`LandingPage.jsx`)
   - New "Download" link in navigation
   - Beautiful download section with:
     - Download card with TallyProxy.exe button
     - 3-step setup instructions
     - Security note (data stays local)
   - Responsive design for mobile

6. **Landing Page CSS** (`landing.css`)
   - `.tally-connector-section` styles
   - `.connector-download-card` with glow effect
   - `.setup-steps` with numbered circles
   - `.connector-note` security badge
   - Mobile responsive breakpoints

#### Files Created:
- `netlify.toml` - Netlify build configuration
- `public/_redirects` - SPA routing fallback
- `tally-proxy.mjs` - CORS proxy server source
- `public/TallyProxy.exe` - Windows executable

#### Files Modified:
- `src/services/tallyService.js` - Added production mode detection
- `src/pages/LandingPage.jsx` - Added download section
- `src/landing.css` - Added Tally connector styles

#### GitHub Repository:
- Pushed to: https://github.com/Parzival048/booksneo
- Branch: main

---

## 📋 PREVIOUS SESSION CHANGES (2025-12-29 23:03 IST)

### Email Verification & Security - COMPLETE ✅

#### New Features Implemented:

1. **Google SMTP Configuration**
   - Configured Gmail SMTP in Firebase Console (`smtp.gmail.com:587`)
   - Created professional HTML email templates (`email-templates.html`)
   - Password Reset, Email Verification, Email Change templates
   - BooksNeo dark theme branding with gradient CTAs

2. **Email Verification Flow** (`src/pages/auth/VerifyEmail.jsx`)
   - Dedicated verification pending page
   - Step-by-step instructions (numbered)
   - "I've Verified My Email" button with auto-refresh
   - "Resend Verification Email" with 60s cooldown
   - Auto-check verification status every 5 seconds
   - Sign out option for wrong email

3. **AuthContext Updates** (`src/context/AuthContext.jsx`)
   - Added `sendEmailVerification` on registration
   - Added `resendVerificationEmail()` function
   - Added `refreshEmailVerification()` function
   - Added `isEmailVerified` flag

4. **Firestore Security Rules** (`firestore.rules`)
   - Comprehensive security rules for all collections
   - Users can only CRUD their own data
   - Fixed "Missing or insufficient permissions" error
   - Collections covered: users, transactions, companies, ledgers, learningPatterns, settings, vouchers

#### Files Created/Modified:
- `email-templates.html` - Professional email templates
- `src/pages/auth/VerifyEmail.jsx` - Verification page
- `src/auth.css` - Verification styles
- `src/context/AuthContext.jsx` - Email verification functions
- `src/pages/auth/Register.jsx` - Redirect to verify-email
- `src/App.jsx` - Added /verify-email route
- `firestore.rules` - Security rules

---

## 📋 PREVIOUS SESSION CHANGES (2025-12-29 08:48 IST)

### Landing Page Enhancements - COMPLETE ✅

#### New Features Implemented:

1. **Real Dashboard Preview**
   - Replaced placeholder mockup with actual dashboard screenshot in hero section.
   - Added `/public/dashboard-preview.png` (real app screenshot).
   - Enhanced 3D perspective hover effect with purple glow.
   - Increased preview width from 600px to 700px for better visibility.

2. **Professional Loader Animation** (`src/components/common/Loader.jsx`)
   - Premium loading screen with BooksNeo branding.
   - Animated rotating rings (dual-layer, counter-rotating).
   - Pulsing logo with gradient and glow effects.
   - Sliding progress bar with glow trail.
   - Bouncing loading dots.
   - Floating background particles.
   - Smooth fade-out transition (2.2s minimum display time).
   - Responsive design for mobile screens.

3. **New Files Created**
   - `src/components/common/Loader.jsx` - Loader component
   - `src/components/common/Loader.css` - Premium animation styles
   - `public/dashboard-preview.png` - Dashboard screenshot

---

## 📋 PREVIOUS SESSION CHANGES (2025-12-28 22:40 IST)

### UI Polish & Theme Implementation - COMPLETE ✅

#### Key Updates:

1. **Rebranding to "BooksNeo"**
   - Updated application name in `index.html`, `constants.js`, Header, Sidebar, and Auth pages.
   - Refined Landing Page text and logos.

2. **Responsive Design Fixes**
   - **Desktop Grid**: RESTORED 4-column stat card layout on standard 1280px screens (prevented premature collapse).
   - **Sidebar**: Fixed collapsing behavior, ensuring smooth transition and icon alignment (80px collapsed width).
   - **Mobile**: Enhanced responsiveness for tables and cards.

3. **Dark/Light Theme Implementation**
   - **ThemeContext**: Created `ThemeContext.jsx` for global theme state (persisted in `localStorage`).
   - **CSS Variables**: Added `:root[data-theme="light"]` overrides in `index.css` for comprehensive color system.
   - **Toggles**: Added Sun/Moon toggle buttons to Dashboard Header and Landing Page Navbar.
   - **Visibility Fixes**:
     - Fixed unseen text in Light Mode by adding `--bg-nav-scrolled` variable.
     - Updated Landing Page Footer to adapt background color dynamically (`var(--bg-nav-scrolled)`).
     - Ensured contrast for all inputs, cards, and sidebar elements.

---

## 📋 PREVIOUS SESSION CHANGES (2025-12-28 20:48 IST)

### Sales & Purchase Tally Integration - COMPLETE ✅

#### New Features Implemented:

1. **Sales Module Full Rewrite** (`Sales.jsx`)
   - Add/Edit/Delete sales entries with GST calculation
   - Customer ledger selection from Tally
   - Sales account selection
   - GST rates: 0%, 5%, 12%, 18%, 28%
   - Inter-state toggle (IGST vs CGST+SGST)
   - Individual & batch push to Tally
   - Status tracking (Pending/Synced)
   - Summary cards with totals

2. **Purchase Module Full Rewrite** (`Purchase.jsx`)
   - Add/Edit/Delete purchase entries with GST input credit
   - Vendor ledger selection from Tally
   - Purchase account selection
   - GST input credit display
   - Individual & batch push to Tally
   - Status tracking (Pending/Synced)
   - Invoice upload placeholder

3. **TallyService Enhancements** (`tallyService.js`)
   - `createSalesVoucherXML()` - GST-compliant Sales voucher XML
   - `createPurchaseVoucherXML()` - GST-compliant Purchase voucher XML
   - `pushSalesEntry()` - Push single sales entry
   - `pushPurchaseEntry()` - Push single purchase entry
   - `batchPushSales()` - Batch push sales entries
   - `batchPushPurchases()` - Batch push purchase entries
   - Added GST ledgers to `ensureBasicLedgers()`:
     - Output CGST, SGST, IGST (for Sales)
     - Input CGST, SGST, IGST (for Purchases)
     - Purchase Account

4. **Bug Fixes**
   - Chart.js Filler plugin missing in Reports.jsx
   - Duplicate React keys in BankReconciliation.jsx
   - Header plan display (displayName vs display_name)

---

\## 📋 SESSION CHANGES (2025-12-28 15:30 IST)

### Firestore Transaction Storage - COMPLETE ✅

#### New Features Implemented:

1. **AppContext Firestore Integration** (`AppContext.jsx`)
   - Load transactions from Firestore on auth state change
   - Save transactions to Firestore when setTransactions is called
   - Added `LOAD_TRANSACTIONS_FROM_DB` action type
   - Prevents duplicate loading with `firestoreLoadedRef`

2. **Enterprise User Creation** 
   - `create-enterprise-user.mjs` - Script to create Firebase user + Firestore profile
   - `update-enterprise-plan.mjs` - Fix planId field name
   - Created user: enterprise@booksneo.in / Enterprise@2025

3. **Firestore Security Rules** - Updated for transactions collection

---

\## 📋 PREVIOUS SESSION CHANGES (2025-12-28 13:24 IST)

### Plan Usage & Permissions System - COMPLETE ✅

#### New Features Implemented:

1. **Enhanced AuthContext** (`AuthContext.jsx`)
   - Added `setCompanyCount()`, `setTransactionCount()`, `refreshUsage()` functions
   - Fixed Firestore field names: `transactionsThisMonth`, `companiesCount`
   - Real-time usage sync to Firebase

2. **Transaction Limit Enforcement** (`Banking.jsx`)
   - Checks limits before processing bank statements
   - Shows warning when approaching limit
   - Blocks upload when limit reached with upgrade prompt
   - Syncs transaction count after processing

3. **Company Count Sync** (`TallyConnector.jsx`)
   - Syncs company count from Tally to usage tracking
   - Dashboard displays real-time usage vs limit

4. **Feature Gates Fixed**
   - `BankReconciliation.jsx`: Fixed feature name to `bankReconciliation`
   - `Reports.jsx`: Feature gate already working
   - `TallyConnector.jsx`: Removed gate - now Free plan accessible

5. **Centralized Plan Config** (`src/config/plans.js`)
   - Free, Starter, Professional, Enterprise plans
   - Granular limits: transactions, companies, storage
   - Feature flags: tallySync, reports, bankReconciliation, etc.

---

\## 📋 PREVIOUS SESSION CHANGES (2025-12-27 10:05 IST)

### Phase 3 Testing & Bug Fixes - COMPLETE ✅

#### Critical Fixes Applied:

1. **Bank Reconciliation Voucher Fetch Fix** (`tallyService.js`)
   - Fixed `getVouchers()` to use Export Data format
   - Now fetches Payment and Receipt vouchers separately using proper report names
   - Fixed `parseVouchersFromXML()` to accept defaultType parameter

2. **BankReconciliation.jsx Update**
   - Updated voucher filtering to check allLedgers array
   - Added debug logging for troubleshooting

3. **Tally Date Workaround** - Using Dec 1, 2025 for voucher dates (EDU limitation)

---

\## 📋 FIRESTORE SECURITY RULES (Current)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /transactions/{docId} {
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null && resource.data.user_id == request.auth.uid && request.resource.data.user_id == request.auth.uid;
      allow delete: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
    // Similar rules for: companies, ledgers, settings, learningPatterns
  }
}
```

---

\## 📋 TEST USERS

| Email | Password | Plan |
|-------|----------|------|
| enterprise@booksneo.in | Enterprise@2025 | Enterprise (Yearly) |

---

\## 📋 PREVIOUS SESSION CHANGES (2025-12-22 03:29 IST)

### Phase 2 Professional Features - COMPLETE ✅

#### New Pages Created:
1. **BankReconciliation.jsx** (`/reconciliation`)
   - Auto-matching algorithm (amount + date ±3 days, reference number)
   - Side-by-side comparison view (Bank vs Tally)
   - BRS summary cards (balances, difference, match counts)

2. **Reports.jsx** (`/reports`)
   - Cash flow trend (Line chart)
   - Category breakdown (Pie chart)
   - Period selector (Monthly / All Time)
   - Top 5 expenses/incomes lists