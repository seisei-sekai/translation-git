"""
Metrics Model - Stores system-wide metrics as time-series data
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

class Metrics(db.Model):
    """Stores system-wide metrics as time-series data in JSON columns"""
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Simple metrics - User counts
    total_user_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_basic_no_refer = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_basic_refer = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_monthly = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_monthly_onetime = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_annual = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_annual_onetime = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Google user counts
    total_user_number_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_basic_no_refer_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_basic_refer_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_monthly_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_monthly_onetime_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_annual_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_number_annual_onetime_ggl = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Active user metrics
    total_user_monthly_active = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_user_daily_active = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Average user metrics
    user_avg_chatroom_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    user_avg_message_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    user_avg_preview_message_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    user_avg_audio_minutes_processed = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Chatroom metrics
    total_chatroom_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_is_private_chatroom_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_is_invisible_chatroom_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_non_registered_enterable_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_group_announcement_text_not_null_number = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Chatroom averages
    avg_chatroom_messages_count = db.Column(MutableDict.as_mutable(JSON), default=dict)
    avg_avg_participants_count = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Message metrics
    total_message_count = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_message_photo_count = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_message_audio_count = db.Column(MutableDict.as_mutable(JSON), default=dict)
    total_message_text_count = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Message averages
    avg_audio_duration = db.Column(MutableDict.as_mutable(JSON), default=dict)
    avg_original_message_length = db.Column(MutableDict.as_mutable(JSON), default=dict)
    avg_number_key_in_message_translation = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Complex metrics - Location based
    user_ip_location_country = db.Column(MutableDict.as_mutable(JSON), default=dict)
    user_ip_location_city = db.Column(MutableDict.as_mutable(JSON), default=dict)
    user_ip_location_region = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # User system metrics
    user_operating_system = db.Column(MutableDict.as_mutable(JSON), default=dict)
    user_preferred_language = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Message language metrics
    message_language_filter = db.Column(MutableDict.as_mutable(JSON), default=dict)
    
    # Timestamp of last update
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self):
        """Initialize all JSON columns as empty dictionaries"""
        for column in self.__table__.columns:
            if isinstance(column.type, JSON):
                setattr(self, column.name, {})
        self.last_updated = datetime.utcnow()

    def obtain_snapshot_now(self):
        """Update all metrics with current snapshot"""
        try:
            current_time = datetime.utcnow().isoformat()
            
            # Get all users for various calculations
            users = User.query.all()
            total_users = len(users)
            
            # Simple user counts with timestamp
            self.total_user_number[current_time] = total_users
            self.total_user_number_basic_no_refer[current_time] = User.query.filter_by(subscription_plan='basic', refer_code='none').count()
            self.total_user_number_basic_refer[current_time] = User.query.filter(User.subscription_plan=='basic', User.refer_code!='none').count()
            self.total_user_number_monthly[current_time] = User.query.filter_by(subscription_plan='monthly').count()
            self.total_user_number_monthly_onetime[current_time] = User.query.filter_by(subscription_plan='monthly_onetime').count()
            self.total_user_number_annual[current_time] = User.query.filter_by(subscription_plan='annual').count()
            self.total_user_number_annual_onetime[current_time] = User.query.filter_by(subscription_plan='annual_onetime').count()
            
            # Google user counts
            self.total_user_number_ggl[current_time] = User.query.filter_by(is_google_registered='1').count()
            self.total_user_number_basic_no_refer_ggl[current_time] = User.query.filter_by(
                is_google_registered='1', subscription_plan='basic', refer_code='none'
            ).count()
            self.total_user_number_basic_refer_ggl[current_time] = User.query.filter(
                User.is_google_registered=='1', 
                User.subscription_plan=='basic',
                User.refer_code!='none'
            ).count()
            self.total_user_number_monthly_ggl[current_time] = User.query.filter_by(
                is_google_registered='1', subscription_plan='monthly'
            ).count()
            self.total_user_number_monthly_onetime_ggl[current_time] = User.query.filter_by(
                is_google_registered='1', subscription_plan='monthly_onetime'
            ).count()
            self.total_user_number_annual_ggl[current_time] = User.query.filter_by(
                is_google_registered='1', subscription_plan='annual'
            ).count()
            self.total_user_number_annual_onetime_ggl[current_time] = User.query.filter_by(
                is_google_registered='1', subscription_plan='annual_onetime'
            ).count()
            
            # Active users
            one_month_ago = datetime.utcnow() - timedelta(days=30)
            one_day_ago = datetime.utcnow() - timedelta(days=1)
            
            self.total_user_monthly_active[current_time] = User.query.filter(
                User.last_login_at >= one_month_ago
            ).count()
            
            self.total_user_daily_active[current_time] = User.query.filter(
                User.last_login_at >= one_day_ago
            ).count()
            
            # User averages
            total_chatrooms = sum(len(user.chatrooms) for user in users)
            total_messages = sum(len(user.messages) for user in users)
            total_preview_messages = sum(user.preview_message_count or 0 for user in users)
            total_audio_minutes = sum(user.total_audio_minutes_processed or 0 for user in users)
            
            self.user_avg_chatroom_number[current_time] = total_chatrooms / total_users if total_users > 0 else 0
            self.user_avg_message_number[current_time] = total_messages / total_users if total_users > 0 else 0
            self.user_avg_preview_message_number[current_time] = total_preview_messages / total_users if total_users > 0 else 0
            self.user_avg_audio_minutes_processed[current_time] = total_audio_minutes / total_users if total_users > 0 else 0
            
            # Chatroom metrics
            chatrooms = ChatRoom.query.all()
            self.total_chatroom_number[current_time] = len(chatrooms)
            self.total_is_private_chatroom_number[current_time] = ChatRoom.query.filter_by(is_private='1').count()
            self.total_is_invisible_chatroom_number[current_time] = ChatRoom.query.filter_by(is_invisible=True).count()
            self.total_non_registered_enterable_number[current_time] = ChatRoom.query.filter_by(non_registered_enterable='1').count()
            self.total_group_announcement_text_not_null_number[current_time] = ChatRoom.query.filter(
                ChatRoom.group_announcement_text.isnot(None)
            ).count()
            
            # Chatroom averages
            total_chatroom_messages = sum(len(chatroom.messages) for chatroom in chatrooms)
            total_participants = sum(len(chatroom.participants) for chatroom in chatrooms)
            chatroom_count = len(chatrooms)
            
            self.avg_chatroom_messages_count[current_time] = total_chatroom_messages / chatroom_count if chatroom_count > 0 else 0
            self.avg_avg_participants_count[current_time] = total_participants / chatroom_count if chatroom_count > 0 else 0
            
            # Message metrics
            messages = Message.query.all()
            self.total_message_count[current_time] = len(messages)
            self.total_message_photo_count[current_time] = Message.query.filter_by(content_type='photo').count()
            self.total_message_audio_count[current_time] = Message.query.filter_by(content_type='audio').count()
            self.total_message_text_count[current_time] = Message.query.filter_by(content_type='text').count()
            

            # Average audio duration
            audio_messages = Message.query.filter_by(content_type='audio').all()
            if audio_messages:
                total_duration = sum(msg.audio_duration_minutes or 0 for msg in audio_messages)
                self.avg_audio_duration[current_time] = 60.0 * total_duration / len(audio_messages)
            else:
                self.avg_audio_duration[current_time] = 0


            # Message averages
            total_message_length = sum(len(msg.original_text or '') for msg in messages)
            total_translation_keys = sum(len(msg.translations or {}) for msg in messages)
            message_count = len(messages)
            
            self.avg_original_message_length[current_time] = total_message_length / message_count if message_count > 0 else 0
            self.avg_number_key_in_message_translation[current_time] = total_translation_keys / message_count if message_count > 0 else 0
            
            # Complex metrics (reset dictionaries)
            # Location based
            location_counts = {
                'country': {},
                'city': {},
                'region': {}
            }
            
            for user in users:
                if user.last_login_location:
                    country = user.last_login_location.get('country_code')
                    city = user.last_login_location.get('city')
                    region = user.last_login_location.get('region_name')
                    
                    if country:
                        location_counts['country'][country] = location_counts['country'].get(country, 0) + 1
                    if city:
                        location_counts['city'][city] = location_counts['city'].get(city, 0) + 1
                    if region:
                        location_counts['region'][region] = location_counts['region'].get(region, 0) + 1
            
            self.user_ip_location_country = location_counts['country']
            self.user_ip_location_city = location_counts['city']
            self.user_ip_location_region = location_counts['region']
            
            # System metrics
            os_counts = {}
            language_counts = {}
            
            for user in users:
                if user.operating_system:
                    os_counts[user.operating_system] = os_counts.get(user.operating_system, 0) + 1
                if user.preferred_language:
                    language_counts[user.preferred_language] = language_counts.get(user.preferred_language, 0) + 1
            
            self.user_operating_system = os_counts
            self.user_preferred_language = language_counts
            
            # Message language metrics
            language_filter_counts = {}
            for msg in messages:
                if msg.translation_viewers:
                    for lang in msg.translation_viewers.keys():
                        language_filter_counts[lang] = language_filter_counts.get(lang, 0) + 1
            
            self.message_language_filter = language_filter_counts
            
            # Update timestamp
            self.last_updated = datetime.utcnow()
            
            # Commit changes
            db.session.commit()
            
            return True
            
        except Exception as e:
            db.session.rollback()
            # app.logger.error(f"Error obtaining metrics snapshot: {str(e)}")
            return False


