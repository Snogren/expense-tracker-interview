# Bug Report - Expense Tracker Application

## 1. Hardcoded JWT Secret (Critical Security Vulnerability)

**Description:**
The application uses a hardcoded fallback secret (`'your-secret-key-change-in-production'`) in `backend/src/middleware/auth.ts` when the `JWT_SECRET` environment variable is not set. If this application is deployed without explicitly setting the environment variable, anyone knowing this default secret can generate valid JWT tokens and take over any user account.

**Steps to Reproduce:**
1. Start the backend server without setting `JWT_SECRET`.
2. Generate a JWT token using the string `'your-secret-key-change-in-production'` as the secret and any payload (e.g., `{ userId: 1, email: 'admin@example.com' }`).
3. Use this token to make a request to any protected endpoint (e.g., `GET /api/expenses`).
4. The request will be successfully authenticated.

**Analysis:**
- **File:** `backend/src/middleware/auth.ts`
- **Code:** `const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';`
- **Impact:** Complete system compromise.

**Priority:** Critical
**Probability:** High

---

## 2. Denial of Service via Large CSV Import

**Description:**
The import service reads the entire content of uploaded CSV files into memory as a string and then splits it into an array of lines. The endpoint allows files up to 10MB (`express.json({ limit: '10mb' })`). Processing a 10MB CSV file synchronously on the main event loop will block the Node.js process, preventing it from handling other requests. A malicious user could send multiple concurrent large requests to crash the server or make it unresponsive.

**Steps to Reproduce:**
1. Create a 10MB CSV file with many simple rows.
2. Send a `POST /api/import/upload` request with this file content.
3. Observe the server's CPU usage and response time for other requests.
4. The server will hang or possibly crash with an Out of Memory error or simply time out other clients.

**Analysis:**
- **File:** `backend/src/services/importService.ts`
- **Code:** `const lines = content.split(/\r?\n/).filter(line => line.trim());`
- **Impact:** Server unavailability.

**Priority:** High
**Probability:** Medium

---

## 3. Custom CSV Parser Logic Failure

**Description:**
The custom CSV parsing logic incorrectly splits the file content by newlines before parsing quoted fields. If a CSV field contains a newline character (which is valid in CSVs), the parser will treat it as a new row, corrupting the data and likely causing the import to fail or import incorrect data.

**Steps to Reproduce:**
1. Create a CSV file with the following content:
   ```csv
   date,amount,description
   2023-01-01,10.00,"Lunch\nwith team"
   ```
2. Upload this file via the Import features.
3. The parser will split "Lunch" and "with team"" into separate lines.
4. The import will fail or create two malformed rows.

**Analysis:**
- **File:** `backend/src/services/importService.ts`
- **Code:** `const lines = content.split(/\r?\n/).filter(line => line.trim());` happens *before* `parseCsvLine` handles quotes.
- **Impact:** Data corruption and inability to import valid CSV files.

**Priority:** High
**Probability:** Medium

---

## 4. Timezone Offset Data Integrity Issue

**Description:**
When creating an expense, the frontend defaults the date to `new Date().toISOString().split('T')[0]`. `toISOString()` returns the date in UTC. For users in timezones "behind" UTC (e.g., US/Americas), this often results in the default date being "tomorrow" if it is late in the evening. This causes expenses to be saved with the wrong date unless manually corrected.

**Steps to Reproduce:**
1. set system time to 8:00 PM PST (UTC is 4:00 AM next day).
2. Open the "Add Expense" form.
3. Observe the "Date" field. It will show tomorrow's date.
4. Save the expense without changing the date.

**Analysis:**
- **File:** `frontend/src/components/ExpenseForm.tsx`
- **Code:** `date: initialData?.date || new Date().toISOString().split('T')[0]`
- **Impact:** Incorrect data entry.

**Priority:** Medium
**Probability:** High

---

## 5. Weak Password Security (No Complexity Requirements)

**Description:**
There is no validation for password length or complexity during registration. A user can register with a 1-character password. While bcrypt is used for storage, allowing weak passwords makes the system vulnerable to brute-force attacks on specific accounts.

**Steps to Reproduce:**
1. Send a POST request to `/api/auth/register` with `{ email: "test@test.com", password: "1" }`.
2. The account is created successfully.

**Analysis:**
- **File:** `backend/src/services/authService.ts` (and likely router)
- **Code:** No validation logic present for password string.
- **Impact:** Weak account security.

**Priority:** Medium
**Probability:** High

---

## 6. Unhandled Invalid Category ID in Expense Creation

**Description:**
The `createExpense` endpoint validates that `categoryId` is a positive integer but does not check if the category actually exists before attempting the database insertion. If an invalid ID is sent, the database throws a foreign key constraint error, which results in a generic 500 Internal Server Error instead of a helpful 400 Bad Request message.

**Steps to Reproduce:**
1. Authenticate as a user.
2. Send a POST request to `/api/expenses` with `categoryId: 99999` (assuming this ID doesn't exist).
3. The server responds with 500 Internal Server Error.

**Analysis:**
- **File:** `backend/src/routes/expenses.ts`
- **Impact:** Bad API user experience and error log noise.

**Priority:** Low
**Probability:** Low

---

## 7. Search Wildcard Abuse

**Description:**
The expense search functionality uses the `LIKE` operator with the user's input wrapped in wildcards: `%${search}%`. It does not escape wildcard characters (`%` or `_`) in the user input. A user searching for `%` will return all records, which could be unintended behavior, although Knex prevents SQL injection, logic abuse is possible.

**Steps to Reproduce:**
1. Call `GET /api/expenses?search=%`
2. All expenses are returned, ignoring other filtering intent if combined incorrectly (though here it's just a substring match). More problematic: searching for "50%" (literal) will technically work but searching for `_` will match any single character.

**Analysis:**
- **File:** `backend/src/services/expenseService.ts`
- **Code:** `query.where('expenses.description', 'like', \`%${search}%\`);`
- **Impact:** Minor logic bug.

**Priority:** Low
**Probability:** Low
