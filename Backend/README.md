# demoTest

Minimal auth + user API mirroring **loomky-api** module structure.

## Setup
```bash
cd demoTest
cp .env.example .env
npm install
npm run dev
```

## Endpoints

### Auth
- `POST /v1/auth/register` — `{ firstName, lastName, email, password }`
- `POST /v1/auth/login` — `{ email, password }`

### Users (requires `Authorization: Bearer <token>` from login)
- `GET /v1/users` — list all users
- `GET /v1/users/:userId` — get user by id
- `POST /v1/users` — create user `{ firstName, lastName, email, password }`
- `PUT /v1/users/:userId` — update user `{ firstName?, lastName?, email?, password? }`
- `DELETE /v1/users/:userId` — soft delete user

## AI Rules
- Cursor: `.cursor/rules/project-structure.mdc`
- Claude: `CLAUDE.md`
