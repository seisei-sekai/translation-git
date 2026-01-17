"""
Debug Logging Service - API call and transcription logging
Business logic for debug_logging
"""
from datetime import datetime
from extensions import db
from models.debug_log import DebugLog

def log_api_call(function_name, input_text, response, model_used):
    try:
        debug_log = DebugLog(
            function_name=function_name,
            input_text=input_text,
            response={
                'model': response.model,
                'content': response.choices[0].message.content if hasattr(response.choices[0], 'message') else response.text,
                'usage': {
                    'prompt_tokens': getattr(response.usage, 'prompt_tokens', 0),
                    'completion_tokens': getattr(response.usage, 'completion_tokens', 0),
                    'total_tokens': getattr(response.usage, 'total_tokens', 0)
                }
            },
            model_used=model_used,
            tokens_used=getattr(response.usage, 'total_tokens', 0)
        )
        db.session.add(debug_log)
        db.session.commit()
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error logging API call: {str(e)}")

def log_transcription(function_name, file_duration, response):
    try:
        debug_log = DebugLog(
            function_name=function_name,
            input_type='audio',
            input_text=f"Audio file (duration: {file_duration:.2f}s)",
            response={
                'model': 'whisper-1 ',
                'text': response.text,
                'duration': file_duration
            },
            model_used='whisper-1',
            duration=file_duration
        )
        db.session.add(debug_log)
        db.session.commit()
    except Exception as e:
        from flask import current_app
        current_app.logger.error(f"Error logging transcription: {str(e)}")

# Stub function for backwards compatibility
def log_debug_info(*args, **kwargs):
    """Placeholder function for backwards compatibility"""
    pass
