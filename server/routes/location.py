"""
Location routes
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


location_bp = Blueprint('location', __name__)


@location_bp.route('/api/getNearbyLocationInfo', methods=['POST'])
def get_nearby_location_info():
    try:
        data = request.json
        lat = float(data.get('lat'))
        lng = float(data.get('lng'))
        radius = float(data.get('radius'))

        # Get nearby locations using spatial search
        nearby_locations = load_and_search(lat, lng, radius)

        # Extract just the node information from the results
        locations = [item['node'] for item in nearby_locations]

        return jsonify({
            "status": "success",
            "locations": locations
        }), 200
    except Exception as e:
        # print(f"Error in get_nearby_location_info: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500



@location_bp.route('/api/get_ai_rating_shop_single', methods=['POST'])
def get_ai_rating_shop_single():
    try:
        node_data = request.json.get('nodeData')
        ui_language = request.json.get('uiLanguage', 'English')

        if not node_data:
            return jsonify({"error": "No node data provided"}), 400

        rating = get_ai_rating(node_data, ui_language)

        return jsonify({
            "status": "success",
            "rating": rating
        }), 200

    except Exception as e:
        # print(f"Error in get_ai_rating_shop_single: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500










#========================================================================
# =========================== Communication to the OpenAI server ==============
#========================================================================

# Load OpenAI API key


