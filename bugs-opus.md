# Bug Report — Expense Tracker

Analyzed on: 2026-02-09

---

## 1. Hardcoded JWT Secret in Production

**Priority:** 🔴 Critical
**Probability:** 95% — will happen in any deployment where `JWT_SECRET` env var is not set

**Description:**
The JWT secret in `backend/src/middleware/auth.ts` defaults to `'your-secret-key-change-in-production'`. If the environment variable `JWT_SECRET` is not set (which is likely since there is no `.env` file, no `.env.example`, and no documentation about it), all tokens are signed with a publicly-visible secret, allowing anyone to forge authentication tokens for any user.

**Code trace:**
`backend/src/middleware/auth.ts` line 6:
```ts
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```
This value is used in `generateToken` and `authenticateToken`. An attacker who reads the source code can create arbitrary JWTs.

**Steps to reproduce:**
1. Deploy the application without setting `JWT_SECRET`.
2. Craft a JWT with `{ userId: 1, email: "demo@example.com" }` signed with `'your-secret-key-change-in-production'`.
3. Use the forged token to access any authenticated endpoint.

---

## 2. Categories Endpoint Has No Authentication

**Priority:** 🔴 Critical
**Probability:** 100% — this is deterministic from reading the code

**Description:**
The `/api/categories` route does not use the `authenticateToken` middleware, meaning anyone — including unauthenticated users — can fetch all categories. While categories are not user-specific data, this is an information leak and violates the principle of least privilege in a system where all other data endpoints are authenticated.

**Code trace:**
`backend/src/routes/categories.ts` — the router never calls `authenticateToken`:
```ts
router.get('/', async (_req: Request, res: Response) => {
  const categories = await db('categories').select<Category[]>('*');
  res.json(categories);
});
```
Compare with `backend/src/routes/expenses.ts` line 29: `router.use(authenticateToken);`

**Steps to reproduce:**
1. Without logging in, send `GET /api/categories`.
2. Observe that categories are returned without any authentication.

---

## 3. SQL Injection via Search Parameter (LIKE with unescaped user input)

**Priority:** 🔴 Critical
**Probability:** 70% — exploitable in SQLite; the `%` and `_` wildcards in user input can cause unexpected matches, and depending on the driver, deeper injection may be possible

**Description:**
The `search` parameter in `expenseService.listExpenses` is interpolated directly into a `LIKE` pattern without escaping SQL wildcard characters (`%`, `_`). While Knex parameterizes the value (preventing classic SQL injection), the `%` wrapping allows users to inject LIKE wildcards to match unintended data.

**Code trace:**
`backend/src/services/expenseService.ts` line 57:
```ts
query = query.where('expenses.description', 'like', `%${search}%`);
```
If `search` = `%`, this becomes `LIKE '%%%'` which matches everything. Users can use `_` to match single characters and craft pattern-based data extraction.

**Steps to reproduce:**
1. Log in and create expenses with various descriptions.
2. Search with `search=_` — matches all expenses with at least 1 character in description.
3. Search with `search=%` — matches all expenses.

---

## 4. Monthly Total Endpoint Calculates Wrong End-of-Month Date

**Priority:** 🟠 High
**Probability:** 90% — happens every month depending on server timezone

**Description:**
In `getMonthlyTotal`, the end date is calculated using `new Date(year, month, 0).toISOString().split('T')[0]`. The `toISOString()` method outputs in UTC. If the server is in a timezone ahead of UTC (e.g., UTC+5), midnight local time on the last day of the month is actually the *previous day* in UTC. This causes the last day of the month to be excluded from the total. Conversely, servers behind UTC may include a day from the next month.

**Code trace:**
`backend/src/services/expenseService.ts` lines 103-104:
```ts
const endDate = new Date(year, month, 0).toISOString().split('T')[0];
```
`new Date(2026, 2, 0)` creates `Feb 28, 2026 00:00:00` in local time. If the server is UTC+5, `toISOString()` returns `2026-02-27T19:00:00.000Z`, so `endDate` becomes `2026-02-27`, missing the last day of the month.

