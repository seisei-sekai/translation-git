"""
Payment routes
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


payment_bp = Blueprint('payment', __name__)


@payment_bp.route('/api/create-checkout-session', methods=['POST'])
@jwt_required()
def create_checkout_session():
    try:
        data = request.get_json()
        plan_type = data.get('planType')
        payment_method_type = data.get('paymentMethodType', 'card')
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        if plan_type not in STRIPE_PRODUCTS:
            return jsonify({"error": "Invalid plan type"}), 400

        product = STRIPE_PRODUCTS[plan_type]
        url_local = os.getenv('APP_URL', 'http://localhost:3000')

        # Set default currency and amount
        currency = 'usd'
        amount = min(product['amount'], 99999999)

        # Define payment methods and mode based on selection
        payment_methods = ['card']
        checkout_mode = product['type']

        if payment_method_type == 'china':
            payment_methods = ['alipay'] #, 'wechat_pay']
            checkout_mode = 'payment'
            currency = 'cny'
            amount = min(int(amount * 7.2), 99999999)

            line_items = [{
                'price_data': {
                    'currency': currency,
                    'unit_amount': amount,
                    'product_data': {
                        'name': f'{plan_type.capitalize()} Plan (One-time payment)',
                    },
                },
                'quantity': 1,
            }]
        else:
            line_items = [{
                'price': product['price_id'],
                'quantity': 1,
            }]

        # Set payment method options based on mode and type
        payment_method_options = {}

        # if 'wechat_pay' in payment_methods:
        #     payment_method_options['wechat_pay'] = {'client': 'web'}

        if 'alipay' in payment_methods:
            payment_method_options['alipay'] = {}

        if 'card' in payment_methods:
            if checkout_mode == 'subscription':
                payment_method_options['card'] = {}
            else:
                payment_method_options['card'] = {'setup_future_usage': None}

        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            customer_email=user.email,
            payment_method_types=payment_methods,
            line_items=line_items,
            mode=checkout_mode,
            success_url=f"{url_local}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{url_local}/myplan",
            metadata={
                'user_id': user.user_id,
                'plan_type': plan_type,
                'is_subscription': str(product['type'] == 'subscription'),
                'payment_method_type': payment_method_type,
                'currency': currency
            },
            payment_method_options=payment_method_options,
            locale='zh' if payment_method_type == 'china' else 'en',
        )

        return jsonify({
            'sessionId': checkout_session.id,
            'url': checkout_session.url
        }), 200

    except Exception as e:
        # current_app.logger.error(f"Stripe session creation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Handle webhook


@payment_bp.route('/api/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )

        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']

            # Get user and plan info from metadata
            user_id = session['metadata']['user_id']
            plan_type = session['metadata']['plan_type']

            # Update user's subscription/tokens
            handle_successful_payment(user_id, plan_type, session)

        return jsonify({'status': 'success'}), 200

    except Exception as e:
        # current_app.logger.error(f"Webhook error: {str(e)}")
        return jsonify({'error': str(e)}), 400



@payment_bp.route('/api/verify-payment', methods=['POST'])
@jwt_required()
def verify_payment():
    try:
        data = request.get_json()
        session_id = data.get('sessionId')

        if not session_id:
            return jsonify({'error': 'No session ID provided'}), 400

        session = stripe.checkout.Session.retrieve(session_id)

        if session.payment_status == 'paid':
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            if not user:
                return jsonify({'error': 'User not found'}), 404

            plan_type = session.metadata.get('plan_type')

            # Token allocation based on plan type
            token_allocation = {
                'monthly': 2.0,
                'annual': 24.0,
                'monthly_onetime': 2.0,
                'annual_onetime': 24.0,
                'basic': 0.1,
                'token': 2.0
            }

            # Add tokens based on plan type
            if plan_type in token_allocation:
                user.tokens += token_allocation[plan_type]

            # Update subscription details if it's a subscription plan
            if plan_type not in ['token']:
                user.subscription_plan = plan_type
                user.subscription_status = 'active'
                user.stripe_customer_id = session.customer
                user.subscription_start_date = datetime.utcnow()
                user.subscription_end_date = datetime.utcnow() + timedelta(days=365 if 'annual' in plan_type else 30)
            else:

                user.stripe_token_purchase_history[user.user_id] = datetime.now().isoformat()

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Payment verified successfully',
                'plan': plan_type
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Payment not completed'
            }), 400

    except stripe.error.StripeError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        # current_app.logger.error(f"Payment verification error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 500




@payment_bp.route('/api/enterprise_action', methods=['POST'])
@jwt_required()
def enterprise_action():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        code = data.get('code')

        if not code:
            return jsonify({"error": "No code provided"}), 400

        if code == 'godishere666':
            # Add tokens and update subscription
            user.tokens += 2.0
            user.subscription_plan = 'monthly_onetime'
            user.subscription_status = 'active'
            user.subscription_start_date = datetime.utcnow()
            user.subscription_end_date = datetime.utcnow() + timedelta(days=30)

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Enterprise code accepted! Your account has been upgraded."
            }), 200
        else:
            return jsonify({"error": "Invalid enterprise code"}), 400

    except Exception as e:
        # current_app.logger.error(f"Error in enterprise action: {str(e)}")
        return jsonify({
            "error": "An error occurred while processing your request",
            "details": str(e)
        }), 500










