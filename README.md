# Job Board (Minimal)

This is a minimal job-board prototype (Node/Express + SQLite) for local development.

Quick start:

1. Open a terminal in `D:/Globalco Assesment/job-board`
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm run dev
```

4. Open http://localhost:3000 in your browser.

API endpoints:
- `POST /api/signup` { username, password }
- `POST /api/login` { username, password }
- `GET /api/jobs`
- `POST /api/jobs` (auth required: set `Authorization: Bearer <token>` header)
- `POST /api/jobs/:id/apply` { name, email, resume }

Notes:
- This is a starting point. Consider adding validation, file uploads, pagination, search.
