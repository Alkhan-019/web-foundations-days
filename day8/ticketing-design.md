# TicketHub: Event Ticketing System Design

## 1. Requirements

### 1.1 Functional Requirements

TicketHub allows customers to discover events, select seats, purchase tickets, and manage their bookings.

The system must:

1. Allow users to register, log in, and manage their accounts.
2. Allow customers to browse, search, and filter events.
3. Display event details, venues, prices, and seat availability.
4. Temporarily hold available seats during checkout.
5. Process payments through a secure payment provider.
6. Confirm orders and issue tickets with unique identifiers after successful payment.
7. Allow customers to view their tickets and order history.
8. Automatically release expired unpaid seat holds.
9. Prevent two customers from purchasing the same seat for the same event.
10. Display clear messages for unavailable seats, failed payments, and sold-out events.

### 1.2 Non-Functional Requirements

**Performance**

- Event listings and details should load within 300 ms at the 95th percentile under normal conditions.
- Seat availability should update promptly.
- The system should remain responsive during popular sales.

**Consistency**

- A seat must never be sold to more than one customer for the same event.
- An order must only become confirmed after verified payment.
- Expired reservations must not permanently block seats.

**Fairness**

- Use a virtual waiting room for high-demand sales.
- Apply rate limits and bot protection.
- Release customers from the queue at a controlled rate.

**Availability and scalability**

- Use multiple application servers and caching.
- Detect failures and recover where possible.
- Keep confirmed orders durable.

**Security**

- Use HTTPS, authentication, authorization, and input validation.
- Do not store raw payment card details.
- Protect personal information and order records.

**Reliability**

- Use idempotency keys to prevent duplicate payment processing.
- Monitor latency, errors, payment failures, and reservation conflicts.
- Back up the database and test recovery procedures.

## 2. Traffic and Capacity Estimates

### 2.1 Normal Traffic

TicketHub has 2 million registered users. On a normal day, 50,000 people visit the website, and each visitor views 10 pages.

**Daily page views**

50,000 visitors × 10 pages = 500,000 page views per day.

**Average page requests per second**

500,000 ÷ 86,400 seconds ≈ 5.8 page requests per second.

This is an average; actual traffic varies throughout the day. One page may also generate multiple API requests.

**Ticket sales**

5,000 tickets per day ÷ 86,400 seconds ≈ 0.058 tickets per second, or approximately 3.5 tickets per minute.

### 2.2 Popular Concert Sale

A popular concert attracts 200,000 potential buyers for 20,000 seats within the first 10 minutes.

**Average arrival rate**

10 minutes × 60 seconds = 600 seconds.

200,000 ÷ 600 ≈ 333 people arriving per second.

**Buyer-to-seat ratio**

200,000 potential buyers ÷ 20,000 seats = 10 potential buyers per seat.

Only 20,000 customers can receive one seat each if all seats are sold.

**Illustrative API request estimate**

Assuming each arriving person generates five API requests:

333 × 5 ≈ 1,665 API requests per second.

This is a planning assumption, not a measured value. Actual traffic may be higher during short bursts.

### 2.3 Design Implications

The illustrative peak request rate is approximately 287 times the normal average page-request rate. The comparison is approximate because the figures use different request assumptions.

TicketHub therefore needs a virtual waiting room, rate limiting, horizontally scalable application servers, caching, and controlled purchase processing. The database must remain the final authority for seat allocation.

## 3. API Specification

TicketHub uses a REST API with JSON request and response bodies. All purchase endpoints require authentication. The server validates requests and checks that users can access the requested resources.

| Method and endpoint                     | Purpose                               | Success response |
| --------------------------------------- | ------------------------------------- | ---------------- |
| `GET /api/v1/events`                    | List and search events                | `200 OK`         |
| `GET /api/v1/events/{eventId}`          | Retrieve event details                | `200 OK`         |
| `GET /api/v1/events/{eventId}/seats`    | List seat availability                | `200 OK`         |
| `POST /api/v1/holds`                    | Temporarily reserve a seat            | `201 Created`    |
| `DELETE /api/v1/holds/{holdId}`         | Release a customer's hold             | `204 No Content` |
| `POST /api/v1/orders`                   | Create an order from a valid hold     | `201 Created`    |
| `POST /api/v1/orders/{orderId}/payment` | Start payment processing              | `202 Accepted`   |
| `GET /api/v1/orders/{orderId}`          | Check order and payment status        | `200 OK`         |
| `GET /api/v1/me/tickets`                | List the authenticated user's tickets | `200 OK`         |

