"""
Chatroom routes
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
from models.associations import user_chatroom

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


chatroom_bp = Blueprint('chatroom', __name__)


@chatroom_bp.route('/api/chatroom/<int:chatroom_id>', methods=['GET'])
def get_chatroom_name(chatroom_id):
    chatroom = ChatRoom.query.get(chatroom_id)
    if not chatroom:
        return jsonify({"error": "Chatroom not found"}), 404
    return jsonify({
        "name": chatroom.name,
        "is_private": chatroom.is_private
    }), 200




@chatroom_bp.route('/api/get-chatroom-id-coded', methods=['POST'])
@jwt_required()
def get_chatroom_id_coded():
    try:
        data = request.get_json()
        chatroom_id = data.get('chatroomId')

        if not chatroom_id:
            return jsonify({'error': 'Chatroom ID is required'}), 400

        # Query the chatroom from database
        chatroom = ChatRoom.query.filter_by(id=chatroom_id).first()

        if not chatroom:
            return jsonify({'error': 'Chatroom not found'}), 404

        # Check if enter_coded_id exists, if not generate it
        if not chatroom.enter_coded_id:
            chatroom.generate_enter_coded_id()
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                return jsonify({'error': 'Failed to generate coded ID'}), 500

        return jsonify({
            'success': True,
            'enter_coded_id': chatroom.enter_coded_id
        }), 200

    except Exception as e:
        # print(f"Error in get_chatroom_id_coded: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500




@chatroom_bp.route('/api/create-chatroom', methods=['POST'])
def create_chatroom():
    data = request.json
    isEmpty =   data.get('isEmpty')
    chatroom_name = data.get('chatroomName')
    creator_id = data.get('creatorId')
    # print(creator_id)
    # print("fucckkkk")
    password = data.get('password')
    advanced_options = data.get('advancedOptions', {})

    if not chatroom_name or not creator_id:
        return jsonify({"error": "Chatroom name and creator ID are required"}), 400

    # new_id = ChatRoom.query.count() + 1
    if isEmpty == '1':
        chatroom_name = f"New Chatroom"


    new_chatroom = ChatRoom(
        # id=new_id,
        name=chatroom_name,
        creator_id=creator_id,
        max_participants=100,
        allow_friends_only=False,
        max_messages=None,
        max_messages_per_hour=None,
        is_invisible=False,
        password=password,
        # Add new fields
        non_registered_enterable=advanced_options.get('nonRegisteredEnterable', '1'),
        token_spending_mode=advanced_options.get('tokenSpendingMode', '0'),
        token_spending_enterprise_code=advanced_options.get('tokenSpendingEnterpriseCode'),
        filter_allowance_mode=advanced_options.get('filterAllowanceMode', '0'),

    )





    try:
        db.session.add(new_chatroom)
        db.session.commit()  # Ensure the chatroom has an ID
        new_chatroom.generate_enter_coded_id()  # Generate the enter_coded_id
        db.session.commit()
        return jsonify({
            "message": "Chatroom created successfully",
            "chatroomId": new_chatroom.id,
            "codedId": new_chatroom.enter_coded_id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create chatroom: {str(e)}"}), 500






@chatroom_bp.route('/api/join-chatroom', methods=['POST'])
def join_chatroom():
    try:
        data = request.json
        user_id = data.get('userId')
        chatroom_id = data.get('chatroomId')
        password = data.get('password', '')

        print(f"Attempting to join chatroom: {chatroom_id} for user: {user_id}")  # Debug print

        if not user_id or not chatroom_id:
            return jsonify({"error": "User ID and Chatroom ID are required"}), 400

        # Get user and chatroom
        user = User.query.filter_by(user_id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        chatroom = ChatRoom.query.get(chatroom_id)
        if not chatroom:
            return jsonify({"error": "Chatroom not found"}), 404

        # Check if chatroom is invisible/deleted
        if chatroom.is_invisible:
            print("Chatroom is invisible/deleted")  # Debug print
            return jsonify({"error": "This chatroom has been deleted"}), 404

        # Check if user is creator
        is_creator = (chatroom.creator_id == user.user_id)
        print(f"Is creator: {is_creator}")  # Debug print

        print(f"Chatroom is_private: {chatroom.is_private}")  # Debug print
        print(f"User private_room_id: {user.private_room_id}")  # Debug print
        print(f"Chatroom creator_id: {chatroom.creator_id}")  # Debug print
        print(f"User id: {user.user_id}")  # Debug print

        # Check if chatroom is private
        if chatroom.is_private == '1':
            print("Checking private chatroom access")  # Debug print
            if user.private_room_id != chatroom.id:
                print("User cannot access this private room - wrong private_room_id")  # Debug print
                return jsonify({"error": "You can only access your own private chatroom"}), 403
            if chatroom.creator_id != user.user_id:
                print("User cannot access this private room - not creator")  # Debug print
                return jsonify({"error": "This is a private chatroom"}), 403
            print("Private chatroom access granted")  # Debug print

        # For non-private chatrooms, continue with normal flow
        user_chatroom_entry = db.session.query(user_chatroom).filter_by(
            user_id=user.user_id,
            chatroom_id=chatroom.id
        ).first()
        print(f"Existing user_chatroom entry: {user_chatroom_entry is not None}")  # Debug print

        if user_chatroom_entry and user_chatroom_entry.has_joined:
            print("User has already joined this chatroom")  # Debug print
            # User has joined before, no need to check password
            # Update last used chatroom
            user.last_used_chatroom_id = chatroom.id
            db.session.add(user)
            return jsonify({
                "message": "User joined the chatroom successfully",
                "is_creator": is_creator
            }), 200

        # Check if the chatroom has a password and if it matches
        if chatroom.password and chatroom.password != password:
            print("Password mismatch")  # Debug print
            return jsonify({"error": "Incorrect password"}), 403

        print("Adding user to chatroom")  # Debug print
        # Add the user to the chatroom
        if not user_chatroom_entry:
            user_chatroom_entry = user_chatroom.insert().values(
                user_id=user.user_id,
                chatroom_id=chatroom.id,
                has_joined=True
            )
            db.session.execute(user_chatroom_entry)
        else:
            user_chatroom_entry.has_joined = True

        # Add user to chatroom participants if not already added
        if user not in chatroom.participants:
            chatroom.participants.append(user)

        # Create and emit join notification
        join_notification = {
            'content_type': 'join_notification',
            'username': user.username,
            'userId': user.user_id,
            'timestamp': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            'avatar': user.avatar
        }
        sio.emit('user_joined_chatroom', join_notification, room=str(chatroom_id))

        # Update last used chatroom
        user.last_used_chatroom_id = chatroom.id
        db.session.add(user)

        db.session.commit()
        print("Successfully joined chatroom")  # Debug print
        return jsonify({
            "message": "User joined the chatroom successfully",
            "is_creator": is_creator
        }), 200

    except Exception as e:
        print(f"Error in join_chatroom: {str(e)}")  # Debug print
        db.session.rollback()
        return jsonify({
            "error": "Failed to join chatroom",
            "details": str(e)
        }), 500



@chatroom_bp.route('/api/leave-chatroom', methods=['POST'])
def leave_chatroom():
    try:
        data = request.json
        user_id = data.get('userId')
        chatroom_id = data.get('chatroomId')

        if not user_id or not chatroom_id:
            return jsonify({"error": "User ID and Chatroom ID are required"}), 400

        # Get user and chatroom
        user = User.query.filter_by(user_id=user_id).first()
        chatroom = ChatRoom.query.get(chatroom_id)

        if not user or not chatroom:
            return jsonify({"error": "User or chatroom not found"}), 404

        # Check if user is in the chatroom
        if user not in chatroom.participants:
            return jsonify({"error": "User is not in this chatroom"}), 404

        try:
            # If user is creator
            if chatroom.creator_id == user.user_id:
                chatroom.is_invisible = True
                db.session.commit()
                return jsonify({
                    "message": "Creator has left the chatroom. Chatroom is now invisible.",
                    "is_creator": True
                }), 200

            # If user is regular participant
            else:
                # # Remove user from participants
                # chatroom.participants.remove(user)
                # Delete the association in user_chatroom table
                db.session.execute(
                    user_chatroom.delete().where(
                        (user_chatroom.c.user_id == user.user_id) &
                        (user_chatroom.c.chatroom_id == chatroom.id)
                    )
                )
                db.session.commit()
                return jsonify({
                    "message": "User has left the chatroom successfully",
                    "is_creator": False
                }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500



@chatroom_bp.route('/api/join-chatroom-guest', methods=['POST'])
def join_chatroom_guest():
    data = request.json
    chatroom_id = data.get('chatroomId')
    password = data.get('password')

    chatroom = ChatRoom.query.get(chatroom_id)
    if not chatroom:
        return jsonify({"error": "Chatroom not found"}), 404

    # Check if chatroom allows guest access
    if chatroom.non_registered_enterable != '1':
        return jsonify({"error": "guests_not_allowed"}), 403

    # Check if chatroom is private
    if chatroom.is_private == '1':
        return jsonify({"error": "Cannot join private chatrooms as a guest"}), 403

    # Check password if set
    if chatroom.password and chatroom.password != password:
        return jsonify({"error": "Incorrect password"}), 403

    return jsonify({
        "success": True,
        "creatorUserId": chatroom.creator_id,
        "message": "Guest access granted"
    }), 200




@chatroom_bp.route('/api/get-chatroom-meta-details', methods=['GET'])
def get_chatroom_meta_details():
    try:
        # Get parameters from request
        user_id = request.args.get('userId')
        chatroom_id = request.args.get('chatroomId')

        if not user_id or not chatroom_id:
            return jsonify({"error": "Missing userId or chatroomId"}), 400

        # Get user and chatroom
        user = User.query.filter_by(user_id=user_id).first()
        chatroom = ChatRoom.query.get(chatroom_id)

        if not user or not chatroom:
            return jsonify({"error": "User or chatroom not found"}), 404

        # Check if user is a participant
        if user not in chatroom.participants and user.user_id != chatroom.creator_id:
            return jsonify({"error": "User is not authorized to access this chatroom"}), 403
        # Get creator details
        creator = User.query.filter_by(user_id=chatroom.creator_id).first()
        # Base response with common fields
        response = {
            "id": chatroom.id,
            "name": chatroom.name,
            "creator_id": chatroom.creator_id,
            "creator_name": creator.username if creator else "Unknown",
            "creator_avatar": creator.avatar if creator else "default_avatar.png",
            "unique_url": chatroom.unique_url,
            "is_private": chatroom.is_private,
            "password": chatroom.password,
            "participants": [{
                "user_id": p.user_id,
                "avatar": p.avatar
            } for p in chatroom.participants],
            "group_announcement_text": chatroom.group_announcement_text,
            "group_announcement_pic": chatroom.group_announcement_pic,
            "non_registered_enterable": chatroom.non_registered_enterable,
            "token_spending_mode": chatroom.token_spending_mode,
            "filter_allowance_mode": chatroom.filter_allowance_mode
        }

        # Add enterprise code only if user is creator
        if user.user_id == chatroom.creator_id:
            response["token_spending_enterprise_code"] = chatroom.token_spending_enterprise_code

        return jsonify(response), 200

    except Exception as e:
        # current_app.logger.error(f"Error getting chatroom meta details: {str(e)}")
        return jsonify({"error": str(e)}), 500



@chatroom_bp.route('/api/set-chatroom-meta-details', methods=['POST'])
def set_chatroom_meta_details():
    try:
        data = request.json
        user_id = data.get('userId')
        chatroom_id = data.get('chatroomId')
        updates = data.get('updates', {})

        if not user_id or not chatroom_id:
            return jsonify({"error": "Missing userId or chatroomId"}), 400

        # Get user and chatroom
        user = User.query.filter_by(user_id=user_id).first()
        chatroom = ChatRoom.query.get(chatroom_id)

        if not user or not chatroom:
            return jsonify({"error": "User or chatroom not found"}), 404

        # Verify user is the creator
        if user.user_id != chatroom.creator_id:
            return jsonify({"error": "Only the creator can modify chatroom settings"}), 403

        # List of allowed fields to update
        allowed_fields = {
            'name', 'unique_url', 'is_private', 'password',
            'group_announcement_text', 'group_announcement_pic',
            'non_registered_enterable', 'token_spending_mode',
            'filter_allowance_mode', 'token_spending_enterprise_code'
        }

        # Track which fields were updated
        updated_fields = []

        # Update each field if it's in the allowed list
        for key, value in updates.items():
            if key in allowed_fields and hasattr(chatroom, key):
                if key == 'password' and value:
                    # Handle password updates (you might want to add additional validation)
                    setattr(chatroom, key, value)
                    updated_fields.append(key)
                elif key != 'password':  # For non-password fields
                    setattr(chatroom, key, value)
                    updated_fields.append(key)

        if not updated_fields:
            return jsonify({"message": "No valid fields to update"}), 400

        try:
            db.session.commit()
            return jsonify({
                "message": "Chatroom updated successfully",
                "updated_fields": updated_fields
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500

    except Exception as e:
        # current_app.logger.error(f"Error updating chatroom meta details: {str(e)}")
        return jsonify({"error": str(e)}), 500













#


@chatroom_bp.route('/api/chatroom-users/<int:chatroom_id>', methods=['GET'])
def get_chatroom_users(chatroom_id):
    try:
        # Get the chatroom
        chatroom = ChatRoom.query.get(chatroom_id)
        if not chatroom:
            return jsonify({"error": "Chatroom not found"}), 404

        # Get all participants including the creator
        users = []

        # Add creator info
        creator = User.query.filter_by(user_id=chatroom.creator_id).first()
        if creator:
            users.append({
                "user_id": creator.user_id,
                "username": creator.username,
                "avatar": creator.avatar,
                "is_creator": True
            })

        # Add other participants
        for participant in chatroom.participants:
            if participant.user_id != chatroom.creator_id:  # Avoid duplicating creator
                users.append({
                    "user_id": participant.user_id,
                    "username": participant.username,
                    "avatar": participant.avatar,
                    "is_creator": False
                })

        return jsonify({
            "chatroom_id": chatroom_id,
            "chatroom_name": chatroom.name,
            "users": users
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Error getting chatroom users: {str(e)}")
        return jsonify({"error": str(e)}), 500









# Chatlist method


# ... existing imports and code ...



@chatroom_bp.route('/api/chatroom-guest/<string:enter_coded_id>', methods=['GET'])
def get_chatroom_info(enter_coded_id):
    # Search for chatroom with matching enter_coded_id
    chatroom = ChatRoom.query.filter_by(enter_coded_id=enter_coded_id).first()
    if not chatroom:
        return jsonify({"error": "Chatroom not found"}), 404
    return jsonify({
        "name": chatroom.name,
        "id": chatroom.id
    }), 200


# ... rest of the file ...





