"""
Metrics routes
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


metrics_bp = Blueprint('metrics', __name__)


@metrics_bp.route('/api/database_schema', methods=['GET'])
def get_database_schema():
    """Get database schema information - all tables, columns, types, and row counts"""
    try:
        schema_info = []

        # Get all table names
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()

        for table_name in table_names:
            # Get columns and their types
            columns = []
            for column in inspector.get_columns(table_name):
                columns.append({
                    'name': column['name'],
                    'type': str(column['type']),
                    'nullable': column['nullable'],
                    'default': str(column['default']) if column['default'] is not None else None
                })

            # Get row count
            try:
                result = db.session.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
                row_count = result.scalar()
            except:
                row_count = 0

            # Get primary keys
            pk_constraint = inspector.get_pk_constraint(table_name)
            primary_keys = pk_constraint.get('constrained_columns', []) if pk_constraint else []

            schema_info.append({
                'table_name': table_name,
                'columns': columns,
                'row_count': row_count,
                'primary_keys': primary_keys
            })

        return jsonify({
            'success': True,
            'schema': schema_info,
            'total_tables': len(schema_info)
        })

    except Exception as e:
        current_app.logger.error(f"Error getting database schema: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@metrics_bp.route('/api/execute_query', methods=['POST'])
def execute_query():
    """Execute a SQL query (SELECT only for safety)"""
    try:
        request_data = request.get_json() or {}
        query = request_data.get('query', '').strip()

        if not query:
            return jsonify({
                'success': False,
                'error': 'Query cannot be empty'
            }), 400

        # Security: Only allow SELECT queries
        query_upper = query.upper().strip()
        if not query_upper.startswith('SELECT'):
            return jsonify({
                'success': False,
                'error': 'Only SELECT queries are allowed for safety'
            }), 403

        # Additional security: Block dangerous keywords
        dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return jsonify({
                    'success': False,
                    'error': f'Query contains forbidden keyword: {keyword}'
                }), 403

        # Limit number of rows returned
        max_rows = request_data.get('max_rows', 1000)

        # Execute query with timeout
        result = db.session.execute(text(query))

        # Fetch results
        rows = result.fetchmany(max_rows)
        columns = list(result.keys()) if result.keys() else []

        # Convert rows to list of dicts
        data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                # Handle special types
                if isinstance(value, datetime):
                    value = value.isoformat()
                elif isinstance(value, (dict, list)):
                    value = json.dumps(value)
                row_dict[col] = value
            data.append(row_dict)

        return jsonify({
            'success': True,
            'columns': columns,
            'data': data,
            'row_count': len(data),
            'max_rows_reached': len(data) >= max_rows
        })

    except Exception as e:
        current_app.logger.error(f"Error executing query: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@metrics_bp.route('/api/ai_generate_query', methods=['POST'])
def ai_generate_query():
    """Use ChatGPT to convert natural language to SQL query"""
    try:
        request_data = request.get_json() or {}
        user_prompt = request_data.get('prompt', '').strip()
        schema_info = request_data.get('schema', [])

        if not user_prompt:
            return jsonify({
                'success': False,
                'error': 'Prompt cannot be empty'
            }), 400

        # Format schema information for GPT
        schema_text = "Database Schema:\n\n"
        for table in schema_info:
            schema_text += f"Table: {table['table_name']} ({table['row_count']} rows)\n"
            schema_text += "Columns:\n"
            for col in table['columns']:
                pk = " [PRIMARY KEY]" if col['name'] in table.get('primary_keys', []) else ""
                schema_text += f"  - {col['name']}: {col['type']}{pk}\n"
            schema_text += "\n"

        # Create the system prompt
        system_prompt = """You are a PostgreSQL expert. Convert natural language requests into SQL queries.
Rules:
1. ONLY generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Use double quotes for table and column names (e.g., "user", "created_at")
3. Always add a LIMIT clause (default 100) unless user specifies otherwise
4. Use PostgreSQL syntax
5. Return ONLY the SQL query, no explanations or markdown
6. If the request is unclear, return a simple query and add a comment

Available tables and columns:
""" + schema_text
        
        # Call OpenAI API using existing client
        response = openAI_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        generated_query = response.choices[0].message.content.strip()
        
        # Clean up the response (remove markdown code blocks if present)
        if generated_query.startswith('```'):
            lines = generated_query.split('\n')
            generated_query = '\n'.join(lines[1:-1]) if len(lines) > 2 else generated_query
        generated_query = generated_query.replace('```sql', '').replace('```', '').strip()
        
        # Validate it's a SELECT query
        if not generated_query.upper().strip().startswith('SELECT'):
            return jsonify({
                'success': False,
                'error': 'AI generated a non-SELECT query. Please rephrase your request.'
            }), 400
        
        return jsonify({
            'success': True,
            'query': generated_query,
            'model': 'gpt-4',
            'prompt': user_prompt
        })
        
    except Exception as e:
        from flask import current_app
        current_current_app.logger.error(f"Error generating query with AI: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@metrics_bp.route('/api/metrics_info', methods=['GET'])
def get_metrics_info():
    """Get information about available metrics data without fetching all data"""
    try:
        metrics = Metrics.query.first()
        if not metrics:
            return jsonify({
                'success': True,
                'info': {
                    'has_data': False,
                    'message': 'No metrics data collected yet'
                }
            })

        # Analyze one metric to get overall statistics
        sample_metric = metrics.total_user_number
        if sample_metric:
            timestamp_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')
            timestamps = sorted([k for k in sample_metric.keys() if timestamp_pattern.match(str(k))])

            if timestamps:
                oldest = timestamps[0]
                newest = timestamps[-1]
                try:
                    oldest_dt = datetime.fromisoformat(oldest.replace('Z', '+00:00').split('.')[0])
                    newest_dt = datetime.fromisoformat(newest.replace('Z', '+00:00').split('.')[0])
                    span_days = (newest_dt - oldest_dt).days
                    span_hours = (newest_dt - oldest_dt).total_seconds() / 3600
                except:
                    span_days = 0
                    span_hours = 0

                return jsonify({
                    'success': True,
                    'info': {
                        'has_data': True,
                        'total_snapshots': len(timestamps),
                        'oldest_snapshot': oldest,
                        'newest_snapshot': newest,
                        'data_span_days': span_days,
                        'data_span_hours': round(span_hours, 1),
                        'last_updated': str(metrics.last_updated),
                        'collection_frequency': '30 minutes'
                    }
                })

        return jsonify({
            'success': True,
            'info': {
                'has_data': False,
                'message': 'Metrics exist but no time-series data found'
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error in get_metrics_info: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@metrics_bp.route('/api/get_usable_purchased_token', methods=['GET'])
@jwt_required()
def get_usable_purchased_token():
    try:
        # Get current user from JWT token
        current_user_id = get_jwt_identity()

        # Check if request is for host user in guest mode
        host_user_id = request.headers.get('Host-User-Id')
        if host_user_id:
            user = User.query.get(host_user_id)
        else:
            user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "usable_token": round(user.tokens * 500.0, 2),  # Current available tokens
            "max_token_in_plan": 1000.0,    # Maximum tokens in plan
            "status": "success"
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Error fetching token info: {str(e)}")
        return jsonify({
            "error": "Failed to fetch token information",
            "details": str(e)
        }), 500


