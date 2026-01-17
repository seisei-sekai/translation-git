"""
User Model - Main user account and profile information
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

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(512), unique=True, nullable=False)
    username = db.Column(db.String(512), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    avatar = db.Column(db.String(250), nullable=True)
    avatar_full = db.Column(db.String(250), nullable=True)
    tokens = db.Column(db.Float, default=0.0)  #AI TOKENS
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'), nullable=True)
    description = db.Column(db.String(2000), nullable=True)  # User profile description with 2000 character limit
    last_token_update = db.Column(db.DateTime, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    friends = db.relationship('Friendship', foreign_keys='Friendship.user_id', back_populates='user')
    created_chatrooms = db.relationship('ChatRoom', backref='creator', lazy=True)
    messages = db.relationship('Message', backref='user', lazy=True, foreign_keys='Message.user_id')
    password = db.Column(db.String(512), nullable=False)
    last_used_chatroom_id = db.Column(db.Integer, default=1)
    is_google_registered = db.Column(db.String(1), default='0')  # '0' for false, '1' for true
    # Many-to-many relationship for chatroom membership
    chatrooms = db.relationship('ChatRoom', secondary='user_chatroom', back_populates='participants')
    private_room_id = db.Column(db.Integer, nullable=True)  # New attribute
    is_password_randomly_generated = db.Column(db.String(1), default='0')  # '0' for false, '1' for true
    is_registered = db.Column(db.String(1), default='0')  # '0' for false, '1' for  normal login, '2'  for  google login
    is_first_time_login = db.Column(db.String(1), default='0')  # '0' for false, '1' for true
    refer_code = db.Column(db.String(255), default='none')

    preview_message_count = db.Column(db.Integer, default=0)
    messages = db.relationship('Message', 
                             backref='user',
                             lazy=True,
                             foreign_keys='Message.user_id',
                             primaryjoin='User.user_id==Message.user_id')

    # check for if it is guest mode
    is_guest = db.Column(db.Boolean, default=False)
    host_user_id = db.Column(db.String(80), nullable=True)

    # Device and Access Information
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)  # IPv6 support
    last_login_location = db.Column(MutableDict.as_mutable(JSON), nullable=True) # IPv6 support
    
    browser_info = db.Column(db.String(255), nullable=True)
    operating_system = db.Column(db.String(255), nullable=True)
    device_type = db.Column(db.String(50), nullable=True)  # mobile, tablet, desktop
    preferred_language = db.Column(db.String(10), nullable=True)
    timezone = db.Column(db.String(50), nullable=True)
    
    # Registration Information
    registration_ip = db.Column(db.String(45), nullable=True)
    registration_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    registration_method = db.Column(db.String(20), nullable=True)  # 'email', 'google', etc.
    
    # Access History (as JSON)
    access_history = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # User Agent History (as JSON)
    user_agent_history = db.Column(MutableDict.as_mutable(JSON), default=dict)

    # Subscription status
    stripe_customer_id = db.Column(db.String(255), unique=True, nullable=True)
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    subscription_status = db.Column(db.String(50), default='free')  # free, active, cancelled, past_due
    subscription_plan = db.Column(db.String(50), default='unpaid')  # monthly, annual, unpaid
    subscription_start_date = db.Column(db.DateTime, nullable=True)
    subscription_end_date = db.Column(db.DateTime, nullable=True)
    subscription_cancel_at_period_end = db.Column(db.Boolean, default=False)
    # Track history of token purchases via Stripe
    stripe_token_purchase_history = db.Column(MutableDict.as_mutable(JSON), default=dict)  # {purchase_id: timestamp}
    # Payment history
    last_payment_date = db.Column(db.DateTime, nullable=True)
    last_payment_amount = db.Column(db.Float, nullable=True)
    payment_method_last4 = db.Column(db.String(4), nullable=True)
    
    # Token management
    tokens_purchased = db.Column(db.Float, default=0.0)  # Total tokens purchased
    tokens_used = db.Column(db.Float, default=0.0)  # Total tokens used
    
    # Usage tracking
    total_audio_minutes_processed = db.Column(db.Float, default=0.0)
    total_words_translated = db.Column(db.Integer, default=0)
    
    # Billing flags
    has_payment_issues = db.Column(db.Boolean, default=False)
    is_tax_exempt = db.Column(db.Boolean, default=False)
    tax_id = db.Column(db.String(255), nullable=True)
    
    # Billing address
    billing_name = db.Column(db.String(255), nullable=True)
    billing_email = db.Column(db.String(255), nullable=True)
    billing_address = db.Column(db.String(500), nullable=True)
    billing_city = db.Column(db.String(255), nullable=True)
    billing_state = db.Column(db.String(255), nullable=True)
    billing_country = db.Column(db.String(255), nullable=True)
    billing_postal_code = db.Column(db.String(20), nullable=True)

    def __init__(self, user_id, username, email, password, is_guest = False, host_user_id = None):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.password = password
        self.is_google_registered = '0'
        self.is_password_randomly_generated = '0'
        self.is_registered = '0'
        self.is_guest = False  # Add default value
        self.host_user_id = None  # Add default value
        self.set_random_avatar()  # Add this line to set random avatar during initialization
        
        # Create private room for new user
        try:
            # Import ChatRoom here to avoid circular import
            from models.chatroom import ChatRoom
            
            private_room = ChatRoom(
                name=f"{username}'s Private Room",
                creator_id=user_id,
                is_private='1',
                max_participants=1
            )
            # Add user as participant
            private_room.participants.append(self)

            db.session.add(private_room)
            db.session.flush()  # This will populate the id field
            
            # Set the private room ID and last used chatroom
            self.private_room_id = private_room.id
            self.last_used_chatroom_id = private_room.id
            
        except Exception as e:
            db.session.rollback()
            raise e

    def update_login_info(self, request):
        """Update user login information"""
        current_time = datetime.utcnow()
        
        # Get IP address considering proxy headers
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address:
            ip_address = ip_address.split(',')[0].strip()
            
        # Get user agent information
        user_agent = request.headers.get('User-Agent', '')
        
        # Parse user agent
        browser_info = httpagentparser.detect(user_agent)
        
        # Update current login info
        self.last_login_at = current_time
        self.last_login_ip = ip_address
        self.browser_info = browser_info.get('browser', {}).get('name', '')
        self.operating_system = browser_info.get('os', {}).get('name', '')
        self.device_type = self._determine_device_type(user_agent)
        self.preferred_language = request.accept_languages.best_match(['en', 'es', 'fr', 'de', 'zh'])
        
        # Update access history
        if not self.access_history:
            self.access_history = {}
            
        access_entry = {
            'timestamp': current_time.isoformat(),
            'ip_address': ip_address,
            'user_agent': user_agent,
            'browser': self.browser_info,
            'os': self.operating_system,
            'device_type': self.device_type,
            'language': self.preferred_language
        }
        
        # Keep last 10 accesses
        access_key = current_time.strftime('%Y%m%d%H%M%S')
        self.access_history[access_key] = access_entry
        
        # Trim history to keep only last 10 entries
        if len(self.access_history) > 10:
            oldest_key = min(self.access_history.keys())
            del self.access_history[oldest_key]
            
    def _determine_device_type(self, user_agent):
        """Determine device type from user agent"""
        user_agent = user_agent.lower()
        if any(device in user_agent for device in ['mobile', 'android', 'iphone', 'ipad', 'windows phone']):
            return 'mobile'
        elif 'tablet' in user_agent:
            return 'tablet'
        return 'desktop'

    def add_notification(self, title, body, type='info'):
        """Add a notification for this user"""
        # Local import to avoid circular dependency
        from models.notification import Notification
        
        notification = Notification(
            user_id=self.user_id,
            title=title,
            body=body,
            type=type,
            created_at=datetime.utcnow()  # Explicitly set UTC time
        )
        db.session.add(notification)
        try:
            db.session.commit()
            # Emit the notification via Socket.IO with UTC timestamp
            sio.emit('new_notification', {
                'id': notification.id,
                'title': notification.title,
                'body': notification.body,
                'type': notification.type,
                'created_at': notification.created_at.strftime('%Y-%m-%dT%H:%M:%S.%fZ')  # ISO format with UTC indicator
            }, room=f"user_{self.user_id}")
            return notification
        except Exception as e:
            db.session.rollback()
            raise e

    def set_random_avatar(self):
        """Set a random avatar if none is currently set"""
        colors = ['blue', 'mintygreen', 'orange', 'palegreen', 'purple', 'rosy', 'black']
        random_color = random.choice(colors)
        # url_local = "https://yoohi.ai/"
        self.avatar = f"thumb_avatar_seal_{random_color}.png"
        self.avatar_full = f"avatar_seal_{random_color}.png"

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def get_all_chatrooms(self):
        # Combine created chatrooms and chatrooms where user is a member
        all_chatrooms = set(self.created_chatrooms + self.chatrooms)
        return list(all_chatrooms)

    def set_password_generated_status(self, is_generated):
        """
        Set the password generation status
        Args:
            is_generated (bool): True if password was randomly generated, False if user-set
        """
        self.is_password_randomly_generated = '1' if is_generated else '0'

        


# Association table for the many-to-many relationship between User and ChatRoom
