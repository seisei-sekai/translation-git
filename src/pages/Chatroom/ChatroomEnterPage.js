import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGlobalState, setGlobalState } from '../../globalState';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import axios from 'axios';
import './ChatroomEnterPage.css';
import { useTranslation } from 'react-i18next';
const local_url = process.env.REACT_APP_BACKEND_URL;
const ChatroomEnterPage = () => {
  const { t } = useTranslation();
  const { chatroomIdCoded } = useParams();
  const [chatroomId, setChatroomId] = useState(1);
  const [chatroomName, setChatroomName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Collect user device info
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
    return userInfo;
  };

  useEffect(() => {
    // Fetch chatroom name when component mounts
    const fetchChatroomName = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/chatroom-guest/${chatroomIdCoded}`);
        setChatroomName(response.data.name);
        setChatroomId(response.data.id); // Set the numeric chatroom ID
      } catch (error) {
        setError(t('Failed to fetch chatroom information'));
      }
    };

    fetchChatroomName();
  }, [chatroomId]);

  const enterChatroom = (chatroomId, chatroomName, chatroomPassword = '') => {
    const userId = getGlobalState('currUserId');
    setGlobalState('is_chatroom_private', false); // Set to false for regular chatrooms
    
    axios.post(`${local_url}/api/join-chatroom`, {
      userId: userId,
      chatroomId: chatroomId,
      password: chatroomPassword
    })
    .then((response) => {
      if (response.status === 200) {
        setGlobalState('currChatroomId', chatroomId);
        setGlobalState('currChatroomName', chatroomName);
        console.log('Entering chatroom with ID:', chatroomId);
        console.log('Entering chatroom with Name:', chatroomName);
        
        // Use window.location.href to force a full page refresh
        window.location.href = `${window.location.origin}/chat`;
      }
    })
    .catch((error) => {
      if (error.response && error.response.status === 403) {
        console.error(t('Incorrect password'));
      } else {
        console.error(t('Error joining chatroom'), error);
      }
    });
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    const isLoggedIn = getGlobalState('isLoggedIn');

    if (!isLoggedIn) {
      try {
        // First check if chatroom allows guest entry
        const response = await axios.post(`${local_url}/api/join-chatroom-guest`, {
          chatroomId,
          password
        });

        if (response.data.success) {
          // Set guest mode states
          console.log('BBBB:', {
            chatroomId,
            chatroomName,
            password
          });
          setGlobalState('isGuestMode', true);
          setGlobalState('currHostUserId', response.data.creatorUserId);
          
          // Set join/leave times
          const joinTime = new Date();
          const leaveTime = new Date(joinTime.getTime() + (10 * 1000)); // 30 seconds later
          
          setGlobalState('GuestJoinTime', joinTime.toISOString());
          setGlobalState('GuestLeaveTime', leaveTime.toISOString());

          // Create guest user
          const newUserId = uuidv4();
          const newUsername = `User_${newUserId.slice(0, 6)}`;
          console.log('NNNN:', {
            userId: newUserId,
            username: newUsername
          });

          // Register guest user
          axios.post(`${local_url}/api/register`, {
            userId: newUserId,
            username: newUsername, 
            email: `${newUserId}@guest_yoohi.com`,
            password: newUserId,
            isGuestMode: true,
            hostUserId: response.data.creatorUserId
          })
          .then(() => {
            // Login guest user
            const userInfo = collectUserInfo();
            return axios.post(`${local_url}/api/login`, {
              userIdOrEmail: newUserId,
              password: newUserId,
              deviceInfo: userInfo
            });
          })
          .then(response => {
            console.log('LLLLLL', {
              userId: newUserId,
              username: newUsername
            });
            setGlobalState('token', response.data.token);
            setGlobalState('currUserId', newUserId);
            setGlobalState('currUserName', newUsername);
            setGlobalState('currUserAvatar', response.data.user_avatar);
            setGlobalState('isLoggedIn', true);  // Set logged in status
            // Enter chatroom with guest user
            enterChatroom(chatroomId, chatroomName, password);
          });
        }
      } catch (error) {
        if (error.response?.data?.error === 'guests_not_allowed') {
          setError(t('This chatroom does not allow guest access'));
        } else {
          setError(error.response?.data?.error || t('Failed to join chatroom'));
        }
      }
    } else {
      // Existing logic for registered users
      console.log('AAAA:', {
        userId: getGlobalState('currUserId'),
        username: getGlobalState('currUserName')
      });
      enterChatroom(chatroomId, chatroomName, password);
    }
  };

  return (
    <div className="chatroom-enter-container">
      <div className="chatroom-enter-content">
        <img
          src={`${process.env.PUBLIC_URL}/Cut.png`}
          alt={t("Chatroom Icon")}
          className="chatroom-enter-icon"
        />
        <h1 className="chatroom-enter-title">{t("Enter Yoohi Chatroom:")}{chatroomName}</h1>
        {error && <p className="chatroom-enter-error">{error}</p>}
        <form onSubmit={handleSubmit} className="chatroom-enter-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("Enter chatroom password (Optional)")}
            className="chatroom-enter-input"
          />
          <button type="submit" className="chatroom-enter-button">{t("Join Chatroom")}</button>
        </form>
      </div>
    </div>
  );
};

export default ChatroomEnterPage;
