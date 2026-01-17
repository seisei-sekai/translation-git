"""
Application Configuration
Contains Flask app configuration, database settings, and other configs
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""
    
    # =================== Flask Configuration ===================
    SECRET_KEY = os.getenv('SECRET_KEY', 'change-this-secret-key-in-production')
    STATIC_FOLDER = './src/'
    
    # Session configuration
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PREFERRED_URL_SCHEME = 'https'  # Force HTTPS for url_for oauth
    
    # =================== Database Configuration ===================
    # Database configuration(2025.1 - 2026.1, on amazon aws)
    # DB_USER = 'postgres'
    # DB_PASSWORD = 'YoohiDB2024!'
    # DB_HOST = 'database-1.ch0gug4sugvd.ap-northeast-1.rds.amazonaws.com'
    # DB_PORT = '5432'
    # DB_NAME = 'postgres'
    # SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    
    # GCP service temporary deployment (2026. 1. 13)
    # DB_USER = 'root'  # Change to root or your MySQL user
    # DB_PASSWORD = 'your_mysql_password'  # Change this
    # DB_HOST = 'localhost'  # Change to localhost
    # DB_PORT = '3306'  # Change to MySQL port
    # DB_NAME = 'translation_db'  # Change to your database name
    # SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    
    # Read from environment variables first, then fall back to defaults
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'your-database-password')
    DB_HOST = os.getenv('DB_HOST', 'db')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_NAME = os.getenv('DB_NAME', 'translation_db')
    
    # Disable SSL to avoid self-signed errors when connecting from Docker to host MySQL.
    # Also add charset to avoid encoding issues.
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4&ssl_disabled=true"
    )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # =================== JWT Configuration ===================
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-this-jwt-secret-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)  # Set token expiration to 1 day
    
    # =================== Upload Configuration ===================
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'webm'}
    
    # =================== Stripe Configuration ===================
    # Stripe keys should be loaded from environment variables in production
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
    STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY', '')
    STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Print database connection info (hide password)
        print(f"[DATABASE CONFIG] Connecting to: mysql+pymysql://{Config.DB_USER}:****@{Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}?charset=utf8mb4&ssl_disabled=true")


def get_database_uri():
    """Get the database URI string"""
    return Config.SQLALCHEMY_DATABASE_URI

