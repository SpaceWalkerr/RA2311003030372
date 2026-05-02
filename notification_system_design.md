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
