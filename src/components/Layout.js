import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/AppSideBarStyle.css';
import { useSidebar } from '../contexts/SidebarContext'; // Import the useSidebar hook
import globalState, { setGlobalState, getGlobalState } from '../globalState'; // Add this import
import './Layout.css';


function Layout({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(old => old + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { showSidebar, toggleSidebar, showMenuButton } = useSidebar();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleSidebarItemClick = (route) => {
    navigate(route);
    toggleSidebar(); // Close sidebar after navigation
  };

  const handleLanguageChange = (event) => {
    const selectedLanguage = event.target.value;
    let languageToSet;
    
    if (selectedLanguage === 'system') {
      languageToSet = navigator.language;
      i18n.changeLanguage(languageToSet);
    } else {
      languageToSet = selectedLanguage;
      i18n.changeLanguage(languageToSet);
    }

    // Store the language in globalState
    setGlobalState('uiLanguage', languageToSet);
  };

  return (
    <div className="layout">
      {/* Conditionally render the Menu Button */}
      {showMenuButton && (
        <button 
          className={`button-top-left-menu ${showSidebar ? 'active' : ''}`} 
          onClick={toggleSidebar} 
          aria-label="Menu"
        />
      )}

      <div className={showSidebar ? "sidebar open" : "sidebar"}>
        <ul>

          <li onClick={() => handleSidebarItemClick('/chat')}>{t('Chat')}</li>
          {/* <li onClick={() => handleSidebarItemClick('/chatroom')}>{t('Chatrooms')}</li> */}
          {/* <li onClick={() => handleSidebarItemClick('/walkietalkie')}>{t('Walkie Talkie')}</li> */}
          {/* <li onClick={() => handleSidebarItemClick('/profile')}>{t('Profile')}</li>
          <li onClick={() => handleSidebarItemClick('/login_page')}>{t('Login')}</li> */}
          {/* <li onClick={() => handleSidebarItemClick('/class')}>{t('Class')}</li> */}

          {/* <li onClick={() => handleSidebarItemClick('/map')}>{t('Map')}</li> */}
          <li onClick={() => handleSidebarItemClick('/myplan')}>{t('My Plan')}</li>
          <li onClick={() => handleSidebarItemClick('/landingpage')}>{t('Official Site')}</li>
          {/* <li onClick={() => handleSidebarItemClick('/japan')}>{t('J-Life')}</li> */}
          {/* <li onClick={() => handleSidebarItemClick('/dashboard_admin')}>{t('Admin Dashboard')}</li>
          <li onClick={() => handleSidebarItemClick('/debug')}>{t('Debug_admin')}</li> */}
          {/* Add other sidebar items here */}
        </ul>

        {/* Only show GlobalState Display if isDebugPanelOn is true */}
        {getGlobalState('isDebugPanelOn') && (
          <div className="global-state-display">
            <div className="global-state-header">
              <p className="global-state-title">Global State:</p>
              <button 
                className="refresh-button" 
                onClick={() => setRefreshKey(old => old + 1)}
                title="Auto-refreshing every 1s"
              >
                ⟳
              </button>
            </div>
            <div className="global-state-items">
              {Object.entries({...globalState}).map(([key, value]) => (
                <div key={`${key}-${refreshKey}`} className="global-state-item">
                  <span className="global-state-key">{key}:</span>
                  <span className="global-state-value">
                    {value === null ? 'null' : value === undefined ? 'undefined' : value.toString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-language-selector">
          <p>{t('UI Language')}</p>
          <select 
            id="language-select" 
            onChange={handleLanguageChange} 
            value={i18n.language === navigator.language ? 'system' : i18n.language}
          >
            <option value="system">{t('System Language')}</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ar">العربية</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="ru">Русский</option>
            <option value="pt">Português</option>
            <option value="de">Deutsch</option>
            <option value="hi">हिन्दी</option>
            <option value="bn">বাংলা</option>
            <option value="ko">한국어</option>
            <option value="it">Italiano</option>
            <option value="tr">Türkçe</option>
            <option value="vi">Tiếng Việt</option>
            <option value="nl">Nederlands</option>
            {/* Add other language options here */}
          </select>
        </div>
      </div>

      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default Layout;
