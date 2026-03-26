# Black Friday Deals Backend

Starter Node.js backend for the marketplace system described in your documentation.

## Stack

- Node.js
- Express
- MySQL
- JWT authentication
- Model-first business logic

## Structure

```text
src/
  app.js
  server.js
  config/
  controllers/
  middleware/
  models/
  routes/
  utils/
database/
  schema.sql
```

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Create the database using the schema in [database/schema.sql](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/database/schema.sql).

Optional starter data:

```bash
mysql -u root -p deals_platform < database/seed.sql
```

4. Start the server:

```bash
npm run dev
```

## Current Starter Features

- User registration and login with JWT
- Role-based access control for `admin`, `vendor`, and `public_user`
- CRUD starting points for categories, stores, deals, ads, notifications, and subscription plans
- Search and filtering for deals
- Shared MySQL data access layer
- Single fixed API endpoint using the `request` header instead of many changing route paths
- Frontend-managed cart handoff to backend QR redemption flow

## API Pattern

The backend now uses one fixed endpoint:

```text
/api
```

Use the `request` header to select the action:

```http
request: register
```

Protected actions still use the normal authorization header:

```http
Authorization: Bearer <token>
```

Examples:

```bash
curl -X POST http://localhost:5000/api \
  -H "Content-Type: application/json" \
  -H "request: register" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "secret123",
    "role": "vendor"
  }'
```

```bash
curl -X POST http://localhost:5000/api \
  -H "Content-Type: application/json" \
  -H "request: list_deals" \
  -d '{
    "search": "tv",
    "location": "Kigali",
    "page": 1,
    "limit": 10
  }'
```

## Notes

- Business logic is kept in the model layer to match your requested approach.
- This is a starter backend, not the full finished marketplace.
- File uploads, email verification delivery, pagination metadata expansion, vendor analytics, and admin approval workflows can be added next.
- Detailed testing steps are available in [API_TESTING.md](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/API_TESTING.md).
