# SnapShare Photo-Sharing App: Scaling Plan

## 1. Assumptions

This scaling plan uses the following assumptions:

- SnapShare has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo has an average size of 2 MB.
- Each photo generates one thumbnail of 50 KB.
- A day has 86,400 seconds, and a year has 365 days.
- Storage estimates use decimal units: 1,000 MB = 1 GB and 1,000 GB = 1 TB.
- All original photos and thumbnails are retained for one year.
- The peak feed-view rate is estimated at five times the average rate.
- Storage estimates exclude backups, replicas, metadata, and other overhead.

## 2. Capacity Calculations

### Daily active users

Daily active users (DAU) = Registered users × Daily activity percentage

DAU = 10,000,000 × 0.10

**DAU = 1,000,000 users**

### Daily photo uploads

Each active user uploads one photo per day.

Daily uploads = 1,000,000 × 1

**Daily uploads = 1,000,000 photos**

### Average uploads per second

Uploads per second = Daily uploads ÷ Seconds per day

= 1,000,000 ÷ 86,400

**Average upload rate ≈ 11.57 uploads per second**, or approximately 12 uploads per second.

### Daily feed views

Daily feed views = Daily active users × Feed pages per user per day

= 1,000,000 × 50

**Daily feed views = 50,000,000**

### Average feed views per second

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed rate ≈ 578.70 feed views per second**, or approximately 579 per second.

### Peak feed views per second

Peak rate = Average feed rate × Peak factor

= (50,000,000 ÷ 86,400) × 5

**Peak feed rate ≈ 2,893.52**, or approximately 2,894 feed views per second.

This is a planning estimate based on the specified 5× peak factor.

### Annual original-photo storage

Daily original-photo storage = 1,000,000 × 2 MB

= 2,000,000 MB = 2 TB per day

Annual original-photo storage = 2 TB × 365

**Annual original-photo storage = 730 TB**

### Annual thumbnail storage

Daily thumbnail storage = 1,000,000 × 50 KB

= 50,000,000 KB = 50 GB per day

Annual thumbnail storage = 50 GB × 365

= 18,250 GB

**Annual thumbnail storage = 18.25 TB**

### Total annual photo storage

Total = Original-photo storage + Thumbnail storage

= 730 TB + 18.25 TB

**Total annual storage = 748.25 TB**

This is the estimated additional storage required for one year of uploads and thumbnails, assuming all files are retained. The estimate excludes backups, replicas, metadata, and storage overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** under the given assumptions.

It handles 50 million feed-page views per day compared with one million photo uploads per day. This represents approximately 50 feed-page views for every photo upload.

The design should therefore optimize read performance by using a CDN to deliver images, a cache to reduce repeated feed queries, and a database read replica to handle read traffic separately from writes. App servers should also scale horizontally to handle increased request volume.

The system must still support reliable photo uploads, but feed retrieval is expected to place greater demand on the system.

## 4. Why Photos Belong in Object Storage

Original photos and thumbnails should be stored in object storage rather than directly inside relational database tables.

Object storage services, such as Amazon S3, Azure Blob Storage, or Google Cloud Storage, are designed to store large numbers of files and scale as data grows. They can also integrate with a CDN to deliver images efficiently.

The relational database should store metadata such as the photo ID, user ID, caption, upload timestamp, and object-storage key. This keeps database records smaller and makes metadata easier to query without transferring large image files through the database.

## 5. Text Architecture Diagram

```text
                       +----------------------+
                       |    Mobile / Web      |
                       |        Users         |
                       +----------+-----------+
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
          +-------------------+       +--------------------+
          |   Load Balancer   |       |        CDN         |
          | API Traffic       |       | Photos/Thumbnails  |
          +---------+---------+       +---------+----------+
                    |                           |
              +-----+-----+                     | Cache miss
              |           |                     v
              v           v           +--------------------+
        +-----------+ +-----------+   |   Object Storage   |
        | App Server| | App Server|   | Original Photos    |
        |     1     | |     2     |   |    & Thumbnails    |
        +-----+-----+ +-----+-----+   +---------+----------+
              |             |                   ^
              +------+------+                   |
                     |                           |
             +-------+--------+                  |
             |                |                  |
             v                v                  |
       +-----------+  +-------------------+      |
       |   Cache   |  | Database Primary  |      |
       | Feed Data |  | Metadata/Writes   |      |
       +-----------+  +---------+---------+      |
                                |                |
                                | Replication    |
                                v                |
                       +-------------------+     |
                       | Database Read     |     |
                       | Replica           |     |
                       +-------------------+     |
                                                 |
       Thumbnail processing:                     |
                                                 |
       App Server --> +-------------------+      |
                      | Thumbnail Job     |      |
                      | Queue             |      |
                      +---------+---------+      |
                                |                |
                                v                |
                      +-------------------+      |
                      | Thumbnail Worker  |------+
                      | Generate Thumbnail|
                      +-------------------+
```

