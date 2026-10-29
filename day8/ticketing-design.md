# TicketHub: Event Ticketing System Design

## 1. Requirements

### 1.1 Functional Requirements

TicketHub is a website that allows users to discover events, select seats, purchase tickets, and view their bookings.

The system must:

1. Allow users to register, log in, and manage their accounts.
2. Allow users to browse, search, and filter concerts and other events.
3. Display event details, venue information, ticket prices, and seat availability.
4. Allow users to select and temporarily hold available seats.
5. Allow users to pay securely for held seats.
6. Confirm successful orders and issue tickets with unique identifiers.
7. Allow users to view their purchased tickets and order history.
8. Release seats automatically when a reservation expires without payment.
9. Prevent two customers from purchasing the same seat for the same event.
10. Provide clear messages when seats are unavailable or payments fail.

### 1.2 Non-Functional Requirements

**Speed**

- Event listings and event details should load within 300 ms at the 95th percentile under normal conditions.
- Seat availability should update quickly enough to support a smooth booking experience.
- The system should remain responsive during popular concert sales.

**Correctness and consistency**

- A seat must never be sold to more than one customer for the same event.
- Orders must only be confirmed after successful payment verification.
- Seat reservations and order records must remain consistent.
- Expired or cancelled reservations must not permanently block seats.

**Fairness**

- The system should use a fair, documented queue for high-demand sales.
- Customers should receive clear information about their queue position or waiting status.
- Automated bots and excessive repeated requests should be limited.
- The queue should prevent customers from gaining unfair advantages by repeatedly refreshing.

**Availability and scalability**

- The system should handle normal traffic and scale during major ticket releases.
- Multiple application servers should reduce dependence on a single server.
- Failed components should be detected and recovered where possible.

**Security**

- Use HTTPS to protect communication.
- Authenticate customers before allowing purchases.
- Validate requests and enforce access controls.
- Never store raw payment card details; use a trusted payment provider.
- Protect customer information and order records.

**Reliability**

- Record confirmed orders durably.
- Handle payment timeouts and retries without charging customers twice.
- Monitor errors, latency, payment failures, and seat reservation conflicts.
- Back up important data and test recovery procedures.

## 2. Traffic and Capacity Estimates

### 2.1 Normal Traffic

TicketHub has 2 million registered users. On a normal day, 50,000 people visit the website, and each visitor views 10 pages.

**Daily page views**

50,000 visitors × 10 pages = 500,000 page views per day.

**Average page requests per second**

500,000 ÷ 86,400 seconds per day ≈ 5.8 page requests per second.

This is an average estimate. Actual traffic will vary by time of day. Page views also do not represent every API request because one page may make multiple API calls.

**Ticket sales**

The system sells 5,000 tickets on a normal day. This averages approximately 0.058 tickets sold per second, or about 3.5 tickets per minute. Sales are not expected to occur evenly throughout the day.

### 2.2 Popular Concert Sale

When a popular concert goes on sale, 200,000 people try to buy 20,000 seats within the first 10 minutes.

**Average arrival rate**

10 minutes × 60 seconds = 600 seconds.

200,000 people ÷ 600 seconds ≈ 333 people arriving per second.

**Seat demand**

200,000 potential buyers ÷ 20,000 available seats = 10 potential buyers per seat.

Only 10% of these potential buyers can receive a seat if every person wants one seat and all 20,000 seats are sold. The other customers must receive a clear sold-out or unavailable message.

**Illustrative request-rate estimate**

If each arriving person generates an average of 5 API requests during the sale, the system may receive approximately:

333 people per second × 5 requests = 1,665 API requests per second on average.

This is a planning assumption, not a supplied fact. Actual request volume depends on page design, retries, polling, queue behavior, and customer activity. Short bursts could be substantially higher.

### 2.3 Comparison and Design Implications

Normal traffic averages approximately 5.8 page requests per second, while the illustrative popular-sale estimate is approximately 1,665 API requests per second. This is about 287 times the normal average page-request rate, although the comparison uses different request assumptions and should be treated as approximate.

The system should therefore use a virtual waiting room, rate limiting, horizontally scalable application servers, caching for event information, and a reliable queue for purchase attempts. Seat allocation and payment confirmation must remain correct even when requests arrive concurrently.

The waiting room should release customers at a controlled rate based on measured system capacity. It must not promise a seat merely because someone entered the queue.
