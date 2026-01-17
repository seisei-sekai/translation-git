"""
Socket.IO Event Handlers
Extracted from app_legacy.py
"""
from flask import current_app
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import base64
import json
import os
import io

# Import from extensions
from extensions import db, sio, openAI_client
# Import get_app for accessing app context in socket handlers
from socket_handlers import get_app

# Import from config
from config.constants import (
    TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O,
    TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O,
    TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI,
    TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI,
    AUDIO_UNIT_PRICE_PER_MINUTE
)

# Import models
from models import User, ChatRoom, Message, Notification

# Import services
from services.translation import translate_text, get_new_translated_string, get_new_translated_string_4o_stylish
from services.token_service import check_and_update_tokens


def add_user(user_id, username):
    """Helper function to create a new user"""
    if username is None:
        username = "user_" + user_id[:4]
    new_user = User(user_id=user_id, username=username, email=f"{user_id}@test.test", password=f"{user_id}")
    db.session.add(new_user)
    db.session.commit()


@sio.event
def connect(sid, environ):
    print(f"[SOCKET.IO] Client connected: {sid}")
    # print(f"Client connected: {sid}")



@sio.event
def disconnect(sid):
    pass
    # print(f"Client disconnected: {sid}")


#fuck


@sio.event
def audio_chunk(sid, data):
    print(f"[SOCKET.IO] Received audio_chunk from {sid}, size: {len(data.get('audio', b''))} bytes")
    # print(f"Received audio chunk from {sid}")
    # # print("Received data:", data)  # Debug: Print the entire data object

    # Safely get values from the data dictionary
    audio_data = data.get('buffer')
    target_language = data.get('targetLanguage')
    user_id = data.get('userId')
    is_voice_clone_tts_enabled = data.get('isVoiceCloneTTSEnabled')

    # # Check if required data is present
    # if not audio_data:
    #     # print("Error: No audio data received")
    #     return
    # if not target_language:
    #     # print("Warning: No target language specified")
    # if not user_id:
    #     # print("Warning: No userId specified")
    #     # You might want to use a default user ID or skip processing
    #     # user_id = "default_user"  # Uncomment this if you want to use a default
    #     return  # Or return here if you want to skip processing without a user ID

    # Proceed with audio processing
    try:
        # audio_processor.process_audio(audio_data, target_language, user_id, is_voice_clone_tts_enabled)
        a=0
    except Exception as e:
        print(f"Error processing audio: {str(e)}")



@sio.event
def join_room(sid, data):
    with get_app().app_context():
        user_id = data['userId']
        chatroom_id = str(data['chatroomId'])  # Convert to string
        sio.enter_room(sid, chatroom_id)
        # Check if user is still a participant
        chatroom = ChatRoom.query.get(int(chatroom_id))
        if not chatroom:
            return False

        user = User.query.filter_by(user_id=user_id).first()
        if not user:
            return False

        # Check if user is in participants list
        if user not in chatroom.participants:
            # Emit the leave message
            sio.emit('already_leave_chatroom', {
                'chatroomId': chatroom_id,
                'userId': user_id,
                'is_leave': True
            }, room=sid)
            return False

        # If user is still a participant, proceed with joining
        # Add user to the Socket.IO room for this chatroom
        # sid: Socket.IO session ID for the client
        # chatroom_id: ID of the chatroom to join

        # Update user's last used chatroom
        user.last_used_chatroom_id = chatroom.id
        db.session.add(user)
        db.session.commit()

        # print(f"User {user_id} has joined chatroom {chatroom_id}")
        sio.emit('room_joined', {'message': f'Joined room {chatroom_id}'}, room=sid)
        return True



# ... existing imports ...



@sio.on('ask_ai')
def handle_ask_ai(sid, data):
    selected_text = data.get('selectedText', '')
    prompt_text = data.get('promptText', '')

    try:
        # Combine the selected text and prompt
        combined_prompt = f"Selected text: {selected_text}\n\nUser prompt: {prompt_text}\n\nPlease provide a response based on the selected text and the user's prompt:"

        # Call OpenAI API
        response = openAI_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": combined_prompt}
            ]
        )

        ai_response = response.choices[0].message.content

        # Return the AI response to the client
        return {'aiResponse': ai_response}
    except Exception as e:
        # app.logger.error(f"Error in AI processing: {str(e)}")
        return {'error': str(e)}

