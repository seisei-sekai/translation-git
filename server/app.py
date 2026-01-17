"""
Main Application Entry Point
Refactored modular Flask application with Socket.IO
"""
import eventlet
import eventlet.wsgi
eventlet.monkey_patch()  # for handling websocket

import os
import json
import socketio
from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

# Load environment variables
load_dotenv()

# Force HTTPS for OAuth
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '0'  # Enforce HTTPS
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

# =================== Import Configuration ===================
from config.config import Config
from config.constants import *

# =================== Import Extensions ===================
from extensions import db, jwt, sio

# =================== Import Models ===================
# Import all models to ensure they're registered with SQLAlchemy
from models import *

# =================== Import Services ===================
from services import *

# =================== Import Utils ===================
from utils.helpers import get_db, reset_message_sequence

# =================== Create Flask App ===================
app = Flask(__name__, static_folder='./src/')
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# Load configuration
app.config.from_object(Config)
Config.init_app(app)

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Wrap app with Socket.IO
app.wsgi_app = socketio.WSGIApp(sio, app.wsgi_app)

# =================== Initialize Extensions ===================
db.init_app(app)
jwt.init_app(app)

# =================== Register Blueprints ===================
from routes import register_blueprints
register_blueprints(app)
print("[ROUTES] All route blueprints registered successfully")

# =================== Socket.IO Event Handlers ===================
# Import socket handlers to register them
import socket_handlers
# Initialize socket handlers with app context
socket_handlers.init_socket_handlers(app)
print("[SOCKET.IO] Event handlers registered")

# =================== Database Initialization ===================
with app.app_context():
    try:
        print("[DATABASE] Attempting to initialize database...")
        get_db(app, db)
        print("[DATABASE] Successfully connected and initialized")
        
        # Optionally reset message sequence (commented out by default)
        # reset_message_sequence(app, db)
        
    except Exception as e:
        print(f"[DATABASE ERROR] Failed to initialize: {str(e)}")
        # Don't crash the app, let it try to reconnect

# =================== Load Language Configuration ===================
try:
    with open('language_mainstream_server.json') as f:
        LANGUAGE_CONFIG = json.load(f)
    MAINSTREAM_LANGUAGES = set(LANGUAGE_CONFIG['languages'])
    print(f"[LANGUAGE] Loaded {len(MAINSTREAM_LANGUAGES)} mainstream languages")
except Exception as e:
    print(f"[LANGUAGE WARNING] Could not load language config: {e}")
    MAINSTREAM_LANGUAGES = set()

# =================== Setup Metrics Scheduler ===================
try:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=check_and_update_metrics,
        trigger="interval",
        minutes=30,
        id='metrics_update_job',
        name='Update metrics every 30 minutes',
        replace_existing=True
    )
    scheduler.start()
    print("[SCHEDULER] Metrics update job started (every 30 minutes)")
except Exception as e:
    print(f"[SCHEDULER WARNING] Could not start scheduler: {e}")

# =================== Application Info ===================
print("=" * 80)
print("[APP] Yoohi Translation Service")
print("[APP] Modular architecture with Flask Blueprints")
print(f"[APP] Environment: {os.getenv('FLASK_ENV', 'production')}")
print(f"[APP] Database: {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}")
print("=" * 80)

# =================== Error Handlers ===================
@app.errorhandler(422)
def handle_unprocessable_entity(error):
    """Handle JWT validation errors"""
    # app.logger.error(f"JWT Validation Error: {error}")
    return {"error": "Invalid or expired token"}, 422

@app.errorhandler(404)
def handle_not_found(error):
    """Handle 404 errors"""
    return {"error": "Resource not found"}, 404

@app.errorhandler(500)
def handle_server_error(error):
    """Handle 500 errors"""
    return {"error": "Internal server error"}, 500

# =================== Run Application ===================
if __name__ == '__main__':
    # Get port from environment or use default
    port = int(os.getenv('PORT', 5002))
    
    print(f"[SERVER] Starting on port {port}...")
    print("[SERVER] Press CTRL+C to stop")
    
    # Run with eventlet for WebSocket support
    eventlet.wsgi.server(
        eventlet.listen(('0.0.0.0', port)),
        app,
        log_output=True
    )

