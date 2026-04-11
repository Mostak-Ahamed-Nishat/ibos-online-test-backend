# iBOS Online Assessment Platform - Backend

Backend for an online exam platform with Admin and Candidate workflows.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB + Mongoose
- Zod (request validation)
- JWT (access + refresh)

## Architecture

Modular layered pattern:

- `routes -> controller -> service -> model`
- centralized error handling
- async wrapper for controllers
- Zod validation at route boundaries

## Implemented Modules

- Authentication (`/api/auth`)
  - register, login, logout, refresh token
  - email verification + resend verification
  - forgot/reset password
  - role-based access (`ADMIN`, `CANDIDATE`)
- Exams (`/api/admin/exams`)
  - exam CRUD
  - question CRUD inside exam
  - add question from question bank
- Question Bank (`/api/admin/question-bank/questions`)
  - question CRUD + search + pagination
  - duplicate prevention
- Candidate Exam Runtime (`/api/candidate/exams`)
  - start session, resume session
  - one-question-at-a-time flow
  - save/skip/jump/review
  - manual submit + timeout submit
  - offline sync (push/pull)
- Exam Integrity
  - tab switch / fullscreen exit / copy-paste / right-click event capture
  - max violation limit + auto-submit
- Evaluation and Results
  - objective auto-marking
  - text answer manual evaluation by admin
  - per-attempt result publish flow
  - candidate result visibility status
- Analytics (`/api/admin/exams/:examId/analytics`)
  - summary metrics
  - candidate submission list
  - CSV export

## Security and Hardening

- Helmet
- CORS whitelist support
- global API rate limiting
- candidate exam-specific rate limiting
- cookie parser + secure refresh token flow
- structured environment validation on startup

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root (`backend/.env`).
3. Run dev server:

```bash
npm run dev
```

## Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ibos_exam_system

APP_BASE_URL=http://localhost:5000
APP_FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

ACCESS_TOKEN_SECRET=change_this_to_a_long_random_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
REFRESH_TOKEN_COOKIE_NAME=refreshToken

API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=300

SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
SMTP_FROM="iBOS Exam <no-reply@example.com>"

ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=ChangeThisAdminPassword123!
ADMIN_SEED_FULL_NAME=System Admin
ADMIN_SEED_STUDENT_ID=ADM001
```

Important:

- `sandbox.smtp.mailtrap.io` is test-only and does not deliver to real inboxes.
- For real delivery, use a production SMTP provider (for example Gmail SMTP, Brevo, SendGrid SMTP relay, Mailgun SMTP).
- Set a valid sender format in `SMTP_FROM`, example: `iBOS Exam <no-reply@yourdomain.com>`.

Test SMTP quickly:

```bash
npm run test:email -- your-email@example.com
```

## Scripts

- `npm run dev` - start dev server with watch
- `npm run build` - build TypeScript
- `npm run start` - run compiled build
- `npm run seed:admin` - create/update admin user from env

## API Base

- Local: `http://localhost:5000/api`
- Health: `GET /api/health`

## Database Design

- Miro ERD: https://miro.com/welcomeonboard/Tmd1ZzZzT1NxK2hVNGJrLy9KclFVTFYzR0FRRXh5c0IxTlRjV2xpNkRUQ1BrbkRTZGFYQURjSkh6M04rMmhqZHdSQ1RPUXJRVUV1anIwQzhodG1UVC9JRVM5M2tKTUV2UmsxU2xJMUVscndadGlGeS9xZ1Z5MmFYeXllZEdxRmNzVXVvMm53MW9OWFg5bkJoVXZxdFhRPT0hdjE=?share_link_id=752565887110
