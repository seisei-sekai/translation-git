"""
Decorators for route protection and validation
"""
from functools import wraps
from flask import request, jsonify
from config.constants import DEBUG_PASSWORD


def verify_debug_password(f):
    """
    Decorator to verify debug password for admin/debug routes
    Checks for 'Debug-Password' header and validates it
    
    Args:
        f: The function to decorate
        
    Returns:
        Decorated function that checks debug password before executing
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        debug_password = request.headers.get('Debug-Password')
        if not debug_password or debug_password != DEBUG_PASSWORD:
            return jsonify({"error": "Invalid or missing debug password"}), 401
        return f(*args, **kwargs)
    return decorated_function

