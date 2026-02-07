# SystemModel-Opus — Expense Tracker

> **Comprehensive system model for rapid onboarding, navigation, and architectural understanding.**
> Auto-generated from full source analysis. All file references are clickable.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Tech Stack](#3-tech-stack)
4. [Directory Structure](#4-directory-structure)
5. [Data Model](#5-data-model)
6. [Backend Deep Dive](#6-backend-deep-dive)
   - [Entry Point & Server](#61-entry-point--server)
   - [Route → Service → DB Layer](#62-route--service--db-layer)
   - [Authentication & Authorization](#63-authentication--authorization)
   - [API Reference](#64-api-reference)
   - [CSV Import Pipeline](#65-csv-import-pipeline)
   - [Validation](#66-validation)
7. [Frontend Deep Dive](#7-frontend-deep-dive)
   - [Entry Point & Providers](#71-entry-point--providers)
   - [Routing & Auth Gate](#72-routing--auth-gate)
   - [Pages](#73-pages)
   - [Components](#74-components)
   - [Hooks (State & Data)](#75-hooks-state--data)
   - [API Client Layer](#76-api-client-layer)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Key Design Patterns](#9-key-design-patterns)
10. [Configuration & Tooling](#10-configuration--tooling)
11. [Getting Started](#11-getting-started)
12. [File Index](#12-file-index)

---

## 1. System Overview

**Expense Tracker** is a full-stack web application that lets authenticated users:

- **Track expenses** — create, read, update, delete with category tagging
- **View a dashboard** — monthly spending totals, month-over-month trends, recent activity
- **Bulk import from CSV** — a multi-step wizard that uploads, auto-maps columns, validates, previews, and atomically imports expenses

The system is a classic **SPA + REST API** architecture with a React frontend talking to an Express backend over JSON, backed by SQLite.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      BROWSER                             │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Login   │  │Dashboard │  │ Expenses │  │ Import  │  │
│  │  Page    │  │  Page    │  │  Page    │  │  Page   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
│       │              │              │              │      │
│  ┌────┴──────────────┴──────────────┴──────────────┴───┐  │
│  │           React Hooks (TanStack Query)              │  │
│  │  useAuth · useExpenses · useCategories · useImport  │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                               │
│  ┌────────────────────────┴────────────────────────────┐  │
│  │              API Client (fetch wrapper)             │  │
│  │         Bearer token · JSON · Error handling        │  │
│  └────────────────────────┬────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────┘
                            │  HTTP (Vite proxy :5173 → :3002)
┌───────────────────────────┼──────────────────────────────┐
│                     EXPRESS SERVER                        │
│                           │                               │
│  ┌────────────────────────┴────────────────────────────┐  │
│  │  Middleware: CORS · JSON parser · Request logger    │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                               │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │ /auth  │ │/expenses │ │/categor. │ │    /import     │ │
│  │ routes │ │  routes  │ │  routes  │ │    routes      │ │
│  └───┬────┘ └────┬─────┘ └──────────┘ └───────┬────────┘ │
│      │           │          (public)           │          │
│  ┌───┴────┐ ┌────┴──────┐            ┌────────┴────────┐ │
│  │  auth  │ │  expense  │            │    import       │ │
│  │Service │ │  Service  │            │   Service       │ │
│  └───┬────┘ └────┬──────┘            └────────┬────────┘ │
│      │           │                             │         │
│  ┌───┴───────────┴─────────────────────────────┴───────┐ │
│  │              Knex Query Builder                     │ │
│  └─────────────────────────┬───────────────────────────┘ │
└────────────────────────────┼─────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   SQLite DB     │
                    │   (data.db)     │
                    └─────────────────┘
```

---

## 3. Tech Stack

| Layer        | Technology                          | Purpose                             |
| ------------ | ----------------------------------- | ----------------------------------- |
| **Frontend** | React 18                            | UI components & rendering           |
|              | TypeScript                          | Type safety                         |
|              | Vite                                | Dev server, bundler, HMR            |
|              | TanStack Query v5                   | Server state, caching, mutations    |
|              | React Router v6                     | Client-side routing                 |
|              | Tailwind CSS 3                      | Utility-first styling               |
|              | Lucide React                        | Icon library                        |
| **Backend**  | Node.js + Express 4                 | HTTP server & routing               |
|              | TypeScript                          | Type safety                         |
|              | Knex.js 3                           | SQL query builder & migrations      |
|              | better-sqlite3                      | SQLite driver (synchronous, fast)   |
|              | bcryptjs                            | Password hashing                    |
|              | jsonwebtoken                        | JWT auth tokens                     |
|              | Zod                                 | Request body validation             |
|              | Pino + pino-pretty                  | Structured logging                  |
| **Testing**  | Vitest                              | Test runner (both ends)             |
|              | @testing-library/react + jest-dom   | React component testing             |
|              | jsdom                               | DOM environment for frontend tests  |
| **Tooling**  | tsx                                 | TypeScript execution (dev)          |
|              | PostCSS + Autoprefixer              | CSS processing pipeline             |

---

## 4. Directory Structure

```
expense-tracker-interview/
├── README.md                          # Project readme
├── SystemModel-Opus.md                # ← this document
│
├── backend/
│   ├── package.json                   # Dependencies & scripts
│   ├── tsconfig.json                  # TS config (ES2022, NodeNext)
│   ├── vitest.config.ts               # Test config
│   └── src/
│       ├── index.ts                   # Express app entry — mounts routes, middleware
│       ├── logger.ts                  # Pino logger factory
│       ├── db/
│       │   ├── knex.ts                # Knex instance (singleton)
│       │   ├── knexfile.ts            # Knex config (SQLite, paths)
│       │   ├── migrations/
│       │   │   ├── 001_initial.ts     # users, categories, expenses tables
│       │   │   └── 002_import_sessions.ts  # import_sessions, import_history
│       │   └── seeds/
│       │       └── 001_seed.ts        # Demo user + categories + sample expenses
│       ├── middleware/
│       │   └── auth.ts                # JWT verify middleware + token generator
│       ├── routes/
│       │   ├── auth.ts                # POST /register, /login
│       │   ├── categories.ts          # GET / (public)
│       │   ├── expenses.ts            # CRUD + monthly-total (auth required)
│       │   └── import.ts              # Multi-step CSV import (auth required)
│       ├── services/
│       │   ├── authService.ts         # register/login business logic
│       │   ├── expenseService.ts      # CRUD + listing + monthly totals
│       │   └── importService.ts       # CSV parsing, mapping, validation, import
│       └── types/
│           ├── index.ts               # Core domain types (User, Expense, etc.)
│           └── import.ts              # Import-specific types
│
└── frontend/
    ├── index.html                     # SPA shell
    ├── package.json                   # Dependencies & scripts
    ├── tsconfig.json                  # TS config (React JSX, bundler resolution)
    ├── tsconfig.node.json             # TS config for vite.config.ts
    ├── vite.config.ts                 # Vite: React plugin, /api proxy, @ alias
    ├── vitest.config.ts               # Test config (jsdom, @testing-library)
    ├── postcss.config.js              # PostCSS → Tailwind + Autoprefixer
    ├── tailwind.config.js             # Tailwind content paths
    └── src/
        ├── main.tsx                   # React root: QueryClient, BrowserRouter
        ├── App.tsx                    # Auth gate, route definitions
        ├── index.css                  # Tailwind directives + body styles
        ├── api/
        │   ├── client.ts              # fetch wrapper: auth headers, error handling
        │   ├── auth.ts                # login/register/logout API calls
        │   ├── categories.ts          # getCategories
        │   ├── expenses.ts            # CRUD + monthly-total API calls
        │   └── import.ts              # Full import wizard API calls
        ├── components/
        │   ├── Layout.tsx             # Nav bar, responsive shell, logout button
        │   ├── Modal.tsx              # Reusable modal with backdrop + Escape key
        │   ├── ExpenseForm.tsx        # Create/edit form with validation
        │   ├── ExpenseList.tsx        # Renders expense rows with edit/delete
        │   ├── CategoryIcon.tsx       # Maps icon strings → Lucide components
        │   └── ImportWizard.tsx       # 4-step wizard (Upload→Map→Preview→Complete)
        ├── hooks/
        │   ├── useAuth.ts             # Auth state, login/register/logout mutations
        │   ├── useCategories.ts       # Categories query (staleTime: Infinity)
        │   ├── useExpenses.ts         # Expenses query + CRUD mutations
        │   └── useImport.ts           # Import session, upload, mapping, confirm
        ├── pages/
        │   ├── Login.tsx              # Login/register toggle form
        │   ├── Dashboard.tsx          # Stats cards + recent expenses
        │   ├── Expenses.tsx           # Full expense list + search/filter + CRUD modals
        │   └── Import.tsx             # Import landing + history + wizard launcher
        ├── types/
        │   └── index.ts              # Frontend domain types (mirrors backend)
        └── tests/
            └── setup.ts              # @testing-library/jest-dom import
```

---

## 5. Data Model

### 5.1 Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────┐
│    users     │       │    expenses      │       │  categories   │
├──────────────┤       ├──────────────────┤       ├───────────────┤
│ id       PK  │──┐    │ id           PK  │    ┌──│ id        PK  │
│ email        │  │    │ userId       FK ─┼────┘  │ name          │
│ passwordHash │  │    │ categoryId   FK ─┼───────│ icon          │
│ createdAt    │  │    │ amount           │       └───────────────┘
└──────────────┘  │    │ description      │
                  │    │ date             │
                  │    │ createdAt        │
                  │    └──────────────────┘
                  │
                  │    ┌──────────────────────┐    ┌──────────────────────┐
                  │    │  import_sessions     │    │   import_history     │
                  │    ├──────────────────────┤    ├──────────────────────┤
                  ├───▶│ id              PK   │    │ id              PK   │
                  │    │ userId          FK   │    │ userId          FK ──┼──┐
                  │    │ status               │    │ sessionId            │  │
                  │    │ fileName             │    │ fileName             │  │
                  │    │ fileSize             │    │ totalRows            │  │
                  │    │ rawCsvData           │    │ importedRows         │  │
                  │    │ columnMapping (JSON) │    │ skippedRows          │  │
                  │    │ parsedRows    (JSON) │    │ createdAt            │  │
                  │    │ validRowCount        │    └──────────────────────┘  │
                  │    │ invalidRowCount      │                             │
                  │    │ skippedRowCount      │                             │
                  │    │ importedExpenseCount │                             │
                  │    │ createdAt            │                             │
                  │    │ updatedAt            │                             │
                  │    └──────────────────────┘                             │
                  │                                                        │
                  └────────────────────────────────────────────────────────┘
```

### 5.2 Table Details

**Defined in:** [backend/src/db/migrations/001_initial.ts](backend/src/db/migrations/001_initial.ts) and [backend/src/db/migrations/002_import_sessions.ts](backend/src/db/migrations/002_import_sessions.ts)

| Table              | Key Columns                                                         | Notes                                                |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `users`            | `id` PK, `email` UNIQUE, `passwordHash`, `createdAt`               | bcrypt-hashed passwords                              |
| `categories`       | `id` PK, `name`, `icon`                                            | 6 seeded categories; icon maps to Lucide icon names  |
| `expenses`         | `id` PK, `userId` FK→users, `categoryId` FK→categories, `amount` DECIMAL(10,2), `description`, `date`, `createdAt` | CASCADE delete on user removal |
| `import_sessions`  | `id` PK, `userId` FK→users, `status` (upload\|mapping\|preview\|completed\|cancelled), JSON blobs for `columnMapping` & `parsedRows` | Tracks wizard state server-side |
| `import_history`   | `id` PK, `userId` FK→users, `sessionId`, `fileName`, `totalRows`, `importedRows`, `skippedRows`, `createdAt` | Created atomically on successful import |

### 5.3 Seed Data

**Defined in:** [backend/src/db/seeds/001_seed.ts](backend/src/db/seeds/001_seed.ts)

| Entity     | Seed Content                                                           |
| ---------- | ---------------------------------------------------------------------- |
| Categories | Food 🍴, Transport 🚗, Entertainment 🎬, Bills 📄, Shopping 🛍️, Other ⋯ |
| Users      | `demo@example.com` / `password123`                                     |
| Expenses   | 15 random expenses spread over the last 15 days                        |

---

## 6. Backend Deep Dive

### 6.1 Entry Point & Server

**File:** [backend/src/index.ts](backend/src/index.ts)

```
Express App
  ├── cors()                          — open CORS
  ├── express.json({ limit: '10mb' }) — parse JSON bodies (large for CSV imports)
  ├── Request Logger middleware       — logs method, path, status, duration via Pino
  ├── /api/auth      → authRoutes
  ├── /api/expenses  → expenseRoutes
  ├── /api/categories → categoryRoutes
  ├── /api/import    → importRoutes
  └── /api/health    → { status: 'ok' }
```

**Port:** `process.env.PORT` or `3002`

### 6.2 Route → Service → DB Layer

The backend follows a clean three-layer architecture:

```
Route (HTTP concerns: parsing, status codes, Zod validation)
  → Service (Business logic, data transformation)
    → Knex (SQL queries against SQLite)
```

| Layer     | Files                                                    | Responsibility                                          |
| --------- | -------------------------------------------------------- | ------------------------------------------------------- |
| Routes    | [routes/auth.ts](backend/src/routes/auth.ts), [routes/expenses.ts](backend/src/routes/expenses.ts), [routes/categories.ts](backend/src/routes/categories.ts), [routes/import.ts](backend/src/routes/import.ts) | HTTP parsing, Zod validation, status codes, error responses |
| Services  | [services/authService.ts](backend/src/services/authService.ts), [services/expenseService.ts](backend/src/services/expenseService.ts), [services/importService.ts](backend/src/services/importService.ts) | Business logic, data transformation |
| DB        | [db/knex.ts](backend/src/db/knex.ts) + [db/knexfile.ts](backend/src/db/knexfile.ts) | Connection singleton, config |

### 6.3 Authentication & Authorization

**Files:** [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts), [backend/src/services/authService.ts](backend/src/services/authService.ts)

| Aspect           | Implementation                                                          |
| ---------------- | ----------------------------------------------------------------------- |
| Password storage | bcrypt with 10 salt rounds                                              |
| Token format     | JWT signed with `JWT_SECRET` env var (or hardcoded dev fallback)        |
| Token lifetime   | 24 hours                                                                |
| Token payload    | `{ userId: number, email: string }`                                     |
| Auth middleware   | `authenticateToken` — extracts Bearer token, verifies, attaches `req.user` |
| Protected routes | `/api/expenses/*` and `/api/import/*` — middleware applied via `router.use()` |
| Public routes    | `/api/auth/*` and `/api/categories` — no auth required                  |

**Auth flow:**
```
Register/Login → bcrypt verify → JWT signed → returned to client
                                                  ↓
Client stores in localStorage → sent as Authorization: Bearer <token>
                                                  ↓
authenticateToken middleware → jwt.verify → req.user = { userId, email }
```

### 6.4 API Reference

#### Auth Routes — [backend/src/routes/auth.ts](backend/src/routes/auth.ts)

| Method | Path                  | Body                               | Response                          | Auth |
| ------ | --------------------- | ---------------------------------- | --------------------------------- | ---- |
| POST   | `/api/auth/register`  | `{ email, password }` (min 6 chars)| `201 { user, token }`             | No   |
| POST   | `/api/auth/login`     | `{ email, password }`              | `200 { user, token }`             | No   |

#### Expense Routes — [backend/src/routes/expenses.ts](backend/src/routes/expenses.ts)

| Method | Path                         | Query/Body                                              | Response              | Auth |
| ------ | ---------------------------- | ------------------------------------------------------- | --------------------- | ---- |
| GET    | `/api/expenses`              | `?limit&offset&startDate&endDate&search`                | `200 Expense[]`       | Yes  |
| GET    | `/api/expenses/monthly-total`| `?year&month`                                           | `200 { total, year, month }` | Yes |
| GET    | `/api/expenses/:id`          | —                                                       | `200 Expense`         | Yes  |
| POST   | `/api/expenses`              | `{ categoryId, amount, description, date }`             | `201 Expense`         | Yes  |
| PUT    | `/api/expenses/:id`          | `{ categoryId?, amount?, description?, date? }`         | `200 Expense`         | Yes  |
| DELETE | `/api/expenses/:id`          | —                                                       | `204`                 | Yes  |

#### Category Routes — [backend/src/routes/categories.ts](backend/src/routes/categories.ts)

| Method | Path               | Response           | Auth |
| ------ | ------------------ | ------------------ | ---- |
| GET    | `/api/categories`  | `200 Category[]`   | No   |

#### Import Routes — [backend/src/routes/import.ts](backend/src/routes/import.ts)

| Method | Path                              | Body                                                    | Response                    | Auth |
| ------ | --------------------------------- | ------------------------------------------------------- | --------------------------- | ---- |
| GET    | `/api/import/session`             | —                                                       | `200 { session, parsedRows }` | Yes |
| POST   | `/api/import/session`             | —                                                       | `201 { session }`           | Yes  |
| DELETE | `/api/import/session/:id`         | —                                                       | `204`                       | Yes  |
| POST   | `/api/import/upload`              | `{ fileName, csvContent }`                              | `201 { session, structure }`| Yes  |
| POST   | `/api/import/session/:id/mapping` | `{ columnMapping: { date, amount, description, category? } }` | `200 { session, parsedRows, validCount, invalidCount }` | Yes |
| PATCH  | `/api/import/session/:id/row`     | `{ rowIndex, updates: { date?, amount?, description?, category? } }` | `200 { row }` | Yes |
| POST   | `/api/import/session/:id/skip`    | `{ rowIndex, skip: boolean }`                           | `200 { row }`               | Yes  |
| POST   | `/api/import/session/:id/confirm` | —                                                       | `200 { importedCount, skippedCount, history }` | Yes |
| GET    | `/api/import/history`             | —                                                       | `200 ImportHistory[]`       | Yes  |

### 6.5 CSV Import Pipeline

**File:** [backend/src/services/importService.ts](backend/src/services/importService.ts)

The import feature is a **stateful, multi-step wizard** with server-side session persistence:

```
Step 1: UPLOAD                    Step 2: MAPPING
─────────────────                 ──────────────────
Client reads file → POST         Client selects column    → POST mapping
/import/upload                    /import/session/:id/mapping
  ↓                                 ↓
detectDelimiter(csv)              Parse each row using mapping:
parseCsv(csv, delimiter)            parseDate(str) → YYYY-MM-DD
Extract headers + sample rows       parseAmount(str) → number
suggestMapping(headers)              matchCategory(str) → DB lookup
Store raw CSV in session             validateRow() → errors[]
  ↓                                 ↓
Return { structure,               Store parsedRows JSON in session
  suggestedMapping }              Return { parsedRows, validCount, invalidCount }


Step 3: PREVIEW                   Step 4: CONFIRM
──────────────────                ──────────────────
Client reviews parsed rows       POST /import/session/:id/confirm
Can PATCH individual rows          ↓
Can POST skip/unskip rows        Filter: !skipped && errors.length === 0
  ↓                                 ↓
Re-validates on each change      db.transaction:
Recalculates valid/invalid          INSERT each valid row → expenses
counts                              UPDATE session → 'completed'
                                    INSERT → import_history
                                  ↓
                                Return { importedCount, skippedCount }
```

**Smart features in the import service:**

| Feature                | Implementation                                                  |
| ---------------------- | --------------------------------------------------------------- |
| Delimiter detection    | Counts `,` `;` `\t` occurrences in first line                  |
| Quoted field parsing   | Handles `"fields with, commas"` and `""escaped quotes""`       |
| Header auto-mapping    | Keyword matching: `date/time/when`, `amount/price/cost`, etc.   |
| Date parsing           | Supports `YYYY-MM-DD`, `MM/DD/YYYY`, `DD-MM-YYYY`, `YYYY/MM/DD`, plus `new Date()` fallback |
| Amount parsing         | Strips `$€£`, handles `(negative)` parentheses notation         |
| Category matching      | Exact → partial → alias dictionary → falls back to "Other"     |
| Atomic import          | Knex transaction ensures all-or-nothing on confirm              |
| Session management     | Creating a new session auto-cancels any existing active session |

### 6.6 Validation

**Request validation** uses [Zod](https://zod.dev/) schemas defined inline in route files:

| Route File                                                  | Schemas                                                |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| [routes/auth.ts](backend/src/routes/auth.ts)                | `registerSchema` (email + password min 6), `loginSchema` |
| [routes/expenses.ts](backend/src/routes/expenses.ts)        | `createExpenseSchema` (all required), `updateExpenseSchema` (all optional) |
| [routes/import.ts](backend/src/routes/import.ts)            | `uploadSchema`, `mappingSchema`, `updateRowSchema`, `skipRowSchema` |

**Row-level validation** (import): [importService.ts `validateRow()`](backend/src/services/importService.ts) checks date presence, amount > 0, description non-empty.

---

## 7. Frontend Deep Dive

### 7.1 Entry Point & Providers

**File:** [frontend/src/main.tsx](frontend/src/main.tsx)

```
<React.StrictMode>
  <QueryClientProvider>          ← TanStack Query (staleTime: 60s, retry: 1)
    <BrowserRouter>              ← React Router
      <App />
    </BrowserRouter>
  </QueryClientProvider>
</React.StrictMode>
```

### 7.2 Routing & Auth Gate

**File:** [frontend/src/App.tsx](frontend/src/App.tsx)

The `App` component acts as an **authentication gate**:

```
Is loading?  → Show spinner
Not authed?  → Render <Login /> (full-page, no layout)
Authed?      → Render <Layout> with routes:
                 /          → <Dashboard />
                 /expenses  → <Expenses />
                 /import    → <Import />
                 *          → Redirect to /
```

### 7.3 Pages

| Page | File | Purpose | Key Hooks |
| ---- | ---- | ------- | --------- |
| **Login** | [Login.tsx](frontend/src/pages/Login.tsx) | Login/register toggle form with error display | Props from `useAuth` |
| **Dashboard** | [Dashboard.tsx](frontend/src/pages/Dashboard.tsx) | 3 stat cards (monthly spend, total count, average) + 5 recent expenses | `useExpenses`, `useMonthlyTotal` (current + previous month) |
| **Expenses** | [Expenses.tsx](frontend/src/pages/Expenses.tsx) | Full expense list with search, date filtering (presets + custom range), create/edit/delete modals | `useExpenses`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense` |
| **Import** | [Import.tsx](frontend/src/pages/Import.tsx) | Landing card with 3-step explainer + import history table + wizard launcher | `useImportHistory`, renders `<ImportWizard />` |

### 7.4 Components

| Component | File | Props | Description |
| --------- | ---- | ----- | ----------- |
| **Layout** | [Layout.tsx](frontend/src/components/Layout.tsx) | `children`, `onLogout` | Top nav bar with logo, nav links (Dashboard, Expenses, Import), logout button. Highlights active route. |
| **Modal** | [Modal.tsx](frontend/src/components/Modal.tsx) | `isOpen`, `onClose`, `title`, `children` | Backdrop overlay, Escape key handler, body scroll lock, close button |
| **ExpenseForm** | [ExpenseForm.tsx](frontend/src/components/ExpenseForm.tsx) | `onSubmit`, `onCancel`, `initialData?`, `isLoading?` | Category dropdown, amount, description, date inputs. Client-side validation. Supports create & edit modes. |
| **ExpenseList** | [ExpenseList.tsx](frontend/src/components/ExpenseList.tsx) | `expenses`, `onEdit`, `onDelete` | Renders expense rows with category icon, description, date, amount, edit/delete buttons. Empty state. |
| **CategoryIcon** | [CategoryIcon.tsx](frontend/src/components/CategoryIcon.tsx) | `icon`, `className?` | Maps icon string name → Lucide React component. Renders in indigo circle. |
| **ImportWizard** | [ImportWizard.tsx](frontend/src/components/ImportWizard.tsx) | `onComplete`, `onCancel` | **4-step wizard** with progress indicator. Contains sub-components: `UploadStep`, `MappingStep`, `PreviewStep`, `CompleteStep`. Manages full import lifecycle. |

### 7.5 Hooks (State & Data)

All data-fetching hooks use **TanStack Query v5** for caching, deduplication, and cache invalidation.

#### `useAuth` — [frontend/src/hooks/useAuth.ts](frontend/src/hooks/useAuth.ts)
- Manages auth state: `{ user, isAuthenticated, isLoading }`
- Bootstraps from `localStorage` on mount (`token` + `user` JSON)
- Provides `login`, `register` mutations and `logout` callback
- Stores token + user in `localStorage` on success

#### `useCategories` — [frontend/src/hooks/useCategories.ts](frontend/src/hooks/useCategories.ts)
- Query key: `['categories']`
- `staleTime: Infinity` — fetched once, never refetched (categories are static)

#### `useExpenses` — [frontend/src/hooks/useExpenses.ts](frontend/src/hooks/useExpenses.ts)
- `useExpenses(params?)` — query with search/date filters, key: `['expenses', params]`
- `useExpense(id)` — single expense query
- `useMonthlyTotal(year?, month?)` — monthly aggregation
- `useCreateExpense()` — mutation, invalidates `['expenses']` + `['monthly-total']`
- `useUpdateExpense()` — mutation, same invalidation
- `useDeleteExpense()` — mutation, same invalidation

#### `useImport` — [frontend/src/hooks/useImport.ts](frontend/src/hooks/useImport.ts)
- `useActiveSession()` — checks for resumable session
- `useImportHistory()` — history list
- `useCreateSession()`, `useCancelSession()` — session lifecycle
- `useUploadCsv()`, `useSaveMapping()` — wizard step mutations
- `useUpdateRow()`, `useSkipRow()` — row-level edits in preview
- `useConfirmImport()` — final import, invalidates expenses + monthly-total + import queries

### 7.6 API Client Layer

**File:** [frontend/src/api/client.ts](frontend/src/api/client.ts)

Central `apiRequest<T>()` function that:
- Prepends `/api` base path (Vite proxies to backend)
- Injects `Authorization: Bearer <token>` from `localStorage`
- Sets `Content-Type: application/json`
- Throws `ApiError` with status code and details on non-OK responses
- Returns `undefined` for `204 No Content`

Individual API modules mirror backend routes:
- [api/auth.ts](frontend/src/api/auth.ts) — `login()`, `register()`, `logout()`, `isAuthenticated()`
- [api/categories.ts](frontend/src/api/categories.ts) — `getCategories()`
- [api/expenses.ts](frontend/src/api/expenses.ts) — `getExpenses()`, `getExpense()`, `createExpense()`, `updateExpense()`, `deleteExpense()`, `getMonthlyTotal()`
- [api/import.ts](frontend/src/api/import.ts) — Full import session lifecycle (8 functions)

---

## 8. Data Flow Diagrams

### 8.1 Login Flow

```
Login.tsx                useAuth                   api/auth.ts          Backend
────────                ────────                   ───────────          ───────
onSubmit(email, pwd)
  → login({email, pwd})
      → authApi.login()
          → POST /api/auth/login ────────────────────────────────────→ Zod validate
                                                                       bcrypt.compare
                                                                       jwt.sign
          ← { user, token } ←────────────────────────────────────────
      localStorage.set('token')
      localStorage.set('user')
      setState({ isAuthenticated: true })
  ← App re-renders → shows Layout + Dashboard
```

### 8.2 Expense CRUD Flow

```
Expenses.tsx         useExpenses hooks        api/expenses.ts        Backend
────────────         ────────────────         ───────────────        ───────
Mount
  → useExpenses({ search, dateRange })
      → GET /api/expenses?search=&startDate=&endDate= ──────────→ authenticateToken
                                                                   expenseService.list()
      ← Expense[] ←──────────────────────────────────────────────  Knex join categories

Click "Add"
  → <Modal><ExpenseForm />
  → onSubmit(data)
      → createExpense.mutate(data)
          → POST /api/expenses ──────────────────────────────────→ Zod validate
                                                                   expenseService.create()
          ← 201 Expense ←────────────────────────────────────────
      → invalidateQueries(['expenses'], ['monthly-total'])
      ← UI updates automatically via TanStack Query
```

### 8.3 CSV Import Flow

```
Import.tsx  →  ImportWizard.tsx                     Backend importService.ts
                                                    ─────────────────────────
Step 1: Upload
  FileReader.readAsText(file)
  → POST /import/upload { fileName, csvContent }  → detectDelimiter, parseCsv
  ← { session, structure: { headers,              ← suggestMapping(headers)
     sampleRows, suggestedMapping } }

Step 2: Mapping
  User adjusts dropdowns
  → POST /import/session/:id/mapping              → Parse all rows with mapping
    { columnMapping }                                parseDate, parseAmount
  ← { parsedRows[], validCount, invalidCount }    ← matchCategory, validateRow

Step 3: Preview
  User reviews table
  → POST /import/session/:id/skip                 → Toggle row.skipped
    { rowIndex, skip }                               Recalculate counts
  ← { row }

Step 4: Confirm
  → POST /import/session/:id/confirm              → db.transaction:
  ← { importedCount, skippedCount, history }         INSERT expenses (valid only)
                                                      UPDATE session → completed
  → invalidateQueries(['expenses', 'monthly-total',   INSERT import_history
     'import-session', 'import-history'])
```

---

## 9. Key Design Patterns

| Pattern | Where | How |
| ------- | ----- | --- |
| **Three-layer architecture** | Backend | Routes → Services → DB. Routes handle HTTP, services handle logic, Knex handles SQL. |
| **Server state management** | Frontend | TanStack Query manages all server data with automatic caching, deduplication, and cache invalidation on mutations. |
| **Optimistic cache invalidation** | Frontend hooks | Every mutation invalidates relevant query keys (`['expenses']`, `['monthly-total']`) to trigger automatic refetch. |
| **Auth gate pattern** | [App.tsx](frontend/src/App.tsx) | Top-level component renders either Login or authenticated Layout based on auth state. No route guards needed. |
| **Token in localStorage** | Frontend | JWT stored in `localStorage`, injected in every API request by the centralized `apiRequest()` client. |
| **Wizard state machine** | Import feature | Import follows a linear `upload → mapping → preview → complete` flow with server-side session persistence. |
| **Zod schemas at the boundary** | Backend routes | Request bodies validated with Zod before reaching service layer. Errors return 400 with details. |
| **Category alias matching** | [importService.ts](backend/src/services/importService.ts) | Dictionary of aliases maps common terms (e.g., "groceries", "uber") to canonical category names. |
| **Atomic transactions** | Import confirm | `db.transaction()` wraps expense inserts + session update + history creation for all-or-nothing semantics. |
| **Proxy in development** | [vite.config.ts](frontend/vite.config.ts) | Vite dev server proxies `/api` requests to `http://localhost:3002`, avoiding CORS issues. |
| **Component composition** | Frontend | Pages compose reusable components (`Modal`, `ExpenseForm`, `ExpenseList`, `CategoryIcon`). |

---

## 10. Configuration & Tooling

### 10.1 Backend Configuration

| File | Purpose |
| ---- | ------- |
| [backend/tsconfig.json](backend/tsconfig.json) | `ES2022` target, `NodeNext` module resolution, strict mode, source maps |
| [backend/vitest.config.ts](backend/vitest.config.ts) | Node environment, tests in `tests/**/*.test.ts`, v8 coverage |
| [backend/src/db/knexfile.ts](backend/src/db/knexfile.ts) | `better-sqlite3` client, `data.db` in backend root, TS migrations & seeds |

### 10.2 Frontend Configuration

| File | Purpose |
| ---- | ------- |
| [frontend/tsconfig.json](frontend/tsconfig.json) | `ES2020` target, `react-jsx`, bundler resolution, `@/*` path alias, strict mode |
| [frontend/vite.config.ts](frontend/vite.config.ts) | React plugin, `@` alias → `./src`, dev server on `:5173`, `/api` proxy → `:3002` |
| [frontend/vitest.config.ts](frontend/vitest.config.ts) | jsdom environment, `@testing-library/jest-dom` setup, `@` alias |
| [frontend/tailwind.config.js](frontend/tailwind.config.js) | Content: `index.html` + `src/**/*.{js,ts,jsx,tsx}` |
| [frontend/postcss.config.js](frontend/postcss.config.js) | Tailwind CSS + Autoprefixer |

### 10.3 NPM Scripts

**Backend** ([backend/package.json](backend/package.json)):
| Script | Command | Purpose |
| ------ | ------- | ------- |
| `dev` | `tsx watch src/index.ts` | Dev server with hot reload |
| `build` | `tsc` | Compile TypeScript |
| `start` | `node dist/index.js` | Run compiled JS |
| `db:migrate` | `knex migrate:latest` | Run pending migrations |
| `db:rollback` | `knex migrate:rollback` | Rollback last migration batch |
| `db:seed` | `knex seed:run` | Seed database |
| `test` | `vitest` | Run tests in watch mode |
| `test:run` | `vitest run` | Run tests once |

**Frontend** ([frontend/package.json](frontend/package.json)):
| Script | Command | Purpose |
| ------ | ------- | ------- |
| `dev` | `vite` | Dev server on :5173 |
| `build` | `tsc && vite build` | Type-check + production build |
| `preview` | `vite preview` | Preview production build |
| `test` | `vitest` | Run tests in watch mode |
| `test:run` | `vitest run` | Run tests once |

---

## 11. Getting Started

```bash
# 1. Backend
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev              # → http://localhost:3002

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev              # → http://localhost:5173

# 3. Login
#    Email:    demo@example.com
#    Password: password123
```

---

## 12. File Index

Quick-reference sorted by function. Every file in the project.

### Backend — Server & Config
| File | Purpose |
| ---- | ------- |
| [backend/package.json](backend/package.json) | Dependencies and scripts |
| [backend/tsconfig.json](backend/tsconfig.json) | TypeScript configuration |
| [backend/vitest.config.ts](backend/vitest.config.ts) | Test runner configuration |
| [backend/src/index.ts](backend/src/index.ts) | Express app: middleware, routes, server start |
| [backend/src/logger.ts](backend/src/logger.ts) | Pino structured logger |

### Backend — Database
| File | Purpose |
| ---- | ------- |
| [backend/src/db/knex.ts](backend/src/db/knex.ts) | Knex singleton instance |
| [backend/src/db/knexfile.ts](backend/src/db/knexfile.ts) | Knex config (SQLite, paths) |
| [backend/src/db/migrations/001_initial.ts](backend/src/db/migrations/001_initial.ts) | Creates users, categories, expenses tables |
| [backend/src/db/migrations/002_import_sessions.ts](backend/src/db/migrations/002_import_sessions.ts) | Creates import_sessions, import_history tables |
| [backend/src/db/seeds/001_seed.ts](backend/src/db/seeds/001_seed.ts) | Seeds categories, demo user, sample expenses |

### Backend — Auth & Middleware
| File | Purpose |
| ---- | ------- |
| [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) | JWT verification middleware + token generation |

### Backend — Routes
| File | Purpose |
| ---- | ------- |
| [backend/src/routes/auth.ts](backend/src/routes/auth.ts) | POST /register, /login with Zod validation |
| [backend/src/routes/categories.ts](backend/src/routes/categories.ts) | GET /categories (public) |
| [backend/src/routes/expenses.ts](backend/src/routes/expenses.ts) | Full CRUD + monthly-total (protected) |
| [backend/src/routes/import.ts](backend/src/routes/import.ts) | Multi-step import wizard endpoints (protected) |

### Backend — Services
| File | Purpose |
| ---- | ------- |
| [backend/src/services/authService.ts](backend/src/services/authService.ts) | Register + login business logic |
| [backend/src/services/expenseService.ts](backend/src/services/expenseService.ts) | Expense CRUD + filtering + monthly totals |
| [backend/src/services/importService.ts](backend/src/services/importService.ts) | CSV parsing, mapping, validation, atomic import |

### Backend — Types
| File | Purpose |
| ---- | ------- |
| [backend/src/types/index.ts](backend/src/types/index.ts) | User, Category, Expense, JwtPayload + re-exports import types |
| [backend/src/types/import.ts](backend/src/types/import.ts) | ImportSession, ParsedRow, ColumnMapping, CsvStructure, etc. |

### Frontend — Config
| File | Purpose |
| ---- | ------- |
| [frontend/package.json](frontend/package.json) | Dependencies and scripts |
| [frontend/index.html](frontend/index.html) | SPA HTML shell |
| [frontend/tsconfig.json](frontend/tsconfig.json) | TypeScript configuration |
| [frontend/tsconfig.node.json](frontend/tsconfig.node.json) | TS config for Vite config file |
| [frontend/vite.config.ts](frontend/vite.config.ts) | Vite: React, proxy, aliases |
| [frontend/vitest.config.ts](frontend/vitest.config.ts) | Test runner configuration |
| [frontend/postcss.config.js](frontend/postcss.config.js) | PostCSS plugins |
| [frontend/tailwind.config.js](frontend/tailwind.config.js) | Tailwind content paths |

### Frontend — App Shell
| File | Purpose |
| ---- | ------- |
| [frontend/src/main.tsx](frontend/src/main.tsx) | React root with QueryClient + BrowserRouter |
| [frontend/src/App.tsx](frontend/src/App.tsx) | Auth gate + route definitions |
| [frontend/src/index.css](frontend/src/index.css) | Tailwind directives + body styles |

### Frontend — API Client
| File | Purpose |
| ---- | ------- |
| [frontend/src/api/client.ts](frontend/src/api/client.ts) | Centralized fetch wrapper with auth + error handling |
| [frontend/src/api/auth.ts](frontend/src/api/auth.ts) | Auth API calls + localStorage token management |
| [frontend/src/api/categories.ts](frontend/src/api/categories.ts) | Category fetch |
| [frontend/src/api/expenses.ts](frontend/src/api/expenses.ts) | Expense CRUD + monthly-total API calls |
| [frontend/src/api/import.ts](frontend/src/api/import.ts) | Full import session API (8 functions) |

### Frontend — Hooks
| File | Purpose |
| ---- | ------- |
| [frontend/src/hooks/useAuth.ts](frontend/src/hooks/useAuth.ts) | Auth state + login/register/logout |
| [frontend/src/hooks/useCategories.ts](frontend/src/hooks/useCategories.ts) | Categories query (cached indefinitely) |
| [frontend/src/hooks/useExpenses.ts](frontend/src/hooks/useExpenses.ts) | Expenses queries + CRUD mutations |
| [frontend/src/hooks/useImport.ts](frontend/src/hooks/useImport.ts) | Import session, upload, mapping, confirm mutations |

### Frontend — Components
| File | Purpose |
| ---- | ------- |
| [frontend/src/components/Layout.tsx](frontend/src/components/Layout.tsx) | App shell: nav bar + content area |
| [frontend/src/components/Modal.tsx](frontend/src/components/Modal.tsx) | Reusable modal dialog |
| [frontend/src/components/ExpenseForm.tsx](frontend/src/components/ExpenseForm.tsx) | Create/edit expense form |
| [frontend/src/components/ExpenseList.tsx](frontend/src/components/ExpenseList.tsx) | Expense list with actions |
| [frontend/src/components/CategoryIcon.tsx](frontend/src/components/CategoryIcon.tsx) | Icon string → Lucide component |
| [frontend/src/components/ImportWizard.tsx](frontend/src/components/ImportWizard.tsx) | 4-step import wizard |

### Frontend — Pages
| File | Purpose |
| ---- | ------- |
| [frontend/src/pages/Login.tsx](frontend/src/pages/Login.tsx) | Login/register form |
| [frontend/src/pages/Dashboard.tsx](frontend/src/pages/Dashboard.tsx) | Stats + recent expenses |
| [frontend/src/pages/Expenses.tsx](frontend/src/pages/Expenses.tsx) | Full expense management |
| [frontend/src/pages/Import.tsx](frontend/src/pages/Import.tsx) | Import landing + history |

### Frontend — Types & Tests
| File | Purpose |
| ---- | ------- |
| [frontend/src/types/index.ts](frontend/src/types/index.ts) | All frontend TypeScript interfaces |
| [frontend/tests/setup.ts](frontend/tests/setup.ts) | Test setup (@testing-library/jest-dom) |
