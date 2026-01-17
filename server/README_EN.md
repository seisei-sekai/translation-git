# Server Backend Documentation

## 📁 Project Structure

```
server/
├── app.py                              # Main Flask application entry point
├── app_legacy.py                       # Legacy application (reference only)
├── extensions.py                       # Flask extensions initialization
├── requirements.txt                    # Python dependencies
├── Dockerfile                          # Docker container configuration
├── gunicorn_config.py                  # Gunicorn production server config
├── init-db.sql                         # Database initialization SQL
├── config/                             # Configuration directory
│   ├── __init__.py
│   ├── constants.py                    # Application constants
│   └── config.py                       # Application configuration
├── routes/                             # API route blueprints
│   ├── __init__.py
│   ├── auth.py                         # Authentication routes (login, register, Google OAuth)
│   ├── user.py                         # User management routes
│   ├── chatroom.py                     # Chatroom management routes
│   ├── payment.py                      # Payment routes (Stripe integration)
│   ├── audio.py                        # Audio processing routes
│   ├── translation.py                  # Translation service routes
│   └── misc.py                         # Miscellaneous routes
├── socket_handlers/                    # WebSocket event handlers
│   ├── __init__.py
│   └── events.py                       # Socket.IO event handlers
├── services/                           # Business logic services
│   ├── __init__.py
│   ├── metrics_service.py              # Metrics monitoring service
│   └── debug_logging.py                # Debug logging service
├── models/                             # Database models
│   ├── __init__.py
│   ├── user.py                         # User model
│   ├── chatroom.py                     # Chatroom model
│   ├── message.py                      # Message model
│   ├── metrics.py                      # Metrics model
│   └── debug_log.py                    # Debug log model
├── utils/                              # Utility functions
├── uploads/                            # File upload directory
│   ├── avatars/                        # User avatars
│   ├── chatroom_audio/                 # Chatroom audio files
│   ├── chatroom_photo/                 # Chatroom photos
│   ├── clonedTranslatedVoice/          # Cloned translated voices
│   └── voice_clone_reference/          # Voice cloning reference audio
├── instance/                           # Instance folder (database, etc.)
└── legacy/                             # Legacy code archive

# Additional standalone scripts
├── elevenlabs_tts.py                   # ElevenLabs text-to-speech
├── gpt_api_parrallel_processor.py      # GPT API parallel processor
├── spatial_search.py                   # Spatial search functionality
├── streaming.py                        # Streaming processing
├── stripe_payment.py                   # Stripe payment handler
└── translation_queue.py                # Translation queue manager
```

## 🚀 Core Features

### 1. Authentication System
- **Regular Registration/Login**: Email and password authentication
- **Google OAuth**: Third-party login
- **Guest Mode**: Use without registration
- **JWT Tokens**: Token-based authentication

### 2. Chatroom Features
- **Public Chatrooms**: Visible to all users
- **Private Chatrooms**: Require password or invitation
- **Real-time Communication**: WebSocket-based instant messaging
- **User Management**: Creators can manage members

### 3. Audio Processing
- **Speech-to-Text**: Real-time speech recognition
- **Text-to-Speech**: AI voice synthesis
- **Voice Cloning**: Personalized voice generation
- **Audio Upload**: Support for multiple audio formats

### 4. Translation Service
- **Real-time Translation**: Multi-language instant translation
- **Translation Queue**: Asynchronous translation task processing
- **Language Detection**: Automatic source language identification

### 5. Payment System
- **Stripe Integration**: Secure payment processing
- **Subscription Management**: Monthly/yearly subscription plans
- **Payment Verification**: Ensure payment status synchronization

## 🛠️ Tech Stack

- **Web Framework**: Flask 3.0.0
- **Real-time Communication**: Flask-SocketIO
- **Database**: SQLAlchemy (supports SQLite/PostgreSQL/MySQL)
- **Authentication**: Flask-JWT-Extended
- **Payment System**: Stripe
- **AI Services**: OpenAI GPT-4, ElevenLabs
- **Production Server**: Gunicorn
- **Containerization**: Docker

## 📋 Environment Configuration

Before running, configure the following environment variables (in `.env` file):

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# Database Configuration
DATABASE_URL=sqlite:///app.db

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Server Configuration
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

## 🚀 How to Run

### Development Environment

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Initialize database
flask db upgrade

# 3. Start development server
python app.py
```

### Production Environment

```bash
# Start with Gunicorn
gunicorn -c gunicorn_config.py app:app
```

### Docker Deployment

```bash
# Build image
docker build -t realtime-transcription-server .

# Run container
docker run -p 5000:5000 --env-file .env realtime-transcription-server
```

## 📡 API Endpoints

### Authentication (`/api/auth/*`)
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### User Management (`/api/user/*`)
- `POST /api/delete-account` - Delete account
- `POST /api/update-username` - Update username
- `POST /api/change-password` - Change password
- `POST /api/upload-avatar` - Upload avatar
- `GET /api/user-chatrooms/<user_id>` - Get user's chatrooms

### Chatroom Management (`/api/chatroom/*`)
- `POST /api/create-chatroom` - Create chatroom
- `POST /api/join-chatroom` - Join chatroom
- `POST /api/leave-chatroom` - Leave chatroom
- `POST /api/get-chatroom-messages` - Get chatroom messages

### Payment (`/api/payment/*`)
- `POST /api/create-checkout-session` - Create payment session
- `POST /api/verify-payment` - Verify payment status
- `POST /api/check-subscription-status` - Check subscription status
- `POST /api/cancel-subscription` - Cancel subscription

## 🔌 WebSocket Events

### Client-to-Server Events
- `join_room` - Join chatroom
- `leave_room` - Leave chatroom
- `send_message` - Send message
- `audio_stream` - Audio stream data
- `request_translation` - Request translation

### Server-to-Client Events
- `user_joined` - User joined notification
- `user_left` - User left notification
- `new_message` - New message notification
- `translation_result` - Translation result
- `audio_transcription` - Audio transcription result

## 🔒 Security Features

1. **JWT Authentication**: All authenticated APIs use JWT tokens
2. **Password Encryption**: Passwords stored using bcrypt encryption
3. **CORS Configuration**: Restrict cross-origin request sources
4. **Input Validation**: Strict input data validation
5. **Rate Limiting**: Prevent API abuse

## 📊 Database Models

### User Table
- Basic user information (ID, username, email, password)
- Subscription information (plan, status)
- Guest flag (is_guest)

### ChatRoom Table
- Chatroom information (ID, name, creator)
- Privacy settings (is_private, password)
- Member management

### Message Table
- Message content (text, audio)
- Sender information
- Timestamp

### Metrics Table
- System performance metrics
- User usage statistics
- Time series data

## 🐛 Debugging

Enable debug logging:

```python
# Set in app.py
app.config['DEBUG'] = True
app.config['LOG_LEVEL'] = 'DEBUG'
```

View logs:
- Application logs output to console
- Debug logs stored in `DebugLog` database table

## 📝 Important Notes

1. **Database Migrations**: Run migrations after modifying models
2. **Environment Variables**: All environment variables must be properly configured in production
3. **File Uploads**: Ensure `uploads/` directory has write permissions
4. **WebSocket**: Production environment requires message queue configuration (e.g., Redis)
5. **API Keys**: Securely manage all third-party service API keys

## 🔄 Version Information

- **app.py**: Current production version with modular architecture
- **app_legacy.py**: Legacy version, reference only, not recommended for use

## 📞 Support

For issues, please check log files or contact the development team.

