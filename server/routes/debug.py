"""
Debug routes
"""
from flask import Blueprint, request, jsonify, send_from_directory, session, redirect, url_for, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from sqlalchemy import text, desc
from PIL import Image
import os
import base64
import json
import re
import random
import string
import io

# Import from config
from config.constants import *

# Import from extensions
from extensions import db, sio, openAI_client, stripe

# Import models
from models import User, ChatRoom, Message, Notification, Metrics, Plan, PaymentHistory, ReferCode, Friendship, Shop, DebugLog

# Import services
from services.translation import translate_text
from services.token_service import check_and_update_tokens
from services.metrics_service import check_and_update_metrics
from services.debug_logging import log_debug_info
from services.encryption import encrypt_data, decrypt_data
from services.ip_location import get_ip_location

# Import utils
from utils.helpers import generate_random_password, allowed_file
from utils.decorators import verify_debug_password

# For OAuth (needed by auth routes)
try:
    from requests_oauthlib import OAuth2Session
    from oauthlib.oauth2 import WebApplicationClient
    import requests as http_requests
    from google.oauth2 import id_token
    from google.auth.transport import requests
except ImportError:
    pass  # OAuth dependencies not needed for all blueprints

# For location/spatial search
try:
    from spatial_search import load_and_search, initialize_data
    from get_ai_international_rating import get_ai_rating
except ImportError:
    pass  # Location dependencies not needed for all blueprints


debug_bp = Blueprint('debug', __name__)