# ... rest of the file ...




@sio.event
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



@sio.event
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




@sio.event
def test_message(sid, data):
    print(f'[SOCKET.IO] Received test_message from {sid}: {data}')
    sio.emit('test_response', {'message': 'Hello from the server!'}, room=sid)


#========================================================================
# =========================== Utility Functions==============
#========================================================================


@sio.on('recall_message')
def message_recall(sid, data):
    with get_app().app_context():
        try:
            # app.logger.info(f"Received recall request - Data: {data}")
            chatroom_id = data.get('chatroomId')
            message_id = data.get('messageId')
            user_id = data.get('userId')

            # app.logger.info(f"Processing recall - Chatroom: {chatroom_id}, Message: {message_id}, User: {user_id}")

            # Update message recall status in database
            message = Message.query.get(message_id)
            if message:
                # app.logger.info(f"Found message to recall: {message.id}")
                message.is_recalled = '1'
                db.session.commit()
                # app.logger.info("Database updated successfully")

                # Emit recall status to all users in the chatroom
                recall_data = {
                    'messageId': message_id,
                    'userId': user_id,
                    'username': message.username
                }
                # app.logger.info(f"Broadcasting recall status: {recall_data}")
                sio.emit('receive_recall_message_status', recall_data, room=str(chatroom_id))
                # app.logger.info("Broadcast complete")

                return True
            else:
                # app.logger.error(f"Message not found: {message_id}")
                return False

        except Exception as e:
            # app.logger.error(f"Error recalling message: {str(e)}")
            return False




@sio.on('edit_existed_text')
def handle_edit_text(sid, data):
    try:
        with get_app().app_context():
            message_id = data.get('messageId')
            edited_text = data.get('editedText')
            chatroom_id = data.get('chatroomId')
            to_language_me = data.get('toLanguageMe')
            to_language_me_first = data.get('toLanguageMeFirst')
            to_language_me_second = data.get('toLanguageMeSecond')
            is_split = data.get('isSplit')
            user_id = data.get('userId')
            low_cost_mode = data.get('lowCostMode')
            is_guest_mode = data.get('isGuestMode', False)
            curr_host_user_id = data.get('currHostUserId')

            # Get the message from database
            message = Message.query.get(message_id)
            if message:
                # Update original text
                message.original_text = edited_text
                message.is_edited = '1'

                # Always update the original_text_raw translation
                message.edit_translation('original_text_raw', edited_text)

                if is_split:
                    # Handle split mode translations
                    if to_language_me_first:
                        if to_language_me_first == 'original_text_raw':
                            message.edit_translation(to_language_me_first, edited_text)
                        else:
                            response = get_new_translated_string(to_language_me_first, edited_text)
                            message.edit_translation(to_language_me_first, response.choices[0].message.content, response)

                    if to_language_me_second:
                        if to_language_me_second == 'original_text_raw':
                            message.edit_translation(to_language_me_second, edited_text)
                        else:
                            response = get_new_translated_string(to_language_me_second, edited_text)
                            message.edit_translation(to_language_me_second, response.choices[0].message.content, response)
                else:
                    # Handle single language mode
                    if to_language_me:
                        if to_language_me == 'original_text_raw':
                            message.edit_translation(to_language_me, edited_text)
                        else:
                            response = get_new_translated_string(to_language_me, edited_text)
                            message.edit_translation(to_language_me, response.choices[0].message.content, response)
                # If in guest mode, use host user ID for pricing
                pricing_user_id = curr_host_user_id if is_guest_mode and curr_host_user_id else user_id
                priced_translation = message.get_translation_priced(pricing_user_id, to_language_me, low_cost_mode)
                db.session.add(message)
                db.session.commit()

                # Emit updated message to all users in the chatroom
                sio.emit('receive_edited_message', {
                    'messageId': message_id,
                    'editedText': edited_text,
                    'translations': message.translations,
                    'is_edited': '1'
                }, room=str(chatroom_id))

                return True
            else:
                # app.logger.error(f"Message not found: {message_id}")
                return False

    except Exception as e:
        # app.logger.error(f"Error editing message: {str(e)}")
        return False



