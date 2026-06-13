# Posterly

AI-powered poster generation SaaS. Describe an idea and Posterly turns it into a
beautiful, print-ready poster in seconds.

This repository is a monorepo with two independently deployable apps:

| App         | Stack                                                        | Path        |
| ----------- | ----------------------------------------------------------- | ----------- |
| `frontend`  | Next.js (App Router) · TypeScript · Tailwind · shadcn/ui     | `frontend/` |
| `backend`   | Node.js · Express · TypeScript · Supabase                    | `backend/`  |

The frontend renders the marketing site and product UI and talks to the backend
over HTTP. The backend owns business logic, integrations (Supabase, OpenAI, fal,
Cloudflare R2, Polar) and returns a consistent JSON envelope.

## Architecture

```
posterly/
├── frontend/                 # Next.js app
│   └── src/
│       ├── app/              # App Router routes (marketing landing at /)
│       ├── components/       # UI + marketing components (one per file)
│       │   ├── marketing/
│       │   └── ui/           # shadcn/ui primitives
│       ├── hooks/
│       ├── lib/              # env, supabase (ssr), api client, utils
│       │   └── supabase/     # createBrowserClient + createServerClient
│       ├── services/         # typed API calls to the backend
│       ├── types/
│       └── utils/
└── backend/                  # Express API
    └── src/
        ├── app.ts            # Express app factory
        ├── index.ts          # Server bootstrap
        ├── controllers/
        ├── lib/              # env, supabase admin client, api helpers
        ├── middleware/       # validate (zod), errorHandler, notFound
        ├── routes/           # versioned under /api/v1
        ├── services/
        ├── types/
        └── utils/            # structured logger
```

### API response envelope

Every backend response uses a consistent shape (see `backend/src/lib/api.ts`):

```jsonc
// success
{ "success": true, "data": { /* ... */ } }

// error
{ "success": false, "error": { "message": "...", "code": "...", "details": {} } }
```

## Prerequisites

- Node.js >= 20
- A Supabase project (URL + service role key)

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in real values
npm run dev            # http://localhost:4000
```

Health check: `GET http://localhost:4000/api/v1/health`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in real values
npm run dev                  # http://localhost:3000
```

Make sure `NEXT_PUBLIC_API_URL` points at the backend (default
`http://localhost:4000`).

## Environment variables

### Frontend (`frontend/.env.local`)

| Variable                        | Description                          |
| ------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key           |
| `NEXT_PUBLIC_API_URL`           | Base URL of the Express backend      |

### Backend (`backend/.env`)

| Variable                    | Description                              |
| --------------------------- | ---------------------------------------- |
| `NODE_ENV`                  | `development` \| `test` \| `production`   |
| `PORT`                      | API port (default `4000`)                |
| `CORS_ORIGIN`               | Allowed frontend origin                  |
| `SUPABASE_URL`              | Supabase project URL                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only)  |
| `OPENAI_API_KEY`            | OpenAI API key                           |
| `FAL_KEY`                   | fal.ai API key                           |
| `R2_ACCOUNT_ID`             | Cloudflare R2 account id                 |
| `R2_ACCESS_KEY_ID`          | Cloudflare R2 access key id              |
| `R2_SECRET_ACCESS_KEY`      | Cloudflare R2 secret access key          |
| `R2_BUCKET`                 | Cloudflare R2 bucket name                |
| `R2_PUBLIC_URL`             | Public base URL for R2 assets            |
| `POLAR_ACCESS_TOKEN`        | Polar billing access token               |
| `POLAR_WEBHOOK_SECRET`      | Polar webhook signing secret             |

All variables are validated at startup with zod (`*/lib/env.ts`); the apps fail
fast with a readable error if anything is missing or malformed.

## Scripts

### Frontend

| Script          | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the dev server         |
| `npm run build` | Production build             |
| `npm run start` | Serve the production build   |
| `npm run lint`  | Lint with ESLint             |

### Backend

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start with hot reload (tsx)       |
| `npm run build`     | Compile TypeScript to `dist/`     |
| `npm run start`     | Run the compiled server           |
| `npm run typecheck` | Type-check without emitting       |

## Notes

- `backend/src/types/database.ts` is a placeholder for Supabase-generated types.
  Regenerate it with the Supabase CLI once your schema exists.
- The Supabase service role key bypasses Row Level Security and must never be
  exposed to the browser — keep it on the backend only.
