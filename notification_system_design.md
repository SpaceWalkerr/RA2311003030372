# Notification System Design

## Stage 1

The notification service should allow the frontend to show campus updates after a user logs in. The main actions are:

- fetch notifications for a student
- fetch unread notifications
- mark one notification as read
- mark all notifications as read
- create a notification for a group of students
- support real-time notification delivery

### Common Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
```

### Get Notifications

```http
GET /api/v1/students/{studentId}/notifications?status=all&type=Placement&page=1&limit=20
```

Response:

```json
{
  "page": 1,
  "limit": 20,
  "total": 120,
  "notifications": [
    {
      "id": "n101",
      "studentId": "1042",
      "type": "Placement",
      "title": "Placement update",
      "message": "CSX Corporation hiring",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:18Z"
    }
  ]
}
```

### Get Unread Count

```http
GET /api/v1/students/{studentId}/notifications/unread-count
```

Response:

```json
{
  "studentId": "1042",
  "unreadCount": 8
}
```

### Mark Notification As Read

```http
PATCH /api/v1/students/{studentId}/notifications/{notificationId}/read
```

Response:

```json
{
  "id": "n101",
  "isRead": true,
  "readAt": "2026-04-22T18:05:00Z"
}
```

### Mark All As Read

```http
PATCH /api/v1/students/{studentId}/notifications/read-all
```

Response:

```json
{
  "studentId": "1042",
  "updatedCount": 8
}
```

### Create Notification

```http
POST /api/v1/notifications
```

Request:

```json
{
  "type": "Placement",
  "title": "Placement update",
  "message": "CSX Corporation hiring",
  "studentIds": ["1042", "1043"],
  "sendEmail": true
}
```

Response:

```json
{
  "notificationId": "n102",
  "status": "queued",
  "targetCount": 2
}
```

### Real-Time Notifications

Use WebSocket or Server-Sent Events after login.

```http
GET /api/v1/students/{studentId}/notifications/stream
```

Event payload:

```json
{
  "event": "notification.created",
  "data": {
    "id": "n102",
    "type": "Placement",
    "title": "Placement update",
    "message": "CSX Corporation hiring",
    "createdAt": "2026-04-22T18:10:00Z"
  }
}
```

## Stage 2

I would use PostgreSQL. Notifications, students, and read status are related data, so SQL is a good fit.

### Tables

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  notification_type notification_type NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE student_notifications (
  student_id BIGINT NOT NULL REFERENCES students(id),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  PRIMARY KEY (student_id, notification_id)
);
```

### Queries

Create a notification:

```sql
INSERT INTO notifications (id, notification_type, title, message)
VALUES ($1, $2, $3, $4);
```

Assign it to students:

```sql
INSERT INTO student_notifications (student_id, notification_id)
SELECT id, $1
FROM students
WHERE id = ANY($2);
```

Fetch notifications for a student:

```sql
SELECT n.id, n.notification_type, n.title, n.message, sn.is_read, n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
ORDER BY n.created_at DESC
LIMIT $2 OFFSET $3;
```

Mark one notification as read:

```sql
UPDATE student_notifications
SET is_read = true, read_at = NOW()
WHERE student_id = $1 AND notification_id = $2;
```

### Problems As Data Grows

As data grows, fetching unread notifications can become slow, and sending one notification to many students can create many rows.

Simple fixes:

- add indexes on commonly searched columns
- use pagination
- send large notifications in batches
- archive old notifications later

## Stage 3

Given query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

This query is correct for getting unread notifications, but it can be slow when the table becomes large. If there is no index, the database has to check many rows and then sort them by time.

I would not use `SELECT *`. I would fetch only the columns needed by the frontend:

```sql
SELECT id, notification_type, title, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC
LIMIT 20;
```

Useful index:

```sql
CREATE INDEX idx_student_read_created
ON notifications (student_id, is_read, created_at DESC);
```

This index helps because the query filters by student, filters unread rows, and sorts by latest time.

Adding indexes on every column is not a good idea. It uses more storage and makes insert/update slower. Indexes should be added only where queries need them.

Students who got placement notifications in the last 7 days:

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

## Stage 4

Fetching notifications from the database on every page load is not a good approach. If many students open pages at the same time, the database will get too many repeated requests.

I would change it like this:

- fetch only unread count on page load
- fetch full notifications only when the user opens the notification panel
- use pagination, for example latest 20 notifications first
- cache unread count for a short time
- use WebSocket or Server-Sent Events for new notifications

Tradeoffs:

- cache is faster, but the count may be slightly old for a few seconds
- WebSocket/SSE gives real-time updates, but it needs extra connection handling
- pagination reduces load, but the frontend has to request more pages when needed

Simple flow:

1. Page loads and calls unread count API.
2. User opens notification panel.
3. Frontend calls notification list API with `limit` and `page`.
4. New notifications are pushed using WebSocket/SSE.

## Stage 5

The method given has a flaw because it sends email, inserts data into a database, and pushes an app all at the same time in one loop. If email fails after some students have been processed, the system will be stuck in a half-finished state.

Main problems:
- One slow email call can slow down the whole thing.
- Trying again can cause notifications to be sent twice.
- It's hard to keep track of some students who fail.
- You shouldn't have to deal with 50,000 students in one request.

Sending an email and saving to the database shouldn't be too closely linked. Save the notification and the people who will get it first. Then, use background jobs to send emails and app pushes.

Revised pseudocode:

```text
function notify_all(student_ids, message, type):
    notification_id = save_notification(type, message)

    for batch in split(student_ids, 1000):
        save_recipients(notification_id, batch)
        add_job("send_email", notification_id, batch)
        add_job("push_app", notification_id, batch)

    return notification_id

worker send_email(notification_id, batch):
    for student_id in batch:
        try:
            send_email_to_student(student_id, notification_id)
            mark_email_sent(student_id, notification_id)
        catch:
            mark_email_failed(student_id, notification_id)
            retry_later(student_id, notification_id)

worker push_app(notification_id, batch):
    for student_id in batch:
        push_notification(student_id, notification_id)
```

If email fails for 200 students, only those 200 should be retried. The already successful students should not be processed again.

## Stage 6

For the priority inbox, I used this order:

```text
Placement > Result > Event
```

If two notifications have the same type the newer one comes first.

The code fetches notifications from the provided API sorts them, and returns the top 10. The implementation is in:

```text
notification_app_be/priorityInbox.js
```

To keep top 10 updated when new notifications come in, I would insert the new notification into the current top list, sort it again, and remove extra items after 10. Since the list size is small, this is simple and fast.

Run:

```bash
cd notification_app_be
npm run run
```

Or start local API:

```bash
npm start
```

Endpoint:

```http
GET /priority-inbox?limit=10
```
