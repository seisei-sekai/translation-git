import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Logout.css';
import { useTranslation } from 'react-i18next';  // Import the hook for i18n
import { setGlobalState } from '../../globalState';

function Logout() {
  const { t } = useTranslation();  // Destructure t function to access translations
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('accountName');
    setGlobalState('isLoggedIn', false);
    alert(t('Logged out successfully'));  // Use i18n translation for the alert message
    navigate('/login_page');  // Redirect to login page
  };

  const local_url = process.env.REACT_APP_API_URL || window.location.origin;
  const clearLocalStorage = () => {
    // Clear all localStorage
    localStorage.clear();
    
    // Reset all global state to defaults
    setGlobalState('currChatroomId', '0');
    setGlobalState('currChatroomName', 'Public Chatroom');
    setGlobalState('currChatroomCode', '');
    setGlobalState('currUserId', null);
    setGlobalState('currUserName', null);
    setGlobalState('currUserAvatar', `${local_url}/user_avatar/default_avatar_1.png`);
    setGlobalState('isLoggedIn', false);
    setGlobalState('token', null);
    setGlobalState('isGuestMode', false);
    setGlobalState('currHostUserId', null);
    setGlobalState('GuestJoinTime', null);
    setGlobalState('GuestLeaveTime', null);
    setGlobalState('is_chatroom_private', false);
    setGlobalState('isCreator', false);
    setGlobalState('selectedLanguageMe', 'English');
    setGlobalState('selectedLanguageMeFirst', 'English');
    setGlobalState('selectedLanguageMeSecond', 'English');
    setGlobalState('selectedLanguageMePreview', 'English');
    setGlobalState('initialRenderRef', true);
    
    alert(t('Logged out successfully'));
    navigate('/chat');
  };
  return (
    <div className="logout-container">
      <button
        className="logout-btn-clear-storage"
        onClick={clearLocalStorage}
      >
        {t('Logout')}
      </button>
      {/* <button onClick={handleLogout} className="logout-btn">
        {t('Logout')}
      </button> */}
    </div>
  );
}

export default Logout;
