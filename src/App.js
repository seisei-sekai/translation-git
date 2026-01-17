// src/App.js
import React, { useEffect, useRef, useState } from 'react';
import Chat from './pages/Chat/Chat';
import { Link, useNavigate, useLocation } from 'react-router-dom';  // Import Link for navigation
import { QRCodeCanvas } from 'qrcode.react';
import './styles/AppQRCodeStyle.css'; // Import the CSS file for chat styling
import './styles/AppSideBarStyle.css'; // Import the CSS file for chat styling
import './App.css'; // Import the CSS file for chat styling
import { setGlobalState, getGlobalState } from './globalState';

import { useTranslation } from 'react-i18next'; // Import the hook for automatic system language detection
import Slidebar from './components/Slidebar';

function App() {
  const { t, i18n } = useTranslation();  // Destructure t function to access translations
  const url = window.location.href;
  const qrContainerRef = useRef(null);
  
  const [backgroundHeight, setBackgroundHeight] = useState('0px');
  const [scale, setScale] = useState(1);
  const [yScale, setYScale] = useState(1); // Scale for the background along Y-axis
  const [transformOrigin, setTransformOrigin] = useState("50% 50%"); // Default transform origin
  const [showSidebar, setShowSidebar] = useState(false);
  const [sliderValue, setSliderValue] = useState(1);
  const [showSlider, setShowSlider] = useState(false);
  const sliderRef = useRef(null);
  const sliderFillRef = useRef(null);
  const location = useLocation();

  const navigate = useNavigate();  // Initialize the useNavigate hook

  useEffect(() => {
    if (qrContainerRef.current) {
      const { bottom } = qrContainerRef.current.getBoundingClientRect();
      setBackgroundHeight(`${bottom + 20}px`);  // 20px below the QR code
    }}, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScrollVertical);
    return () => window.removeEventListener('scroll', handleScrollVertical);
  }, []);

  const handleScrollVertical = () => {
    // This function is for the QR code sliding function
    const position = window.pageYOffset;
    const newScale = Math.max(0.001, 1 - position / 50); // Adjust scale base on scroll, minimum scale is 0.5
    const newYScale = Math.max(0.001, 1 - position / 50); // Slower scale reduction for Y axis
    const newTransformOrigin = position > 10 ? "60% 10%" : "50% 50%";
    console.log(`Scroll position: ${position}, Scale: ${newScale}, Transform Origin: ${newTransformOrigin}`);

    setScale(newScale);
    setYScale(newYScale);
    setTransformOrigin(newTransformOrigin);
  };


  return (
    <div className="App">

        {/* <div className="qr-container">
          <QRCodeCanvas value={url} />
        </div> */}

      <Chat />
      <Slidebar />
      {/* <div className="floating-info-container">
        <h3>{t('ChatroomId')}:</h3>
        <h3>{getGlobalState('currChatroomId')}</h3>
        <h3>{t('Chatroom Name')}:</h3>
        <h3>{getGlobalState('currChatroomName')}</h3>
        <h3>{t('User ID')}: {getGlobalState('currUserId')}</h3>
        <h3>{t('User Name')}: {getGlobalState('currUserName')}</h3>
        <h3>{t('isLoggedIn')}: {getGlobalState('isLoggedIn') ? t('Yes') : t('No')}</h3>
        <h3>{t('User Avatar')}: {getGlobalState('currUserAvatar')}</h3>
      </div> */}

    </div>
  );
}

export default App;
