"""
Application Constants
Contains all constant values used throughout the application
"""
import json
import os

# =================== Debug Password ===================
DEBUG_PASSWORD = os.getenv('DEBUG_PASSWORD', '')

# =================== Token Pricing Constants ===================
# GPT-4O pricing (per token)
TEXT_UNIT_PRICE_PER_TOKEN_CACHED_INPUT_TOKENS_GPT_4O = 0.00000125
TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O = 0.0000025
TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O = 0.00001

# GPT-4O Mini pricing (per token)
TEXT_UNIT_PRICE_PER_TOKEN_CACHED_INPUT_TOKENS_GPT_4O_MINI = 0.000000075
TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI = 0.00000015
TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI = 0.0000006

# Audio pricing (per minute)
AUDIO_UNIT_PRICE_PER_MINUTE = 0.006

# =================== Upload Configuration ===================
UPLOAD_FOLDER = 'uploads'
AVATAR_UPLOAD_FOLDER = 'uploads/avatars'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Avatar/Thumbnail Configuration
THUMBNAIL_SIZE = (200, 200)
THUMBNAIL_PREFIX = "thumb_"

# =================== Mainstream Languages ===================
# Load mainstream languages from config
try:
    with open('language_mainstream_server.json') as f:
        LANGUAGE_CONFIG = json.load(f)
    MAINSTREAM_LANGUAGES = set(LANGUAGE_CONFIG['languages'])
except:
    MAINSTREAM_LANGUAGES = set()

# =================== Google OAuth Configuration ===================
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.getenv('APP_URL', 'http://localhost:3000') + "/api/auth/google/callback"

# Google OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo"

# =================== Stripe Configuration ===================
# Configure these in your Stripe dashboard and set via environment variables
STRIPE_PRODUCTS = {
    'monthly': {
        'price_id': os.getenv('STRIPE_PRICE_MONTHLY', ''),
        'amount': 1099,  # $10.99 in cents
        'type': 'subscription'
    },
    'annual': {
        'price_id': os.getenv('STRIPE_PRICE_ANNUAL', ''),
        'amount': 8990,  # $89.90 in cents
        'type': 'subscription'
    },
    'monthly_onetime': {
        'price_id': os.getenv('STRIPE_PRICE_MONTHLY_ONETIME', ''),
        'amount': 1599,  # $15.99 in cents
        'type': 'payment'
    },
}

# Get Stripe webhook secret from environment
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')

