# Real-Time Translation App

A modern, real-time multilingual instant messaging application with advanced AI-powered translation capabilities.

## Overview

This application provides seamless real-time communication across language barriers, combining instant messaging features with AI-powered translation, voice cloning, and collaborative chatroom capabilities.

## Key Features

### Core Functionality
- Real-time instant messaging with WebSocket support
- AI-powered text translation (50+ languages)
- Voice message translation with voice cloning
- Photo/image translation and interpretation
- Multi-user chatroom support

### User Experience
- Guest mode for quick access
- Private and public chatrooms
- QR code room sharing
- Customizable language preferences
- Token-based usage system

### Advanced Features
- Speech-to-text transcription
- Voice cloning for translated audio
- Location-based features
- User friendship system
- Subscription management with Stripe
- Enterprise referral codes

## Technology Stack

### Frontend
- React 18
- Socket.IO Client
- Material Icons
- React Router
- i18next (internationalization)
- Stripe.js (payments)
- Chart.js (analytics)

### Backend
- Python Flask
- Socket.IO
- SQLAlchemy (ORM)
- MySQL 8
- JWT authentication
- OpenAI API
- ElevenLabs API

### Infrastructure
- Docker & Docker Compose
- Nginx (reverse proxy)
- Eventlet (async support)
- Gunicorn (production server)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 14+ (for local development)
- Python 3.9+ (for local development)

### Environment Setup

1. Clone the repository
```bash
git clone <your-repo-url>
cd stealth-translation-git
```

2. Configure environment variables

Backend (.env in server directory):
```bash
cp server/.env.example server/.env
# Edit server/.env with your actual values
```

Frontend (.env in root directory):
```bash
cp .env.frontend.example .env
# Edit .env with your actual values
```

3. Start with Docker Compose
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5002

## Configuration

### Required Environment Variables

#### Backend Configuration
- `SECRET_KEY`: Flask secret key
- `JWT_SECRET_KEY`: JWT token signing key
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`: Database credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `STRIPE_SECRET_KEY`: Stripe payment processing
- `OPENAI_API_KEY`: OpenAI API for translations
- `ELEVENLABS_API_KEY`: ElevenLabs for voice cloning

#### Frontend Configuration
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`: Stripe public key

## Architecture

### System Components

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │◄───────►│   Flask     │◄───────►│   MySQL     │
│   Frontend  │         │   Backend   │         │   Database  │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │
      │                       ├──────────► OpenAI API
      │                       │
      └───────────────────────├──────────► ElevenLabs API
            Socket.IO         │
                             └──────────► Stripe API
```

### Database Schema

- **Users**: User profiles, authentication, tokens
- **Chatrooms**: Room settings, privacy, members
- **Messages**: Text, voice, photo messages
- **Friendships**: User connections
- **Notifications**: System notifications
- **Metrics**: Usage analytics

## Development

### Local Development Setup

#### Frontend
```bash
npm install
npm start
```

#### Backend
```bash
cd server
pip install -r requirements.txt
python app.py
```

### Building for Production

```bash
npm run build
docker-compose build
docker-compose up -d
```

## API Documentation

See [docs/api-documentation.md](docs/api-documentation.md) for detailed API documentation.

## Security

- All API keys must be configured via environment variables
- JWT-based authentication
- Password encryption with bcrypt
- HTTPS required in production
- CORS configuration for API security

## License

All rights reserved.

## Contact

For questions and support, please open an issue in the repository.
