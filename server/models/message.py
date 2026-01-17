"""
Message Model - Chat messages with translation support
Database model definition
"""
from datetime import datetime, timedelta
from extensions import db, sio, openAI_client
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON, text
from werkzeug.security import generate_password_hash, check_password_hash
from services.encryption import simple_encrypt, simple_decrypt
from config.constants import (
    TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O,
    TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O,
    TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI,
    TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI
)
import random
import httpagentparser
import hashlib
import secrets
import json

class Message(db.Model):
    __tablename__ = 'message'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(80), nullable=False)
    username = db.Column(db.String(80), nullable=False)
    chatroom_id = db.Column(db.Integer, nullable=False)
    _original_text = db.Column('original_text', db.Text, nullable=False, default='')
    _translated_text = db.Column('translated_text', db.Text, nullable=False, default='')
    translated_text_secondary = db.Column(db.Text, nullable=True)
    _translations = db.Column('translations', MutableDict.as_mutable(JSON), nullable=True, default=dict) # Store translations and their token usage
    translation_tokens = db.Column(MutableDict.as_mutable(JSON), nullable=True, default=dict)  # Store token usage for each translation
    translation_viewers = db.Column(MutableDict.as_mutable(JSON), nullable=True, default=dict)  # Store who viewed the token for each translation
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    content_type = db.Column(db.String(20), nullable=False, default='text')
    is_recalled = db.Column(db.String(1), default='0')
    is_edited = db.Column(db.String(1), default='0')
    message_type = db.Column(db.String(20), nullable=False, default='bubble')
    reply_to_message_id = db.Column(db.Integer, default=-1)  # New field
    audio_duration_minutes = db.Column(db.Float, default=0.0)
    

    def __init__(self, user_id, username, chatroom_id, original_text, translated_text, content_type, translations=None, is_recalled='0', is_edited='0', reply_to_message_id=-1, audio_duration_minutes=0.0):
        self.user_id = user_id
        self.username = username
        self.chatroom_id = chatroom_id
        self.original_text = original_text
        self.translated_text = translated_text
        self.content_type = content_type
        self.translations = translations or {}
        self.translation_tokens = {}  # Initialize token tracking
        self.translation_viewers = {} 
        self.is_recalled = is_recalled
        self.is_edited = is_edited
        self.reply_to_message_id = reply_to_message_id
        self.audio_duration_minutes = audio_duration_minutes

    @property
    def original_text(self):
        """Decrypt and return original text"""
        if not self._original_text:
            return None
        return simple_decrypt(self._original_text)

    @original_text.setter
    def original_text(self, value):
        """Encrypt and store original text"""
        if value is None:
            self._original_text = None
        else:
            self._original_text = simple_encrypt(value)


    @property
    def translated_text(self):
        """Decrypt and return translated text"""
        if not self._translated_text:
            return None
        return simple_decrypt(self._translated_text)

    @translated_text.setter
    def translated_text(self, value):
        """Encrypt and store translated text"""
        if value is None:
            self._translated_text = None
        else:
            self._translated_text = simple_encrypt(value)


    @property
    def translations(self):
        """Decrypt and return translations dictionary"""
        if not self._translations:
            return {}
        try:
            decrypted_dict = {}
            for lang, text in self._translations.items():
                if text:  # Only decrypt if there's content
                    decrypted_dict[lang] = simple_decrypt(text)
                else:
                    decrypted_dict[lang] = None
            return decrypted_dict
        except Exception as e:
            # app.logger.error(f"Decryption error (translations): {str(e)}")
            return {}

    @translations.setter
    def translations(self, value):
        """Encrypt and store translations dictionary"""
        if not value:
            self._translations = {}
        else:
            encrypted_dict = {}
            for lang, text in value.items():
                if text:  # Only encrypt if there's content
                    encrypted_dict[lang] = simple_encrypt(text)
                else:
                    encrypted_dict[lang] = None
            self._translations = encrypted_dict




    def add_translation(self, language, text, response=None):
        """Add an encrypted translation with its token usage statistics"""
        if self._translations is None:
            self._translations = {}
        if self.translation_tokens is None:
            self.translation_tokens = {}
            
        # Encrypt and store the translation text
        self._translations[language] = simple_encrypt(text)
        
        # Store the token usage and model details if response is provided
        if response:
            # Calculate prices for both models
            price_gpt4o = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O + 
                          response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O)
            
            price_gpt4o_mini = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI + 
                               response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI)
            
            self.translation_tokens[language] = {
                'model': response.model,
                'completion_tokens': response.usage.completion_tokens,
                'prompt_tokens': response.usage.prompt_tokens,
                'total_tokens': response.usage.total_tokens,
                'content': simple_encrypt(response.choices[0].message.content),
                'timestamp': datetime.utcnow().isoformat(),
                'price_gpt4o': price_gpt4o,
                'price_gpt4o_mini': price_gpt4o_mini
            }

            
    def edit_translation(self, language, text, response=None):
        """
        Edit an existing translation with new encrypted text and token usage statistics
        """
        if self._translations is None:
            self._translations = {}
        if self.translation_tokens is None:
            self.translation_tokens = {}
            
        # Update the encrypted translation text
        if language in self._translations:
            self._translations[language] = simple_encrypt(text)
            
            # Update token usage if response is provided
            if response:
                # Calculate new prices
                new_price_gpt4o = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O + 
                                response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O)
                
                new_price_gpt4o_mini = (response.usage.prompt_tokens * TEXT_UNIT_PRICE_PER_TOKEN_PROMPT_INPUT_TOKENS_GPT_4O_MINI + 
                                    response.usage.completion_tokens * TEXT_UNIT_PRICE_PER_TOKEN_COMPLETION_OUTPUT_TOKENS_GPT_4O_MINI)
                
                # Get existing prices or default to 0
                existing_price_gpt4o = self.translation_tokens.get(language, {}).get('price_gpt4o', 0)
                existing_price_gpt4o_mini = self.translation_tokens.get(language, {}).get('price_gpt4o_mini', 0)
                
                try:
                    self.translation_tokens[language] = {
                        'model': response.model,
                        'completion_tokens': response.usage.completion_tokens,
                        'prompt_tokens': response.usage.prompt_tokens,
                        'total_tokens': response.usage.total_tokens,
                        'content': simple_encrypt(response.choices[0].message.content),
                        'timestamp': datetime.utcnow().isoformat(),
                        'price_gpt4o': existing_price_gpt4o + new_price_gpt4o,
                        'price_gpt4o_mini': existing_price_gpt4o_mini + new_price_gpt4o_mini
                    }
                    # app.logger.info(f"Translation tokens updated for {language}")
                except Exception as e:
                    app.logger.error(f"Error updating translation tokens: {str(e)}")
            return True
        return False



    def get_translation(self, language):
        """
        Get translation for a specific language
        """
        return self.translations.get(language, self.translated_text)


    def get_translation_priced(self, user_id, language, isLowCostMode):
        """
        Get translation and handle pricing/tracking for the requesting user with improved concurrency handling
        """
        # First check if translation exists to fail fast
        if not self.translations or language not in self.translations:
            return None

        try:
            # Import User here to avoid circular import
            from models.user import User
            
            # Use the existing session instead of creating a new one
            with db.session.begin_nested():
                # Get user with explicit locking
                user = User.query.with_for_update().filter_by(user_id=user_id).first()
                if not user:
                    return self.translations.get(language)

                # Initialize viewers structure if needed
                if self.translation_viewers is None:
                    self.translation_viewers = {}
                if language not in self.translation_viewers:
                    self.translation_viewers[language] = {}

                # Check if user hasn't viewed this translation
                if user_id not in self.translation_viewers.get(language, {}):
                    # Calculate price
                    price_key = 'price_gpt4o_mini' if isLowCostMode == "1" else 'price_gpt4o'
                    price = self.translation_tokens.get(language, {}).get(price_key, 0)
                    
                    # Update user tokens
                    if price > 0:
                        user.tokens -= price
                    
                    # Update viewers list
                    self.translation_viewers.setdefault(language, {})[user_id] = datetime.utcnow().isoformat()
                    
                    try:
                        # Update the message's translation_viewers
                        db.session.execute(
                            text("UPDATE message SET translation_viewers = :viewers WHERE id = :id"),
                            {"viewers": json.dumps(self.translation_viewers), "id": self.id}
                        )
                    except Exception as e:
                        from flask import current_app
                        current_app.logger.error(f"Failed to update translation viewers: {str(e)}")
                        # Continue execution even if update fails
        
        except Exception as e:
            from flask import current_app
            current_app.logger.error(f"Error in get_translation_priced: {str(e)}")
            db.session.rollback()
        
        # Always return the translation if it exists
        # print(f"GGGGGUser ID: {user_id}, Language: {language}, Low Cost Mode: {isLowCostMode}")
        # print(f"Translations: {self.translations}")
        return self.translations



