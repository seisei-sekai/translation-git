"""
User routes
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


user_bp = Blueprint('user', __name__)


@user_bp.route('/api/delete-account', methods=['POST'])
@jwt_required()
def delete_account():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        try:
            # First try to cancel any active subscription
            if user.stripe_customer_id:
                try:
                    subscriptions = stripe.Subscription.list(
                        customer=user.stripe_customer_id,
                        limit=1
                    )

                    if subscriptions.data:
                        subscription = subscriptions.data[0]
                        stripe.Subscription.modify(
                            subscription.id,
                            cancel_at_period_end=True
                        )
                except Exception as e:
                    current_app.logger.error(f"Error canceling subscription during account deletion: {str(e)}")

            # Mark user as deleted and reset properties
            user.is_deleted = True
            user.username = 'Deleted User'
            user.email = f"{user.email}_DELETED"
            user.is_active = False
            user.description = None

            user.stripe_customer_id = None
            user.stripe_subscription_id = None
            user.subscription_status = 'cancelled'
            user.subscription_plan = 'basic'
            user.subscription_end_date = None
            user.tokens = 0.0
            # Generate random password
            random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
            user.password = generate_password_hash(random_password)

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Account successfully deleted'
            }), 200

        except Exception as e:
            db.session.rollback()
            # current_app.logger.error(f"Database error during account deletion: {str(e)}")
            raise

    except Exception as e:
        # current_app.logger.error(f"Error deleting account: {str(e)}")
        return jsonify({
            'error': 'Failed to delete account',
            'details': str(e)
        }), 500








@user_bp.route('/api/check-user-is-unpaid', methods=['POST'])
@jwt_required()
def check_user_is_unpaid():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Guest users should not be blocked by payment
        if user.is_guest:
            return jsonify({
                "isUnpaid": False
            }), 200

        is_unpaid = user.subscription_plan == 'unpaid'

        return jsonify({
            "isUnpaid": is_unpaid
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Error checking user payment status: {str(e)}")
        return jsonify({
            "error": "Failed to check payment status",
            "details": str(e)
        }), 500



# Add this at the top of the file with other configurations




@user_bp.route('/api/update-username', methods=['POST'])
@jwt_required()
def update_username():
    data = request.get_json()
    current_user_id = get_jwt_identity()  # Get the user ID from the JWT token
    new_username = data.get('new_username')

    if not new_username:
        return jsonify({"error": "New username is required"}), 400

    # Find the user by the ID from the JWT token
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Update the username
    user.username = new_username
    db.session.commit()

    return jsonify({"message": "Username updated successfully"}), 200



@user_bp.route('/api/user-info', methods=['GET'])
def get_user_info():
    try:
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        # current_app.logger.info(f"Extracted user ID from JWT: {current_user_id}")

        user = User.query.get(int(current_user_id))
        if not user:
            # current_app.logger.error(f"User not found for ID: {current_user_id}")
            return jsonify({"error": "User not found"}), 404


        return jsonify({
            "user_id": user.user_id,
            "email": user.email,
            "tokens": user.tokens * 500.0,
            "plan_id": user.subscription_plan,
            "username": user.username,
            "is_password_randomly_generated": user.is_password_randomly_generated,
            "description":user.description
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            "error": "Server error",
            "details": str(e)
        }), 500



@user_bp.route('/api/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        new_password = data.get('newPassword')
        old_password = data.get('oldPassword')

        # For randomly generated passwords, we don't need to verify old password
        if user.is_password_randomly_generated == '0':
            if not old_password or not user.check_password(old_password):
                return jsonify({"error": "Invalid old password"}), 400

        # Update password and set is_password_randomly_generated to '0'
        user.set_password(new_password)
        user.is_password_randomly_generated = '0'
        db.session.commit()

        return jsonify({"message": "Password updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500




@user_bp.route('/api/edit-user-description', methods=['POST'])
@jwt_required()
def edit_user_description():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        description = data.get('description', '').strip()

        # Validate description length (500 words)
        if len(description.split()) > 500:
            return jsonify({"error": "Description exceeds 500 words limit"}), 400

        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        user.description = description
        db.session.commit()

        return jsonify({"message": "Description updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@user_bp.route('/api/public-user-info/<user_id>', methods=['GET'])
def get_public_user_info(user_id):
    # Find the user by user_id
    user = User.query.filter_by(user_id=user_id).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Prepare the avatar URL, use default if the user has no avatar
    avatar_url = f"{request.host_url}uploads/avatars/{user.avatar}" if user.avatar else f"{request.host_url}user_avatar/default_avatar_1.png"

    # Return the username and avatar URL
    return jsonify({
        "username": user.username,
        "avatar": avatar_url,
        "description": user.description
    }), 200

# Add these constants at the top of the file


@user_bp.route('/api/upload-avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    # Get the current user's ID from the JWT token
    current_user_id = get_jwt_identity()

    if 'avatar' not in request.files:
        return jsonify({"error": "No avatar file provided"}), 400

    # Get the uploaded file from the request
    avatar_file = request.files['avatar']

    if avatar_file and allowed_file(avatar_file.filename):
        # Secure the filename and set the path
        avatar_file.filename = secure_filename(avatar_file.filename)
        # Save the file as <user_id>.png to avoid filename conflicts
        avatar_filename = f"{current_user_id}.png"
        avatar_path = os.path.join(AVATAR_UPLOAD_FOLDER, avatar_filename)
        # Create thumbnail filename
        thumbnail_filename = f"{THUMBNAIL_PREFIX}{current_user_id}.png"
        thumbnail_path = os.path.join(AVATAR_UPLOAD_FOLDER, thumbnail_filename)
            # Create and save thumbnail
        with Image.open(avatar_file) as img:
            # Convert to RGB if image is in RGBA mode
            if img.mode == 'RGBA':
                img = img.convert('RGB')

            # Create thumbnail
            img.thumbnail(THUMBNAIL_SIZE)

            # Save thumbnail with reduced quality
            img.save(thumbnail_path, 'JPEG', quality=60, optimize=True)
        # Save the file
        avatar_file.save(avatar_path)

        # Update the user's avatar path in the database
        user = User.query.get(current_user_id)
        if user:
            user.avatar = thumbnail_filename
            user.avatar_full = avatar_filename
            db.session.commit()

        return jsonify({"message": "Avatar uploaded successfully", "avatar_url": f"/api/avatar/{current_user_id}"}), 201

    return jsonify({"error": "Invalid file type. Only png, jpg, jpeg are allowed."}), 400





@user_bp.route('/api/avatar/<user_id>', methods=['GET'])
def get_avatar(user_id):
    # Find the user in the database
    user = User.query.filter_by(user_id=user_id).first()

    if not user or not user.avatar:
        return jsonify({"error": "Avatar not found"}), 404

    # Get the file path of the avatar
    avatar_path = os.path.join(AVATAR_UPLOAD_FOLDER, user.avatar)

    if os.path.exists(avatar_path):
        # Serve the avatar file and return the address
        return jsonify({"user_avatar": user.avatar}), 200


# Utility function to check allowed file extensions


@user_bp.route('/api/user-chatrooms/<user_id>', methods=['GET'])
@jwt_required()
def get_user_chatrooms(user_id):
    '''
    Get all chatroom_id the user_id is in

    '''
    # current_user_id = get_jwt_identity()
    # # print("current_user_id")
    # # print(str(current_user_id))
    # if str(current_user_id) != user_id:
    #     return jsonify({"error": "Unauthorized access"}), 403

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Fetch chatrooms created by the user or where the user is a participant
    user_chatrooms = ChatRoom.query.filter(
        (ChatRoom.creator_id == user.user_id) |
        (ChatRoom.participants.any(user_id=user.user_id))
    ).all()

    chatrooms_data = [{
        "id": chatroom.id,
        "name": chatroom.name,
        "is_private": chatroom.is_private,  # Convert string '1'/'0' to boolean
        "is_invisible": chatroom.is_invisible,
    } for chatroom in user_chatrooms]

    return jsonify({"chatrooms": chatrooms_data}), 200



