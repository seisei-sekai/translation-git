// src/Profile.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setGlobalState, getGlobalState } from '../../globalState';
import { useTranslation } from 'react-i18next';
import './Profile.css';

// Fetch the backend URL from environment variables
const local_url = process.env.REACT_APP_BACKEND_URL;

function Profile() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [newAvatar, setNewAvatar] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null); // State for user avatar
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [updatedUsername, setUpdatedUsername] = useState(''); // State to store the new username
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [userDescription, setUserDescription] = useState('');
  const [descriptionSuccess, setDescriptionSuccess] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const navigate = useNavigate();

  // Fetch user information if logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
  
    if (token) {
      axios.get(`${local_url}/api/user-info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((response) => {
        setUser(response.data);
        setUpdatedUsername(response.data.username);
        setUserDescription(response.data.description || '');
      })
      .catch((error) => {
        console.log("User info fetch error:", error);
        setUser(null);
      });
    } else {
      setUser(null);
    }
  }, []);
  
    // Function to fetch user's avatar
    const fetchAvatar = async () => {
      try {
        const response = await axios.get(`${local_url}/api/avatar/${getGlobalState('currUserId')}`);
        if (response.data.user_avatar) {
          setUserAvatar(`${local_url}/uploads/avatars/${response.data.user_avatar}`);
          setGlobalState('currUserAvatar', response.data.user_avatar);
        } else {
          setUserAvatar(`${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`); // Set default avatar if none is found
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
        setUserAvatar(`${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`); // Set default avatar on error
      }
    };

  // Call fetchAvatar when user data is loaded
  useEffect(() => {
    if (user) {
      fetchAvatar();
    }
  }, [user]);

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    e.preventDefault();
    if (!newAvatar) {
      alert(t('Please select an image to upload.'));
      return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('avatar', newAvatar);
    

    try {
      await axios.post(`${local_url}/api/upload-avatar`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadSuccess(true);
      fetchAvatar();
    } catch (error) {
      console.log('Avatar upload failed:', error);
      setUploadSuccess(false);
    }
  };

  const handleUsernameEdit = () => {
    setIsEditingUsername(true);
  };

  const handleUsernameChange = (e) => {
    setUpdatedUsername(e.target.value);
  };

  const saveUpdatedUsername = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${local_url}/api/update-username`, {
        user_id: getGlobalState('currUserId'),
        new_username: updatedUsername
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Update user state
      setUser(prevUser => ({ ...prevUser, username: updatedUsername }));
      
      // Update global state
      setGlobalState('currUserName', updatedUsername);
  
      // Update localStorage
      localStorage.setItem('username', updatedUsername);
  
      // Stop editing and show success message
      setIsEditingUsername(false);
      setUpdateSuccess(true);
    } catch (error) {
      console.log('Username update failed:', error);
      setUpdateSuccess(false);
    }
  };

  const handlePasswordEdit = () => {
    setIsEditingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordChange = async () => {
    // Reset error and success states
    setPasswordError('');
    setPasswordSuccess(false);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError(t('New passwords do not match'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('Password must be at least 6 characters long'));
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${local_url}/api/change-password`,
        {
          oldPassword: oldPassword,
          newPassword: newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Clear form and show success message
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsEditingPassword(false);
      setPasswordSuccess(true);
    } catch (error) {
      setPasswordError(t(error.response?.data?.error || 'Failed to change password'));
    }
  };

  const handleDescriptionEdit = () => {
    setIsEditingDescription(true);
    setDescriptionSuccess(false);
  };

  const saveUpdatedDescription = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${local_url}/api/edit-user-description`, {
        description: userDescription
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsEditingDescription(false);
      setDescriptionSuccess(true);
    } catch (error) {
      console.log('Description update failed:', error);
      setDescriptionSuccess(false);
    }
  };

  // Add new useEffect to check subscription status
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${local_url}/api/check-subscription-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsSubscriptionActive(response.data.hasActiveSubscription);
        setSubscriptionDetails(response.data.subscriptionDetails);
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };

    checkSubscriptionStatus();
  }, []);

  // Add new function to handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${local_url}/api/cancel-subscription`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setCancelSuccess(true);
        setIsSubscriptionActive(false);
        // Refresh subscription details
        const statusResponse = await axios.get(`${local_url}/api/check-subscription-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptionDetails(statusResponse.data.subscriptionDetails);
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  // Add new function to handle account deletion
  const handleDeleteAccount = async () => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(t('Are you sure you want to delete your account? This will also cancel any active subscriptions and cannot be undone.'));
    
    if (isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${local_url}/api/delete-account`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          // Clear all storage
          localStorage.clear();
          
          // Navigate to chat page
          navigate('/chat');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        alert(t('Failed to delete account. Please try again.'));
      }
    }
  };

  return (
    <div className="profile-container">
      <h1>{t('Welcome to your profile')}</h1>
  
      {user ? (
        <div>
          <h2>{t('Hello, {{name}}', { name: getGlobalState('currUserName') })}</h2>
          <div className="profile-avatar-container">
            <img 
              src={userAvatar} 
              alt={t('User Avatar')} 
            />
          </div>
          <div className="profile-user-details">
            <h3>{t('User Details')}</h3>
            <p><strong>{t('User ID')}:</strong> {user.user_id}</p>
            <p><strong>{t('Email')}:</strong> {user.email}</p>
            <p><strong>{t('Tokens')}:</strong> {user.tokens}</p>
            <p><strong>{t('Plan ID')}:</strong> {user.plan_id}</p>
          </div>
  
          <div className="profile-avatar-edit">
            <h3>{t('Avatar Settings')}</h3>
            <form className="profile-avatar-upload-form" onSubmit={handleAvatarUpload}>
              <div className="file-input-wrapper">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={(e) => setNewAvatar(e.target.files[0])} 
                />
              </div>
              <div className="avatar-buttons">
                <button type="submit">{t('Upload New Avatar')}</button>
              </div>
            </form>
            {uploadSuccess && <p className="profile-upload-success">{t('Avatar uploaded successfully!')}</p>}
          </div>
  

          <div className="profile-username-edit">
            <h3>{t('Edit Username')}</h3>
            {isEditingUsername ? (
              <div>
                <input
                  type="text"
                  value={updatedUsername}
                  onChange={handleUsernameChange}
                />
                <button onClick={saveUpdatedUsername}>{t('Save Username')}</button>
                <button className="profile-username-edit-cancel" onClick={() => setIsEditingUsername(false)}>{t('Cancel')}</button>
              </div>
            ) : (
              <div>
                <p><strong>{t('Username')}:</strong> {user.username}</p>
                <button onClick={handleUsernameEdit}>{t('Edit Username')}</button>
              </div>
            )}
            {updateSuccess && <p className="profile-username-success">{t('Username updated successfully!')}</p>}
          </div>

          <div className="profile-description-edit">
            <h3>{t('About Me')}</h3>
            {isEditingDescription ? (
              <div>
                <textarea
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder={t('Write something about yourself (max 500 characters)')}
                />
                <div className="description-buttons">
                  <button onClick={saveUpdatedDescription}>{t('Save Description')}</button>
                  <button 
                    className="profile-description-edit-cancel" 
                    onClick={() => setIsEditingDescription(false)}
                  >
                    {t('Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="user-description">{userDescription || t('No description added yet.')}</p>
                <button onClick={handleDescriptionEdit}>{t('Edit Description')}</button>
              </div>
            )}
            {descriptionSuccess && (
              <p className="profile-description-success">{t('Description updated successfully!')}</p>
            )}
          </div>

          <div className="profile-password-edit">
            <h3>{t('Password Settings')}</h3>
            {isEditingPassword ? (
              <div className="password-change-form">
                {user.is_password_randomly_generated === '0' && (
                  <div className="password-input-group">
                    <label>{t('Current Password')}:</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                      >
                        {showOldPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="password-input-group">
                  <label>{t('New Password')}:</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="password-input-group">
                  <label>{t('Confirm New Password')}:</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                {passwordError && <p className="error-message">{passwordError}</p>}
                
                <div className="password-buttons">
                  <button onClick={handlePasswordChange}>
                    {user.is_password_randomly_generated === '1' 
                      ? t('Create Password') 
                      : t('Change Password')}
                  </button>
                  <button 
                    className="profile-password-edit-cancel" 
                    onClick={() => setIsEditingPassword(false)}
                  >
                    {t('Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={handlePasswordEdit}>
                  {user.is_password_randomly_generated === '1' 
                    ? t('Create Password') 
                    : t('Change Password')}
                </button>
              </div>
            )}
            {passwordSuccess && (
              <p className="profile-password-success">
                {t('Password updated successfully!')}
              </p>
            )}
          </div>

          <div className="profile-subscription-status">
            <h3>{t('Subscription Status')}</h3>
            {subscriptionDetails ? (
              <div>
                <p><strong>{t('Current Plan')}:</strong> {subscriptionDetails.planType}</p>
                <p><strong>{t('Status')}:</strong> {subscriptionDetails.status}</p>
                {subscriptionDetails.planType !== 'basic' && (
                  <>
                    {subscriptionDetails.currentPeriodEnd && (
                      <p>
                        <strong>{t('Current Period End')}:</strong> {
                          new Date(subscriptionDetails.currentPeriodEnd * 1000).toLocaleDateString()
                        }
                      </p>
                    )}
                    {isSubscriptionActive && subscriptionDetails.status === 'active' && (
                      <button 
                        className="cancel-subscription-button"
                        onClick={handleCancelSubscription}
                      >
                        {t('Cancel Subscription')}
                      </button>
                    )}
                  </>
                )}
                {cancelSuccess && (
                  <p className="success-message">
                    {t('Subscription successfully cancelled. You will have access until the end of your current billing period.')}
                  </p>
                )}

              </div>
            ) : (
              <p>{t('No active subscription')}</p>
            )}
          </div>
          <div>

                <button 
                  className="profile-link" 
                  onClick={handleDeleteAccount}
                  style={{ 
                    backgroundColor: 'black',
                  }}
                >
                  {t('Delete Account')}
                </button>
          </div>

        </div>
      ) : (
        <div className="profile-not-logged-in">
          <h2>{t('You are not logged in')}</h2>
        </div>
      )}

      <Link className="profile-link" to="/chat">{t('Go back to HomePage')}</Link>
      <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
          <div className="empty-space"></div>
    </div>
  );
}

export default Profile;