### 3.1 Example: Retrieve Events

Request:

`GET /api/v1/events`

Example response:

```json
{
  "events": [
    {
      "id": 42,
      "name": "Summer Concert",
      "venue": "City Arena",
      "price": 2500,
      "currency": "KES",
      "status": "on_sale"
    }
  ]
}
```

### 3.2 Example: Hold a Seat

Request:

`POST /api/v1/holds`

```json
{
  "event_id": 42,
  "seat_id": 815
}
```

Example response:

```json
{
  "hold_id": 901,
  "event_id": 42,
  "seat_id": 815,
  "status": "active",
  "expires_at": "2026-10-29T12:05:00Z"
}
```

The server sets the expiry time. A hold lasts five minutes by default. If another customer already holds or has purchased the seat, the API returns `409 Conflict`.

### 3.3 Example: Create an Order

Request:

`POST /api/v1/orders`

```json
{
  "hold_id": 901
}
```

The server verifies that the hold belongs to the authenticated user, has not expired, and has not already been used. It then creates a pending order.

### 3.4 Error Responses

Errors use a consistent JSON structure:

```json
{
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "This seat is no longer available."
  }
}
```

Common HTTP status codes include:

- `400 Bad Request`: invalid request data.
- `401 Unauthorized`: authentication is required.
- `403 Forbidden`: the user lacks permission.
- `404 Not Found`: the resource does not exist.
- `409 Conflict`: the seat is unavailable or the request conflicts with current state.
- `429 Too Many Requests`: rate limit exceeded.
- `500 Internal Server Error`: unexpected server failure.

Payment requests use an idempotency key so that retries do not create duplicate charges. Payment confirmation is based on verified payment-provider notifications or a server-to-server status check, not solely on the customer's browser.

## 4. Relational Database Schema

TicketHub uses PostgreSQL because relational constraints and transactions help preserve inventory accuracy.

### 4.1 Tables

**Users**

| Column          | Type                 | Purpose               |
| --------------- | -------------------- | --------------------- |
| `id`            | BIGINT, primary key  | Unique user ID        |
| `name`          | VARCHAR(150)         | Customer name         |
| `email`         | VARCHAR(255), unique | Login and contact     |
| `password_hash` | TEXT                 | Secure password hash  |
| `created_at`    | TIMESTAMPTZ          | Account creation time |

**Events**

| Column      | Type                | Purpose                   |
| ----------- | ------------------- | ------------------------- |
| `id`        | BIGINT, primary key | Unique event ID           |
| `name`      | VARCHAR(200)        | Event name                |
| `venue`     | VARCHAR(200)        | Event location            |
| `starts_at` | TIMESTAMPTZ         | Event start time          |
| `status`    | VARCHAR(30)         | Draft, on sale, or closed |

**Seats**

| Column            | Type                          | Purpose                  |
| ----------------- | ----------------------------- | ------------------------ |
| `id`              | BIGINT, primary key           | Unique seat record       |
| `event_id`        | BIGINT, foreign key           | Associated event         |
| `section`         | VARCHAR(50)                   | Venue section            |
| `seat_number`     | VARCHAR(30)                   | Seat label               |
| `price`           | NUMERIC(10,2)                 | Ticket price             |
| `status`          | VARCHAR(20)                   | Available, held, or sold |
| `hold_expires_at` | TIMESTAMPTZ, nullable         | Hold expiry              |
| `held_by_user_id` | BIGINT, nullable, foreign key | User holding the seat    |

A unique constraint on `(event_id, section, seat_number)` prevents duplicate seat records for the same event.

**Orders**

| Column            | Type                 | Purpose                                  |
| ----------------- | -------------------- | ---------------------------------------- |
| `id`              | BIGINT, primary key  | Unique order ID                          |
| `user_id`         | BIGINT, foreign key  | Customer who placed the order            |
| `status`          | VARCHAR(20)          | Pending, confirmed, failed, or cancelled |
| `total_amount`    | NUMERIC(10,2)        | Total order amount                       |
| `idempotency_key` | VARCHAR(100), unique | Prevent duplicate order creation         |
| `created_at`      | TIMESTAMPTZ          | Order creation time                      |

