---
layout: default
title: API Documentation
---

# API Documentation

## Base URL

```
Development: http://localhost:5002
Production: https://your-domain.com
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Authentication Endpoints

### Register User

**POST** `/api/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "user_id": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

### Login

**POST** `/api/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "user_id": "uuid",
    "username": "string",
    "email": "string",
    "tokens": "float"
  }
}
```

### Logout

**POST** `/api/logout`

Logout current user (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Google OAuth Login

**GET** `/api/auth/google`

Initiate Google OAuth flow.

**GET** `/api/auth/google/callback`

Google OAuth callback endpoint.

## User Endpoints

### Get User Profile

**GET** `/api/user/profile`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user_id": "uuid",
  "username": "string",
  "email": "string",
  "avatar": "url",
  "tokens": "float",
  "subscription_type": "string",
  "subscription_expiration": "datetime",
  "language_preference": "string"
}
```

### Update User Profile

**PUT** `/api/user/update`

Update user profile information.

**Request Body:**
```json
{
  "username": "string",
  "language_preference": "string",
  "avatar": "file"
}
```

### Change Password

**POST** `/api/change-password`

Change user password.

**Request Body:**
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

## Chatroom Endpoints

### Create Chatroom

**POST** `/api/chatroom/create`

Create a new chatroom.

**Request Body:**
```json
{
  "chatroom_name": "string",
  "source_language": "string",
  "target_language": "string",
  "is_private": "boolean",
  "password": "string (optional)",
  "max_members": "integer",
  "token_spending_mode": "string"
}
```

**Response:**
```json
{
  "chatroom_id": "integer",
  "chatroom_code": "string",
  "chatroom_name": "string",
  "qr_code_data": "string"
}
```

### Join Chatroom

**POST** `/api/join-chatroom`

Join an existing chatroom.

**Request Body:**
```json
{
  "chatroom_code": "string",
  "password": "string (optional)"
}
```

### Get Chatroom Details

**GET** `/api/chatroom/<chatroom_id>`

Get details of a specific chatroom.

**Response:**
```json
{
  "chatroom_id": "integer",
  "chatroom_name": "string",
  "source_language": "string",
  "target_language": "string",
  "members": [
    {
      "user_id": "uuid",
      "username": "string",
      "avatar": "url"
    }
  ],
  "created_at": "datetime"
}
```

### Get User Chatrooms

**GET** `/api/user/chatrooms`

Get all chatrooms the user is a member of.

**Response:**
```json
{
  "chatrooms": [
    {
      "chatroom_id": "integer",
      "chatroom_name": "string",
      "unread_count": "integer",
      "last_message": "string",
      "last_message_time": "datetime"
    }
  ]
}
```

### Leave Chatroom

**POST** `/api/chatroom/leave`

Leave a chatroom.

**Request Body:**
```json
{
  "chatroom_id": "integer"
}
```

### Delete Chatroom

**DELETE** `/api/chatroom/<chatroom_id>`

Delete a chatroom (creator only).

## Message Endpoints

### Get Messages

**GET** `/api/messages/<chatroom_id>`

Get messages from a chatroom.

**Query Parameters:**
- `limit`: Number of messages (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "messages": [
    {
      "message_id": "integer",
      "user_id": "uuid",
      "username": "string",
      "message_content": "string",
      "translated_content": "string",
      "message_type": "text|voice|photo",
      "timestamp": "datetime",
      "audio_url": "url",
      "photo_url": "url"
    }
  ]
}
```

### Send Message (HTTP)

**POST** `/api/send-message`

Send a text message.

**Request Body:**
```json
{
  "chatroom_id": "integer",
  "message_content": "string",
  "message_type": "text"
}
```

### Upload Voice Message

**POST** `/api/upload-voice`

Upload and translate voice message.

**Request Body (multipart/form-data):**
- `audio`: Audio file
- `chatroom_id`: Integer
- `language`: String

### Upload Photo

**POST** `/api/upload-photo`

Upload photo for translation/interpretation.

