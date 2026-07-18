# Auth API — Postman Collection

Role-based authentication flow with email OTP verification and password reset.
All request/response examples below are captured from the running API.

---

## Environment / Collection Variables

| Variable | Initial Value | Notes |
|----------|---------------|-------|
| `base_url` | `http://localhost:3026` | Server base URL (from `PORT` in `.env`) |
| `token` | _(empty)_ | JWT — auto-populated by the **Login** request (see snippet below) |

All auth endpoints are prefixed with **`/v1/auth`**.

### Common Headers

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

Protected routes (e.g. `/v1/users`) additionally require:

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer {{token}}` |

---

## Reference Data

**Available roles** (send the role `name` in the register body):

`HR` · `QA` · `Developer` · `Candidate`

**Password requirements:** 8–64 chars, at least one lowercase, one uppercase, one number, and one special character.

**OTP:** 6-digit numeric code, valid for **10 minutes**, single-use (cleared after successful use).

---

## Auth Flow (happy path)

```
1. Register            → OTP emailed, user created (isVerified = false)
2. Verify Email        → submit OTP → isVerified = true
3. Login               → returns JWT (blocked with 403 until verified)
   ─────────────────────────────────────────────
   Forgot Password     → reset OTP emailed
   Change Password     → submit OTP + new password → password reset
```

---

## 1. Register

Creates a user with the given role, generates a verification OTP, stores it, and emails it.

**`POST {{base_url}}/v1/auth/register`**

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Passw0rd!",
  "role": "Candidate",
  "phoneNumber": "+12025550123"
}
```

> `phoneNumber` is optional. `role` must be one of the available role names.

### Response — `201 Created`

```json
{
  "message": "Registration successful. Please verify your email using the OTP sent to your inbox.",
  "user": {
    "id": "6a5af830efc2a58c4b68d709",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "Candidate"
  }
}
```

### Error Responses

**`409 Conflict`** — email already registered

```json
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "A user with this email already exists."
}
```

**`400 Bad Request`** — invalid role

```json
{
  "error": "VALIDATION_ERROR",
  "message": "The request has validation errors.",
  "validationErrors": [
    { "field": "role", "message": "Invalid role selected." }
  ]
}
```

**`400 Bad Request`** — field validation (example: bad email + weak password)

```json
{
  "error": "VALIDATION_ERROR",
  "message": "The request has validation errors.",
  "validationErrors": [
    { "message": "Invalid email address", "field": "email" },
    { "message": "Password must be at least 8 characters", "field": "password" },
    { "message": "Password must contain at least one uppercase letter", "field": "password" },
    { "message": "Password must contain at least one number", "field": "password" },
    { "message": "Password must contain at least one special character", "field": "password" }
  ]
}
```

---

## 2. Verify Email

Confirms the OTP sent during registration and activates the account for login.

**`POST {{base_url}}/v1/auth/verify-email`**

### Request Body

```json
{
  "email": "john@example.com",
  "otp": "141999"
}
```

### Response — `200 OK`

```json
{
  "message": "Email verified successfully. You can now log in."
}
```

### Error Responses

**`400 Bad Request`** — wrong or expired OTP

```json
{
  "error": "VALIDATION_ERROR",
  "message": "The request has validation errors.",
  "validationErrors": [
    { "field": "otp", "message": "Invalid or expired OTP." }
  ]
}
```

**`404 Not Found`** — no user for that email

```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found."
}
```

**`409 Conflict`** — already verified

```json
{
  "error": "EMAIL_ALREADY_VERIFIED",
  "message": "Email is already verified."
}
```

---

## 3. Login

Authenticates a **verified** user and returns a JWT containing the user's role.

**`POST {{base_url}}/v1/auth/login`**

### Request Body

```json
{
  "email": "john@example.com",
  "password": "Passw0rd!"
}
```

### Response — `200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTVhZjgzMGVmYzJhNThjNGI2OGQ3MDkiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQ2FuZGlkYXRlIiwiaWF0IjoxNzg0MzQ2Njk1LCJleHAiOjE3ODQ0MzMwOTV9.iBQRYXSIE4aNnNGkI1wTQLJd2tWYdyh2lWOJGSXNQQM",
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "Candidate"
  }
}
```

### Postman — auto-save the token

Add this to the request's **Scripts → Post-response** tab so `{{token}}` is set for protected calls:

```js
const res = pm.response.json();
if (res.token) {
  pm.collectionVariables.set("token", res.token);
}
```

### Error Responses

**`403 Forbidden`** — email not verified yet

```json
{
  "error": "EMAIL_NOT_VERIFIED",
  "message": "Please verify your email before logging in."
}
```

**`401 Unauthorized`** — wrong email or password

```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Authentication failed."
}
```

**`403 Forbidden`** — account deactivated

```json
{
  "error": "ACCOUNT_INACTIVE",
  "message": "Your account is inactive. Please contact support."
}
```

---

## 4. Forgot Password

Generates a password-reset OTP and emails it. Always returns the same generic
message so email addresses cannot be enumerated.

**`POST {{base_url}}/v1/auth/forgot-password`**

### Request Body

```json
{
  "email": "john@example.com"
}
```

### Response — `200 OK`

```json
{
  "message": "If an account with that email exists, a password reset OTP has been sent."
}
```

> The response is identical whether or not the email exists.

---

## 5. Change Password

Resets the password using the OTP from the forgot-password email.

**`POST {{base_url}}/v1/auth/change-password`**

### Request Body

```json
{
  "email": "john@example.com",
  "otp": "767173",
  "newPassword": "NewPass1!"
}
```

### Response — `200 OK`

```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

### Error Responses

**`400 Bad Request`** — wrong or expired OTP

```json
{
  "error": "VALIDATION_ERROR",
  "message": "The request has validation errors.",
  "validationErrors": [
    { "field": "otp", "message": "Invalid or expired OTP." }
  ]
}
```

---

## Health Check

**`GET {{base_url}}/health`** → `200 OK`

```json
{ "status": "UP", "timestamp": "2026-07-18T03:51:12.176Z" }
```
