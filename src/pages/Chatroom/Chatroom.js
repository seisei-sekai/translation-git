import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setGlobalState, getGlobalState } from '../../globalState';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './Chatroom.css';

const local_url = process.env.REACT_APP_BACKEND_URL;

function Chatroom() {
  const { t } = useTranslation();
  const [chatrooms, setChatrooms] = useState([]);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [newChatroomPassword, setNewChatroomPassword] = useState('');
  const [enterChatroomId, setEnterChatroomId] = useState('');
  const [enterChatroomPassword, setEnterChatroomPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${local_url}/api/user-info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((response) => {
        setGlobalState('isLoggedIn', true);
        fetchChatrooms();
      })
      .catch((error) => {
        console.log("User info fetch error:", error);
        setGlobalState('isLoggedIn', false);
      });
    } else {
      setGlobalState('isLoggedIn', false);
    }
  }, []);

  const fetchChatrooms = () => {
    console.log('Environment Variables:', {
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
    });
    console.log('Current Chatroom:', {
      id: getGlobalState('currChatroomId'),
      name: getGlobalState('currChatroomName'),
      userId: getGlobalState('currUserId'),
      username: getGlobalState('currUserName'),
      isLoggedIn: getGlobalState('isLoggedIn')
    });

    axios.get(`${local_url}/api/user-chatrooms/${getGlobalState('currUserId')}`)
      .then((response) => {
        setChatrooms(response.data.chatrooms);
      })
      .catch((error) => {
        console.error('Error fetching chatrooms:', error);
      });
  };

  const handleCreateChatroom = () => {
    const chatroomName = newChatroomName.trim() || t('Chatroom-{{number}}', { number: chatrooms.length + 1 });
    const chatroomPassword = newChatroomPassword.trim();
    axios.post(`${local_url}/api/create-chatroom`, {
      chatroomName: chatroomName,
      creatorId: localStorage.getItem('userId'),
      password: chatroomPassword
    })
    .then((response) => {
      setGlobalState('currChatroomId', response.data.chatroomId);
      setGlobalState('currChatroomName', chatroomName);
      setNewChatroomName('');
      setNewChatroomPassword('');
      enterChatroom(response.data.chatroomId, chatroomName, chatroomPassword);

    })
    .catch((error) => {
      console.error('Error creating chatroom:', error);
    });
  };

  const enterChatroom = (chatroomId, chatroomName, chatroomPassword = '') => {
    const userId = getGlobalState('currUserId');
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
        navigate(`/chat`);
      }
    })
    .catch((error) => {
      if (error.response && error.response.status === 403) {
        console.error(t('Incorrect password'));
      } else {
        console.error('Error joining chatroom:', error);
      }
    });
  };

  const handleEnterChatroom = () => {
    enterChatroom(enterChatroomId, '', enterChatroomPassword);
    navigate('/chat');
  };

  const joinPublicChatroom = () => {
    const publicChatroomId = 1; // You can set this to a specific ID for your public chatroom
    const publicChatroomName = 'Public Chatroom';
    enterChatroom(publicChatroomId, publicChatroomName);
  };

  return (
    <div className="chatroom-container">
      {!getGlobalState('isLoggedIn') ? (
        <>
          <h2>{t('You are not logged in')}</h2>
          <Link to="/chat">{t('Go to Chat Page')}</Link>
          <Link to="/login_page">{t('Login')}</Link>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
        </>
      ) : (
        <>
          <h2>{t('Create a Chatroom')}</h2>
          <div>
            <input
              type="text"
              placeholder={t('Enter new chatroom name (optional)')}
              value={newChatroomName}
              onChange={(e) => setNewChatroomName(e.target.value)}
            />
            <input
              type="password"
              placeholder={t('Enter password (optional)')}
              value={newChatroomPassword}
              onChange={(e) => setNewChatroomPassword(e.target.value)}
            />
            <button onClick={handleCreateChatroom}>{t('Create Chatroom')}</button>
          </div>
          <div className="empty-space"></div>
          <div>
            <h2>{t('Enter Existing Chatroom')}</h2>
            <input
              type="text"
              placeholder={t('Enter chatroom ID')}
              value={enterChatroomId}
              onChange={(e) => setEnterChatroomId(e.target.value)}
            />
            <input
              type="password"
              placeholder={t('Enter password (optional)')}
              value={enterChatroomPassword}
              onChange={(e) => setEnterChatroomPassword(e.target.value)}
            />
            <button onClick={handleEnterChatroom}>{t('Enter Chatroom')}</button>
          </div>
          <div className="empty-space"></div>
          <div>
            <h2>{t('Chatrooms History')}</h2>
            {chatrooms.length === 0 ? (
              <p>{t('No chatrooms available.')}</p>
            ) : (
              <ul>
                {chatrooms.map((chatroom) => (
                  <li key={chatroom.id}>
                    <button onClick={() => enterChatroom(chatroom.id, chatroom.name, chatroom.password)}>
                      {chatroom.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link to="/">{t('Go back to HomePage')}</Link>
          <div className="public-chatroom-container">
            <button className="join-public-btn" onClick={joinPublicChatroom}>
              {t('Join Public Chatroom')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Chatroom;