@sio.event
def user_speaking_from_client_start(sid, data):
    with get_app().app_context():
        try:
            user_id = data.get('userId')
            username = data.get('username')
            chatroom_id = str(data.get('chatroomId'))  # Convert to string
            user = User.query.filter_by(user_id=user_id).first()
            avatar = user.avatar if user else None
            # Relay the message to all users in the chatroom
            sio.emit('user_speaking_to_client_start', {
                'userId': user_id,
                'username': username,
                'avatar': avatar
            }, room=chatroom_id)

            return True
        except Exception as e:
            # app.logger.error(f"Error in user_speaking_from_client_start: {str(e)}")
            return False



@sio.event
def user_speaking_from_client_stop(sid, data):
    with get_app().app_context():
        try:
            user_id = data.get('userId')
            username = data.get('username')
            chatroom_id = str(data.get('chatroomId'))  # Convert to string
            user = User.query.filter_by(user_id=user_id).first()
            avatar = user.avatar if user else None
            # Relay the message to all users in the chatroom
            sio.emit('user_speaking_to_client_stop', {
                'userId': user_id,
                'username': username,
                                'avatar': avatar
            }, room=chatroom_id)

            return True
        except Exception as e:
            # app.logger.error(f"Error in user_speaking_from_client_stop: {str(e)}")
            return False





@sio.event
def user_speaking_from_client_content_transcript(sid, data):
    with get_app().app_context():
        try:
            user_id = data.get('userId')
            username = data.get('username')
            chatroom_id = str(data.get('chatroomId'))
            streaming_transcript = data.get('streamingTranscript')
            user = User.query.filter_by(user_id=user_id).first()
            avatar = user.avatar if user else None
            # print(f"Received transcript from {username}: {streaming_transcript}")  # Debug log

            if all([user_id, username, chatroom_id, streaming_transcript]):
                sio.emit('user_speaking_to_client_content_transcript', {
                    'userId': user_id,
                    'username': username,
                    'streamingTranscript': streaming_transcript,
                                    'avatar': avatar
                }, room=chatroom_id)
                return True
            else:
                # print("Missing required data")
                return False

        except Exception as e:
            # print(f"Error in user_speaking_from_client_content_transcript: {str(e)}")
            return False

# ... existing code ...



@sio.event
def get_avatar_socket(sid, data):
    """Socket.IO event handler for getting user avatar"""
    with get_app().app_context():
        try:
            user_id = data.get('userId')
            if not user_id:
                sio.emit('avatar_response', {
                    'error': 'User ID is required'
                }, room=sid)
                return

            # Find the user in the database
            user = User.query.filter_by(user_id=user_id).first()


                # Return the avatar filename
            sio.emit('avatar_response', {
                'success': True,
                'user_avatar': user.avatar
            }, room=sid)

        except Exception as e:
            # app.logger.error(f"Error in get_avatar_socket: {str(e)}")
            sio.emit('avatar_response', {
                'error': f'Server error: {str(e)}'
            }, room=sid)

# =================================================================================
# ChatNamespace - Handles message uploads (text and audio)
# =================================================================================

from socketio import Namespace
from config.constants import AUDIO_UNIT_PRICE_PER_MINUTE
from services.debug_logging import log_transcription

# Load mainstream languages
import json
try:
    with open('language_mainstream_server.json') as f:
        LANGUAGE_CONFIG = json.load(f)
    MAINSTREAM_LANGUAGES = set(LANGUAGE_CONFIG['languages'])
except:
    MAINSTREAM_LANGUAGES = set()

