import React, { useState, useEffect, useCallback } from 'react';
import './Notification.css';
import { useTranslation } from 'react-i18next';
import { getGlobalState } from '../../globalState';
import io from 'socket.io-client';

const Notification = ({ menuVisible, onClose }) => {
  const { t } = useTranslation();
  const [notificationList, setNotificationList] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const currUserId = getGlobalState('currUserId');
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const token = getGlobalState('token');

  const handleClickInside = useCallback((e) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    // Fetch existing notifications when component mounts
    if (currUserId && token) {
      fetchNotifications();
    }

    // Set up Socket.IO connection for real-time notifications
    const socket = io(backendUrl);
    socket.on(`new_notification`, (notification) => {
      setNotificationList(prev => [notification, ...prev]);
    });

    // Add click event listener to handle clicks outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-menu')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      socket.disconnect();
      document.removeEventListener('click', handleClickOutside);
    };
  }, [currUserId, token, onClose]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setNotificationList(data.notifications);
    } catch (error) {
      console.error(t('Error fetching notifications'), error);
    }
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    try {
      await fetch(`${backendUrl}/api/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setNotificationList([]);
    } catch (error) {
      console.error(t('Error marking notifications as read'), error);
    }
  };

  const formatTime = (timestamp) => {
    // Parse the UTC timestamp and create a Date object
    const date = new Date(timestamp + 'Z'); // Ensure UTC interpretation by adding 'Z'
    
    return date.toLocaleString([], { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'  // Shows timezone abbreviation
    });
  };

  const handleNotificationClick = (notification, e) => {
    e.stopPropagation();
    setSelectedNotification(notification);
  };

  const closeModal = (e) => {
    if (e) e.stopPropagation();
    setSelectedNotification(null);
  };

  return (
    <>
      <div 
        className={`notification-menu ${menuVisible ? 'show' : ''}`}
        onClick={handleClickInside}
      >
        <div className="notification-menu-header">
          {t('Notifications')}
        </div>
        <div className="notification-list">
          {notificationList.length === 0 ? (
            <div className="notification-item">
              <div className="notification-content">
                {t('No new notifications')}
              </div>
            </div>
          ) : (
            notificationList.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.type}`}
                onClick={(e) => handleNotificationClick(notification, e)}
              >
                <div className="notification-title">
                  {notification.title}
                </div>
                <div className="notification-content">
                  {notification.body}
                </div>
                <div className="notification-time">
                  {formatTime(notification.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="notification-menu-footer">
          <button 
            className="clear-notifications"
            onClick={handleClearAll}
          >
            {t('Clear all')}
          </button>
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="notification-modal-overlay" onClick={closeModal}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-header">
              <span>{t('Notification Details')}</span>
              <button className="modal-close-button" onClick={closeModal}>×</button>
            </div>
            <div className="notification-modal-content">
              <div className={`notification-modal-item ${selectedNotification.type}`}>
                <div className="notification-modal-title">
                  {selectedNotification.title}
                </div>
                <div className="notification-modal-body">
                  {selectedNotification.body}
                </div>
                <div className="notification-modal-time">
                  {formatTime(selectedNotification.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notification;
