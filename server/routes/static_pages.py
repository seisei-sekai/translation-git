"""
Static Pages routes
"""
from flask import Blueprint, request, jsonify, send_from_directory, session, redirect, url_for, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from sqlalchemy import text, desc
from PIL import Image
import os
import base64
import json
import re
import random
import string
import io

# Import from config
from config.constants import *

# Import from extensions
from extensions import db, sio, openAI_client, stripe

# Import models
from models import User, ChatRoom, Message, Notification, Metrics, Plan, PaymentHistory, ReferCode, Friendship, Shop, DebugLog

# Import services
from services.translation import translate_text
from services.token_service import check_and_update_tokens
from services.metrics_service import check_and_update_metrics
from services.debug_logging import log_debug_info
from services.encryption import encrypt_data, decrypt_data
from services.ip_location import get_ip_location

# Import utils
from utils.helpers import generate_random_password, allowed_file
from utils.decorators import verify_debug_password

# For OAuth (needed by auth routes)
try:
    from requests_oauthlib import OAuth2Session
    from oauthlib.oauth2 import WebApplicationClient
    import requests as http_requests
    from google.oauth2 import id_token
    from google.auth.transport import requests
except ImportError:
    pass  # OAuth dependencies not needed for all blueprints

# For location/spatial search
try:
    from spatial_search import load_and_search, initialize_data
    from get_ai_international_rating import get_ai_rating
except ImportError:
    pass  # Location dependencies not needed for all blueprints


static_pages_bp = Blueprint('static_pages', __name__)


@static_pages_bp.route('/', methods=['GET'])
def serve_react_app():
    return send_from_directory(app.static_folder, 'index.html')

# Serve another webpage


@static_pages_bp.route('/chat', methods=['GET'])
def serve_chat_page():
    return send_from_directory(app.static_folder, 'index.html')

# Serve another webpage


@static_pages_bp.route('/chatroom', methods=['GET'])
def serve_chatroom_page():
    return send_from_directory(app.static_folder, 'chatroom.html')

# Serve another webpage


@static_pages_bp.route('/people', methods=['GET'])
def serve_people_page():
    return send_from_directory(app.static_folder, 'people.html')

# Serve another webpage


@static_pages_bp.route('/profile', methods=['GET'])
def serve_profile_page():
    return send_from_directory(app.static_folder, 'profile.html')

# Serve another webpage


@static_pages_bp.route('/myplan', methods=['GET'])
def serve_myplan_page():
    return send_from_directory(app.static_folder, 'myplan.html')

# Serve another webpage


@static_pages_bp.route('/settings', methods=['GET'])
def serve_settings_page():
    return send_from_directory(app.static_folder, 'settings.html')

# Serve another webpage


@static_pages_bp.route('/login_page', methods=['GET'])
def serve_login_page():
    return send_from_directory(app.static_folder, 'login.html')



@static_pages_bp.route('/register_page', methods=['GET'])
def serve_register_page():
    return send_from_directory(app.static_folder, 'register.html')

# Serve another webpage


@static_pages_bp.route('/landingpage', methods=['GET'])
def serve_landingpage_page():
    return send_from_directory(app.static_folder, 'landingpage.html')

# Add this new route


@static_pages_bp.route('/walkietalkie', methods=['GET'])
def serve_walkietalkie_page():
    return send_from_directory(app.static_folder, 'index.html')

# Add this new route


@static_pages_bp.route('/lecture', methods=['GET'])
def serve_lecture_page():
    return send_from_directory(app.static_folder, 'index.html')
















#========================================================================
#===================  Stripe Settup===============================
#========================================================================



