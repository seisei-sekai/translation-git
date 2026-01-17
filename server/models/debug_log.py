"""
Debug Log Model
Database model definitions
"""
from datetime import datetime
from extensions import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON

class DebugLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    function_name = db.Column(db.String(100))
    input_type = db.Column(db.String(50))  # 'text', 'audio', or 'photo'
    input_text = db.Column(db.Text)
    response = db.Column(db.JSON)
    model_used = db.Column(db.String(50))
    tokens_used = db.Column(db.Integer)
    duration = db.Column(db.Float)  # For audio files
    file_size = db.Column(db.Integer)  # For photo/audio uploads
    file_type = db.Column(db.String(50))  # MIME type
    upload_status = db.Column(db.String(50))  # success/failure
