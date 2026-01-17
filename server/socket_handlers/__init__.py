"""
Socket.IO Event Handlers Module
Imports and registers all socket event handlers
"""

# Store app instance for use in event handlers
_app_instance = None

def init_socket_handlers(app):
    """Initialize socket handlers with app context"""
    global _app_instance
    _app_instance = app
    
    # Import all event handlers (this will register them with sio)
    from . import events

def get_app():
    """Get the stored app instance for use in socket handlers"""
    return _app_instance

# Import all event handlers
from . import events

__all__ = ['events', 'init_socket_handlers', 'get_app']
