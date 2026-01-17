---
layout: default
title: Technical Architecture
---

# Technical Architecture Documentation

## System Overview

The Real-Time Translation App is a full-stack web application designed for seamless multilingual communication. The system consists of three main layers: frontend client, backend API server, and database layer, with integration to external AI services.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
├──────────────────────────────────────────────────────────────┤
│  React SPA                                                    │
│  ├── React Router (Navigation)                               │
│  ├── Socket.IO Client (Real-time)                            │
│  ├── Axios (HTTP Requests)                                   │
│  └── i18next (Internationalization)                          │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼─────────────────────────────────────┐
│                     Application Layer                         │
├──────────────────────────────────────────────────────────────┤
│  Flask Application Server                                     │
│  ├── Flask Blueprints (Modular Routes)                       │
│  ├── Socket.IO Server (WebSocket)                            │
│  ├── Flask-JWT-Extended (Authentication)                     │
│  ├── SQLAlchemy ORM (Database)                               │
│  └── APScheduler (Background Tasks)                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│   MySQL DB     │ │ External │ │   File         │
│                │ │ APIs     │ │   Storage      │
│ - Users        │ │ - OpenAI │ │ - Avatars      │
│ - Chatrooms    │ │ - 11Labs │ │ - Audio        │
│ - Messages     │ │ - Stripe │ │ - Photos       │
│ - Friendships  │ │          │ │                │
└────────────────┘ └──────────┘ └────────────────┘
```

## Component Details

### 1. Frontend Architecture

#### Technology Stack
- **Framework**: React 18 with Hooks
- **State Management**: Context API + Local State
- **Routing**: React Router v6
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios
- **UI Components**: Custom components with CSS modules
- **Internationalization**: i18next

#### Key Components

**Authentication Flow**
```
Login/Register → JWT Token → LocalStorage → Axios Interceptor
```

**Real-time Messaging**
```
Socket Connection → Event Listeners → State Updates → UI Render
```

**File Structure**
```
src/
├── pages/              # Page components
│   ├── Chat/          # Chat interface
│   ├── Login/         # Auth pages
│   ├── MyPlan/        # Subscription
│   └── ...
├── components/         # Reusable components
├── locales/           # i18n translations
├── styles/            # CSS modules
└── globalState.js     # Global state management
```

### 2. Backend Architecture

#### Technology Stack
- **Framework**: Flask 2.x
- **WebSocket**: Flask-SocketIO + Eventlet
- **ORM**: SQLAlchemy
- **Authentication**: Flask-JWT-Extended
- **Database**: MySQL 8
- **Task Scheduler**: APScheduler
- **Server**: Gunicorn + Eventlet workers

#### Modular Structure

```
server/
├── app.py                 # Application entry point
├── config/
│   ├── config.py         # App configuration
│   └── constants.py      # Constants & settings
├── models/               # Database models
│   ├── user.py
│   ├── chatroom.py
│   ├── message.py
│   └── ...
├── routes/               # API blueprints
│   ├── auth.py          # Authentication
│   ├── user.py          # User management
│   ├── chatroom.py      # Chatroom operations
│   ├── message.py       # Messaging
│   └── ...
├── services/            # Business logic
│   ├── translation.py   # Translation service
│   ├── token_service.py # Token management
│   └── ...
├── socket_handlers/     # WebSocket events
│   └── events.py
└── utils/              # Utilities
    ├── helpers.py
    └── decorators.py