**Steps to reproduce:**
1. Set server timezone to a positive UTC offset (e.g., `TZ=Asia/Kolkata`).
2. Create an expense dated on the last day of a month (e.g., `2026-01-31`).
3. Query monthly total for January 2026.
4. Observe the expense on the 31st is not included in the total.

---

## 5. Date Parsing in ExpenseList Produces Off-by-One Day

**Priority:** 🟠 High
**Probability:** 85% — depends on the user's browser timezone

**Description:**
The `formatDate` function in `ExpenseList.tsx` creates a `Date` object from a date string like `"2026-01-15"`. When parsed as `new Date("2026-01-15")`, JavaScript treats this as UTC midnight. In timezones behind UTC (e.g., US timezones), this becomes the *previous day* in local time, so the displayed date is one day earlier than the actual expense date.

**Code trace:**
`frontend/src/components/ExpenseList.tsx` lines 74-78:
```ts
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```
For a user in US Eastern (UTC-5), `new Date("2026-01-15")` = `Jan 14, 2026 19:00 EST`, so `toLocaleDateString` outputs `"Jan 14, 2026"` instead of `"Jan 15, 2026"`.

**Steps to reproduce:**
1. Use the app from a US timezone browser.
2. Create an expense with date `2026-01-15`.
3. View the expense list — it displays `Jan 14, 2026`.

---

## 6. `knexfile.ts` Uses `__dirname` Which Is Undefined in ESM

**Priority:** 🟠 High
**Probability:** 75% — depends on how the project is run (tsx may polyfill it, but native ESM will break)

**Description:**
The knexfile uses `__dirname` (a CommonJS global) but the project uses TypeScript with likely ESM compilation. If the compiled output runs as ESM (or if `tsx` changes behavior), `__dirname` will be `undefined`, causing database file path resolution to fail and the app to crash on startup.

**Code trace:**
`backend/src/db/knexfile.ts` lines 6-7:
```ts
connection: {
  filename: path.join(__dirname, '../../data.db'),
},
```
The `tsconfig.json` and build setup determine whether `__dirname` is available. In ESM, `__dirname` is not defined; `import.meta.url` should be used instead.

**Steps to reproduce:**
1. Build the backend with `tsc` and run with `node --experimental-specifier-resolution=node dist/index.js`.
2. The app crashes with `ReferenceError: __dirname is not defined`.

---

## 7. Token Expiry Not Validated on Frontend — Stale Auth State

**Priority:** 🟠 High
**Probability:** 80% — happens every 24 hours for active users

**Description:**
JWT tokens expire after 24 hours (set in `auth.ts` middleware), but the frontend never checks token expiry. The `useAuth` hook checks only if `token` exists in `localStorage`, not whether it's still valid. After 24 hours, all API requests will fail with 403, but the UI still shows the user as authenticated. The user sees broken data/errors instead of being redirected to login.

**Code trace:**
`frontend/src/hooks/useAuth.ts` lines 22-30: only checks `localStorage.getItem('token')` existence.
`frontend/src/api/client.ts` — the `apiRequest` function throws `ApiError` on 401/403, but nothing in the app catches these to trigger a logout.

**Steps to reproduce:**
1. Log in and leave the app open for 24+ hours.
2. Try to navigate or create an expense.
3. API calls fail with 403 but the UI still shows logged-in state.
4. User must manually clear storage or know to re-login.

---

## 8. `updateExpense` Does Not Verify `categoryId` Exists

**Priority:** 🟡 Medium
**Probability:** 60% — happens if user sends a crafted request with an invalid categoryId

**Description:**
When creating or updating an expense, the backend validates that `categoryId` is a positive integer, but never checks that the category actually exists in the `categories` table. Due to the foreign key constraint in SQLite, this will cause an unhandled database error (500) instead of a clean validation error (400).

