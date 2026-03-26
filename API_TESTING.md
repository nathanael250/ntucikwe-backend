# API Testing Guide

This document helps you test the backend using the fixed endpoint approach.

## Base URL

```text
http://localhost:5000/api
```

## Important API Rule

Do not change the endpoint path for each action.

Use the same endpoint every time:

```text
/api
```

Select the action from headers:

```http
request: register
```

## Common Headers

Always send:

```http
Content-Type: application/json
request: <command_name>
```

For protected commands also send:

```http
Authorization: Bearer <token>
```

## Test Tool Setup

If you use Postman, create these variables:

- `base_url` = `http://localhost:5000/api`
- `user_token` = empty first
- `vendor_token` = empty first
- `admin_token` = empty first
- `store_id` = empty first
- `deal_id` = empty first
- `user_id` = empty first
- `notification_id` = empty first

## Before Testing

1. Make sure MySQL is running.
2. Import [database/schema.sql](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/database/schema.sql).
3. Optionally import [database/seed.sql](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/database/seed.sql).
4. Configure [.env](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/.env).
5. Start the server with `npm run dev`.

## Important Role Note

The `register` command only allows:

- `vendor`
- `public_user`

It does not allow creating `admin` users from the API.

If you want to test admin-only commands, create an admin directly in the database first.

Example SQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
```

Or insert a dedicated admin user manually with a hashed password.

## Recommended Test Order

1. `health`
2. `register` vendor
3. `login` vendor
4. `get_profile`
5. `list_store_categories`
6. `list_deal_categories`
7. `create_store`
8. `list_stores`
9. `create_deal`
10. `list_deals`
11. `get_deal`
12. `add_deal_image`
13. `create_ad`
14. `list_ads`
15. `my_notifications`

For admin testing:

1. `login` as admin
2. `list_users`
3. `update_user_status`
4. `create_store_category`
5. `create_deal_category`
6. `create_subscription_plan`
7. `create_notification`

## Commands Summary

| Command | Auth | Role | Notes |
|---|---|---|---|
| `health` | No | Any | Server status |
| `register` | No | Any | Creates `vendor` or `public_user` |
| `login` | No | Any | Returns JWT token |
| `get_profile` | Yes | Any logged-in user | Current user profile |
| `list_users` | Yes | Admin | List users |
| `update_user_status` | Yes | Admin | Requires `id`, `status` |
| `create_store_category` | Yes | Admin | Create store category |
| `list_store_categories` | No | Any | List store categories |
| `create_deal_category` | Yes | Admin | Create deal category |
| `list_deal_categories` | No | Any | List deal categories |
| `create_store` | Yes | Vendor/Admin | Vendor creates own store |
| `list_stores` | No | Any | Supports filters |
| `list_user_stores` | No | Any | Requires `user_id` |
| `get_store` | No | Any | Requires `id` |
| `list_store_deals` | No | Any | Requires `store_id` |
| `create_redemption_qr` | Yes | Logged-in user | Frontend sends selected items |
| `verify_redemption_qr` | Yes | Admin/Vendor | Checks QR status before using |
| `use_redemption_qr` | Yes | Admin/Vendor | Marks QR as used |
| `create_deal` | Yes | Vendor/Admin | Vendor can use own store only |
| `list_deals` | No | Any | Supports filters |
| `get_deal` | No | Any | Requires `id` |
| `add_deal_image` | Yes | Vendor/Admin | Requires `id`, `image_path` |
| `create_ad` | Yes | Vendor/Admin | Vendor uses own account |
| `list_ads` | No | Any | Supports filters |
| `create_subscription_plan` | Yes | Admin | Create plan |
| `list_subscription_plans` | No | Any | List plans |
| `create_notification` | Yes | Admin | Requires `user_id`, `title` |
| `my_notifications` | Yes | Logged-in user | Own notifications |
| `mark_notification_as_read` | Yes | Logged-in user | Requires `id` |

## Request Examples

For simplicity, use `POST` for all tests.

### 1. Health

Headers:

```http
request: health
Content-Type: application/json
```

Body:

```json
{}
```

### 2. Register Vendor

Headers:

```http
request: register
Content-Type: application/json
```

Body:

```json
{
  "first_name": "Alice",
  "last_name": "Vendor",
  "email": "alice.vendor@example.com",
  "phone_number": "0780000000",
  "address": "Kigali",
  "password": "secret123",
  "role": "vendor"
}
```

Save:

- `data.token` as `vendor_token`
- `data.user.id` as `user_id`

### 3. Login Vendor

Headers:

```http
request: login
Content-Type: application/json
```

Body:

```json
{
  "email": "alice.vendor@example.com",
  "password": "secret123"
}
```

Save:

- `data.token` as `vendor_token`
- `data.user.id` as `user_id`

### 4. Get Profile

Headers:

```http
request: get_profile
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

