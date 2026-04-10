# iBOS Online Assessment Backend

Backend service for the Online Assessment Platform.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB (Mongoose)

## Database Design

- Miro ERD: https://miro.com/welcomeonboard/Tmd1ZzZzT1NxK2hVNGJrLy9KclFVTFYzR0FRRXh5c0IxTlRjV2xpNkRUQ1BrbkRTZGFYQURjSkh6M04rMmhqZHdSQ1RPUXJRVUV1anIwQzhodG1UVC9JRVM5M2tKTUV2UmsxU2xJMUVscndadGlGeS9xZ1Z5MmFYeXllZEdxRmNzVXVvMm53MW9OWFg5bkJoVXZxdFhRPT0hdjE=?share_link_id=752565887110

## API

### Health Check

- `GET /api/health`

## Environment Variables

Create a `.env` file in `/`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ibos_exam_system
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript to `dist/`
- `npm run start` - Run production build

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example`.
3. Run development server:

```bash
npm run dev
```