**Order Items**

| Column     | Type                | Purpose                    |
| ---------- | ------------------- | -------------------------- |
| `id`       | BIGINT, primary key | Unique item ID             |
| `order_id` | BIGINT, foreign key | Associated order           |
| `seat_id`  | BIGINT, foreign key | Seat being purchased       |
| `price`    | NUMERIC(10,2)       | Price recorded at purchase |

A unique constraint on `seat_id` in `order_items` prevents the same seat from being attached to two orders. This design assumes each seat is sold only once for its event.

**Seat Holds**

| Column       | Type                | Purpose                                 |
| ------------ | ------------------- | --------------------------------------- |
| `id`         | BIGINT, primary key | Unique hold ID                          |
| `seat_id`    | BIGINT, foreign key | Held seat                               |
| `user_id`    | BIGINT, foreign key | Customer holding the seat               |
| `expires_at` | TIMESTAMPTZ         | Hold expiry time                        |
| `status`     | VARCHAR(20)         | Active, released, expired, or converted |

Only one active, unexpired hold can control a seat at a time. This rule is enforced through the seat row lock and transaction logic; expired holds are ignored even if a cleanup worker has not yet run.

**Tickets**

| Column          | Type                        | Purpose           |
| --------------- | --------------------------- | ----------------- |
| `id`            | BIGINT, primary key         | Unique ticket ID  |
| `order_item_id` | BIGINT, unique, foreign key | Purchased seat    |
| `ticket_code`   | UUID, unique                | Ticket identifier |
| `issued_at`     | TIMESTAMPTZ                 | Ticket issue time |

### 4.2 Relationships

- One user can place many orders.
- One event has many seats.
- One seat can have many historical holds, but only one valid active hold at a time.
- One order can contain multiple order items.
- Each order item refers to one seat.
- Each purchased order item can have one ticket.

Foreign keys preserve referential integrity. Unique constraints prevent duplicate emails, event seat labels, order idempotency keys, seat purchases, and ticket codes.

## 5. Preventing Double-Booking

### 5.1 The Problem

A simple check-then-update sequence is unsafe. Two customers might both read a seat as available before either request changes its status. Both could then attempt to purchase it.

TicketHub prevents this with a PostgreSQL transaction, a row-level lock, conditional state changes, and database constraints.

### 5.2 Seat Reservation Transaction

The following simplified SQL illustrates the core reservation logic. The application first begins a transaction and locks the requested seat row.

```sql
BEGIN;

SELECT id, status, hold_expires_at
FROM seats
WHERE id = 815
  AND event_id = 42
FOR UPDATE;
```

`FOR UPDATE` locks the selected seat row until the transaction commits or rolls back. A competing reservation for the same row must wait.

After obtaining the lock, the application checks the current state. If the seat is sold, or has an active unexpired hold, it rolls back and returns `409 Conflict`.

If the seat is available or its previous hold has expired, the application updates it:

```sql
UPDATE seats
SET status = 'held',
    held_by_user_id = 123,
    hold_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = 815
  AND event_id = 42
  AND (
    status = 'available'
    OR (
      status = 'held'
      AND hold_expires_at <= NOW()
    )
  )
RETURNING id;
```

If no row is returned, the reservation failed. The application rolls back and reports that the seat is unavailable. Otherwise, it creates the corresponding hold record and commits:

```sql
INSERT INTO seat_holds
    (seat_id, user_id, expires_at, status)
VALUES
    (815, 123, NOW() + INTERVAL '5 minutes', 'active');

COMMIT;
```

The application must check that exactly one seat was updated and handle errors by rolling back. In a production implementation, the seat update and hold creation must always occur in the same transaction.

### 5.3 Why This Works

If two customers request the same seat at almost the same time:

1. The first transaction locks the seat row.
2. The second transaction waits for that lock.
3. The first transaction updates the seat and commits.
4. The second transaction obtains the lock and reads the latest state.
5. The second request sees the active hold or sold status and fails.

This prevents both requests from reserving the same seat. Database constraints provide additional protection if application code contains a mistake.

### 5.4 Payment Confirmation and Expiry

A hold is not a completed sale. When payment is initiated, the order remains pending until the payment provider confirms success.