**Code trace:**
`backend/src/services/expenseService.ts` `createExpense` function:
```ts
const [id] = await db('expenses').insert(params);
```
No check for category existence. The `categories` table FK constraint (`001_initial.ts` line 23) will cause a SQLite constraint violation error.

**Steps to reproduce:**
1. Log in and send `POST /api/expenses` with `categoryId: 999`.
2. Receive a 500 Internal Server Error instead of a descriptive 400 error.

---

## 9. Dashboard "Total Expenses" Shows Count of Current Page, Not All Expenses

**Priority:** 🟡 Medium
**Probability:** 90% — happens when user has more than 50 expenses

**Description:**
The Dashboard uses `useExpenses()` with no params, which calls `listExpenses` with the default `limit: 50`. The dashboard then displays `expenses.length` as "Total Expenses" count. When a user has more than 50 expenses, it will always show 50 instead of the real total.

**Code trace:**
`frontend/src/pages/Dashboard.tsx` line 21: `const totalExpenses = expenses?.length || 0;`
`backend/src/services/expenseService.ts` line 38: `limit = 50`

The backend doesn't return a total count alongside the paginated results, so the frontend has no way to know the real total.

**Steps to reproduce:**
1. Create more than 50 expenses (e.g., via CSV import).
2. Go to the Dashboard.
3. "Total Expenses" shows `50` instead of the actual count.

---

## 10. Dashboard Average Calculation Uses Only Fetched (max 50) Expenses

**Priority:** 🟡 Medium
**Probability:** 90% — same trigger as bug #9

**Description:**
The "Avg per Expense" stat on the Dashboard calculates the average using `expenses.reduce(...)` / `expenses.length`, but `expenses` is capped at 50 rows by the backend default limit. This gives an inaccurate average once the user has more than 50 expenses.

**Code trace:**
`frontend/src/pages/Dashboard.tsx` lines 105-107:
```ts
(expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length).toFixed(2)
```

**Steps to reproduce:**
1. Import 100+ expenses with varying amounts.
2. Dashboard "Avg per Expense" reflects only the 50 most recent expenses.

---

## 11. CSV Import `DD-MM-YYYY` Date Format Ambiguity with `MM/DD/YYYY`

**Priority:** 🟡 Medium
**Probability:** 65% — happens when importing dates like `01-02-2026` which could be Jan 2 or Feb 1

**Description:**
The date parser checks patterns in order: `YYYY-MM-DD`, `MM/DD/YYYY`, `DD-MM-YYYY`, `YYYY/MM/DD`. A date like `05-03-2026` matches `DD-MM-YYYY` (March 5) but the user might intend `MM-DD-YYYY` (May 3). The `DD-MM-YYYY` pattern uses `-` delimiter and `MM/DD/YYYY` uses `/`, which helps, but if a CSV has `MM-DD-YYYY` format (common in US exports), dates will be silently misinterpreted — the month and day will be swapped.

**Code trace:**
`backend/src/services/importService.ts` lines 29-34:
```ts
const DATE_PATTERNS = [
  { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
  { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
  { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY' },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
];
```
A date `03-15-2026` (US format March 15) matches `DD-MM-YYYY` and becomes `2026-15-03` — an invalid date. Worse, `03-05-2026` silently becomes `2026-05-03` (May 3) when the user meant March 5.

**Steps to reproduce:**
1. Create a CSV with a date column using `MM-DD-YYYY` format (e.g., `03-05-2026`).
2. Import via the wizard.
3. The date is silently misinterpreted as `2026-05-03` (May 3) instead of `2026-03-05` (March 5).

---

## 12. Negative Expense Amounts Are Silently Rejected

**Priority:** 🟡 Medium
**Probability:** 60% — common in bank exports where negative = expense

**Description:**
CSV imports of bank statements often have negative amounts for expenses (debits). The `parseAmount` function correctly parses negative numbers and parenthesized negatives, but the `validateRow` function rejects any amount ≤ 0. There's no way for the user to fix this during the preview step because the amount validation happens server-side and the import wizard doesn't support inline editing of row values.

