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
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=a7cd5d001@smtp-brevo.com
SMTP_PASS=your_brevo_smtp_key
SMTP_FROM="iBOS Exam Verification <no-reply@yourdomain.com>"
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=ChangeThisAdminPassword123!
ADMIN_SEED_FULL_NAME=System Admin
ADMIN_SEED_STUDENT_ID=ADM001
```

Important:
- Use your Brevo SMTP key in `SMTP_PASS`.
- Use a valid sender format for `SMTP_FROM`, for example: `iBOS Exam Verification <no-reply@yourdomain.com>`.

SMTP check command:
```bash
npm run test:email -- your-email@example.com
```

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript to `dist/`
- `npm run start` - Run production build
- `npm run seed:admin` - Create/update admin from env values
- `npm run test:email -- your-email@example.com` - Send a direct SMTP test email

## Core Endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/admin/dashboard` (ADMIN only)

## Database Design

- Miro ERD: https://miro.com/welcomeonboard/Tmd1ZzZzT1NxK2hVNGJrLy9KclFVTFYzR0FRRXh5c0IxTlRjV2xpNkRUQ1BrbkRTZGFYQURjSkh6M04rMmhqZHdSQ1RPUXJRVUV1anIwQzhodG1UVC9JRVM5M2tKTUV2UmsxU2xJMUVscndadGlGeS9xZ1Z5MmFYeXllZEdxRmNzVXVvMm53MW9OWFg5bkJoVXZxdFhRPT0hdjE=?share_link_id=752565887110
