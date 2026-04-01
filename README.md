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
- Frontend-managed cart handoff to backend multi-store order QR redemption flow
- QR image generation and WhatsApp delivery hook after checkout

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

Guest checkout for `create_redemption_qr` can work without `Authorization` when the frontend sends customer contact fields.

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

## WhatsApp QR Delivery

After checkout, the backend now:

- generates one QR image per store redemption
- stores QR images under `/uploads/qrcodes`
- attempts to send a WhatsApp message with the QR to the customer's phone

Configure these variables in `.env`:

```env
APP_BASE_URL=http://localhost:5000
WHATSAPP_PROVIDER=wawp
WHATSAPP_DEFAULT_TO=250781796824@c.us
WAWP_API_BASE_URL=https://api.wawp.net
WAWP_INSTANCE_ID=
WAWP_ACCESS_TOKEN=
```

Important:

- `APP_BASE_URL` must be public so Wawp can fetch and send the QR image
- `WHATSAPP_DEFAULT_TO` should follow Wawp chat format like `250781796824@c.us`
- if WhatsApp is not configured, checkout still succeeds and the response includes delivery status

## Notes

- Business logic is kept in the model layer to match your requested approach.
- This is a starter backend, not the full finished marketplace.
- File uploads, email verification delivery, pagination metadata expansion, vendor analytics, and admin approval workflows can be added next.
- Detailed testing steps are available in [API_TESTING.md](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/API_TESTING.md).