**Code trace:**
`backend/src/services/importService.ts` line 185:
```ts
} else if (row.amount <= 0) {
  errors.push({ field: 'amount', message: 'Amount must be greater than zero' });
}
```
The frontend `ImportWizard.tsx` has no inline row editing UI — only skip/unskip.

**Steps to reproduce:**
1. Import a bank CSV where expenses are negative (e.g., `-50.00`).
2. All rows with negative amounts show as "Invalid" in the preview.
3. The user has no way to fix them in the UI; they can only skip.

---

## 13. `getActiveSession` Query Returns Stale Sessions from Different Uploads

**Priority:** 🟡 Medium
**Probability:** 50% — happens if a user abandons an upload mid-flow and starts again via the API directly

**Description:**
`uploadCsv` calls `getActiveSession` and reuses an existing session if one is found. If a user previously started an import that is in "mapping" or "preview" status and then tries to upload a new CSV, it overwrites the old session's data but resets the status to "upload" — however, the old `parsedRows` and `columnMapping` are not cleared. This can cause stale data to persist in the session.

**Code trace:**
`backend/src/services/importService.ts` `uploadCsv` function (lines 271-302):
```ts
let session = await getActiveSession(userId);
if (!session) {
  session = await createSession(userId);
}
// Updates fileName, fileSize, rawCsvData, status='upload'
// Does NOT clear columnMapping or parsedRows
```

**Steps to reproduce:**
1. Start an import and get to the "preview" step.
2. Go back and upload a different CSV file.
3. The session retains old `parsedRows` and `columnMapping` from the previous file.
4. If the user resumes the session via `GET /import/session`, they see stale preview data.

---

## 14. `parseAmount` Does Not Handle Comma as Decimal Separator

**Priority:** 🟡 Medium
**Probability:** 50% — happens for European CSV files

**Description:**
The `parseAmount` function strips commas entirely (treating them as thousands separators), but in European CSV exports, commas are decimal separators (e.g., `12,50` means €12.50). The function converts `12,50` to `1250.00`.

**Code trace:**
`backend/src/services/importService.ts` line 150:
```ts
const cleaned = amountStr.replace(/[$\u20AC\u00A3\s,]/g, '').trim();
```
The comma in `12,50` is stripped → `1250` → parsed as `1250.00`.

**Steps to reproduce:**
1. Create a CSV with European-formatted amounts (e.g., `12,50`).
2. Import via the wizard.
3. The amount is parsed as `1250` instead of `12.50`.

---

## 15. No CORS Origin Restriction

**Priority:** 🟡 Medium
**Probability:** 40% — exploitable if the app is deployed on a public domain

