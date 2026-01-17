"""
Auth routes
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


auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/google', methods=['GET'])
def google_login():
    try:
        # Find out what URL to hit for Google login
        google = OAuth2Session(
            GOOGLE_CLIENT_ID,
            redirect_uri=GOOGLE_REDIRECT_URI,
            scope=['openid', 'email', 'profile']
        )

        authorization_url, state = google.authorization_url(
            GOOGLE_AUTH_URL,
            access_type="offline",
            prompt="select_account"
        )

        session['oauth_state'] = state
        # current_app.logger.info(f"Authorization URL: {authorization_url}")
        return redirect(authorization_url)

    except Exception as e:
        # current_app.logger.error(f"Google OAuth error: {str(e)}")
        return redirect(f"{os.getenv('REACT_APP_FRONTEND_URL')}/login_page?error=oauth_failed")



@auth_bp.route('/api/auth/google/callback', methods=['POST'])
def google_callback():
    """
    Handle Google OAuth callback with device tracking and user management.
    Expected request body:
    {
        "credential": string,
        "deviceInfo": {
            "userAgent": string,
            "language": string,
            "platform": string,
            "screenResolution": string,
            "timezone": string,
            ...
        }
    }
    """
    try:
        # Get request data
        data = request.get_json()
        credential = data.get('credential')
        device_info = data.get('deviceInfo', {})

        if not credential:
            # current_app.logger.error("No Google credential provided")
            return jsonify({'error': 'No credential provided'}), 400

        # Verify Google token
        try:
            idinfo = id_token.verify_oauth2_token(
                credential,
                requests.Request(),
                GOOGLE_CLIENT_ID
            )

            # Extract user information from Google token
            email = idinfo['email']
            google_user_id = idinfo['sub']
            name = idinfo.get('name', '')
            picture = idinfo.get('picture', '')
            locale = idinfo.get('locale', 'en')

            # current_app.logger.info(f"Google authentication successful for email: {email}")

        except ValueError as e:
            # current_app.logger.error(f"Invalid Google token: {str(e)}")
            return jsonify({'error': 'Invalid token'}), 401

        # Find existing user
        user = User.query.filter_by(email=email).first()
        current_time = datetime.utcnow()

        if user:
            # current_app.logger.info(f"Existing user found: {user.user_id}")
                            # After finding existing user
            check_and_update_tokens(user)
            # Update user information
            try:
                # Update basic info
                ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
                if ip_address:
                    ip_address = ip_address.split(',')[0].strip()

                # Get location info
                location_info = get_ip_location(ip_address)

                # Update user's login info
                user.last_login_at = current_time
                user.last_login_ip = ip_address
                if location_info:
                    user.last_login_location = location_info  # You'll need to add this field to your User model


                # Update device information
                user.browser_info = device_info.get('userAgent', '')
                user.operating_system = device_info.get('platform', '')
                user.preferred_language = device_info.get('language', locale)
                user.timezone = device_info.get('timezone', '')

                # Create access history entry
                access_entry = {
                    'timestamp': current_time.isoformat(),
                    'ip_address': user.last_login_ip,
                    'login_type': 'google',
                    'user_agent': device_info.get('userAgent', ''),
                    'platform': device_info.get('platform', ''),
                    'screen_resolution': device_info.get('screenResolution', ''),
                    'language': device_info.get('language', locale),
                    'timezone': device_info.get('timezone', ''),
                    'connection_type': device_info.get('connectionType', ''),
                    'device_memory': device_info.get('deviceMemory', ''),
                    'hardware_concurrency': device_info.get('hardwareConcurrency', ''),
                }

                # Update access history (keep last 10 entries)
                if not user.access_history:
                    user.access_history = {}

                access_key = current_time.strftime('%Y%m%d%H%M%S')
                user.access_history[access_key] = access_entry

                if len(user.access_history) > 10:
                    oldest_key = min(user.access_history.keys())
                    del user.access_history[oldest_key]

                db.session.commit()
                # current_app.logger.info(f"Updated user information for: {user.user_id}")

            except Exception as e:
                # current_app.logger.error(f"Error updating user information: {str(e)}")
                db.session.rollback()
                # Continue with login even if update fails

            # Create JWT token
            access_token = create_access_token(identity=str(user.id))

            # Add welcome notification if first login of the day
            if not user.last_login_at or user.last_login_at.date() < current_time.date():
                try:
                    welcome_notification = Notification(
                        user_id=user.user_id,
                        title=f"Welcome back, {user.username}!",
                        body="Thank you for using Yoohi.ai today.",
                        type="welcome"
                    )
                    db.session.add(welcome_notification)
                    db.session.commit()
                except Exception as e:
                    # current_app.logger.error(f"Error creating welcome notification: {str(e)}")
                    db.session.rollback()



            return jsonify({
                'exists': True,
                'token': access_token,
                'userId': user.user_id,
                'username': user.username,
                'email': user.email,
                'user_avatar': user.avatar
            }), 200

        else:
            # current_app.logger.info(f"New Google user registration for email: {email}")
            # Return user info for new registration
            return jsonify({
                'exists': False,
                'email': email,
                'name': name,
                'picture': picture,
                'locale': locale,
                'deviceInfo': {
                    'userAgent': device_info.get('userAgent', ''),
                    'platform': device_info.get('platform', ''),
                    'language': device_info.get('language', locale),
                    'timezone': device_info.get('timezone', ''),
                    'screenResolution': device_info.get('screenResolution', '')
                }
            }), 200

    except Exception as e:
        # current_app.logger.error(f"Google callback error: {str(e)}")
        return jsonify({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }), 500







@auth_bp.route('/api/register_google_email', methods=['POST'])
def register_by_GoogleOauth():
    try:
        data = request.json
        # current_app.logger.info(f"Received registration data: {data}")  # Log received data

        email = data.get('email')
        user_id = data.get('userId')
        username = data.get('username')

        if not email or not user_id or not username:
            # current_app.logger.error(f"Missing fields: email={email}, userId={user_id}, username={username}")
            return jsonify({"error": "Missing required fields"}), 400

        # Generate random password
        random_password = generate_random_password()

        # Create new user with Google OAuth specifics
        try:
            new_user = User(
                user_id=user_id,
                username=username,
                email=email,
                password=generate_password_hash(random_password)
            )
            new_user.is_google_registered = '1'
            new_user.is_password_randomly_generated = '1'
            new_user.is_registered = '2'  # '2' indicates Google OAuth registration

            # current_app.logger.info(f"Attempting to add user: {new_user.user_id}, {new_user.email}")
            db.session.add(new_user)
            db.session.commit()
            # current_app.logger.info("User successfully added to database")

            # Add welcome notification
            new_user.add_notification(
                title=f"Welcome to Yoohi! {new_user.username}",
                body="Yoohi.ai is a universal Translator",
                type="welcome"
            )

            # Now login the user
            access_token = create_access_token(identity=str(new_user.id))

            return jsonify({
                "token": access_token,
                "userId": new_user.user_id,
                "username": new_user.username,
                "password": random_password  # Send back for immediate login
            }), 201

        except Exception as e:
            current_app.logger.error(f"Database error: {str(e)}")
            db.session.rollback()
            raise

    except Exception as e:
        current_app.logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Routes


@auth_bp.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        # current_app.logger.info(f"Registration data: {data}")  # Debug log

        user_id = data.get('userId')
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        is_guest_mode = data.get('isGuestMode', False)  # Add this
        host_user_id = data.get('hostUserId','')  # Add this


        # Check if user_id exists in either user_id or email fields
        if User.query.filter(
            (User.user_id == user_id) |
            (User.email == user_id) |
            (User.user_id == email) |
            (User.email == email)
        ).first():
            return jsonify({'error': 'User ID or Email is already in use'}), 409

        # Create new user
        new_user = User(
            user_id=user_id,
            username=username,
            email=email,
            password=generate_password_hash(password),
            is_guest=is_guest_mode,
            host_user_id=host_user_id
        )
        db.session.add(new_user)
        db.session.commit()

            # Add welcome notification
        new_user.add_notification(
            title=f"Welcome to Yoohi! {new_user.username}",
            body="Yoohi.ai is a universal Translator",
            type="welcome"
        )
        # current_app.logger.info(f"Successfully registered user: {user_id}")  # Debug log
        return jsonify({'message': 'User registered successfully'}), 201

    except Exception as e:
        # current_app.logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@auth_bp.route('/api/login', methods=['POST'])
def login():
    """
    Handle user login with device tracking and security measures.
    Expected request body:
    {
        "userIdOrEmail": string,
        "password": string,
        "deviceInfo": {
            "userAgent": string,
            "language": string,
            "platform": string,
            "screenResolution": string,
            "timezone": string,
            ...
        }
    }
    """
    try:
        # Get request data
        data = request.get_json()
        user_id_or_email = data.get('userIdOrEmail')
        password = data.get('password')
        device_info = data.get('deviceInfo', {})
        is_google_login = data.get('isGoogleLogin', False)

        # current_app.logger.info(f"Login attempt for user: {user_id_or_email}")

        # Input validation
        if not user_id_or_email or not password:
            return jsonify({'error': 'Missing credentials'}), 400

        # Find user by either user_id or email
        user = User.query.filter(
            (User.user_id == user_id_or_email) |
            (User.email == user_id_or_email)
        ).first()

        if not user:
            # current_app.logger.warning(f"Login failed - User not found: {user_id_or_email}")
            return jsonify({'error': 'Invalid credentials'}), 401

        # For Google OAuth users
        if user.is_registered == '2':  # Google OAuth user
            if not is_google_login and not check_password_hash(user.password, password):
                # current_app.logger.warning(f"Login failed - Invalid password for Google user: {user.user_id}")
                return jsonify({'error': 'Invalid credentials'}), 401
        else:  # Regular user
            if not check_password_hash(user.password, password):
                # current_app.logger.warning(f"Login failed - Invalid password for user: {user.user_id}")
                return jsonify({'error': 'Invalid credentials'}), 401

        # Update user's login information
        try:
            current_time = datetime.utcnow()

            # Get IP address considering proxy headers
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip_address:
                ip_address = ip_address.split(',')[0].strip()

                # Get location info
                location_info = get_ip_location(ip_address)

                # Update user's login info
                user.last_login_at = current_time
                user.last_login_ip = ip_address
                if location_info:
                    user.last_login_location = location_info  # You'll need to add this field to your User model

            # Update browser and device info
            user.browser_info = device_info.get('userAgent', '')
            user.operating_system = device_info.get('platform', '')
            user.preferred_language = device_info.get('language', '')
            user.timezone = device_info.get('timezone', '')

            # Create access history entry
            access_entry = {
                'timestamp': current_time.isoformat(),
                'ip_address': ip_address,
                'user_agent': device_info.get('userAgent', ''),
                'platform': device_info.get('platform', ''),
                'screen_resolution': device_info.get('screenResolution', ''),
                'language': device_info.get('language', ''),
                'timezone': device_info.get('timezone', ''),
                'connection_type': device_info.get('connectionType', ''),
                'device_memory': device_info.get('deviceMemory', ''),
                'hardware_concurrency': device_info.get('hardwareConcurrency', '')
            }

            # Update access history (keep last 10 entries)
            if not user.access_history:
                user.access_history = {}

            access_key = current_time.strftime('%Y%m%d%H%M%S')
            user.access_history[access_key] = access_entry

            # Trim history to keep only last 10 entries
            if len(user.access_history) > 10:
                oldest_key = min(user.access_history.keys())
                del user.access_history[oldest_key]

            # Commit changes to database
            db.session.commit()
            # current_app.logger.info(f"Successfully updated login info for user: {user.user_id}")

        except Exception as e:
            # current_app.logger.error(f"Error updating user login info: {str(e)}")
            # Continue with login even if tracking update fails
            db.session.rollback()

        # Create JWT token
        access_token = create_access_token(identity=str(user.id))

        # Prepare response
        response_data = {
            'token': access_token,
            'userId': user.user_id,
            'username': user.username,
            'email': user.email,
            'user_avatar': user.avatar
        }

        # Log successful login
        # current_app.logger.info(f"Login successful for user: {user.user_id}")
        check_and_update_tokens(user)
        # Add notification for first login of the day
        if not user.last_login_at or user.last_login_at.date() < current_time.date():
            try:
                welcome_notification = Notification(
                    user_id=user.user_id,
                    title=f"Welcome back, {user.username}!",
                    body="Thank you for using Yoohi.ai today.",
                    type="welcome"
                )
                db.session.add(welcome_notification)
                db.session.commit()
            except Exception as e:
                # current_app.logger.error(f"Error creating welcome notification: {str(e)}")
                db.session.rollback()

        return jsonify(response_data), 200

    except Exception as e:
        # Log the error
        # current_app.logger.error(f"Login error: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }), 500



@auth_bp.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    # In JWT, logout typically means expiring the token or deleting it from the frontend
    return jsonify({'message': 'Logout successful'}), 200



