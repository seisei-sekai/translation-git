"""
ReferCode Model
Database model for managing referral codes and their usage
"""
from datetime import datetime
from extensions import db
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy import JSON


class ReferCode(db.Model):
    """
    ReferCode model for managing referral codes and their usage
    """
    __tablename__ = 'refer_code'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    refer_code = db.Column(db.String(255), unique=True, nullable=False)
    refer_code_description = db.Column(db.Text, nullable=True)
    total_number = db.Column(db.Integer, default=1)  # Total number of times code can be used
    refer_code_user_list = db.Column(MutableDict.as_mutable(JSON), default=dict)  # {user_id: timestamp}
    number_refer_code_used = db.Column(db.Integer, default=0)  # Number of times code has been used
    refer_code_expiration_date = db.Column(db.DateTime, nullable=True)
    refer_code_creation_date = db.Column(db.DateTime, default=datetime.utcnow)
    refer_code_activation_plan = db.Column(db.String(50), nullable=False)  # e.g., 'monthly', 'annual', 'basic'
    refer_code_total_cost = db.Column(db.Float, default=0.0)  # Total cost associated with this code
    refer_code_is_active = db.Column(db.String(1), default='0')  # '0' for false, '1' for true

    def __init__(self, **kwargs):
        """Initialize ReferCode with keyword arguments"""
        super(ReferCode, self).__init__(**kwargs)
        self.refer_code_user_list = {}
        self.number_refer_code_used = 0
        if 'refer_code_creation_date' not in kwargs:
            self.refer_code_creation_date = datetime.utcnow()

    def is_valid(self):
        """
        Check if the refer code is still valid
        
        Returns:
            bool: True if code is valid, False otherwise
        """
        current_time = datetime.utcnow()
        
        # Check expiration
        if self.refer_code_expiration_date and current_time > self.refer_code_expiration_date:
            return False
            
        # Check usage limit
        if self.number_refer_code_used >= self.total_number:
            return False
            
        return True

    def use_code(self, user_id):
        """
        Attempt to use the refer code for a user
        
        Args:
            user_id: ID of the user trying to use the code
            
        Returns:
            tuple: (bool, str) - (success, message)
        """
        if not self.is_valid():
            return False, "Refer code is no longer valid"
            
        if str(user_id) in self.refer_code_user_list:
            return False, "User has already used this code"
            
        # Add user to the list with current timestamp
        self.refer_code_user_list[str(user_id)] = datetime.utcnow().isoformat()
        self.number_refer_code_used += 1
        
        try:
            db.session.commit()
            return True, "Code successfully used"
        except Exception as e:
            db.session.rollback()
            return False, f"Error using code: {str(e)}"

    def to_dict(self):
        """
        Convert refer code object to dictionary
        
        Returns:
            dict: Dictionary representation of the refer code
        """
        return {
            'id': self.id,
            'name': self.name,
            'refer_code': self.refer_code,
            'description': self.refer_code_description,
            'total_number': self.total_number,
            'used_count': self.number_refer_code_used,
            'expiration_date': self.refer_code_expiration_date.isoformat() if self.refer_code_expiration_date else None,
            'creation_date': self.refer_code_creation_date.isoformat(),
            'activation_plan': self.refer_code_activation_plan,
            'total_cost': self.refer_code_total_cost,
            'is_valid': self.is_valid()
        }

