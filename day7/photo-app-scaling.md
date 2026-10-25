# SnapShare: Photo-App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The following assumptions are used for this scaling plan:

- SnapShare has 10 million registered users.
- 10% of registered users are active daily.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo generates one thumbnail averaging 50 KB.
- A day contains 86,400 seconds, and a year contains 365 days.
- Peak feed traffic is five times the average traffic.
- Storage calculations use decimal units: 1 TB = 1,000,000 MB.
- No photos are deleted, and no compression savings are assumed.
- Storage estimates exclude backups, database metadata, and additional replicas.

## 2. Traffic and Storage Estimates

### Daily active users

Daily active users (DAU) are calculated as:

10,000,000 registered users × 10% = **1,000,000 daily active users**

### Photo uploads per second

Each active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = 1,000,000 photos.

Average uploads per second = 1,000,000 ÷ 86,400 = **approximately 11.6 uploads per second**.

For additional planning, if upload traffic also experiences a five-times peak, the system should handle approximately 58 uploads per second during that peak. This is a planning assumption because the supplied five-times factor applies specifically to feed views.

### Feed views per second

Each active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50 = 50,000,000 feed pages.

Average feed views per second = 50,000,000 ÷ 86,400 = **approximately 579 feed views per second**.

Peak feed views per second = 579 × 5 = **approximately 2,895 feed views per second**.

The architecture should therefore support roughly 2,900 feed requests per second at the estimated peak, with additional capacity for unexpected traffic spikes.

### Photo storage per year

**Original photos**

Daily original-photo storage = 1,000,000 × 2 MB = 2,000,000 MB, or 2 TB per day.

Annual original-photo storage = 2 TB × 365 = **730 TB per year**.

**Thumbnails**

Daily thumbnail storage = 1,000,000 × 50 KB = 50,000,000 KB, or 50 GB per day.

Annual thumbnail storage = 50 GB × 365 = **18.25 TB per year**.

**Total photo storage**

Total annual storage = 730 TB + 18.25 TB = **748.25 TB per year**.

SnapShare should plan for approximately 748.25 TB of new photo and thumbnail data annually before accounting for backups, replication, metadata, and future growth.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** based on the supplied workload.

There are 50 million feed views per day compared with 1 million photo uploads per day, giving approximately 50 feed views for every upload. Feed requests also reach an estimated peak of about 2,895 requests per second.

This means the architecture should prioritize fast feed delivery, caching, horizontal scaling of application servers, and database read replicas. Uploads must still be reliable, but frequently requested feed data and photo files should be served without repeatedly loading the primary database.

## 4. Where Photo Files Should Be Stored

Photo files should be stored in object storage rather than directly inside the relational database.

Storing large image files in the database would increase database size, backups, and query overhead. It could also make database maintenance and scaling more expensive.

Instead, object storage should hold the original photos and generated thumbnails. The database should store metadata such as photo ID, owner ID, object-storage key, upload timestamp, caption, and visibility settings. This separation allows the database to manage relationships and searchable information while object storage handles large files efficiently.

## 5. Text-Based Architecture Diagram

```text
                         USERS
                           |
                           v
                 +-------------------+
                 |        CDN        |
                 | Cached images and |
                 | static content    |
                 +-------------------+
                           |
                 Feed/API requests
                           |
                           v
                 +-------------------+
                 |  Load Balancer    |
                 +-------------------+
                           |
                           v
                 +-------------------+
                 |   App Servers     |
                 | Horizontally      |
                 | scalable services |
                 +-------------------+
                    |       |       |
                    |       |       +----------------------+
                    |       |                              |
                    v       v                              v
              +---------+ +----------------+       +---------------+
              |  Cache  | | Primary DB     |------>| Read Replica  |
              |         | | Users, photo   |       | Feed metadata  |
              | Feed    | | metadata,      |       | and read      |
              | data    | | relationships  |       | queries       |
              +---------+ +----------------+       +---------------+
                    ^
                    |
               Cached results

 Photo upload:
 Users --> Load Balancer --> App Servers --> Object Storage
                                   |                |
                                   |                | Original photo
                                   v                v
                              +-----------+   +----------------+
                              |  Queue    |   | Object Storage |
                              | Thumbnail |   | Originals and  |
                              | jobs      |   | thumbnails     |
                              +-----------+   +----------------+
                                   |
                                   v
                              +-----------+
                              | Thumbnail |
                              | Worker    |
                              +-----------+
                                   |
                                   v
                              Object Storage
                              (save thumbnail)
```