**Description:**
The backend uses `cors()` with no options, which allows requests from any origin. This means a malicious website can make authenticated API requests on behalf of a logged-in user (if the user visits the attacker's site while authenticated), potentially reading their expense data or creating/deleting expenses.

**Code trace:**
`backend/src/index.ts` line 12:
```ts
app.use(cors());
```
This sets `Access-Control-Allow-Origin: *` for all responses.

**Steps to reproduce:**
1. Deploy the app at `https://expense-tracker.example.com`.
2. Visit a malicious page at `https://evil.example.com` that makes fetch requests to the API.
3. The browser allows the cross-origin request because `CORS` is unrestricted.
4. (Note: `Authorization` header with bearer token must be present — this requires the attacker to have access to the token or combine with XSS.)

---

## 16. Login/Registration Errors Not Cleared When Switching Modes

**Priority:** 🟢 Low
**Probability:** 85% — easy to reproduce

**Description:**
On the Login page, if a user triggers a login error (e.g., wrong password) and then switches to Register mode, the login error remains visible until a successful register or another login attempt. The error messages from the mutations are not reset when toggling between login and register modes.

**Code trace:**
`frontend/src/pages/Login.tsx` line 36:
```ts
const error = isRegisterMode ? registerError : loginError;
```
This switches which error is shown, so the old error does get hidden on mode switch. However, switching back reveals the stale error again. The mutations are never `reset()`.

**Steps to reproduce:**
1. Enter wrong credentials on the login form.
2. See the error message.
3. Switch to Register mode — error disappears (correct).
4. Switch back to Login mode — the old stale error reappears.

---

## 17. Dashboard Delete Handler Is a No-Op

**Priority:** 🟢 Low
**Probability:** 100% — deterministic from code

**Description:**
On the Dashboard, the `onDelete` callback passed to `ExpenseList` is `() => {}` — a no-op function. If a user clicks the delete button (trash icon) on a recent expense from the Dashboard, nothing happens. There's no feedback that deletion is unavailable from this view.

**Code trace:**
`frontend/src/pages/Dashboard.tsx` line 118:
```ts
<ExpenseList
  expenses={recentExpenses}
  onEdit={onEditExpense}
  onDelete={() => {}}
/>
```
The `ExpenseList` component renders the delete button, which calls this empty function.

**Steps to reproduce:**
1. Go to the Dashboard.
2. Click the trash icon on any recent expense.
3. Nothing happens — no deletion, no error, no feedback.

---

## 18. Import Session Resume Doesn't Restore Wizard State

**Priority:** 🟢 Low
**Probability:** 70% — happens when user refreshes during import

**Description:**
The `GET /import/session` endpoint supports resuming an active import session, but the frontend `ImportWizard` component maintains wizard state (step, session, structure, parsedRows) in local React state only. If the user refreshes the page mid-import, the wizard starts from the "upload" step even though a session with parsed data exists on the server. The `useActiveSession` hook exists but the `ImportWizard` never uses it.

**Code trace:**
`frontend/src/components/ImportWizard.tsx` line 29: `const [currentStep, setCurrentStep] = useState<WizardStep>('upload');`
The wizard always starts at "upload" and never checks for an existing server-side session.

**Steps to reproduce:**
1. Start a CSV import and reach the "preview" step.
2. Refresh the browser.
3. Navigate back to the Import page and click "Start Import".
4. The wizard starts from "Upload" instead of resuming at "Preview".

---

## 19. No Pagination UI — Users Cannot See Beyond 50 Expenses

**Priority:** 🟢 Low
**Probability:** 80% — happens once user exceeds 50 expenses

**Description:**
The backend supports pagination via `limit` and `offset` parameters, but the frontend never sends pagination params and has no pagination UI (no "next page" button, infinite scroll, etc.). Users with more than 50 expenses can never see their older expenses.

**Code trace:**
`frontend/src/api/expenses.ts` `getExpenses` — never sends `limit` or `offset`.
`backend/src/services/expenseService.ts` line 38: `limit = 50` (default).

**Steps to reproduce:**
1. Create more than 50 expenses.
2. Go to the Expenses page.
3. Only the 50 most recent are shown, with no way to see the rest.

---

## 20. `amount` Field Stored as `decimal(10,2)` but Validated as Any Positive Float

**Priority:** 🟢 Low
**Probability:** 30% — only if user enters very precise amounts

**Description:**
The Zod schema validates `amount` as `z.number().positive()` with no precision constraint, but the database stores it as `decimal(10,2)`. Amounts with more than 2 decimal places (e.g., `10.999`) will be silently rounded by the database, causing a mismatch between what the user entered and what's stored.

**Code trace:**
`backend/src/routes/expenses.ts` line 14: `amount: z.number().positive()`
`backend/src/db/migrations/001_initial.ts` line 24: `table.decimal('amount', 10, 2)`

**Steps to reproduce:**
1. Create an expense with amount `10.999`.
2. The API accepts it (Zod passes).
3. The database stores `11.00` (rounded).
4. When retrieved, the amount differs from what was submitted.
