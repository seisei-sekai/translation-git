"""
Notification routes
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


notification_bp = Blueprint('notification', __name__)


@notification_bp.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Get all notifications for the current user"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    notifications = Notification.query.filter_by(
        user_id=user.user_id
    ).order_by(
        desc(Notification.created_at)
    ).paginate(
        page=page,
        per_page=per_page
    )

    return jsonify({
        'notifications': [{
            'id': n.id,
            'title': n.title,
            'body': n.body,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat()
        } for n in notifications.items],
        'total': notifications.total,
        'pages': notifications.pages,
        'current_page': notifications.page
    }), 200




@notification_bp.route('/api/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    """Mark notifications as read"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    data = request.get_json()
    notification_ids = data.get('notification_ids', [])

    if not notification_ids:
        # Mark all notifications as read
        Notification.query.filter_by(
            user_id=user.user_id,
            is_read=False
        ).update({'is_read': True})
    else:
        # Mark specific notifications as read
        Notification.query.filter(
            Notification.user_id == user.user_id,
            Notification.id.in_(notification_ids)
        ).update({'is_read': True}, synchronize_session=False)

    try:
        db.session.commit()
        return jsonify({'message': 'Notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500