## 6. Component Explanations

- **Mobile/Web Users:** Users upload photos and request feed pages through the application.
- **CDN:** Caches and delivers original photos and thumbnails close to users, reducing latency and repeated requests to object storage.
- **Load Balancer:** Distributes incoming API requests across healthy app servers to prevent one server from becoming overloaded.
- **App Servers:** Authenticate requests, apply application logic, manage photo metadata, retrieve feed data, and coordinate uploads and background jobs.
- **Cache:** Stores frequently requested feed data and other reusable results to reduce database queries and improve response times.
- **Database Primary:** Stores authoritative metadata and handles new photo records and other database writes.
- **Database Read Replica:** Serves suitable read queries using replicated data, reducing read pressure on the primary database.
- **Object Storage:** Stores the original image files and generated thumbnails independently of the relational database.
- **Thumbnail Job Queue:** Holds thumbnail-generation jobs so that uploads do not have to wait for image processing to finish.
- **Thumbnail Worker:** Pulls jobs from the queue, retrieves the original image from object storage, generates a smaller thumbnail, stores it back in object storage, and records or updates its storage key when necessary.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it through the mobile or web application.
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server authenticates the user and validates the request, including file type and size.
4. The app server stores the original photo in object storage under a unique object key.
5. The app server writes a metadata record to the primary database, including the photo ID, owner ID, caption, upload time, and original-image object key.
6. The app server places a thumbnail-generation job on the queue. The job contains the photo ID and the original-image object key.
7. The app server returns an upload-success response once the required original-file and metadata writes have succeeded and the job has been safely queued. The thumbnail may still be processing.
8. A thumbnail worker pulls the job from the queue when it is ready to process it.
9. The worker retrieves the original image from object storage and generates a smaller 50 KB thumbnail, subject to the image-processing settings.
10. The worker saves the thumbnail in object storage under its own unique object key.
11. The worker updates the photo metadata with the thumbnail key if that key is stored separately. If the thumbnail key is deterministic, the system can instead derive it consistently.
12. The worker acknowledges the job after successful processing. If processing fails, the job can be retried, with a dead-letter queue used for jobs that repeatedly fail.
13. When a follower requests a feed containing the photo, an app server retrieves the feed metadata from the cache or database read replica and returns the relevant image references.
14. The CDN serves cached images when available and retrieves uncached images from object storage.

The queue and worker allow thumbnail processing to happen asynchronously. This reduces upload waiting time and allows image processing to scale independently from API traffic.

## 8. Architectural Trade-Offs

### Trade-off 1: Database Read Replicas Versus Immediate Consistency

**Benefit:** A read replica can handle many feed and metadata queries, reducing the workload on the primary database.

**Cost:** Replication is often asynchronous, so a recently uploaded photo may not immediately appear in a follower's feed if the feed query uses a replica that has not caught up.

**Mitigation:** After a successful upload, the application can temporarily read the new photo from the primary database, return the uploaded photo directly to its owner, or use a short-lived consistency mechanism until replication catches up.

### Trade-off 2: CDN and Cache Performance Versus Freshness

**Benefit:** Caching images and feed data reduces latency, database load, and repeated object-storage requests.

**Cost:** Cached feed data or images may become stale after a photo is uploaded, edited, or deleted.

**Mitigation:** Use appropriate cache expiration times, invalidate affected cache entries when content changes, and use versioned object keys for updated images.

### Trade-off 3: Asynchronous Thumbnail Processing Versus Immediate Availability

**Benefit:** A queue allows uploads to complete without waiting for thumbnail generation, and workers can scale independently.

**Cost:** Thumbnails may not be available immediately, and a growing queue can delay processing during busy periods.

**Mitigation:** Monitor queue depth and processing delay, add workers when needed, retry transient failures, and provide a temporary placeholder or original-image fallback when a thumbnail is unavailable.

### Trade-off 4: Object Storage and CDN Versus Operational Complexity

**Benefit:** Object storage provides scalable file storage, while a CDN improves delivery speed and reduces repeated origin requests.

**Cost:** The architecture introduces additional services, permissions, monitoring, storage costs, and possible data-transfer charges.

**Mitigation:** Use consistent object naming, least-privilege access controls, lifecycle policies where appropriate, and monitoring for storage, CDN, and request costs.

## 9. Conclusion

SnapShare should use a horizontally scalable application architecture with a load balancer, multiple app servers, a cache, a primary database with a read replica, object storage, a CDN, and a queue-based thumbnail-processing worker.

The capacity estimates are one million daily active users, approximately 12 uploads per second on average, approximately 579 average feed views per second, approximately 2,894 peak feed views per second, and 748.25 TB of additional original-photo and thumbnail storage per year.

This design prioritizes read performance while supporting reliable uploads, asynchronous image processing, scalable storage, and explicit handling of consistency and failure scenarios.
