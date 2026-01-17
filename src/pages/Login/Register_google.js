import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './Register.css';
import { setGlobalState } from '../../globalState';


function RegisterGoogle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    // Get email from URL parameters
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const local_url = process.env.REACT_APP_BACKEND_URL;

  const handleRegister = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert(t("Passwords don't match!"));
      return;
    }

    axios.post(`${local_url}/api/register`, {
      userId,
      username,
      email,
      password,
      isGoogleAuth: true
    })
      .then(response => {
        alert(t('User registered successfully'));
        // After successful registration, log the user in automatically
        return axios.post(`${local_url}/api/login`, { userId, password });
      })
      .then(response => {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', username);
        setGlobalState('isLoggedIn', true);
        navigate('/chat');
        window.location.reload();
      })
      .catch(error => {
        alert(error.response?.data?.error || t('Registration failed'));
      });
  };

  return (
    <div className="register-container dark-mode">
      <div className="register-box">
        <h1>{t('Complete Registration')}</h1>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder={t('Nickname')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={t('User ID (for login)')}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('Password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t('Confirm Password')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder={t('Email Address')}
            value={email}
            readOnly
            disabled
          />
          <button type="submit" className="register-btn">{t('Complete Registration')}</button>
        </form>
      </div>
    </div>
  );
}

export default RegisterGoogle;
