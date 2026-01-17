import React from 'react';
import { useTranslation } from 'react-i18next';
import './WelcomePage.css';



const WelcomePage = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="welcome-page dark" onClick={onClose}>
      <div className="content">
        <img 
          src={`${process.env.PUBLIC_URL}/Cut.png`} 
          alt={t('Logo')} 
          className="logo_welcome"
        />
        <h1 className="product-name">Yoohi</h1>
        <p className="slogan">{t('Chat in your Mother Language')}</p>
        <p className="empowered-by-ai">{t('Empowered by AI')}</p>
        <p className="click-anywhere">{t('Click anywhere to continue')}</p>
      </div>
    </div>
  );
};

export default WelcomePage;