**Request Body (multipart/form-data):**
- `photo`: Image file
- `chatroom_id`: Integer

## Friend Endpoints

### Send Friend Request

**POST** `/api/friend/request`

Send a friend request.

**Request Body:**
```json
{
  "friend_id": "uuid"
}
```

### Accept Friend Request

**POST** `/api/friend/accept`

Accept a friend request.

**Request Body:**
```json
{
  "friend_id": "uuid"
}
```

### Get Friends List

**GET** `/api/friends`

Get user's friends list.

**Response:**
```json
{
  "friends": [
    {
      "user_id": "uuid",
      "username": "string",
      "avatar": "url",
      "status": "online|offline"
    }
  ]
}
```

### Search Users

**GET** `/api/users/search`

Search for users.

**Query Parameters:**
- `query`: Search term

**Response:**
```json
{
  "users": [
    {
      "user_id": "uuid",
      "username": "string",
      "avatar": "url"
    }
  ]
}
```

## Payment Endpoints

### Create Checkout Session

**POST** `/api/create-checkout-session`

Create a Stripe checkout session.

**Request Body:**
```json
{
  "plan_type": "monthly|annual|monthly_onetime|annual_onetime"
}
```

**Response:**
```json
{
  "sessionId": "stripe-session-id"
}
```

### Stripe Webhook

**POST** `/api/stripe-webhook`

Handle Stripe webhook events.

**Headers:**
```
Stripe-Signature: <signature>
```

### Get Subscription Status

**GET** `/api/subscription/status`

Get user's subscription status.

**Response:**
```json
{
  "subscription_type": "string",
  "expiration": "datetime",
  "tokens_remaining": "float",
  "is_active": "boolean"
}
```

## Notification Endpoints

### Get Notifications

**GET** `/api/notifications`

Get user notifications.

**Response:**
```json
{
  "notifications": [
    {
      "notification_id": "integer",
      "type": "string",
      "content": "string",
      "is_read": "boolean",
      "created_at": "datetime"
    }
  ]
}
```

### Mark Notification as Read

**POST** `/api/notification/read/<notification_id>`

Mark a notification as read.

## WebSocket Events

### Connection

**Event:** `connect`

Establish WebSocket connection.

**Client Emits:**
```javascript
socket.emit('connect')
```

### Join Room

**Event:** `join_room`

Join a chatroom for real-time updates.

**Client Emits:**
```javascript
socket.emit('join_room', {
  chatroom_id: 123,
  user_id: 'uuid'
})
```

### Send Message

**Event:** `send_message`

Send a real-time message.

**Client Emits:**
```javascript
socket.emit('send_message', {
  chatroom_id: 123,
  message_content: 'Hello',
  message_type: 'text'
})
```

**Server Emits to Room:**
```javascript
socket.on('receive_message', (data) => {
  // Handle received message
})
```

### Leave Room

**Event:** `leave_room`

Leave a chatroom.

**Client Emits:**
```javascript
socket.emit('leave_room', {
  chatroom_id: 123
})
```

### Typing Indicator

**Event:** `user_typing`

Notify others when user is typing.

**Client Emits:**
```javascript
socket.emit('user_typing', {
  chatroom_id: 123,
  username: 'John'
})
```

**Server Emits to Room:**
```javascript
socket.on('user_typing', (data) => {
  // Show typing indicator
})
```

### User Status

**Event:** `user_status`

Update user online/offline status.

**Client Emits:**
```javascript
socket.emit('user_status', {
  status: 'online'
})
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- Authentication: 5 requests per minute
- General API: 60 requests per minute
- WebSocket: 100 events per minute

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit`: Items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

## Language Codes

Supported languages (ISO 639-1 codes):

- `en`: English
- `zh`: Chinese (Simplified)
- `ja`: Japanese
- `ko`: Korean
- `es`: Spanish
- `fr`: French
- `de`: German
- `it`: Italian
- `pt`: Portuguese
- `ru`: Russian
- And 40+ more languages...

---

Last Updated: 2026-01

