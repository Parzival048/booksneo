# AI Tally Sync

**Intelligent Bank Statement to Tally Prime Integration with AI Categorization**

A multi-tenant SaaS platform that automates the process of importing bank statements, categorizing transactions using AI, and syncing them to Tally Prime.

## 🚀 Features

### Core Features (All Plans)
- 📄 **Bank Statement Upload** - CSV, Excel, PDF parsing
- 🧠 **AI Categorization** - OpenAI-powered transaction classification
- 🔗 **Tally Connector** - Direct integration with Tally Prime
- 📊 **Dashboard** - Real-time usage and transaction stats
- 👤 **User Authentication** - Firebase Auth with email/password

### Professional Features
- 🔄 **Bank Reconciliation** - Match bank entries with Tally vouchers
- 📈 **Reports & Analytics** - Cash flow, expense trends, charts
- 🏢 **Multi-Company** - Connect multiple Tally companies

### Enterprise Features
- 👥 **Multi-User** - Team access with roles
- 🔌 **API Access** - Integration with external systems
- 🏷️ **White Labeling** - Custom branding

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite |
| Styling | Vanilla CSS with design tokens |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| AI | OpenAI GPT-4 |
| Tally | XML API (ODBC/HTTP) |
| Charts | Chart.js + react-chartjs-2 |

## 📦 Project Structure

```
src/
├── components/
│   ├── common/          # Shared components (PlanGate, FileUpload)
│   └── layout/          # Sidebar, Header
├── config/
│   └── plans.js         # Centralized plan definitions
├── context/
│   ├── AppContext.jsx   # Global app state
│   └── AuthContext.jsx  # Authentication & usage tracking
├── pages/
│   ├── auth/            # Login, Signup, ResetPassword
│   ├── Banking.jsx      # Bank statement processing
│   ├── Dashboard.jsx    # Main dashboard
│   ├── Profile.jsx      # User profile & plans
│   ├── Reports.jsx      # Analytics (Pro+)
│   ├── BankReconciliation.jsx # BRS (Pro+)
│   └── TallyConnector.jsx     # Tally integration
├── services/
│   ├── firebaseClient.js      # Firebase config
│   ├── dataService.js         # Firestore CRUD
│   ├── openaiService.js       # AI categorization
│   └── tallyService.js        # Tally XML API
└── utils/
    ├── constants.js     # Bank templates, categories
    └── helpers.js       # Formatting utilities
```

## 🔐 Plan System

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Transactions/month | 50 | 500 | 5,000 | Unlimited |
| Companies | 1 | 3 | 10 | Unlimited |
| AI Categorization | ✅ | ✅ | ✅ | ✅ |
| Tally Sync | ✅ | ✅ | ✅ | ✅ |
| Bank Reconciliation | ❌ | ❌ | ✅ | ✅ |
| Reports | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Tally Prime with ODBC/HTTP server enabled (port 9000)
- Firebase project (Auth + Firestore)
- OpenAI API key

### Environment Variables
```env
VITE_OPENAI_API_KEY=sk-...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### Installation
```bash
npm install
npm run dev
```

### Tally Setup
1. Open Tally Prime
2. Press F12 > Advanced Configuration
3. Enable "Allow Remote Access" on port 9000
4. In app, go to Tally Connector and test connection

## 📝 Recent Updates (Dec 2024)

### Plan Usage System
- ✅ Real-time transaction & company tracking
- ✅ Limit enforcement in Banking module
- ✅ PlanGate components for feature access
- ✅ Tally Connector unlocked for Free plan

### Authentication
- ✅ Firebase Auth integration
- ✅ Protected routes
- ✅ Profile management

### UI/UX
- ✅ Modern dark theme with glassmorphism
- ✅ Responsive dashboard
- ✅ Plan badges and upgrade prompts

## 🔧 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## 📄 License

Proprietary - BooksNeo

---

*Built with ❤️ for Indian accountants and businesses*
