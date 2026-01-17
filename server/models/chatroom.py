"""
ChatRoom Model - Chat room configuration and management
Database model definition
"""
from datetime import datetime, timedelta
from extensions import db, sio, openAI_client
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON
from werkzeug.security import generate_password_hash, check_password_hash
import random
import httpagentparser
import hashlib
import secrets
import string
import time

class ChatRoom(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), default='NewChatroom')
    creator_id = db.Column(db.String(80), db.ForeignKey('user.user_id'))
    unique_url = db.Column(db.String(255), unique=True)
    max_participants = db.Column(db.Integer, default=100)
    allow_friends_only = db.Column(db.Boolean, default=False)
    max_messages = db.Column(db.Integer, nullable=True)
    max_messages_per_hour = db.Column(db.Integer, nullable=True)
    is_invisible = db.Column(db.Boolean, default=False)
    is_private = db.Column(db.String(1), default='0')  # '1' for private, '0' for public
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    messages = db.relationship('Message', backref='chatroom', lazy=True)
    participants = db.relationship('User', secondary='user_chatroom', back_populates='chatrooms')
    password = db.Column(db.String(128), nullable=True)
    enter_coded_id = db.Column(db.String(255), default='')

    # Define the relationship with Message
    messages = db.relationship('Message',
                             backref='chat_room',
                             lazy=True,
                             foreign_keys='Message.chatroom_id',
                             primaryjoin='ChatRoom.id==Message.chatroom_id')




    # New fields
    non_registered_enterable = db.Column(db.String(1), default='1')


    token_spending_mode = db.Column(db.String(1), default='0')  # 0:self, 1:creator, 2:enterprise
    filter_allowance_mode = db.Column(db.String(1), default='0')  # 0:all allowed, 1:non-entertainment
    
    
    token_spending_enterprise_code = db.Column(db.String(255), nullable=True)
    joining_permission_required = db.Column(db.String(1), default='0')
    group_announcement_text = db.Column(db.String(1000), nullable=True)  # Store as string
    group_announcement_pic = db.Column(db.String(1000), nullable=True)  # Store as string of URLs
   
   
   
    dynamic_code = db.Column(db.String(255), nullable=True)
    special_flag = db.Column(db.String(255), nullable=True)
    chatroom_id_hashed = db.Column(db.String(255), nullable=True)
    
    # Add new fields for dynamic code tracking
    last_time_create_dynamic_code = db.Column(db.DateTime, nullable=True)
    last_time_create_dynamic_code_duration = db.Column(db.Float, nullable=True)  # Duration in minutes
    
    def get_temporary_code(self, expire_minutes: float = 60.0) -> str:
        """
        Get or generate a temporary code for the chatroom.
        If existing code has expired, generates a new one.
        
        Args:
            expire_minutes (float): Number of minutes until code expires (default: 60.0)
                
        Returns:
            str: 6-character code containing letters and numbers
        """
        # Check if we have a valid existing code
        if (not self.is_temporary_code_expired() and 
            self.dynamic_code is not None):
            return str(self.dynamic_code)
            
        # Generate new code if expired or doesn't exist
        random.seed(self.id + int(time.time()))
        chars = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '').replace('1', '')
        code = ''.join(random.choices(chars, k=6))
        
        # Update tracking fields
        self.dynamic_code = code
        self.last_time_create_dynamic_code = datetime.utcnow()
        self.last_time_create_dynamic_code_duration = expire_minutes
        
        # Commit changes to database
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e
            
        return code
    
    def is_temporary_code_expired(self) -> bool:
        """
        Check if the current temporary code has expired.
        
        Returns:
            bool: True if code has expired or no code exists, False otherwise
        """
        if not self.last_time_create_dynamic_code or not self.last_time_create_dynamic_code_duration:
            return True
            
        now = datetime.utcnow()
        expiration_time = self.last_time_create_dynamic_code + timedelta(
            minutes=self.last_time_create_dynamic_code_duration
        )
        
        return now > expiration_time

    def generate_enter_coded_id(self) -> str:
        """
        Generate an MD5-encrypted enter_coded_id based on the chatroom's ID.
        This ensures a consistent 1-to-1 relationship between ID and enter_coded_id.
        
        Returns:
            str: MD5 hash of the chatroom ID
        """
        import hashlib
        
        # Convert ID to string and encode to bytes
        id_str = str(self.id).encode('utf-8')
        
        # Create MD5 hash
        md5_hash = hashlib.md5(id_str).hexdigest()
        
        # Update the enter_coded_id field
        self.enter_coded_id = md5_hash
        
        return md5_hash


        
    

