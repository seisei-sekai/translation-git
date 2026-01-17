"""
Upload routes
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


upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/api/upload-reference-audio', methods=['POST'])
def upload_reference_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    user_id = request.form.get('userId')
    if not user_id:
        return jsonify({"error": "No user ID provided"}), 400

    audio_file = request.files['audio']
    filename = f"{user_id}.mp3"
    file_path = os.path.join('uploads', 'voice_clone_reference', filename)

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    audio_file.save(file_path)

    return jsonify({"message": "Reference audio uploaded successfully"}), 200




@upload_bp.route('/public/<path:filename>', methods=['GET'])
def uploaded_file(filename):
    return send_from_directory('public', filename)



@upload_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    # print(current_app.config['UPLOAD_FOLDER'])
    # print("yesssssss")
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)