The CDN is primarily used to deliver photo files and other cacheable content. The load balancer routes incoming application requests to healthy app servers. App servers handle upload requests, feed generation, authentication, and coordination with other services.

## 6. Components and the Problems They Solve

1. **CDN:** Serves frequently requested photos and thumbnails from locations closer to users, reducing latency and traffic reaching the origin.
2. **Load balancer:** Distributes incoming requests across healthy app servers to prevent one server from becoming overloaded.
3. **App servers:** Execute application logic for uploads, feed generation, permissions, and communication with the database and storage services.
4. **Cache:** Keeps frequently accessed feed data and metadata in fast memory to reduce repeated database queries and improve response times.
5. **Primary database:** Stores structured data such as user accounts, photo metadata, follow relationships, and references to stored photo files.
6. **Database read replica:** Handles suitable read queries so that feed traffic places less pressure on the primary database.
7. **Object storage:** Stores original photos and thumbnails separately from the database, allowing photo storage to grow without making the database excessively large.
8. **Queue:** Holds thumbnail-generation jobs so uploads can finish without waiting for image processing to complete.
9. **Thumbnail worker:** Processes queued jobs, generates smaller versions of photos, and saves the resulting thumbnails to object storage.

The primary database remains responsible for writes, and the read replica receives changes from it; replication may introduce a short delay before new metadata becomes visible on the replica.

## 7. Photo Upload Flow

1. A user selects a photo and submits an upload request through the SnapShare application.
2. The load balancer forwards the request to a healthy app server.
3. The app server authenticates the user, checks upload permissions, and validates the file type and size.
4. The app server creates a photo record or upload reference in the primary database and assigns a unique storage key.
5. The original photo is uploaded to object storage under that key. A production implementation can use a secure, time-limited upload URL so the client uploads directly to object storage without routing the entire file through an app server.
6. After the original upload succeeds, the application confirms that the photo is stored and places a thumbnail-generation job on the queue.
7. A thumbnail worker retrieves the queued job and reads the original photo from object storage.
8. The worker resizes the image, generates a thumbnail, and stores it in object storage using a separate thumbnail key.
9. The worker updates the photo's processing status or thumbnail reference in the primary database.
10. When a user requests a feed, the app servers retrieve the required feed metadata, using the cache and read replica where appropriate, and return photo references or CDN URLs.
11. The CDN serves the original or thumbnail image to the user, reducing repeated requests to object storage.

If thumbnail processing fails, the job should be retried safely, and the original photo should remain available. Upload and processing statuses help the application distinguish between a completed upload and a thumbnail that is still being generated.

## 8. Trade-Offs

### Trade-off 1: Caching versus freshness

Caching improves feed performance and reduces database load, but cached information may become stale. For example, a deleted photo or changed privacy setting might briefly remain visible if invalidation is delayed. SnapShare should use expiration policies and invalidate or refresh relevant cache entries when important data changes.

### Trade-off 2: Asynchronous thumbnail generation versus immediate availability

Using a queue and worker allows users to upload photos without waiting for thumbnail processing, improving perceived upload speed. However, thumbnails may not be available immediately, and queue failures can delay processing. SnapShare should monitor queue depth, retry failed jobs, and show a processing state until the thumbnail is ready.

### Trade-off 3: Read replicas versus consistency

Read replicas improve read capacity by distributing feed queries, but replication lag can cause a newly uploaded photo or recent update to appear late in a feed. SnapShare can use the primary database for critical read-after-write operations and replicas for less time-sensitive feed reads.

### Trade-off 4: Object storage and CDN versus operational complexity

Object storage and a CDN provide scalable image delivery, but introduce extra configuration, access-control, cache-invalidation, and cost-management requirements. Private photos need authorization controls, and CDN caching rules must respect each photo's visibility settings.

## 9. Conclusion

SnapShare has approximately 1 million daily active users, 11.6 average photo uploads per second, 579 average feed views per second, and a projected peak of about 2,895 feed views per second. New originals and thumbnails require approximately 748.25 TB of storage per year under the stated assumptions.

Because the application is read-heavy, it should scale feed delivery using a CDN, caching, load-balanced app servers, and a database read replica. Original photos and thumbnails belong in object storage, while a queue and thumbnail worker process images asynchronously. This design separates responsibilities and allows the system to scale as its users and photo library grow.
