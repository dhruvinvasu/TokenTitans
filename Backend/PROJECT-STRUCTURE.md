# demoTest — Full Project Structure & Codebase Reference

Minimal auth + user REST API mirroring **loomky-api** conventions.  
Stack: **Node.js + TypeScript**, **Express**, **Inversify DI**, **MongoDB/Mongoose**, **Zod**, **JWT**, **bcrypt**.

---

## Table of Contents

1. [Root Layout](#root-layout)
2. [Source Tree (`src/`)](#source-tree-src)
3. [Request Flow](#request-flow)
4. [API Endpoints](#api-endpoints)
5. [Modules](#modules)
6. [Shared Infrastructure](#shared-infrastructure)
7. [Patterns & Conventions](#patterns--conventions)
8. [Dependency Injection](#dependency-injection)
9. [Environment Variables](#environment-variables)
10. [NPM Scripts](#npm-scripts)
11. [Adding a New Feature Module](#adding-a-new-feature-module)

---

## Root Layout

```
demoTest/
├── .cursor/rules/
│   └── project-structure.mdc   # Cursor AI rules (always applied)
├── .env                          # Local env (not committed)
├── .env.example                  # Env template
├── .gitignore
├── .prettierrc.json              # Prettier config
├── CLAUDE.md                     # Claude AI rules (short)
├── eslint.config.mjs             # ESLint flat config
├── package.json
├── package-lock.json
├── PROJECT-STRUCTURE.md          # This file — full codebase reference
├── README.md                     # Quick start + endpoints
├── tsconfig.json                 # TypeScript + path alias @/*
└── src/                          # Application source (see below)
```

---

## Source Tree (`src/`)

```
src/
├── index.ts                      # App entry: DB connect, Express setup, listen
├── inversify.config.ts           # Inversify DI container bindings
│
├── @types/
│   └── express/
│       └── index.d.ts            # Express Request extensions (userId, rawBody, etc.)
│
├── common/
│   └── base.controller.ts        # ok(), created(), noContent() response helpers
│
├── config/
│   ├── app.config.ts             # Zod-validated env → Config object
│   ├── config.types.ts           # Env enum (dev | staging | prod | test)
│   ├── database.ts               # mongoose.connect()
│   └── global-error-handler.ts   # uncaughtException, SIGTERM, SIGINT handlers
│
├── constants/
│   ├── database.constants.ts     # modelNames (USER → model + collection)
│   └── errors.constant.ts        # AUTH_ERRORS, SERVER_ERRORS payloads
│
├── errors/
│   ├── base.error.ts             # BaseError class (status, error, toJson)
│   ├── error.types.ts            # ErrorInfo interface
│   ├── authentication.error.ts   # 401
│   ├── conflict.error.ts         # 409
│   ├── not-found.error.ts        # 404
│   └── validation.error.ts       # 400 + validationErrors[]
│
├── middlewares/
│   ├── async.middleware.ts       # asyncWrapper — catches async route errors
│   ├── auth.middleware.ts        # JWT Bearer token verification
│   ├── error-handler.middleware.ts  # Global Express error handler
│   └── validate-middleware.ts    # Zod body/params/query validation
│
├── models/
│   └── base.model.ts             # BaseSchema (deletedAt, timestamps) + IBaseModel
│
├── modules/
│   ├── auth/                     # Register + login (no model — uses User)
│   │   ├── controllers/auth.controller.ts
│   │   ├── dtos/auth.dto.ts
│   │   ├── routes/auth.routes.ts
│   │   ├── services/auth.service.ts
│   │   └── validations/auth.validation.ts
│   └── user/                     # User CRUD
│       ├── controllers/user.controller.ts
│       ├── dtos/user.dto.ts
│       ├── models/user.model.ts
│       ├── repositories/user.repository.ts
│       ├── routes/user.routes.ts
│       ├── services/user.service.ts
│       └── validations/user.validation.ts
│
├── repositories/
│   └── base.repository.ts        # IRepository<T> — find, create, update, delete
│
├── routes/
│   ├── router.ts                 # /health, /v1/*, 404 catch-all
│   └── v1/
│       └── v1Router.ts           # /auth, /users
│
├── types/
│   ├── auth.types.ts             # TokenPayload { userId, email }
│   └── di.types.ts               # Inversify TYPES symbols
│
├── utils/
│   ├── crypto.utils.ts           # hashPassword, comparePasswords (bcrypt)
│   ├── http.utils.ts             # HttpCode enum, sanitizeBody/Headers
│   ├── logger.util.ts            # Winston console logger
│   └── validation.utils.ts       # isValidMongoId
│
└── validation/
    └── index.ts                  # RequestValidationSchema, ValidationErrorDetail
```

---

## Request Flow

```
HTTP Request
    │
    ▼
index.ts
  ├── cors, helmet, express.json (500kb, rawBody capture)
  └── router.ts
        ├── GET /health
        ├── /v1 → v1Router.ts
        │         ├── /auth → auth.routes (public)
        │         └── /users → user.routes (authMiddleware on all routes)
        └── * → 404 Route_Not_Found
    │
    ▼ (per route)
  validate(ZodSchema)  →  asyncWrapper(controller.method)
    │
    ▼
  Controller → Service → Repository → Mongoose Model
    │
    ▼ (on error)
  error-handler.middleware.ts
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check `{ status: 'UP', timestamp }` |
| POST | `/v1/auth/register` | No | Register user |
| POST | `/v1/auth/login` | No | Login → JWT token |
| GET | `/v1/users` | Bearer JWT | List all non-deleted users |
| GET | `/v1/users/:userId` | Bearer JWT | Get user by ID |
| POST | `/v1/users` | Bearer JWT | Create user |
| PUT | `/v1/users/:userId` | Bearer JWT | Update user (partial) |
| DELETE | `/v1/users/:userId` | Bearer JWT | Soft delete (`deletedAt`) |

### Auth — Request / Response

**POST `/v1/auth/register`**
```json
{ "firstName": "John", "lastName": "Doe", "email": "john@example.com", "password": "secret123" }
```
→ `201` `{ user: { id, firstName, lastName, email } }`

**POST `/v1/auth/login`**
```json
{ "email": "john@example.com", "password": "secret123" }
```
→ `200` `{ token, user: { id, firstName, lastName, email } }`

### Users — Request / Response

All user routes require header: `Authorization: Bearer <token>`

**POST `/v1/users`** — same body as register  
**PUT `/v1/users/:userId`** — at least one of: `firstName`, `lastName`, `email`, `password`  
**DELETE `/v1/users/:userId`** — `204 No Content`

---

## Modules

### `auth` module

| File | Role |
|------|------|
| `validations/auth.validation.ts` | `RegisterSchema`, `LoginSchema` (Zod) |
| `dtos/auth.dto.ts` | `RegisterDTO`, `LoginDTO` via `z.infer` |
| `services/auth.service.ts` | register (conflict check), login (JWT sign) |
| `controllers/auth.controller.ts` | HTTP layer; extends `BaseController` |
| `routes/auth.routes.ts` | `POST /register`, `POST /login` |

No auth-specific model — uses `UserRepository` and `User` model.

### `user` module

| File | Role |
|------|------|
| `models/user.model.ts` | `IUser` schema, email unique index, password pre-save hash |
| `repositories/user.repository.ts` | `findByEmail`, `findDocumentById` (+password) |
| `validations/user.validation.ts` | Create, Update, Get, Delete schemas |
| `dtos/user.dto.ts` | `CreateUserDTO`, `UpdateUserDTO`, `UserIdParamsDTO` |
| `services/user.service.ts` | list, getById, create, update, soft delete |
| `controllers/user.controller.ts` | HTTP layer |
| `routes/user.routes.ts` | CRUD routes + `authMiddleware()` |

### User model fields

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | MongoDB ID |
| `firstName` | string | required, trimmed |
| `lastName` | string | required, trimmed |
| `email` | string | required, lowercase, unique (when not deleted) |
| `password` | string | required, `select: false`, bcrypt hashed on save |
| `deletedAt` | Date? | soft delete (from BaseSchema) |
| `createdAt` | Date | auto (BaseSchema) |
| `updatedAt` | Date | auto (BaseSchema) |

Collection: `users` (via `modelNames.USER`)

---

## Shared Infrastructure

### Config (`config/app.config.ts`)

Environment parsed with Zod at startup. Invalid env → log + `process.exit(1)`.

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | Yes | — | `dev` \| `staging` \| `prod` \| `test` |
| `PORT` | No | `3001` | Server port |
| `TZ` | Yes | — | Must be `UTC` |
| `DATABASE_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Min 32 characters |
| `SALT_ROUNDS` | No | `12` | bcrypt rounds (10–15) |

### Base model (`models/base.model.ts`)

All feature models call `schema.add(BaseSchema)` for:
- `deletedAt` — soft delete
- `createdAt`, `updatedAt` — Mongoose timestamps

### Base repository (`repositories/base.repository.ts`)

Abstract `IRepository<T>` with: `findById`, `findOne`, `find`, `create`, `updateById`, `deleteById`.  
Default query options: `{ lean: true }`.

### Error handling

| Class | HTTP | When |
|-------|------|------|
| `ValidationError` | 400 | Zod validation fails |
| `AuthenticationError` | 401 | Missing/invalid JWT |
| `NotFoundError` | 404 | User not found |
| `ConflictError` | 409 | Duplicate email |
| Other / 5xx | 500 | Unhandled; stack in non-prod |

### Middleware chain (typical protected route)

```
authMiddleware() → validate(Schema) → asyncWrapper(controller.method)
```

### Express Request extensions (`@types/express/index.d.ts`)

- `rawBody?: Buffer`
- `parsedBody?: Record<string, unknown>`
- `userId?: string`
- `userEmail?: string`

---

## Patterns & Conventions

### Module folder structure (per feature)

```
modules/<feature>/
├── models/           # Mongoose model (if entity has DB collection)
├── validations/      # Zod schemas: CreateXSchema, UpdateXSchema, etc.
├── dtos/             # z.infer<typeof XSchema.body> only — no hand-written DTOs
├── repositories/     # extends IRepository<T>
├── services/         # business logic, @injectable()
├── controllers/      # HTTP, extends BaseController, @injectable()
└── routes/           # Express Router, resolve controller from container
```

### Rules

- **No** top-level `controllers/` or feature `models/` outside `modules/`
- **No** `helpers/` folder inside modules
- **No** queues/workers/producers
- Soft delete via `deletedAt` — never hard delete users in service layer
- Indexes use `partialFilterExpression: { deletedAt: null }`
- Pre-save hooks use `HydratedDocument` + `MongooseError`
- DTOs always derived from validation schemas via `z.infer`
- Path alias: `@/*` → `src/*`

### Model registration

```typescript
// constants/database.constants.ts
export const modelNames = {
  USER: { modelName: 'User', collectionName: 'users' },
}

// modules/user/models/user.model.ts
export const User = model<IUser>(
  modelNames.USER.modelName,
  userSchema,
  modelNames.USER.collectionName,
)
```

---

## Dependency Injection

**File:** `src/inversify.config.ts`

| Symbol (`TYPES`) | Class |
|------------------|-------|
| `UserRepository` | `UserRepository` |
| `AuthService` | `AuthService` |
| `AuthController` | `AuthController` |
| `UserService` | `UserService` |
| `UserController` | `UserController` |

Routes resolve controllers once at module load:
```typescript
const userController = container.get<UserController>(TYPES.UserController)
```

Services inject repositories via `@inject(TYPES.UserRepository)`.

---

## Environment Variables

Copy `.env.example` → `.env`:

```env
NODE_ENV=dev
PORT=3026
TZ=UTC
DATABASE_URI=mongodb://localhost:27017/demo-test
JWT_SECRET=change-me-to-at-least-32-characters-long
SALT_ROUNDS=12
```

---

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `ts-node-dev ... src/index.ts` | Hot reload development |
| `build` | `tsc && tsc-alias` | Compile to `dist/` |
| `start` | `node dist/index.js` | Run production build |
| `lint` | `eslint .` | Lint |
| `type-check` | `tsc --noEmit` | Type check only |
| `format` | `prettier --write .` | Format code |

---

## Adding a New Feature Module

Checklist (match existing auth/user patterns):

1. **Validation** — create `modules/<feature>/validations/<feature>.validation.ts` with Zod schemas
2. **DTO** — `modules/<feature>/dtos/<feature>.dto.ts` using `z.infer<typeof XSchema.body>`
3. **Model** (if needed) — extend `IBaseModel`, add `BaseSchema`, register in `modelNames`
4. **Repository** — extend `IRepository<T>`, `@injectable()`
5. **Service** — business logic, inject repository, `@injectable()`
6. **Controller** — extend `BaseController`, `@injectable()`
7. **Routes** — wire validate + asyncWrapper + controller methods
8. **DI** — add symbols to `types/di.types.ts`, bind in `inversify.config.ts`
9. **Router** — mount in `routes/v1/v1Router.ts`

---

## File Count Summary

| Area | Files |
|------|-------|
| Root config/docs | 10 |
| `src/` application | 44 |
| **Total (excl. node_modules, dist)** | **54** |

---

## Related Docs

| File | Purpose |
|------|---------|
| `README.md` | Quick setup and endpoint list |
| `CLAUDE.md` | Short AI assistant rules |
| `.cursor/rules/project-structure.mdc` | Cursor always-on AI rules |
