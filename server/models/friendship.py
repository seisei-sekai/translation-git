"""
Friendship Model
Database model definitions
"""
from datetime import datetime
from extensions import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON

class Friendship(db.Model):
    '''
    Description
    '''
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    friend_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    status = db.Column(db.String(50), default="pending")  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', foreign_keys=[user_id], back_populates='friends')
    friend = db.relationship('User', foreign_keys=[friend_id])

    
