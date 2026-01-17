"""
Referral routes
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


referral_bp = Blueprint('referral', __name__)


@referral_bp.route('/api/refer-code-action', methods=['POST'])
def refer_code_action():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        refer_code = data.get('referCode')

        if not user_id or not refer_code:
            return jsonify({"error": "Missing user ID or refer code"}), 400

        # Get user and refer code from database
        user = User.query.filter_by(user_id=user_id).first()
        refer_code_obj = ReferCode.query.filter_by(refer_code=refer_code).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        if not refer_code_obj:
            return jsonify({"error": "Invalid refer code"}), 400

        # Check if code is still valid
        current_time = datetime.utcnow()

        # Check usage limit
        if refer_code_obj.number_refer_code_used >= refer_code_obj.total_number:
            return jsonify({"error": "Refer code has reached its usage limit"}), 400

        # Check expiration
        if refer_code_obj.refer_code_expiration_date and current_time > refer_code_obj.refer_code_expiration_date:
            return jsonify({"error": "Refer code has expired"}), 400

        # Check if user has already used this code
        if str(user_id) in refer_code_obj.refer_code_user_list:
            return jsonify({"error": "You have already used this refer code"}), 400

        # Update refer code usage
        refer_code_obj.refer_code_user_list[str(user_id)] = current_time.isoformat()
        refer_code_obj.number_refer_code_used += 1

        # Update user based on refer code activation plan
        user.refer_code = refer_code

        if refer_code_obj.refer_code_activation_plan == 'monthly_onetime':
            user.tokens += 2.0
            user.subscription_plan = 'monthly_onetime'
            user.subscription_status = 'active'
            user.subscription_start_date = current_time
            user.subscription_end_date = current_time + timedelta(days=30)
        elif refer_code_obj.refer_code_activation_plan == 'annual_onetime':
            user.tokens += 24.0
            user.subscription_plan = 'annual_onetime'
            user.subscription_status = 'active'
            user.subscription_start_date = current_time
            user.subscription_end_date = current_time + timedelta(days=365)
        elif refer_code_obj.refer_code_activation_plan == 'basic':
            user.tokens += 0.1
            user.subscription_plan = 'basic'
            user.subscription_status = 'active'
            user.subscription_start_date = current_time
            user.subscription_end_date = current_time + timedelta(days=7)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Refer code successfully applied!",
            "plan": refer_code_obj.refer_code_activation_plan
        }), 200

    except Exception as e:
        db.session.rollback()
        # current_app.logger.error(f"Error in refer code action: {str(e)}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred"
        }), 500




@referral_bp.route('/api/join-by-dynamic-code', methods=['POST'])
def join_by_dynamic_code():
    try:
        data = request.get_json()
        dynamic_code = data.get('dynamicCode')
        password = data.get('password')

        if not dynamic_code:
            return jsonify({"error": "Dynamic code is required"}), 400

        # Scan through all chatrooms to find matching dynamic code
        all_chatrooms = ChatRoom.query.all()
        matching_chatroom = None

        for chatroom in all_chatrooms:
            if chatroom.get_temporary_code() == dynamic_code:
                matching_chatroom = chatroom
                break

        if not matching_chatroom:
            return jsonify({"error": "Invalid dynamic code"}), 404

        # Check if password is required
        if matching_chatroom.password:
            if not password:
                return jsonify({
                    "success": False,
                    "requiresPassword": True
                }), 200

            if not check_password_hash(matching_chatroom.password, password):
                return jsonify({"error": "Invalid password"}), 403

        # If we get here, either no password is required or correct password was provided
        return jsonify({
            "success": True,
            "chatroomId": matching_chatroom.id,
            "chatroomName": matching_chatroom.name
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Error in join_by_dynamic_code: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500




@referral_bp.route('/api/get-dynamic-code', methods=['POST'])
def get_dynamic_code():
    try:
        data = request.get_json()
        chatroom_id = data.get('chatroomId')
        user_id = data.get('userId')

        if not chatroom_id or not user_id:
            return jsonify({"error": "Missing chatroom ID or user ID"}), 400

        # Get the chatroom
        chatroom = ChatRoom.query.get(chatroom_id)
        if not chatroom:
            return jsonify({"error": "Chatroom not found"}), 404

        # Check if user is a participant or creator
        user_is_participant = any(participant.user_id == user_id for participant in chatroom.participants)
        user_is_creator = chatroom.creator_id == user_id

        if not (user_is_participant or user_is_creator):
            return jsonify({"error": "User is not authorized to access this chatroom"}), 403

        # Generate temporary code
        dynamic_code = chatroom.get_temporary_code(expire_minutes=60.0)

        return jsonify({"dynamicCode": dynamic_code}), 200

    except Exception as e:
        # current_app.logger.error(f"Error generating dynamic code: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ... existing code ...


