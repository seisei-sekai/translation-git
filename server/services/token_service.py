"""
Token Service - Token management and allocation logic
Business logic for token_service
"""
from datetime import datetime, timedelta
from extensions import db
import stripe

def check_and_update_tokens(user):
    # is_test = 'test'  # Change to 'live' for production mode
    is_test = 'live' 
    """Check and update user tokens based on subscription plan"""
    try:
        current_time = datetime.utcnow()
        
        # Token allocation based on plan type
        token_allocation = {
            'monthly': 2.0,
            'annual': 24.0,
            'monthly_onetime': 2.0,
            'annual_onetime': 24.0,
            'basic': 0.1,
            'token': 2.0
        }

        # Only proceed if user has an active subscription
        if user.subscription_status != 'active' or user.subscription_plan not in ['monthly', 'annual']:
            return

        # Get the appropriate interval based on test/live mode
        if is_test == 'test':
            update_interval = timedelta(seconds=60)  # 60 seconds for testing
        else:
            update_interval = timedelta(days=30)  # 30 days for live

        # Calculate the next update time based on the last token update or subscription start
        last_token_update = user.last_token_update or user.subscription_start_date
        if not last_token_update:
            last_token_update = current_time
            user.last_token_update = current_time
            db.session.commit()
            return

        # Calculate number of periods passed
        time_passed = current_time - last_token_update
        if is_test == 'test':
            periods = time_passed.total_seconds() // 60  # Number of 60-second periods
        else:
            periods = time_passed.days // 30  # Number of months

        # If subscription is annual, adjust token allocation
        if user.subscription_plan == 'annual':
            years_passed = time_passed.days // 365 if is_test == 'live' else time_passed.total_seconds() // (60 * 12)
            if years_passed > 0:
                user.tokens += token_allocation['annual'] * years_passed
                user.last_token_update = last_token_update + timedelta(days=365 * years_passed) if is_test == 'live' \
                    else last_token_update + timedelta(seconds=60 * 12 * years_passed)
                db.session.commit()
        
        # For monthly subscriptions
        elif user.subscription_plan == 'monthly' and periods > 0:
            user.tokens += token_allocation['monthly'] * periods
            if is_test == 'test':
                user.last_token_update = last_token_update + timedelta(seconds=60 * periods)
            else:
                user.last_token_update = last_token_update + timedelta(days=30 * periods)
            db.session.commit()

    except Exception as e:
        # app.logger.error(f"Error updating tokens: {str(e)}")
        db.session.rollback()
