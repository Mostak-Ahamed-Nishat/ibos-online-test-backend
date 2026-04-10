# iBOS Online Assessment Backend

Backend service for the Online Assessment Platform.

## Tech Stack
- Node.js
- Express.js
- TypeScript
- MongoDB (Mongoose)

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create `.env` from `.env.example`.
3. Run development server:
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
ACCESS_TOKEN_SECRET=change_this_to_a_long_random_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN_DAYS=30
REFRESH_TOKEN_COOKIE_NAME=refreshToken
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

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript to `dist/`
- `npm run start` - Run production build
- `npm run seed:admin` - Create/update admin from env values

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
