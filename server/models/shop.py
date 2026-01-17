"""
Shop Model
Database model definitions
"""
from datetime import datetime
from extensions import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON
from sqlalchemy.types import Float

class Shop(db.Model):
    """
    Shop model for storing business/shop information
    """
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, unique=True, nullable=False)
    # Store coordinates as two separate columns for latitude and longitude
    shop_coordinate_lat = db.Column(Float)
    shop_coordinate_lng = db.Column(Float)
    shop_website_link = db.Column(db.String(500))
    shop_google_website_link = db.Column(db.String(500))
    shop_industry_type = db.Column(db.String(100))
    shop_type = db.Column(db.String(100))
    is_shop_member = db.Column(db.String(50))  # Could be changed to Boolean if only True/False
    shop_membership_level = db.Column(db.String(50))
    shop_international_rating = db.Column(db.String(50))
    shop_international_comment = db.Column(db.Text)
    shop_language_support = db.Column(db.String(200))  # Could be JSON if multiple languages
    shop_description = db.Column(db.Text)
    shop_text = db.Column(db.Text)
    shop_badges = db.Column(db.String(500))  # Could be JSON if multiple badges
    copyright_status = db.Column(db.String(100))
    shop_last_updated_time = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, shop_id, coordinate_lat=None, coordinate_lng=None, **kwargs):
        self.shop_id = shop_id
        self.shop_coordinate_lat = coordinate_lat
        self.shop_coordinate_lng = coordinate_lng
        for key, value in kwargs.items():
            setattr(self, key, value)

    def to_dict(self):
        """Convert shop object to dictionary"""
        return {
            'id': self.id,
            'shop_id': self.shop_id,
            'shop_coordinate': [self.shop_coordinate_lat, self.shop_coordinate_lng],
            'shop_website_link': self.shop_website_link,
            'shop_google_website_link': self.shop_google_website_link,
            'shop_industry_type': self.shop_industry_type,
            'shop_type': self.shop_type,
            'is_shop_member': self.is_shop_member,
            'shop_membership_level': self.shop_membership_level,
            'shop_international_rating': self.shop_international_rating,
            'shop_international_comment': self.shop_international_comment,
            'shop_language_support': self.shop_language_support,
            'shop_description': self.shop_description,
            'shop_text': self.shop_text,
            'shop_badges': self.shop_badges,
            'copyright_status': self.copyright_status,
            'shop_last_updated_time': self.shop_last_updated_time.isoformat() if self.shop_last_updated_time else None
        }






# Add this new model after your existing models