```json
{}
```

### 5. List Store Categories

Headers:

```http
request: list_store_categories
Content-Type: application/json
```

Body:

```json
{}
```

### 6. List Deal Categories

Headers:

```http
request: list_deal_categories
Content-Type: application/json
```

Body:

```json
{}
```

### 7. Create Store

Headers:

```http
request: create_store
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

```json
{
  "store_name": "Alice Supermarket",
  "description": "Discounted products every week",
  "location": "Kigali",
  "address": "KG 10 Ave",
  "store_category_id": 1
}
```

Save:

- `data.id` as `store_id`

### 8. List Stores

Headers:

```http
request: list_stores
Content-Type: application/json
```

Body:

```json
{
  "search": "Alice",
  "location": "Kigali",
  "page": 1,
  "limit": 10
}
```

### 9. Get Store

Headers:

```http
request: get_store
Content-Type: application/json
```

Body:

```json
{
  "id": {{store_id}}
}
```

### 9B. List Stores For One User

Headers:

```http
request: list_user_stores
Content-Type: application/json
```

Body:

```json
{
  "user_id": {{user_id}},
  "page": 1,
  "limit": 10
}
```

### 10. Create Deal

Headers:

```http
request: create_deal
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

Use `form-data` when uploading real files.

Fields:

- `title` = `Samsung TV Discount`
- `store_id` = `{{store_id}}`
- `original_price` = `1000`
- `discount_price` = `750`
- `description` = `Black Friday TV offer`
- `deal_category_id` = `1`
- `start_date` = `2026-03-24 08:00:00`
- `end_date` = `2026-03-30 23:59:59`
- `status` = `active`
- `images` = select one or many image files

Save:

- `data.id` as `deal_id`

The backend now inserts into both:

- `deals`
- `deal_images`

in the same request.

Example `curl`:

```bash
curl -X POST http://localhost:5000/api \
  -H "request: create_deal" \
  -H "Authorization: Bearer <vendor_token>" \
  -F "title=Samsung TV Discount" \
  -F "store_id=1" \
  -F "original_price=1000" \
  -F "discount_price=750" \
  -F "description=Black Friday TV offer" \
  -F "deal_category_id=1" \
  -F "status=active" \
  -F "images=@/absolute/path/to/front.jpg" \
  -F "images=@/absolute/path/to/side.jpg"
```

### 10B. List Deals For One Store

Headers:

```http
request: list_store_deals
Content-Type: application/json
```

Body:

```json
{
  "store_id": {{store_id}},
  "page": 1,
  "limit": 10
}
```

### 10C. Create Selection QR From Frontend Cart

The cart stays in the frontend. When the user is ready, the frontend sends the selected deals here.

Headers:

```http
request: create_redemption_qr
Content-Type: application/json
Authorization: Bearer {{user_token}}
```

Body:

```json
{
  "items": [
    {
      "deal_id": {{deal_id}},
      "quantity": 1
    }
  ]
}
```

Response includes:

- `summary_message`
- `qr_token`
- `qr_value`
- selected `items`

### 10D. Verify QR Before Use

Headers:

```http
request: verify_redemption_qr
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "qr_token": "paste_qr_token_here"
}
```

### 10E. Mark QR As Used

