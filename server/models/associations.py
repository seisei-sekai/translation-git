"""
Database Association Tables
Many-to-many relationship tables
"""
from extensions import db

user_chatroom = db.Table('user_chatroom',
    db.Column('user_id', db.String(80), db.ForeignKey('user.user_id'), primary_key=True),
    db.Column('chatroom_id', db.Integer, db.ForeignKey('chat_room.id'), primary_key=True),
    db.Column('has_joined', db.Boolean, default=False)  # Add this line
)
