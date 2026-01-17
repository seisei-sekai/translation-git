// src/Login.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';  // Ensure this file is created for styling
import axios from 'axios';
import { useTranslation } from 'react-i18next';  // Import the hook for automatic system language detection
import { setGlobalState, getGlobalState } from '../../globalState';
import Logout from './Logout';  // Import the Logout component

function Login() {
  const { t } = useTranslation();  // Destructure t function to access translations
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();  // Initialize useNavigate
  // Use environment variable or default to localhost for development
  // In production, set REACT_APP_API_URL environment variable
  // let local_url = process.env.REACT_APP_API_URL || "http://localhost:5002";
  //const local_url = "http://localhost:5002";
  const local_url =process.env.REACT_APP_BACKEND_URL;


  const FetchLastRoom = () => {
    const storedUserId = getGlobalState('currUserId');
    if (storedUserId) {
      axios.get(`${local_url}/api/last-used-chatroom/${storedUserId}`)
        .then(response => {
          const lastUsedChatroomId = response.data.last_used_chatroom_id;
          const chatroomName = response.data.name;
          const isPrivate = response.data.is_private === '1';  // Convert string to boolean
          
          setGlobalState('currChatroomId', lastUsedChatroomId);
          setGlobalState('currChatroomName', chatroomName);
          setGlobalState('is_chatroom_private', isPrivate);
        })
        .catch(error => {
          console.error(t('Error fetching chatroom details:'), error);
        });
    }
  };

  const collectUserInfo = () => {
    const userInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredLanguages: navigator.languages,
      doNotTrack: navigator.doNotTrack,
      cookiesEnabled: navigator.cookieEnabled,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      touchPoints: navigator.maxTouchPoints,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connectionType: navigator.connection ? navigator.connection.effectiveType : null,
      timestamp: new Date().toISOString()
    };
    // console.log(t('User Info:'), userInfo);
    return userInfo;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const userInfo = collectUserInfo();
    
    axios.post(`${local_url}/api/login`, { 
      userIdOrEmail: userId,
      password,
      deviceInfo: userInfo
    })
    .then(response => {
      // Clear all old user data
      localStorage.clear();
      
      // Set new user data
      setGlobalState('isLoggedIn', true);
      setGlobalState('token', response.data.token);
      setGlobalState('currUserId', response.data.userId);
      setGlobalState('currUserName', response.data.username);
      setGlobalState('currUserAvatar', response.data.user_avatar);
      
      // Reset chatroom to default before fetching last room
      setGlobalState('currChatroomId', '0');
      setGlobalState('currChatroomName', 'Public Chatroom');
      setGlobalState('is_chatroom_private', false);
      setGlobalState('isCreator', false);
      
      // Reset guest mode states
      setGlobalState('isGuestMode', false);
      setGlobalState('currHostUserId', null);
      setGlobalState('GuestJoinTime', null);
      setGlobalState('GuestLeaveTime', null);
      
      // Now fetch the new user's last room
      FetchLastRoom();
      navigate('/chat');
      window.location.reload();
    })
    .catch(error => {
      console.error(t('Error fetching chatroom details:'), error);
      alert(t('Invalid credentials'));
    });
  };
  // Add this function to clear localStorage

  // Declare handleGoogleCallback before using it
  const handleGoogleCallback = (response) => {
    const userInfo = collectUserInfo();
    
    axios.post(`${local_url}/api/auth/google/callback`, {
      credential: response.credential,
      deviceInfo: userInfo
    })
    .then(response => {
      if (response.data.exists) {
        // User exists, proceed with login
        localStorage.clear();
        
        // Set new user data
        setGlobalState('token', response.data.token);
        setGlobalState('currUserId', response.data.userId);
        setGlobalState('currUserName', response.data.username);
        setGlobalState('currUserAvatar', response.data.user_avatar);
        setGlobalState('isLoggedIn', true);
        
        // Reset chatroom to default before fetching last room
        setGlobalState('currChatroomId', '0');
        setGlobalState('currChatroomName', 'Public Chatroom');
        setGlobalState('is_chatroom_private', false);
        setGlobalState('isCreator', false);
        
        // Reset guest mode states
        setGlobalState('isGuestMode', false);
        setGlobalState('currHostUserId', null);
        setGlobalState('GuestJoinTime', null);
        setGlobalState('GuestLeaveTime', null);
        
        // Now fetch the new user's last room
        FetchLastRoom();
        navigate('/chat');
        window.location.reload();
      } else {
        // Generate new userId and username without relying on global state
        const timestamp = Date.now();
        const userId = `user_${timestamp}`;
        const username = `user_${timestamp.toString().slice(-4)}`;
        
        axios.post(`${local_url}/api/register_google_email`, {
          email: response.data.email,
          userId: userId,  // Use generated userId
          username: username  // Use generated username
        })
        .then(registerResponse => {
          // Set global state after successful registration
          // setGlobalState('currUserId', userId);
          // setGlobalState('currUserName', username);
          
          // Continue with login...
          return axios.post(`${local_url}/api/login`, {
            userIdOrEmail: response.data.email,
            password: registerResponse.data.password,
            isGoogleLogin: true,
            deviceInfo: userInfo
          });
        })
        .then(loginResponse => {
          // console.log('Login successful:', loginResponse.data);
          setGlobalState('token', loginResponse.data.token);
          setGlobalState('currUserId', loginResponse.data.userId);
          setGlobalState('currUserName', loginResponse.data.username);
          setGlobalState('currUserAvatar', loginResponse.data.user_avatar);
          setGlobalState('isLoggedIn', true);
          handlePrivateChatroom();
          navigate('/chat');
          window.location.reload();
        })
        .catch(error => {
          console.error('Registration/Login error:', error.response?.data || error);
          alert(t('Registration failed. Please try again.'));
        });
      }
    })
    .catch(error => {
      console.error(t('Google login failed'));
      alert(t('Google login failed'));
    });
  };


  const handlePrivateChatroom = () => {
    const token = getGlobalState('token');
    if (!token) {
      console.error(t('User not logged in'));
      return;
    }

    axios.post(`${local_url}/api/private-chatroom`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((response) => {
      const { chatroomId, chatroomName } = response.data;
      setGlobalState('currChatroomId', chatroomId);
      setGlobalState('currChatroomName', chatroomName);
      setGlobalState('is_chatroom_private', true); // Set to true for private chatroom
      window.location.href = `${window.location.origin}/chat`;
    })
    .catch((error) => {
      console.error(t('Error accessing private chatroom:'), error);
    });
  };

  // Initialize Google Sign-In
  useEffect(() => {
    // Create a script element
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Initialize Google Sign-In after the script loads
      window.google.accounts.id.initialize({
        client_id: "572969509362-pem0hqvo8kplp2h21gl15erpggv4k6ut.apps.googleusercontent.com",
        callback: handleGoogleCallback
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleButton"),
        { 
          theme: "outline", 
          size: "large",
          type: "standard",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left"
        }
      );

      // Optionally display the One Tap dialog
      window.google.accounts.id.prompt();
    };

    // Add the script to the document
    document.body.appendChild(script);

    // Cleanup
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="login-container dark-mode">
      <div className="login-box">
        <h1>{t('Login')}</h1>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder={t('User ID or Email')}
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
          <button type="submit" className="login-btn">{t('Login')}</button>
        </form>

        <div className="link-container">
          <div id="googleButton"></div>
          <Link to="/register_page" className="link-btn">
            {t("Don't have an account? Register")}
          </Link>

          <Link to="/" className="link-btn">
            {t('Go back to Main Page')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
