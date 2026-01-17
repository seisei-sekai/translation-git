"""
Utility Helper Functions
Contains various helper functions used throughout the application
"""
import os
import random
import string
import base64
import time
from PIL import Image
from sqlalchemy import text
from google.auth.transport import requests


def generate_random_password(length=16):
    """
    Generate a random password of specified length
    
    Args:
        length (int): Length of password to generate (default: 16)
        
    Returns:
        str: Randomly generated password
    """
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for _ in range(length))


def add_user(user_id, username, db, User):
    """
    Add a new user to the database
    Creates a default user with test email and password
    
    Args:
        user_id (str): User ID
        username (str): Username (defaults to user_XXXX if None)
        db: Database instance
        User: User model class
    """
    if username == None:
        username = "user_" + user_id[:4]
    new_user = User(user_id=user_id, username=username, email=f"{user_id}@test.test", password=f"{user_id}")
    db.session.add(new_user)
    db.session.commit()


def get_db(app, db):
    """
    Initialize database with retry logic
    Tries up to 20 times with 3 second intervals
    
    Args:
        app: Flask app instance
        db: Database instance
        
    Raises:
        Exception: If connection fails after all retries
    """
    max_retries = 20
    retry_count = 0
    while retry_count < max_retries:
        try:
            db.create_all()
            print(f"[DATABASE] Successfully initialized after {retry_count + 1} attempts")
            return
        except Exception as e:
            retry_count += 1
            print(f"[DATABASE] Connection attempt {retry_count}/{max_retries} failed: {str(e)}")
            time.sleep(3)  # Wait 3 seconds before retrying
    raise Exception("Could not connect to database after multiple attempts")


def reset_message_sequence(app, db):
    """
    Reset the message ID sequence to start from 1
    Handles different database types (PostgreSQL, SQLite, MySQL)
    
    Args:
        app: Flask app instance
        db: Database instance
    """
    with app.app_context():
        try:
            if db.engine.url.drivername == 'postgresql':
                db.session.execute(text("ALTER SEQUENCE message_id_seq RESTART WITH 1"))
            elif db.engine.url.drivername == 'sqlite':
                # For SQLite, we can just let it handle the autoincrement
                # The sequence will automatically start from 1 after table creation
                pass
            db.session.commit()
        except Exception as e:
            # Don't raise the error - just log it
            pass


def get_google_provider_cfg():
    """
    Get Google OAuth provider configuration
    
    Returns:
        dict: Google provider configuration
    """
    from config.constants import GOOGLE_USER_INFO_URL
    return requests.get(GOOGLE_USER_INFO_URL).json()


def allowed_file(filename, allowed_extensions=None):
    """
    Check if a file has an allowed extension
    
    Args:
        filename (str): Name of the file to check
        allowed_extensions (set): Set of allowed extensions (optional)
        
    Returns:
        bool: True if file extension is allowed
    """
    if allowed_extensions is None:
        from extensions import ALLOWED_EXTENSIONS
        allowed_extensions = ALLOWED_EXTENSIONS
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def encode_image(image_path):
    """
    Encode image to base64 after resizing it
    
    Args:
        image_path (str): Path to the image file
        
    Returns:
        str: Base64 encoded image string
    """
    def resize_image(image_path, size=(512, 512)):
        """
        Resize image and save to new file
        
        Args:
            image_path (str): Path to original image
            size (tuple): Target size (width, height)
            
        Returns:
            str: Path to resized image
        """
        # Generate resized image path by adding suffix before extension
        base_path, ext = os.path.splitext(image_path)
        output_path = f"{base_path}_resized{ext}"
        
        image = Image.open(image_path)
        image = image.resize(size)
        image.save(output_path)
        return output_path

    # Get resized image path and encode it
    resized_path = resize_image(image_path)
    with open(resized_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

