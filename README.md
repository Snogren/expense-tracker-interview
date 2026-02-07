Well, this didn't go as I hoped.

I thought the initial exploration was strong, I found good bugs, and created a good working system model. I also displayed some AI techniques I've learned. But then, I handed off too much to the AI to create all at once, and then had to deal with slop. By the time I realized my error, and wished to start over and create the tests in smaller pieces, I had already spent 1 hour and 40 minutes. 

What really threw me was during testing, I found a bug where registering new users, and then logging in as a previous user, was just showing the expenses of the newly created user. However the playwright automation couldn't reproduce the bug.

In short, these tests do NOT reflect my best work, in fact I wouldn't call them my work at all. I took a risk and it didn't work, but I've learned a lot from it. What I hope you'll see value in is my exploration/modeling and AI prompting and techniques, which most of the time produce better results.

# Expense Tracker - Interview Exercise

A simple expense tracking application built with React, TypeScript, Node.js, and SQLite.

<img width="1058" height="635" alt="image" src="https://github.com/user-attachments/assets/74719286-c2ba-4d6a-91a7-21920cd9021a" />

## Project Structure

```
expense-tracker-interview/
├── backend/          # Node.js + Express + Knex API
├── frontend/         # React + Vite + TanStack Query
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd backend
npm install
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed with sample data
npm run dev           # Start dev server on http://localhost:3002
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev           # Start dev server on http://localhost:5173
```

### Test Accounts

After seeding, you can login with:
- Email: `demo@example.com`
- Password: `password123`

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Knex.js (query builder)
- SQLite (database)
- JWT (authentication)

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query (data fetching)
- Tailwind CSS (styling)

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Expenses
- `GET /api/expenses` - List user's expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - List all categories
