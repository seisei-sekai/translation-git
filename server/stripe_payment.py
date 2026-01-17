import stripe
import os

# Load Stripe API key from environment variable
stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')



STRIPE_PRODUCTS = {
    'monthly': {
        'price_id': 'prod_RY4hO4A5JrrAAn', # Replace with your Monthly plan price ID
        'amount': 999999999999,  # Amount in cents
        'type': 'subscription'
    },
    'annual': {
        'price_id': 'prod_RY6LUGdP9t51wY',
        'amount': 99999999999,  # Amount in cents
        'type': 'subscription'
    },
    'token': {
        'price_id':'prod_RY6M3ZD1YgjsSJ',
        'amount': 99999999999,  # Amount in cents
        'type': 'one_time'
    }
}



starter_subscription = stripe.Product.create(
  name="Starter Subscription",
  description="$12/Month subscription",
)

starter_subscription_price = stripe.Price.create(
  unit_amount=1200,
  currency="usd",
  recurring={"interval": "month"},
  product=starter_subscription['id'],
)

# Save these identifiers
print(f"Success! Here is your starter subscription product id: {starter_subscription.id}")
print(f"Success! Here is your starter subscription price id: {starter_subscription_price.id}")

