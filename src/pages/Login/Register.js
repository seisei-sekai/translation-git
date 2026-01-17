// src/Register.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';  // Ensure this file is created for styling
import axios from 'axios';
import { useTranslation } from 'react-i18next'; // Import the hook for automatic system language detection
import { FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa'; // Add FaTimes import
import { privacyPolicyContent } from './privacyPolicy';

function Register() {
  const { t } = useTranslation();  // Destructure t function to access translations
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  // let local_url = "https://yoohi.ai";
  const local_url =process.env.REACT_APP_BACKEND_URL;
  //const local_url = "https://192.168.50.202:5002";
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  
  const validatePassword = (password) => {
    const minLength = 6; // Reduced from 8
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (password.length < minLength) return false;
    if (!hasUpperCase || !hasLowerCase) return false; // Changed AND to OR
    if (!hasNumbers) return false;
    
    return true;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateUserId = (id) => {
    const userIdRegex = /^[a-zA-Z0-9_-]{3,20}$/; // Reduced min length to 3
    return userIdRegex.test(id);
  };

  const checkPasswordStrength = (password) => {
    if (password.length < 6) return 'weak';
    const strength = {
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      isLongEnough: password.length >= 6
    };
    
    const score = Object.values(strength).filter(Boolean).length;
    if (score < 2) return 'weak';
    if (score < 3) return 'medium';
    return 'strong';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate all fields
    if (!validateUserId(userId)) {
      newErrors.userId = t('User ID must be 3-20 characters and contain only letters, numbers, underscore, or hyphen');
    }

    if (!validatePassword(password)) {
      newErrors.password = t('Password must be at least 6 characters long and contain at least one uppercase or lowercase letter, and one number');
      setPassword(''); // Clear password field
      setConfirmPassword(''); // Clear confirm password field
      setPasswordStrength(''); // Clear password strength indicator
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t("Passwords don't match");
      setPassword(''); // Clear password field
      setConfirmPassword(''); // Clear confirm password field
      setPasswordStrength(''); // Clear password strength indicator
    }

    if (!validateEmail(email)) {
      newErrors.email = t('Please enter a valid email address');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await axios.post(`${local_url}/api/register`, {
        userId,
        username,
        email,
        password,
        acceptedTerms: true, // GDPR requirement
        acceptedPrivacyPolicy: true // GDPR requirement
      });
      
      alert(t('User registered successfully'));
      navigate('/login_page');
    } catch (error) {
      const errorMessage = error.response?.data?.error;
      if (errorMessage === 'User ID or Email is already in use') {
        setErrors({ ...errors, userId: t('This User ID or Email is already in use') });
      } else {
        alert(error.response?.data?.error || t('Registration failed'));
      }
    }
  };

  // Update password strength indicator when password changes
  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(password));
  }, [password]);

  return (
    <div className="register-container dark-mode">
      <div className="register-box">
        <h1>{t('Register')}</h1>
        <form onSubmit={handleRegister}>
          <input
            className={`input-register ${errors.username ? 'invalid' : ''}`}
            type="text"
            placeholder={t('Nickname')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <div className="validation-message-register">{errors.username}</div>

          <input
            className={`input-register ${errors.userId ? 'invalid' : ''}`}
            type="text"
            placeholder={t('User ID (4-20 characters)')}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <div className="validation-message-register">{errors.userId}</div>

          <div className="password-input-container-register">
            <input
              className={`input-register ${errors.password ? 'invalid' : ''}`}
              type={showPassword ? "text" : "password"}
              placeholder={t('Password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-register"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {password && (
            <div className={`password-strength-register ${passwordStrength}`}>
              {t(`Password strength: ${passwordStrength}`)}
            </div>
          )}
          <div className="validation-message-register">{errors.password}</div>

          <div className="password-input-container-register">
            <input
              className={`input-register ${errors.confirmPassword ? 'invalid' : ''}`}
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t('Confirm Password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-register"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex="-1"
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <div className="validation-message-register">{errors.confirmPassword}</div>

          <input
            className={`input-register ${errors.email ? 'invalid' : ''}`}
            type="email"
            placeholder={t('Email Address')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="validation-message-register">{errors.email}</div>

          <div className="gdpr-consent-register">
            <label>
              <input type="checkbox" required />
              {t('I accept the ')}
              <span 
                className="policy-link" 
                onClick={() => setShowPolicyModal(true)}
              >
                {t('Terms of Service')}
              </span>
              {' '}{t('and')}{' '}
              <span 
                className="policy-link" 
                onClick={() => setShowPolicyModal(true)}
              >
                {t('Privacy Policy')}
              </span>
            </label>
          </div>

          <button type="submit" className="register-btn">{t('Register')}</button>
        </form>

        <div className="link-container">
          <Link to="/chat" className="link-btn">{t('Go back to Main Page')}</Link>
        </div>
      </div>

      {/* Combined Policy Modal */}
      {showPolicyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="modal-close" 
              onClick={() => setShowPolicyModal(false)}
            >
              <FaTimes />
            </button>
            <div className="modal-body">
              <div dangerouslySetInnerHTML={{ __html: privacyPolicyContent }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