The payment handler locks the relevant order and seat, verifies the payment result and reservation state, and changes the order to `confirmed` and the seat to `sold` in one database transaction. It then records the order item and issues a unique ticket. Retries must be idempotent.

If payment fails or the hold expires before purchase is completed, the system releases the seat safely. A background worker can process expired holds, but every new reservation must also check the expiry timestamp. Correctness must not depend only on the background worker running on time.

Payment-provider calls should not be made while holding a database transaction open. The system uses short transactions, idempotency keys, and payment-status reconciliation to handle delayed responses and retries.

## 6. System Architecture

### 6.1 Architecture Diagram

```text
Customers
    |
Web Browser / Mobile Client
    |
DNS and CDN
    |
Web Application Firewall (WAF)
    |
Virtual Waiting Room and Rate Limiter
    |
Load Balancer
    |
+---------------------------+
| Application Servers       |
| API, Authentication,      |
| Seat Holds, Orders        |
+---------------------------+
    |           |           |
    |           |           +---- Payment Provider
    |           |
    |           +---------------- Message Queue
    |                                  |
    |                            Background Workers
    |
    +---- Cache (event details and public data)
    |
    +---- PostgreSQL Primary
                 |
            Read Replica
                 |
          Reporting / Reads

Monitoring and Centralized Logging cover all services.
```

### 6.2 Component Responsibilities

- **Browser or mobile client:** displays events, seats, checkout, and tickets.
- **CDN:** delivers static files and cached public content close to users.
- **WAF and rate limiter:** block suspicious traffic and limit abusive requests.
- **Virtual waiting room:** controls how many customers enter the purchase flow at once.
- **Load balancer:** distributes requests across healthy application servers.
- **Application servers:** implement authentication, event browsing, seat reservation, orders, and payment handling.
- **Cache:** stores frequently requested public event information. It is not the source of truth for seat availability.
- **PostgreSQL primary:** owns authoritative seat status, holds, orders, and ticket records.
- **Read replica:** supports eligible read-heavy operations and reporting. It must not be used to decide whether a seat can be sold.
- **Message queue and background workers:** process expired holds, notifications, payment reconciliation, and other asynchronous tasks.
- **Payment provider:** securely processes payments.
- **Monitoring and logging:** track latency, queue length, database locks, reservation conflicts, payment failures, and service errors.

### 6.3 Handling a Popular Sale

For the 200,000-person sale, the waiting room admits customers at a controlled rate based on measured application and database capacity. Event information is cached, and multiple application servers handle admitted traffic.

Purchase requests are processed through short, controlled database transactions. PostgreSQL remains the final authority for whether a seat is available. When seats are sold, remaining customers receive an unavailable or sold-out response rather than a false confirmation.

Monitoring helps operators adjust admission rates and identify bottlenecks. If a component fails, the system should degrade safely without allowing duplicate sales.

## 7. Trade-Offs

### 7.1 Strong Consistency vs. Throughput

Locking seat rows and using transactions may reduce throughput when many people compete for the same seat. However, preventing double-booking is more important than accepting conflicting sales. Caching and a waiting room reduce unnecessary database pressure.

### 7.2 Fairness vs. Immediate Access

A virtual waiting room adds waiting time, but it helps control overload and reduces the advantage of customers who repeatedly refresh. The admission policy must be transparent and consistent.

### 7.3 Caching vs. Fresh Availability

Caching event descriptions and venue information improves performance. Seat availability changes frequently, so it must be checked against the authoritative database when a customer requests a hold or purchase.

### 7.4 Short Holds vs. Customer Convenience

Five-minute holds reduce the time seats remain unavailable to other customers, but some customers may need more time to complete payment. A clear countdown and safe payment-status reconciliation help balance convenience with inventory availability.

### 7.5 Read Replicas vs. Simpler Database Operations

Read replicas improve read capacity but may lag behind the primary database. They are suitable for event browsing and reporting, not for final seat allocation or payment confirmation.

## 8. Conclusion

TicketHub combines a REST API, relational data model, PostgreSQL transactions, row-level locking, a waiting room, caching, and horizontally scalable application servers. The traffic estimates show why peak sales require controlled admission and careful capacity planning. Most importantly, authoritative database checks and transactional seat updates prevent two customers from purchasing the same seat, while payment verification and idempotency protect order accuracy.
