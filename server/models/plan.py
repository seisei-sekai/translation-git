"""
Plan and Payment Models
Database model definitions
"""
from datetime import datetime
from extensions import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON

class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))  # free, entry, medium, premium
    tokens_per_month = db.Column(db.Integer)
    price = db.Column(db.Float)
    users = db.relationship('User', backref='plan', lazy=True)


class PaymentHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(80), db.ForeignKey('user.user_id'), nullable=False)
    stripe_payment_id = db.Column(db.String(255), unique=True)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='USD')
    status = db.Column(db.String(50), nullable=False)  # succeeded, failed, pending
    payment_method = db.Column(db.String(50))  # credit_card, bank_transfer, etc.
    payment_method_details = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # For subscriptions
    is_subscription_payment = db.Column(db.Boolean, default=False)
    subscription_period_start = db.Column(db.DateTime, nullable=True)
    subscription_period_end = db.Column(db.DateTime, nullable=True)
    
    # For token purchases
    tokens_purchased = db.Column(db.Float, nullable=True)
    
    # For refunds
    refunded = db.Column(db.Boolean, default=False)
    refund_reason = db.Column(db.String(255), nullable=True)
    refunded_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, user_id, stripe_payment_id, amount, status, **kwargs):
        self.user_id = user_id
        self.stripe_payment_id = stripe_payment_id
        self.amount = amount
        self.status = status
        for key, value in kwargs.items():
            setattr(self, key, value)

# Add this near your other model definitions

class PurchaseHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    plan_id = db.Column(db.Integer, db.ForeignKey('plan.id'))
    amount = db.Column(db.Float)
    status = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

