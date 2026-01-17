// src/pages/Profile/Profile_public.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './Profile.css';

const local_url = process.env.REACT_APP_BACKEND_URL;

function ProfilePublic() {
  const { t } = useTranslation();
  const { userId } = useParams(); // Get the userId from the route
  console.log("Extracted userId:", userId);  // Add this to verify if userId is being passed correctly
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch public user info using the userId from the URL
    axios.get(`${local_url}/api/public-user-info/${userId}`)
      .then(response => {
        setUser(response.data);
      })
      .catch(error => {
        console.error('Error fetching public user info:', error);
        setError(t('User not found'));
      });
  }, [userId]);

  return (
    <div className="profile-container">
      <h1>{t('Public Profile')}</h1>

      {error ? (
        <p>{error}</p>
      ) : user ? (
        <div>
          <h2>{user.username}</h2>
          <img src={user.avatar} alt={t('{{username}}\'s avatar', { username: user.username })} className="profile-public-avatar" />
          
          <div className="profile-description">
            <h3>{t('About')}</h3>
            <p>{user.description || t('No description available.')}</p>
          </div>
        </div>
      ) : (
        <p>{t('Loading...')}</p>
      )}

      {/* Link back to the main page */}
      <Link to="/chat" className="profile-link">{t('Back to Main Page')}</Link>
    </div>
  );
}

export default ProfilePublic;
