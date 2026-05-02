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