@debug_bp.route('/api/debug/create-refer-code', methods=['POST'])
def create_refer_code():
    try:
        token_allocation = {
            'monthly_onetime': 2.0,
            'annual_onetime': 24.0,
            'basic': 0.1,
        }
        # Get data from request
        data = request.get_json()

        # Validate required fields
        required_fields = ['name', 'refer_code', 'total_number',
                         'refer_code_expiration_date', 'refer_code_activation_plan']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate activation plan
        valid_plans = ['basic', 'monthly_onetime', 'annual_onetime']
        if data['refer_code_activation_plan'] not in valid_plans:
            return jsonify({'error': 'Invalid activation plan'}), 400

        # Check if refer code already exists
        existing_code = ReferCode.query.filter_by(refer_code=data['refer_code']).first()
        if existing_code:
            return jsonify({'error': 'Refer code already exists'}), 400

        # Parse expiration date
        try:
            expiration_date = datetime.fromisoformat(data['refer_code_expiration_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid expiration date format'}), 400

        total_cost = token_allocation[data['refer_code_activation_plan']] * float(data['total_number'])

        # Create new refer code
        new_refer_code = ReferCode(
            name=data['name'],
            refer_code=data['refer_code'],
            refer_code_description=data.get('refer_code_description', ''),
            total_number=int(data['total_number']),
            refer_code_expiration_date=expiration_date,
            refer_code_activation_plan=data['refer_code_activation_plan'],
            refer_code_total_cost=total_cost,  # Default value, can be updated later
            refer_code_is_active='1'
        )

        # Add to database
        db.session.add(new_refer_code)
        db.session.commit()

        return jsonify({
            'message': 'Refer code created successfully',
            'refer_code': new_refer_code.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        # current_app.logger.error(f"Error creating refer code: {str(e)}")
        return jsonify({'error': 'Failed to create refer code'}), 500



@debug_bp.route('/api/debug/authenticate', methods=['POST'])
def authenticate_debug():
    try:
        data = request.get_json()
        password = data.get('password')

        if not password:
            return jsonify({"error": "Password is required"}), 400

        if password != DEBUG_PASSWORD:
            return jsonify({"error": "Invalid password"}), 401

        return jsonify({"message": "Authentication successful"}), 200

    except Exception as e:
        # current_app.logger.error(f"Debug authentication error: {str(e)}")
        return jsonify({"error": "Authentication failed"}), 500



@debug_bp.route('/api/debug/update-cell', methods=['POST'])
def update_table_cell():
    try:
        data = request.get_json()
        table_name = data.get('tableName')
        row_id = data.get('rowId')
        column = data.get('column')
        value = data.get('value')

        if not all([table_name, row_id, column, value]):
            return jsonify({"error": "Missing required parameters"}), 400

        try:
            # Get the table
            Table = db.metadata.tables[table_name]

            # Convert value to appropriate type based on column type
            column_type = Table.c[column].type.python_type
            converted_value = column_type(value)

            # Update the value
            stmt = (
                update(Table)
                .where(Table.c.id == row_id)
                .values(**{column: converted_value})
            )

            db.session.execute(stmt)
            db.session.commit()

            return jsonify({"message": "Updated successfully"}), 200

        except ValueError as ve:
            return jsonify({"error": f"Invalid value for column {column}: {str(ve)}"}), 400
        except KeyError as ke:
            return jsonify({"error": f"Column not found: {str(ke)}"}), 400

    except Exception as e:
        db.session.rollback()
        # current_app.logger.error(f"Error updating cell: {str(e)}")
        return jsonify({"error": str(e)}), 500



@debug_bp.route('/api/debug/tables', methods=['GET'])
def get_all_tables():
    try:
        # Get all table names from SQLAlchemy
        tables = {}
        for table_name in db.metadata.tables.keys():
            Model = db.metadata.tables[table_name]
            total_records = db.session.query(Model).count()
            tables[table_name] = {
                'total_records': total_records,
                'columns': [column.name for column in Model.columns]
            }
        return jsonify(tables)
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@debug_bp.route('/api/debug/table-data/<table_name>', methods=['GET'])
def get_table_data(table_name):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'id')
        order = request.args.get('order', 'desc')

        # Get the table
        Model = db.metadata.tables[table_name]

        # Calculate total pages
        total_records = db.session.query(Model).count()
        total_pages = (total_records + per_page - 1) // per_page

        # Build query with sorting
        query = db.session.query(Model)
        if order == 'desc':
            query = query.order_by(desc(Model.c[sort_by]))
        else:
            query = query.order_by(Model.c[sort_by])

        # Paginate
        records = query.offset((page - 1) * per_page).limit(per_page).all()

        # Convert records to dict
        data = [{column.name: getattr(record, column.name) for column in Model.columns}
                for record in records]

        return jsonify({
            'data': data,
            'pagination': {
                'total_records': total_records,
                'total_pages': total_pages,
                'current_page': page,
                'per_page': per_page
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@debug_bp.route('/api/debug/openai-usage', methods=['GET'])
def get_openai_usage():
    try:
        # Calculate timestamps for the last 24 hours
        end_time = int(time.time())
        start_time = end_time - (24 * 60 * 60)  # 24 hours ago
        openai_key_admin = os.getenv('OPENAI_ADMIN_KEY', os.getenv('OPENAI_API_KEY', ''))
        # Get costs
        headers = {
            "Authorization": f"Bearer {openai_key_admin}",
            "Content-Type": "application/json"
        }

        # Use http_requests instead of requests
        cost_response = http_requests.get(
            f"https://api.openai.com/v1/organization/costs?start_time={start_time}&limit=100",
            headers=headers
        )

        audio_usage_response = http_requests.get(
            f"https://api.openai.com/v1/organization/usage/audio_transcriptions?start_time={start_time}&limit=100",
            headers=headers
        )

        completion_usage_response = http_requests.get(
            f"https://api.openai.com/v1/organization/usage/completions?start_time={start_time}&limit=100",
            headers=headers
        )

        return jsonify({
            'costs': cost_response.json(),
            'audio_usage': audio_usage_response.json(),
            'completion_usage': completion_usage_response.json()
        })

    except Exception as e:
        # current_app.logger.error(f"Error fetching OpenAI usage: {str(e)}")
        return jsonify({'error': str(e)}), 500



# from cryptography.fernet import Fernet
# from cryptography.hazmat.primitives import hashes
# from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
# import base64

# # Add these constants at the top of your file
# ENCRYPTION_KEY = "helloYoohi"  # Replace in production
# SALT = "helloYoohi.ai".encode()  # Replace in production

# def get_encryption_key():
#     """Generate encryption key from password using PBKDF2"""
#     kdf = PBKDF2HMAC(
#         algorithm=hashes.SHA256(),
#         length=32,
#         salt=SALT,
#         iterations=100000,
#     )
#     key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_KEY.encode()))
#     return Fernet(key)



@debug_bp.route('/api/debug-logs', methods=['GET'])
def get_debug_logs():
    try:
        limit = request.args.get('limit', 100, type=int)
        logs = DebugLog.query.order_by(DebugLog.timestamp.desc()).limit(limit).all()
        return jsonify([{
            'id': log.id,
            'timestamp': log.timestamp.isoformat(),
            'function_name': log.function_name,
            'input_text': log.input_text,
            'response': log.response,
            'model_used': log.model_used,
            'tokens_used': log.tokens_used
        } for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



