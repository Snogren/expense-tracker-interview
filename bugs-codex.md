# Bug Report (Codex)

Ordered by priority, then probability.

---

## 1) Expense list can crash due to `amount` type mismatch
**Description:** The database stores `amount` as a DECIMAL, which SQLite commonly returns as a string. The UI calls `toFixed` on `expense.amount`, which throws if it is a string, causing the Expenses page to crash.

**Steps to reproduce:**
1. Create an expense with any amount.
2. Reload the Expenses page.
3. If the driver returns `amount` as a string, the list render throws `TypeError: expense.amount.toFixed is not a function`.

**Trace (why it happens):**
- `amount` is defined as DECIMAL in the schema: [backend/src/db/migrations/001_initial.ts](backend/src/db/migrations/001_initial.ts#L17-L23).
- The UI assumes `amount` is a number and calls `toFixed`: [frontend/src/components/ExpenseList.tsx](frontend/src/components/ExpenseList.tsx#L37-L40).

**Priority:** P1 (High)
**Probability:** 0.60

---

## 2) Invalid `categoryId` yields 500 instead of a 4xx
**Description:** The API accepts any positive `categoryId` without verifying it exists. An invalid ID violates the foreign key constraint and results in an internal server error.

**Steps to reproduce:**
1. Call `POST /api/expenses` with `categoryId` set to a non-existent value (e.g., 9999).
2. Observe a 500 response from the server.

**Trace (why it happens):**
- Request validation only checks for positive integers, not existence: [backend/src/routes/expenses.ts](backend/src/routes/expenses.ts#L12-L17).
- The insert is executed without category validation: [backend/src/services/expenseService.ts](backend/src/services/expenseService.ts#L76-L79).
- The schema enforces a foreign key: [backend/src/db/migrations/001_initial.ts](backend/src/db/migrations/001_initial.ts#L18-L21).

**Priority:** P2 (Medium)
**Probability:** 0.35

---

## 3) Auth state remains “logged in” after token expiry
**Description:** The backend issues tokens that expire after 24 hours, but the frontend trusts localStorage without validating token freshness. After expiry, the UI still shows as authenticated while API calls fail with 403.

**Steps to reproduce:**
1. Log in and keep the app open for more than 24 hours (or manually replace the token with an expired JWT).
2. Refresh the page; the UI still shows as logged in.
3. Trigger any API call; it returns 403.

**Trace (why it happens):**
- Tokens expire after 24h: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts#L28-L29).
- Client marks authenticated based only on localStorage values: [frontend/src/hooks/useAuth.ts](frontend/src/hooks/useAuth.ts#L19-L31).

**Priority:** P2 (Medium)
**Probability:** 0.50

---

## 4) Dates can display one day off in non-UTC time zones
**Description:** The UI parses `YYYY-MM-DD` using `new Date(dateString)`, which is interpreted as UTC. In negative offsets (e.g., America/Los_Angeles), the displayed day can shift back by one.

**Steps to reproduce:**
1. Create an expense with date `2024-01-01`.
2. View the Expenses list in a timezone behind UTC (e.g., PST).
3. The date may display as `Dec 31, 2023`.

**Trace (why it happens):**
- Date parsing uses `new Date(dateString)` and local formatting: [frontend/src/components/ExpenseList.tsx](frontend/src/components/ExpenseList.tsx#L66-L72).

**Priority:** P2 (Medium)
**Probability:** 0.45

---

## 5) CSV import accepts impossible calendar dates
**Description:** If a CSV date matches a known pattern (e.g., `YYYY-MM-DD`), it is accepted without validating calendar correctness. This allows impossible dates (like `2024-02-30`) to be imported as valid.

**Steps to reproduce:**
1. Upload a CSV containing a date such as `2024-02-30`.
2. Map columns and proceed to preview; the row is marked valid.
3. Confirm import; the invalid date is stored.

**Trace (why it happens):**
- Pattern matches return the string without verifying actual calendar validity: [backend/src/services/importService.ts](backend/src/services/importService.ts#L114-L141).
- Validation only checks presence, not correctness: [backend/src/services/importService.ts](backend/src/services/importService.ts#L191-L207).

**Priority:** P2 (Medium)
**Probability:** 0.40

---

## 6) Import “skipped” count includes invalid rows
**Description:** The import result’s `skippedCount` is computed as `total - imported`, which includes invalid rows even if the user didn’t explicitly skip them. This misreports skipped counts in the completion view and history.

**Steps to reproduce:**
1. Import a CSV with some invalid rows (e.g., missing amount).
2. Do not manually skip them; only valid rows are imported.
3. The completion screen/history shows “skipped” including invalid rows.

**Trace (why it happens):**
- Skipped count is derived from total rows minus imported: [backend/src/services/importService.ts](backend/src/services/importService.ts#L547-L560).
- The same value is stored in history as `skippedRows`: [backend/src/services/importService.ts](backend/src/services/importService.ts#L584-L590).

**Priority:** P3 (Low)
**Probability:** 0.60
