"""
Flask Extensions
Initializes all Flask extensions (db, jwt, socketio, etc.) 
These are created here and imported by app.py and other modules to avoid circular imports
"""
import os
import stripe
import openai
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
import socketio
from oauthlib.oauth2 import WebApplicationClient
from config.constants import GOOGLE_CLIENT_ID

# =================== Database Extension ===================
db = SQLAlchemy()

# =================== JWT Extension ===================
jwt = JWTManager()

# =================== Socket.IO Extension ===================
sio = socketio.Server(
    cors_allowed_origins="*",
    max_http_buffer_size=1e8  # Example: 100MB
)

# =================== OAuth Client ===================
# Initialize OAuth client for Google authentication
client = WebApplicationClient(GOOGLE_CLIENT_ID)

# =================== Stripe Configuration ===================
# Configure via environment variables
stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')

# Stripe product configurations - Set price IDs via environment variables
STRIPE_PRODUCTS = {
    'monthly': {
        'price_id': os.getenv('STRIPE_PRICE_MONTHLY', ''),
        'amount': 1099,  # $10.99 in cents
        'type': 'subscription'
    },
    'annual': {
        'price_id': os.getenv('STRIPE_PRICE_ANNUAL', ''),
        'amount': 8990,  # $89.90 in cents ($8.99/month * 10 months, considering 2 months free)
        'type': 'subscription'
    },
    'monthly_onetime': {
        'price_id': os.getenv('STRIPE_PRICE_MONTHLY_ONETIME', ''),
        'amount': 1599,  # $15.99 in cents
        'type': 'payment'
    },
    'annual_onetime': {
        'price_id': os.getenv('STRIPE_PRICE_ANNUAL_ONETIME', ''),
        'amount': 15999,  # $159.99 in cents
        'type': 'payment'
    },
    'basic': {
        'price_id': os.getenv('STRIPE_PRICE_BASIC', ''),
        'amount': 199,  # $1.99 in cents
        'type': 'payment'
    },
    'token': {
        'price_id': os.getenv('STRIPE_PRICE_TOKEN', ''),
        'amount': 699,  # $6.99 in cents
        'type': 'payment'
    }
}

# Test key - use environment variable STRIPE_SECRET_KEY for testing

# =================== OpenAI Configuration ===================
# OpenAI API key from environment variable
openai_key = os.getenv('OPENAI_API_KEY', '')
openAI_client = openai.OpenAI(api_key=openai_key) if openai_key else None

# DeepSeek client (via DeepInfra)
openAI_client_deepseek = openai.OpenAI(
    api_key="Ljgibz0ibztFJl8RqcPZM2WwdCQdErYv",
    base_url="https://api.deepinfra.com/v1/openai",
)

# =================== Upload Configuration ===================
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