Headers:

```http
request: use_redemption_qr
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "qr_token": "paste_qr_token_here"
}
```

### 11. List Deals

Headers:

```http
request: list_deals
Content-Type: application/json
```

Body:

```json
{
  "search": "Samsung",
  "location": "Kigali",
  "min_discount_rate": 10,
  "page": 1,
  "limit": 10
}
```

### 12. Get Deal

Headers:

```http
request: get_deal
Content-Type: application/json
```

Body:

```json
{
  "id": {{deal_id}}
}
```

### 13. Add Deal Image

Headers:

```http
request: add_deal_image
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

```json
{
  "id": {{deal_id}},
  "image_path": "/uploads/deals/tv-offer.jpg"
}
```

### 14. Create Ad

Headers:

```http
request: create_ad
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

```json
{
  "title": "Homepage Banner Promotion",
  "location": "Homepage Top",
  "banner": "/uploads/ads/homepage-banner.jpg",
  "status": "active",
  "start_date": "2026-03-24 08:00:00",
  "end_date": "2026-03-31 23:59:59"
}
```

### 15. List Ads

Headers:

```http
request: list_ads
Content-Type: application/json
```

Body:

```json
{
  "status": "active",
  "page": 1,
  "limit": 10
}
```

### 16. List Subscription Plans

Headers:

```http
request: list_subscription_plans
Content-Type: application/json
```

Body:

```json
{}
```

### 17. My Notifications

Headers:

```http
request: my_notifications
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

```json
{}
```

## Admin Test Examples

These require an admin token.

### 18. Login Admin

Headers:

```http
request: login
Content-Type: application/json
```

Body:

```json
{
  "email": "admin@example.com",
  "password": "secret123"
}
```

Save:

- `data.token` as `admin_token`

### 19. List Users

Headers:

```http
request: list_users
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "page": 1,
  "limit": 10
}
```

### 20. Update User Status

Headers:

```http
request: update_user_status
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "id": {{user_id}},
  "status": "active"
}
```

### 21. Create Store Category

Headers:

```http
request: create_store_category
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "category_name": "Beauty",
  "sort_order": 7
}
```

### 22. Create Deal Category

Headers:

```http
request: create_deal_category
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "category_name": "Holiday Offers",
  "sort_order": 6
}
```

### 23. Create Subscription Plan

Headers:

```http
request: create_subscription_plan
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "plan_name": "Business Plus",
  "description": "More ads and more deals",
  "price": 99.99,
  "duration_in_days": 30,
  "max_ads": 15,
  "max_deals": 100,
  "status": "active"
}
```

### 24. Create Notification

Headers:

```http
request: create_notification
Content-Type: application/json
Authorization: Bearer {{admin_token}}
```

Body:

```json
{
  "user_id": {{user_id}},
  "title": "Welcome",
  "description": "Your store account has been reviewed."
}
```

### 25. Mark Notification As Read

Headers:

```http
request: mark_notification_as_read
Content-Type: application/json
Authorization: Bearer {{vendor_token}}
```

Body:

```json
{
  "id": {{notification_id}}
}
```

## Expected Response Style

Success responses generally look like this:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

List responses also include:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "offset": 0
  }
}
```

Error responses generally look like this:

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Common Problems

### Missing request header

You will get:

```json
{
  "success": false,
  "message": "Missing request header. Use request"
}
```

### Missing token

For protected commands without `Authorization`, you will get an authentication error.

### Vendor calling admin command

You will get a permission error.

### Missing required body field

You will get a validation error such as:

```json
{
  "success": false,
  "message": "Missing required fields: title"
}
```

### Invalid store ownership

If a vendor tries to create a deal for another vendor's store, the request will be rejected.

## Files Related To Testing

- [src/routes/master.routes.js](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/src/routes/master.routes.js)
- [src/controllers/masterController.js](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/src/controllers/masterController.js)
- [src/config/commands.js](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/src/config/commands.js)
- [README.md](/home/nathanadmin/Projects/MOPAS/Ntucikwe_backend/README.md)