```

#### API Architecture

**RESTful Endpoints**
- Authentication: `/api/auth/*`
- User Management: `/api/user/*`
- Chatrooms: `/api/chatroom/*`
- Messages: `/api/messages/*`
- Payments: `/api/payment/*`

**WebSocket Events**
- Connection: `connect`, `disconnect`
- Messaging: `send_message`, `receive_message`
- Chatroom: `join_room`, `leave_room`
- Status: `user_typing`, `user_status`

### 3. Database Schema

#### Core Tables

**users**
- Primary Key: user_id (UUID)
- Authentication: email, password (hashed)
- Profile: username, avatar, language preferences
- Subscription: subscription_type, tokens, expiration
- Relationships: friendships, chatrooms, messages

**chatrooms**
- Primary Key: chatroom_id
- Settings: is_private, password, max_members
- Languages: source_language, target_language
- Creator: user_id (foreign key)
- Mode: token_spending_mode

**messages**
- Primary Key: message_id
- Content: message_content, message_type
- Translation: translated_content, original_language
- Media: audio_url, photo_url
- Timestamps: timestamp, sequence_id

**friendships**
- Composite Key: user_id, friend_id
- Status: is_accepted
- Timestamps: created_at

#### Relationships

```
User ──┬── 1:N ──→ Chatroom (creator)
       ├── N:M ──→ Chatroom (members)
       ├── 1:N ──→ Message
       └── N:M ──→ User (friendships)

Chatroom ──┬── 1:N ──→ Message
           └── N:M ──→ User (members)
```

### 4. Authentication & Security

#### JWT Token Flow

```
1. User Login → Server validates credentials
2. Server generates JWT with user_id, expiration
3. Client stores JWT in localStorage
4. Client sends JWT in Authorization header
5. Server validates JWT on protected routes
6. Token refresh before expiration
```

#### Security Measures

- Password hashing: bcrypt
- JWT tokens with expiration
- HTTPS in production
- CORS configuration
- Environment variables for secrets
- SQL injection prevention (ORM)
- XSS protection (input sanitization)

### 5. Real-time Communication

#### Socket.IO Architecture

**Connection Lifecycle**
```
Client Connect → Authentication → Room Join → Event Handling
```

**Message Flow**
```
User A sends message
    ↓
Client emits 'send_message'
    ↓
Server receives event
    ↓
Server processes (translate, save to DB)
    ↓
Server emits to room members
    ↓
Clients receive and display
```

**Room Management**
- Dynamic room creation/deletion
- User join/leave handling
- Room member synchronization
- Private room access control

### 6. AI Integration

#### Translation Service

**OpenAI GPT-4**
- Text translation
- Photo interpretation
- Context-aware translation
- Token usage tracking

**Workflow**
```
User Input → Language Detection → Translation Request → 
OpenAI API → Response Processing → Token Deduction → 
Store & Display
```

#### Voice Cloning

**ElevenLabs API**
- Voice message transcription
- Text-to-speech with voice cloning
- Audio file generation
- Storage management

### 7. Payment Integration

#### Stripe Integration

**Subscription Plans**
- Monthly subscription
- Annual subscription
- One-time payments
- Token packs

**Webhook Handling**
```
Stripe Event → Webhook Endpoint → Signature Verification →
Event Processing → Database Update → User Notification
```

### 8. Deployment Architecture

#### Docker Compose Setup

```
┌─────────────┐
│  Frontend   │ Port 3000
│  (React)    │
└──────┬──────┘
       │
┌──────▼──────┐
│  Backend    │ Port 5002
│  (Flask)    │
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │ Port 3306
│  (MySQL)    │
└─────────────┘
```

#### Production Setup

```
Internet
    ↓
Nginx (Reverse Proxy + SSL)
    ↓
┌───────────────────┐
│ Docker Containers │
│ ┌───────────────┐ │
│ │   Frontend    │ │
│ └───────────────┘ │
│ ┌───────────────┐ │
│ │   Backend     │ │
│ └───────────────┘ │
│ ┌───────────────┐ │
│ │   MySQL       │ │
│ └───────────────┘ │
└───────────────────┘
```

#### Nginx Configuration
- HTTPS termination (SSL)
- WebSocket proxy support
- Static file serving
- API reverse proxy
- Rate limiting

### 9. Performance Optimization

#### Frontend
- Code splitting (React.lazy)
- Image optimization
- Lazy loading
- Component memoization
- Bundle size optimization

#### Backend
- Database indexing
- Query optimization
- Connection pooling
- Caching strategies
- Background task processing

#### Real-time
- Socket.IO rooms for efficient broadcasting
- Message batching
- Connection keep-alive
- Reconnection strategies

### 10. Monitoring & Logging

#### Metrics Tracking
- User activity metrics
- API usage statistics
- Token consumption
- Error rates
- Performance metrics

#### Logging
- Application logs
- Error logging
- Access logs
- Audit trails

## Data Flow Examples

### 1. User Registration & Login

```
User enters credentials
    ↓
POST /api/register or /api/login
    ↓
Backend validates input
    ↓
Check user existence
    ↓
Hash password (register) / Verify password (login)
    ↓
Create JWT token
    ↓
Return token + user data
    ↓
Client stores token
    ↓
Redirect to chat interface
```

### 2. Send Translated Message

```
User types message
    ↓
Socket.emit('send_message', data)
    ↓
Server receives message
    ↓
Validate user & chatroom
    ↓
Detect language
    ↓
Call OpenAI API for translation
    ↓
Calculate token cost
    ↓
Deduct tokens from user
    ↓
Save message to database
    ↓
Socket.emit to room members
    ↓
Clients display translated message
```

### 3. Create & Join Chatroom

```
User creates chatroom
    ↓
POST /api/chatroom/create
    ↓
Generate unique chatroom code
    ↓
Save chatroom to database
    ↓
Add creator as member
    ↓
Return chatroom details + QR code data
    ↓
Other users scan QR code
    ↓
Navigate to /enter_chatroom/{code}
    ↓
POST /api/join-chatroom
    ↓
Verify access (password if private)
    ↓
Add user to chatroom
    ↓
Socket.emit('join_room')
    ↓
All room members notified
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Session storage in database
- Load balancer compatible
- Socket.IO Redis adapter for multi-server

### Database Scaling
- Read replicas
- Connection pooling
- Query optimization
- Indexing strategy

### Caching Strategy
- Redis for session data
- API response caching
- Static asset CDN
- Database query cache

## Future Enhancements

1. **Microservices Architecture**: Split services for better scalability
2. **Message Queue**: RabbitMQ/Redis for async processing
3. **CDN Integration**: CloudFront for static assets
4. **Advanced Analytics**: Dedicated analytics service
5. **Mobile Apps**: Native iOS/Android applications
6. **Video Chat**: WebRTC integration
7. **AI Improvements**: Custom translation models

## Development Guidelines

### Code Standards
- PEP 8 for Python
- ESLint for JavaScript
- Type hints for Python
- PropTypes for React

### Git Workflow
- Feature branches
- Pull request reviews
- CI/CD pipeline
- Automated testing

### Testing Strategy
- Unit tests (pytest, Jest)
- Integration tests
- E2E tests (Selenium, Cypress)
- Load testing

---

Last Updated: 2026-01

