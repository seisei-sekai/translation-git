"""
Misc routes
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


misc_bp = Blueprint('misc', __name__)


@misc_bp.route('/api/get_user_current_subscription_info', methods=['GET'])
@jwt_required()
def get_user_current_subscription_info():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        subscription_info = {
            "current_plan": user.subscription_plan,  # monthly, annual, basic, etc.
            "status": user.subscription_status,      # active, cancelled, etc.
            "end_date": user.subscription_end_date.isoformat() if user.subscription_end_date else None,
            "tokens": user.tokens,
            "is_subscription_active": (
                user.subscription_status == 'active' and
                user.subscription_end_date and
                user.subscription_end_date > datetime.utcnow()
            )
        }

        return jsonify(subscription_info), 200

    except Exception as e:
        # current_app.logger.error(f"Error fetching subscription info: {str(e)}")
        return jsonify({
            "error": "Failed to fetch subscription information",
            "details": str(e)
        }), 500



@misc_bp.route('/api/check-subscription-status', methods=['GET'])
@jwt_required()
def check_subscription_status():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.stripe_customer_id:
            return jsonify({
                'hasActiveSubscription': False,
                'subscriptionDetails': None
            }), 200

        # Get subscription directly from Stripe
        customer = stripe.Customer.retrieve(user.stripe_customer_id)
        subscriptions = stripe.Subscription.list(customer=user.stripe_customer_id, limit=1)

        if not subscriptions.data:
            return jsonify({
                'hasActiveSubscription': False,
                'subscriptionDetails': None
            }), 200

        subscription = subscriptions.data[0]

        return jsonify({
            'hasActiveSubscription': subscription.status == 'active',
            'subscriptionDetails': {
                'status': subscription.status,
                'planType': user.subscription_plan,  # Return user's plan from database instead of Stripe
                'currentPeriodEnd': subscription.current_period_end,
                'cancelAtPeriodEnd': subscription.cancel_at_period_end
            }
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Error checking subscription status: {str(e)}")
        return jsonify({
            'error': 'Failed to check subscription status'
        }), 500



@misc_bp.route('/api/cancel-subscription', methods=['POST'])
@jwt_required()
def cancel_subscription():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.stripe_customer_id:
            return jsonify({'error': 'No active subscription found'}), 404

        # Get subscription from Stripe
        subscriptions = stripe.Subscription.list(customer=user.stripe_customer_id, limit=1)

        if not subscriptions.data:
            return jsonify({'error': 'No active subscription found'}), 404

        subscription = subscriptions.data[0]

        # Cancel the subscription at period end
        stripe.Subscription.modify(
            subscription.id,
            cancel_at_period_end=True
        )

        # Update user's subscription status in database
        user.subscription_cancel_at_period_end = True
        user.subscription_plan = 'basic'  # Set plan to basic
        user.subscription_end_date = None  # Use Python None instead of string 'None'
        user.subscription_status = 'cancelled'  # Update status to cancelled

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Subscription will be cancelled at the end of the billing period'
        }), 200

    except Exception as e:
        db.session.rollback()  # Rollback changes if there's an error
        # current_app.logger.error(f"Error canceling subscription: {str(e)}")
        return jsonify({
            'error': 'Failed to cancel subscription'
        }), 500





@misc_bp.route('/api/get_metrics_now', methods=['POST'])
def get_metrics_now():
    try:
        # Parse request parameters
        request_data = request.get_json() or {}
        hours_range = request_data.get('hours', 24)  # Default 24 hours, 0 = all time
        max_points = request_data.get('max_points', 500)  # Max data points per metric
        update_data = request_data.get('update', True)  # Whether to update metrics
        clean_old_data = request_data.get('clean_old_data', None)  # Days to keep, None = keep all

        metrics = Metrics.query.first()
        if not metrics:
            metrics = Metrics()
            db.session.add(metrics)
            db.session.commit()

        # Clean old data only if explicitly requested
        # By default, keep all historical data for life-span view
        if clean_old_data is not None:
            clean_old_metrics_data(metrics, days_to_keep=clean_old_data)

        # Update metrics if requested
        if update_data:
            success = metrics.obtain_snapshot_now()
            if not success:
                return jsonify({
                    'success': False,
                    'error': 'Failed to update metrics'
                }), 500

        # Convert metrics to dict with optimizations
        metrics_dict = {}
        distribution_metrics = [
            'user_ip_location_country',
            'user_ip_location_city',
            'user_ip_location_region',
            'user_operating_system',
            'user_preferred_language',
            'message_language_filter'
        ]

        for key in metrics.__table__.columns.keys():
            if key == 'id':  # Skip id field
                continue

            value = getattr(metrics, key)

            if key == 'last_updated':
                metrics_dict[key] = str(value)
            elif isinstance(value, dict):
                # For distribution metrics (non-timeseries), return as-is
                if key in distribution_metrics:
                    metrics_dict[key] = value
                else:
                    # For time-series metrics, filter and downsample
                    metrics_dict[key] = filter_timeseries_data(value, hours_range, max_points)
            else:
                metrics_dict[key] = str(value) if value is not None else None

        # Calculate total data points, date range, and metrics count
        total_points = 0
        oldest_timestamp = None
        newest_timestamp = None
        metrics_with_data = 0
        timestamp_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

        for key, value in metrics_dict.items():
            if isinstance(value, dict):
                timestamps = [k for k in value.keys() if timestamp_pattern.match(str(k))]
                if timestamps:
                    metrics_with_data += 1
                    total_points += len(timestamps)

                    timestamps_sorted = sorted(timestamps)
                    if oldest_timestamp is None or timestamps_sorted[0] < oldest_timestamp:
                        oldest_timestamp = timestamps_sorted[0]
                    if newest_timestamp is None or timestamps_sorted[-1] > newest_timestamp:
                        newest_timestamp = timestamps_sorted[-1]

        # Calculate actual data span in days
        data_span_days = 0
        avg_points_per_metric = 0
        if oldest_timestamp and newest_timestamp:
            try:
                oldest_dt = datetime.fromisoformat(oldest_timestamp.replace('Z', '+00:00').split('.')[0])
                newest_dt = datetime.fromisoformat(newest_timestamp.replace('Z', '+00:00').split('.')[0])
                data_span_days = (newest_dt - oldest_dt).days
            except:
                pass

        if metrics_with_data > 0:
            avg_points_per_metric = total_points // metrics_with_data

        return jsonify({
            'success': True,
            'metrics': metrics_dict,
            'metadata': {
                'hours_range': hours_range if hours_range > 0 else 'all_time',
                'max_points': max_points,
                'total_data_points_sent': total_points,
                'metrics_count': metrics_with_data,
                'avg_points_per_metric': avg_points_per_metric,
                'last_updated': str(metrics.last_updated),
                'oldest_data': oldest_timestamp,
                'newest_data': newest_timestamp,
                'data_span_days': data_span_days
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error in get_metrics_now: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500








@misc_bp.route('/api/protected', methods=['GET'])
def protected():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    return jsonify(logged_in_as=user.username), 200

# @app.route('/api/user', methods=['POST'])


@misc_bp.route('/api/join-public-chatroom', methods=['GET'])
def join_public_chatroom():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    public_chatroom = ChatRoom.query.filter_by(id=1).first()  # Assuming 1 is your public chatroom ID
    if not public_chatroom:
        # Create public chatroom if it doesn't exist
        public_chatroom = ChatRoom(id=1, name="Public Room", creator_id=user.user_id)
        db.session.add(public_chatroom)
        db.session.commit()

    # Ensure user is a member of the public chatroom
    if user not in public_chatroom.participants:
        public_chatroom.participants.append(user)
        db.session.commit()

    return jsonify({
        "message": "Joined public chatroom successfully",
        "chatroom_id": public_chatroom.id,
        "chatroom_name": public_chatroom.name
    }), 200




@misc_bp.route('/api/last-used-chatroom/<user_id>', methods=['GET'])
def get_last_used_chatroom(user_id):
    user = User.query.filter_by(user_id=user_id).first()
    if user:
        # Get the chatroom details
        chatroom = ChatRoom.query.filter_by(id=user.last_used_chatroom_id).first()
        if chatroom:
            return jsonify({
                "last_used_chatroom_id": user.last_used_chatroom_id,
                "is_private": chatroom.is_private,
                "name": chatroom.name
            }), 200
        return jsonify({
            "last_used_chatroom_id": user.last_used_chatroom_id,
            "is_private": '0',
            "name": None
        }), 200
    else:
        return jsonify({"error": "User not found"}), 404




@misc_bp.route('/api/private-chatroom', methods=['POST'])
@jwt_required()
def access_private_chatroom():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check if user already has a private room
    if user.private_room_id:
        chatroom = ChatRoom.query.get(user.private_room_id)
        if chatroom:
            # print("Existing private room found:", chatroom.id)  # Debug print
                # Update last used chatroom
            user.last_used_chatroom_id = chatroom.id
            db.session.add(user)
            db.session.commit()
            return jsonify({
                "chatroomId": chatroom.id,
                "chatroomName": chatroom.name
            }), 200

    # Create new private chatroom if user doesn't have one
    private_chatroom = ChatRoom(
        name=f"{user.username}'s Private Room",
        creator_id=user.user_id,
        is_private='1',
        max_participants=1
    )
    # Add user as participant
    private_chatroom.participants.append(user)
    try:
        # print("Creating new private room")
        db.session.add(private_chatroom)
        db.session.flush()  # This will populate the id field
        user.private_room_id = private_chatroom.id  # Get the auto-generated ID
                # Update last used chatroom
        # user.last_used_chatroom_id = chatroom.id
        # db.session.add(user)
        db.session.commit()
        return jsonify({
            "chatroomId": private_chatroom.id,
            "chatroomName": private_chatroom.name
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create private chatroom: {str(e)}"}), 500




@misc_bp.route('/api/creator-remove-user', methods=['POST'])
@jwt_required()
def creator_remove_user():
    try:
        data = request.json
        creator_id = data.get('creatorId')
        kicked_user_id = data.get('kickedUserId')
        chatroom_id = data.get('chatroomId')

        # Verify the current user from JWT matches the creator_id
        current_user_id = get_jwt_identity()
        if str(current_user_id) != str(creator_id):
            return jsonify({"error": "Unauthorized action"}), 403

        if not creator_id or not kicked_user_id or not chatroom_id:
            return jsonify({"error": "All fields are required"}), 400

        # Get chatroom and users
        chatroom = ChatRoom.query.get(chatroom_id)
        kicked_user = User.query.filter_by(user_id=kicked_user_id).first()

        if not chatroom or not kicked_user:
            return jsonify({"error": "Chatroom or user not found"}), 404

        # Verify the creator
        if chatroom.creator_id != creator_id:
            return jsonify({"error": "Only the creator can remove users"}), 403

        # Cannot remove the creator
        if kicked_user_id == creator_id:
            return jsonify({"error": "Cannot remove the creator"}), 400

        try:
            # Remove from participants
            if kicked_user in chatroom.participants:
                chatroom.participants.remove(kicked_user)
                db.session.commit()
                                # Emit socket event to notify the kicked user
                sio.emit('already_leave_chatroom', {
                    'chatroomId': chatroom_id,
                    'userId': kicked_user_id,
                    'is_leave': True
                }, room=str(chatroom_id))  # Broadcast to the entire room

                return jsonify({
                    "message": "User removed from chatroom successfully"
                }), 200
            else:
                return jsonify({"error": "User is not in this chatroom"}), 404

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Server error: {str(e)}"}), 500