class ChatNamespace(Namespace):

    @staticmethod
    def on_upload_audio(sid, data):
        with get_app().app_context():
            # current_app.logger.info("Received audio message via Socket.IO")
            user_id = data.get('userId')
            chatroom_id = data.get('chatroomId')
            base64_audio = data.get('audio')
            username = data.get('username')
            target_language = data.get('toLanguageMe')
            target_language_first = data.get('toLanguageMeFirst')
            target_language_second = data.get('toLanguageMeSecond')
            is_split = data.get('isSplit', False)
            reply_to_message_id = data.get('replyToMessageId', -1)
            low_cost_mode = data.get('lowCostMode', '0')
            duration_in_minutes = data.get('durationInMinutes', 0)
            is_guest_mode = data.get('isGuestMode', False)
            curr_host_user_id = data.get('currHostUserId')
            
            if not user_id or not base64_audio:
                sio.emit('audio_upload_failed', {"error": "userId or audio data is missing"}, room=sid)
                return

            try:
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    # Create user if not exists
                    add_user(user_id, username)
                    user = User.query.filter_by(user_id=user_id).first()

                # Decode base64 audio
                audio_data = base64.b64decode(base64_audio)
                audio_file = io.BytesIO(audio_data)

                # Use OpenAI Whisper API to transcribe the audio
                transcript = openAI_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=("audio.mp3", audio_file))
                
                audio_token_cost = AUDIO_UNIT_PRICE_PER_MINUTE * duration_in_minutes
                log_transcription('upload_audio', duration_in_minutes * 60.0, transcript)
                
                # Update user's tokens
                if is_guest_mode and curr_host_user_id:
                    user_host = User.query.filter_by(user_id=curr_host_user_id).first()
                    if user_host:
                        user_host.tokens -= audio_token_cost
                        db.session.commit()
                    else:
                        print("Host user not found")
                else:
                    user = User.query.filter_by(user_id=user_id).first()
                    if user:
                        user.tokens -= audio_token_cost
                        db.session.commit()
                    else:
                        print("User not found")

                # Create new message
                new_message = Message(
                    user_id=user.user_id,
                    username=user.username, 
                    chatroom_id=chatroom_id,
                    original_text=transcript.text,
                    translated_text='',
                    content_type='audio',
                    is_recalled='0',
                    is_edited='0',
                    reply_to_message_id=reply_to_message_id,
                    audio_duration_minutes=duration_in_minutes
                )

                # Add original text as first translation
                new_message.add_translation('original_text_raw', transcript.text)

                if is_split:
                    # Get translations for both languages in split mode
                    if target_language_first == 'original_text_raw':
                        new_message.add_translation(target_language_first, transcript.text)
                    else:
                        response = get_new_translated_string(target_language_first, transcript.text)
                        new_message.add_translation(target_language_first, response.choices[0].message.content, response)
                    
                    if target_language_second == 'original_text_raw':
                        new_message.add_translation(target_language_second, transcript.text)
                    else:
                        response = get_new_translated_string(target_language_second, transcript.text)
                        new_message.add_translation(target_language_second, response.choices[0].message.content, response)
                    
                    translated_text = new_message.translations[target_language_first]
                else:
                    # Single language mode
                    if target_language == 'original_text_raw':
                        new_message.add_translation(target_language, transcript.text)
                        translated_text = transcript.text
                    else:
                        response = get_new_translated_string(target_language, transcript.text)
                        new_message.add_translation(target_language, response.choices[0].message.content, response)
                        translated_text = response.choices[0].message.content

                # Set the translated_text field
                new_message.translated_text = translated_text
                if is_guest_mode:
                    priced_translation = new_message.get_translation_priced(curr_host_user_id, target_language, low_cost_mode)
                else:
                    priced_translation = new_message.get_translation_priced(user_id, target_language, low_cost_mode)
                db.session.add(new_message)
                db.session.commit()

                # Emit with message ID included
                sio.emit('new_message', {
                    'id': new_message.id,
                    'username': user.username,
                    'userId': user.user_id,
                    'original_text': transcript.text,
                    'translated_text': translated_text,
                    'content_type': 'audio',
                    'timestamp': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                    'chatroom_id': chatroom_id,
                    'translations': priced_translation or {},
                    'is_recalled': '0',
                    'is_edited': '0',
                    'reply_to_message_id': reply_to_message_id,
                }, room=str(chatroom_id))

                return True

            except Exception as e:
                current_app.logger.error(f"Error processing audio: {str(e)}")
                sio.emit('audio_upload_failed', {"error": str(e)}, room=sid)
                return False

    @staticmethod
    def on_upload_text(sid, data):
        with get_app().app_context():
            user_id = data.get('userId')
            chatroom_id = data.get('chatroomId')
            message = data.get('message')
            username = data.get('username')
            toLanguageMe = data.get('toLanguageMe')
            toLanguageMeFirst = data.get('toLanguageMeFirst')
            toLanguageMeSecond = data.get('toLanguageMeSecond')
            is_split = data.get('isSplit', False)
            reply_to_message_id = data.get('replyToMessageId', -1)
            low_cost_mode = data.get('lowCostMode', '0')
            is_guest_mode = data.get('isGuestMode', False)
            curr_host_user_id = data.get('currHostUserId')

            if not user_id or not message:
                sio.emit('text_upload_failed', {"error": "userId or message is missing"}, room=sid)
                return False

            try:
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    add_user(user_id, username)
                    user = User.query.filter_by(user_id=user_id).first()

                # Create new message
                new_message = Message(
                    user_id=user_id,
                    username=username,
                    chatroom_id=chatroom_id,
                    original_text=message,
                    translated_text='',
                    content_type='text',
                    is_recalled='0',
                    is_edited='0',
                    reply_to_message_id=reply_to_message_id
                )

                # Add original text as first translation
                new_message.add_translation('original_text_raw', message)

                if is_split:
                    # Get translations for both languages in split mode
                    if toLanguageMeFirst == 'original_text_raw':
                        new_message.add_translation(toLanguageMeFirst, message)
                    else:
                        response = get_new_translated_string(toLanguageMeFirst, message)
                        new_message.add_translation(toLanguageMeFirst, response.choices[0].message.content, response)
                    
                    if toLanguageMeSecond == 'original_text_raw':
                        new_message.add_translation(toLanguageMeSecond, message)
                    else:
                        response = get_new_translated_string(toLanguageMeSecond, message)
                        new_message.add_translation(toLanguageMeSecond, response.choices[0].message.content, response)
                    
                    translated_text = new_message.translations[toLanguageMeFirst]
                else:
                    # Single language mode
                    if toLanguageMe == 'original_text_raw':
                        new_message.add_translation(toLanguageMe, message)
                        translated_text = message
                    else:
                        response = get_new_translated_string(toLanguageMe, message)
                        new_message.add_translation(toLanguageMe, response.choices[0].message.content, response)
                        translated_text = response.choices[0].message.content

                # Set the translated_text field
                new_message.translated_text = translated_text
                if is_guest_mode and curr_host_user_id:
                    priced_translation = new_message.get_translation_priced(curr_host_user_id, toLanguageMe, low_cost_mode)
                else:
                    priced_translation = new_message.get_translation_priced(user_id, toLanguageMe, low_cost_mode)
                db.session.add(new_message)
                db.session.commit()

                # Emit with message ID included
                sio.emit('new_message', {
                    'id': new_message.id,
                    'username': user.username,
                    'userId': user.user_id,
                    'original_text': message,
                    'translated_text': translated_text,
                    'content_type': 'text',
                    'timestamp': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                    'chatroom_id': chatroom_id,
                    'translations': priced_translation or {},
                    'is_recalled': '0',
                    'is_edited': '0',
                    'reply_to_message_id': reply_to_message_id,
                }, room=str(chatroom_id))

                return True

            except Exception as e:
                current_app.logger.error(f"Error processing text: {str(e)}")
                sio.emit('text_upload_failed', {"error": str(e)}, room=sid)
                return False

    @staticmethod
    def on_fetch_chatrooms(sid, data):
        with get_app().app_context():
            user_id = data.get('userId')

            if not user_id:
                sio.emit('chatrooms_fetch_failed', {"error": "userId is missing"}, room=sid)
                return

            try:
                user = User.query.filter_by(user_id=user_id).first()
                if not user:
                    sio.emit('chatrooms_fetch_failed', {"error": "User not found"}, room=sid)
                    return

                # Fetch chatrooms created by the user or where the user is a participant
                user_chatrooms = ChatRoom.query.filter(
                    (ChatRoom.creator_id == user.user_id) | 
                    (ChatRoom.participants.any(user_id=user.user_id))
                ).all()

                chatrooms_data = [{
                    "id": chatroom.id,
                    "name": chatroom.name,
                    "is_private": chatroom.is_private,
                } for chatroom in user_chatrooms]

                sio.emit('chatrooms_fetched', {"chatrooms": chatrooms_data}, room=sid)

            except Exception as e:
                current_app.logger.error(f"Error fetching chatrooms: {str(e)}")
                sio.emit('chatrooms_fetch_failed', {"error": str(e)}, room=sid)

# Register ChatNamespace events
sio.on('fetch_chatrooms', ChatNamespace.on_fetch_chatrooms)
sio.on('upload_text', ChatNamespace.on_upload_text)
sio.on('upload_audio', ChatNamespace.on_upload_audio)
sio.register_namespace(ChatNamespace('/'))
