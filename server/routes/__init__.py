"""
Routes package
Contains all Flask Blueprint route handlers
"""
from flask import Blueprint

# Import blueprints
from .auth import auth_bp
from .user import user_bp
from .chatroom import chatroom_bp
from .message import message_bp
from .payment import payment_bp
from .debug import debug_bp
from .static_pages import static_pages_bp
from .location import location_bp
from .upload import upload_bp
from .misc import misc_bp
from .notification import notification_bp
from .referral import referral_bp
from .metrics import metrics_bp

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(chatroom_bp)
    app.register_blueprint(message_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(debug_bp)
    app.register_blueprint(static_pages_bp)
    app.register_blueprint(location_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(misc_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(referral_bp)
    app.register_blueprint(metrics_bp)
