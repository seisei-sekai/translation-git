"""
Message routes
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
from services.translation import translate_text, get_new_translated_string, get_new_translated_string_4o_stylish
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


message_bp = Blueprint('message', __name__)


@message_bp.route('/api/clear-history/<chatroom_id>', methods=['DELETE'])
def clear_history(chatroom_id):
    try:
        # Permanently delete all records in the Translation table related to the chatroom
        db.session.query(Message).filter_by(chatroom_id=chatroom_id).delete()
        db.session.commit()
        db.session.expire_all()  # Expire session to release any locks

        # Emit a Socket.IO event to notify all clients
        sio.emit('history_cleared', {"message": f"Message history for chatroom {chatroom_id} has been cleared."})

        return jsonify({"message": "Message history cleared for chatroom."}), 200
    except Exception as e:
        db.session.rollback()  # Rollback transaction in case of error
        return jsonify({"error": str(e)}), 500








@message_bp.route('/api/preview-translate', methods=['POST'])
def preview_translate():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        language = data.get('language')
        text = data.get('text')
        low_cost_mode = data.get('lowCostMode', '0')  # Default to regular mode
        is_guest_mode = data.get('isGuestMode', False)
        curr_host_user_id = data.get('currHostUserId')

        if not all([user_id, language, text]):
            return jsonify({"error": "Missing required parameters"}), 400

        # Check if user exists and has enough tokens
        user = User.query.filter_by(user_id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Get translation based on language type
        if language == 'original_text_raw':
            translation = text
            response = None
        elif language in MAINSTREAM_LANGUAGES:
            response = get_new_translated_string(language, text)
            translation = response.choices[0].message.content if response else text
        else:
            response = get_new_translated_string_4o_stylish(language, text, low_cost_mode)
            translation = response.choices[0].message.content if response else text

        # Calculate and deduct tokens if translation was performed
        if response:
            # Calculate prices based on model
            price_gpt4o = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O +
                          response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O)

            price_gpt4o_mini = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI +
                               response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI)

            # Set price based on low cost mode
            preview_price = price_gpt4o_mini if low_cost_mode == '1' else price_gpt4o

            # If in guest mode, check host user's tokens instead
            if is_guest_mode and curr_host_user_id:
                user = User.query.filter_by(user_id=curr_host_user_id).first()
                if not user:
                    return jsonify({"error": "Host user not found"}), 404

            # # Check if user has enough tokens
            # if user.tokens < preview_price:
            #     return jsonify({"error": "Insufficient tokens"}), 403

            # Deduct tokens
            # Increment preview message count
            user.preview_message_count += 1
            user.tokens -= preview_price
            db.session.commit()

        return jsonify({
            "translation": translation,
            "tokens_used": response.usage.total_tokens if response else 0
        })

    except Exception as e:
        # current_app.logger.error(f"Preview translation error: {str(e)}")
        db.session.rollback()
        return jsonify({"error": "Translation failed"}), 500






@message_bp.route('/api/get-messages-on-demand/<chatroom_id>/<language>/<language_first>/<language_second>/<is_split>', methods=['GET'])
def get_messages_on_demand(chatroom_id, language, language_first, language_second, is_split):
    try:
        user_id = request.args.get('userId')
        is_guest_mode = request.args.get('isGuestMode', 'false').lower() == 'true'
        curr_host_user_id = request.args.get('currHostUserId')
        socket_id = request.args.get('socketId')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        check_user_id = curr_host_user_id if curr_host_user_id else user_id
        if check_user_id:
            user = User.query.filter_by(user_id=check_user_id).first()
            if user and user.tokens <= 0:
                sio.emit('check_token_status_is_negative', {
                    'userId': user_id,
                    'hostUserId': curr_host_user_id
                }, room=str(chatroom_id))



        low_cost_mode = request.args.get('lowCostMode', '0')
        message_ids = request.args.get('message_ids', '').split(',')
        message_ids = [int(mid) for mid in message_ids if mid.isdigit()]

        # print("get_all_messages")  # Preserved print statement

        # Check chatroom with error handling
        chatroom = ChatRoom.query.get(chatroom_id)
        if not chatroom:
            return jsonify({"error": "Chatroom not found"}), 404
        if chatroom.is_invisible:
            return jsonify({"error": "This chatroom is no longer available"}), 405

        # Convert is_split string to boolean
        is_split = is_split.lower() == 'true'

        # Build query with proper locking strategy
        query = Message.query.with_for_update(skip_locked=False).filter_by(chatroom_id=chatroom_id)
        if message_ids:
            query = query.filter(Message.id.in_(message_ids))
        messages = query.order_by(Message.timestamp.asc()).all()

        all_messages = []
        for message in messages[::-1]:
            user = User.query.filter_by(user_id=message.user_id).first()
            if user:
                if is_split:
                    # Handle split mode translations
                    for lang in [language_first, language_second]:
                        if lang not in message.translations or not message.translations[lang]:
                            if lang == 'original_text_raw':
                                message.add_translation(lang, message.original_text)
                            else:
                                if lang in MAINSTREAM_LANGUAGES:
                                    response = get_new_translated_string(lang, message.original_text)
                                    message.add_translation(lang, response.choices[0].message.content, response)
                                else:
                                    response = get_new_translated_string_4o_stylish(lang, message.original_text, low_cost_mode)
                                    message.add_translation(lang, response.choices[0].message.content, response)
                else:
                    # Handle single language mode
                    if language not in message.translations or not message.translations[language]:
                        if language == 'original_text_raw':
                            message.add_translation(language, message.original_text)
                        else:
                            if language in MAINSTREAM_LANGUAGES:
                                response = get_new_translated_string(language, message.original_text)
                                message.add_translation(language, response.choices[0].message.content, response)
                            else:
                                response = get_new_translated_string_4o_stylish(language, message.original_text, low_cost_mode)
                                message.add_translation(language, response.choices[0].message.content, response)

                try:
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    # current_app.logger.error(f"Failed to commit translations: {str(e)}")

                # Get priced translation with separate transaction

                pricing_user_id = curr_host_user_id if is_guest_mode and curr_host_user_id else user_id
                priced_translation = message.get_translation_priced(pricing_user_id, language, low_cost_mode)
                # Wrap priced_translation in a dict with language key
                # priced_translation = {language: priced_translation}
                # print(f"FFFFFFFFFFFPriced translation: {priced_translation}")
                # print(f"User ID: {user_id}")
                content = {
                    'id': message.id,
                    'username': message.username,
                    'userId': message.user_id,
                    'original_text': message.original_text,
                    'translated_text': message.translated_text,
                    'content_type': message.content_type,
                    'timestamp': message.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    'translations': priced_translation or {},
                    'is_recalled': message.is_recalled,
                    'is_edited': message.is_edited,
                    'recall_username': message.username if message.is_recalled == '1' else None,
                    'reply_to_message_id': message.reply_to_message_id,
                    'avatar': user.avatar
                }

                sio.emit('received_translated_existed_single_language', content, room=socket_id)
                all_messages.append(content)

                # print(message.translations)  # Preserved print statement

        return jsonify({"messages": all_messages}), 200

    except Exception as e:
        # current_app.logger.error(f"Error in get_messages_on_demand: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500







@message_bp.route('/api/all-messages/<chatroom_id>/<language>/<language_first>/<language_second>/<is_split>', methods=['GET'])
def get_all_messages(chatroom_id, language, language_first, language_second, is_split):
    user_id = request.args.get('userId')  # Add this line
    is_guest_mode = request.args.get('isGuestMode', 'false').lower() == 'true'
    curr_host_user_id = request.args.get('currHostUserId')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    low_cost_mode = request.args.get('lowCostMode', '0')  # Add this line
    # Check if chatroom exists and is invisible
    chatroom = ChatRoom.query.get(chatroom_id)
    if not chatroom:
        return jsonify({"error": "Chatroom not found"}), 404
    if chatroom.is_invisible:
        return jsonify({"error": "This chatroom is no longer available"}), 405

    # Convert is_split string to boolean
    is_split = is_split.lower() == 'true'

    # Fetch messages for the specified chatroom, ordered by timestamp
    messages = Message.query.filter_by(chatroom_id=chatroom_id).order_by(Message.timestamp.asc()).all()
    # print("get_all_messages")

    # Prepare the response data
    all_messages = []
    for message in messages:
        user = User.query.filter_by(user_id=message.user_id).first()
        if user:
            if is_split:
                # Handle split mode - generate translations for both languages if needed
                if language_first not in message.translations or not message.translations[language_first]:
                    if language_first == 'original_text_raw':
                        message.add_translation(language_first, message.original_text)
                    else:
                        if language_first in MAINSTREAM_LANGUAGES:
                            response = get_new_translated_string(language_first, message.original_text)
                            message.add_translation(language_first, response.choices[0].message.content, response)
                        else:
                            response = get_new_translated_string_4o_stylish(language_first, message.original_text, low_cost_mode)
                            message.add_translation(language_first, response.choices[0].message.content, response)

                if language_second not in message.translations or not message.translations[language_second]:
                    if language_second == 'original_text_raw':
                        message.add_translation(language_second, message.original_text)
                    else:
                        if language_second in MAINSTREAM_LANGUAGES:
                            response = get_new_translated_string(language_second, message.original_text)
                            message.add_translation(language_second, response.choices[0].message.content, response)
                        else:
                            response = get_new_translated_string_4o_stylish(language_second, message.original_text, low_cost_mode)
                            message.add_translation(language_second, response.choices[0].message.content, response)

                db.session.commit()
            else:
                # Original single language mode
                if language not in message.translations or not message.translations[language]:
                    if language == 'original_text_raw':
                        message.add_translation(language, message.original_text)
                    else:
                        if language in MAINSTREAM_LANGUAGES:
                            response = get_new_translated_string(language, message.original_text)
                            message.add_translation(language, response.choices[0].message.content, response)
                        else:
                            response = get_new_translated_string_4o_stylish(language, message.original_text, low_cost_mode)
                            message.add_translation(language, response.choices[0].message.content, response)

                    db.session.commit()

            content = {
                'id': message.id,
                'username': message.username,
                'userId': message.user_id,
                'original_text': message.original_text,
                'translated_text': message.translated_text,
                'content_type': message.content_type,
                'timestamp': message.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                'translations': message.translations,
                'is_recalled': message.is_recalled,  # Make sure to include this
                'is_edited': message.is_edited,
                'recall_username': message.username if message.is_recalled == '1' else None,  # Add this
                'reply_to_message_id': message.reply_to_message_id,
                'avatar':user.avatar
            }
            sio.emit('received_translated_existed_single_language', content, room=str(chatroom_id))
            all_messages.append(content)

            # print(message.translations)
            # Emit with message ID included

    return jsonify({"messages": all_messages}), 200









@message_bp.route('/api/upload-message-photo-raw', methods=['POST'])
def upload_photo_raw():
    '''
    Route to upload a raw photo message and associate it with a chatroom, without OpenAI interpretation.
    '''
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    if 'photo' not in request.files:
        return jsonify({"error": "No photo file provided"}), 400

    user_id = request.form.get('userId')
    chatroom_id = request.form.get('chatroomId')
    username = request.form.get('username')

    if not user_id or not chatroom_id:
        return jsonify({"error": "No user ID or chatroom ID provided"}), 400

    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        add_user(user_id, username)
        user = User.query.filter_by(user_id=user_id).first()

    # Save photo file
    photo_file = request.files['photo']
    if photo_file and allowed_file(photo_file.filename):
        filename = secure_filename(photo_file.filename)
        base_filename = os.path.splitext(filename)[0]
        jpeg_filename = f"{base_filename}.jpeg"
        photo_path = os.path.join(UPLOAD_FOLDER, f"chatroom_photo/{jpeg_filename}")

        # Convert image to JPEG format
        image = Image.open(photo_file)
        image = image.convert("RGB")
        image.save(photo_path, "JPEG")

        # Save the photo message to the database
        new_message = Message(
            user_id=user.user_id,
            username=user.username,
            chatroom_id=chatroom_id,
            original_text=photo_path,
            translated_text="",  # Simple text indicator
            content_type='photo'
        )
        db.session.add(new_message)
        db.session.commit()

        # Emit with message ID included
        sio.emit('new_message', {
            'id': new_message.id,  # Add message ID
            'username': user.username,
            'userId': user.user_id,
            'original_text': photo_path,
            'translated_text': "",  # Simple text indicator
            'content_type': 'photo',
            'timestamp': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            'chatroom_id': chatroom_id,
            'is_recalled': '0',
            'is_edited':'0'
        }, room=str(chatroom_id))

        return jsonify({"status": "success", "message": "[Photo]"}), 201

    return jsonify({"error": "Invalid file type"}), 400



@message_bp.route('/api/upload-message-photo', methods=['POST'])
def upload_photo():
    '''
    Route to upload and interpret a photo message and associate it with a chatroom.
    '''
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    if 'photo' not in request.files:
        return jsonify({"error": "No photo file provided"}), 400

    user_id = request.form.get('userId')
    chatroom_id = request.form.get('chatroomId')  # Get the chatroom ID from the request
    username = request.form.get('username')
    systemLanguage = request.form.get('systemLanguage')
    selectedLanguageMeFirst = request.form.get('selectedLanguageMeFirst')
    is_guest_mode = request.form.get('isGuestMode')
    curr_host_user_id = request.form.get('currHostUserId')
    if selectedLanguageMeFirst == 'original_text_raw':
        selectedLanguageMeFirst = systemLanguage
    low_cost_mode = request.form.get('lowCostMode')
    model = 'gpt-4o-mini' # if low_cost_mode == '1' else 'gpt-4o'
    if not user_id or not chatroom_id:
        return jsonify({"error": "No user ID or chatroom ID provided"}), 400

    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        add_user(user_id, username)
        user = User.query.filter_by(user_id=user_id).first()

    # Save photo file
    photo_file = request.files['photo']
    if photo_file and allowed_file(photo_file.filename):
        filename = secure_filename(photo_file.filename)
        base_filename = os.path.splitext(filename)[0]
        jpeg_filename = f"{base_filename}.jpeg"
        photo_path = os.path.join(UPLOAD_FOLDER, f"chatroom_photo/{jpeg_filename}")

        # Convert image to JPEG format
        image = Image.open(photo_file)
        image = image.convert("RGB")
        image.save(photo_path, "JPEG")

        # Base64 encode the image
        # print("sdfsdfsdfsdfsdfsdfhihihihihihihihi")
        # print(photo_path)
        # print(selectedLanguageMeFirst)
        base64_image = encode_image(photo_path)

        prompt_for_photo = (f"You will receive an image containing text. Your task is: provide the literal meaning of each character in the image using {selectedLanguageMeFirst} without any analysis or interpretation. After providing the literal meaning, "
                            f"summarize the overall content of the image. Please express everything in {selectedLanguageMeFirst}.")

        prompt = prompt_for_photo
        # OpenAI prompt to interpret the photo
        response = openAI_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                        },
                    ],
                    }
                ],
                max_tokens=4000,
                )
        # print(f"Model: {response.model}")
        # print(f"Usage - Completion tokens: {response.usage.prompt_tokens}")
        # print(f"Usage - Prompt tokens: {response.usage.prompt_tokens}")
        # print(f"Usage - Total tokens: {response.usage.total_tokens}")
        # print(f"Content4: {response.choices[0].message.content}")
        interpretation = response.choices[0].message.content
        # print(f"Translation: {interpretation}")

        # Save the photo interpretation to the database, associated with the chatroom
        new_message = Message(
            user_id=user_id,
            username= username,
            chatroom_id=chatroom_id,  # Associate translation with chatroom
            original_text=photo_path,
            translated_text=interpretation,
            content_type='photo',
            is_recalled='0',
            is_edited='0'
        )
        db.session.add(new_message)
        db.session.commit()

        # Calculate prices for both models
        price_gpt4o = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O +
                      response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O)

        price_gpt4o_mini = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI +
                           response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI)

        # Set photo price based on low cost mode
        photo_price = price_gpt4o_mini if low_cost_mode == '1' else price_gpt4o

        # Deduct tokens from user's balance
        if is_guest_mode and curr_host_user_id:
            # If in guest mode, deduct from host's tokens
            user = User.query.filter_by(user_id=curr_host_user_id).first()
        else:
            # Otherwise deduct from user's tokens
            user = User.query.filter_by(user_id=user_id).first()

        if user:
            user.tokens -= photo_price
            db.session.commit()
            # print(f"Updated user tokens. Cost: {photo_price} tokens for photo interpretation")
        else:
            print("User not found")

        # Emit with message ID included
        sio.emit('new_message', {
            'id': new_message.id,  # Add message ID
            'username': username,
            'userId': user_id,
            'original_text': photo_path,
            'translated_text': interpretation,
            'content_type': 'photo',
            'timestamp': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            'chatroom_id': chatroom_id,
            'is_recalled': '0',
            'is_edited':'0'
        }, room=str(chatroom_id))

        return jsonify({"status": "success", "message": interpretation}), 201

    return jsonify({"error": "Invalid file type"}), 400



