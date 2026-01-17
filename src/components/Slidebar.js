import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/AppSlidebar.css';

const Slidebar = ({ children }) => {
  const [sliderValue, setSliderValue] = useState(1);
  const [sliderClass, setSliderClass] = useState('walkietalkie');
  const sliderRef = useRef(null);
  const sliderFillRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSliderChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setSliderValue(value);
    updateSliderFill(value);
    updateSliderClass(value);

    switch (value) {
      case 0:
        navigate('/chat');
        break;
      case 1:
        navigate('/walkietalkie');
        break;
      case 2:
        navigate('/photoOCR');  // Changed from '/lecture' to '/photoOCR'
        break;
      default:
        navigate('/chat');
    }
  };

  const updateSliderFill = (value) => {
    if (sliderFillRef.current) {
      const percentage = (value / 2) * 100;
      sliderFillRef.current.style.width = `${percentage}%`;
    
    }
  };

  const updateSliderClass = (value) => {
    switch (value) {
      case 0:
        setSliderClass('chatroom');
        break;
      case 1:
        setSliderClass('walkietalkie');
        break;
      case 2:
        setSliderClass('photoOCR');  // Changed from 'lecture' to 'photoOCR'
        break;
      default:
        setSliderClass('chatroom');
    }
  };

  const getSliderThumbStyle = (value) => {
    let backgroundImage;
    switch (value) {
      case 0:
        backgroundImage = `${process.env.PUBLIC_URL}/chat-icon.svg`;
        break;
      case 1:
        backgroundImage = `${process.env.PUBLIC_URL}/walkie-talkie-icon.svg`;
        break;
      case 2:
        backgroundImage = `${process.env.PUBLIC_URL}/photo-icon.svg`;
        break;
      default:
        backgroundImage = `${process.env.PUBLIC_URL}/chat-icon.svg`;
    }
    return backgroundImage;
  };

  useEffect(() => {
    updateSliderFill(sliderValue);
    updateSliderClass(sliderValue);
  }, [sliderValue]);

  useEffect(() => {
    // Update slider value based on current route
    switch (location.pathname) {
      case '/chat':
        setSliderValue(0);
        break;
      case '/walkietalkie':
        setSliderValue(1);
        break;
      case '/photoOCR':  // Changed from '/lecture' to '/photoOCR'
        setSliderValue(2);
        break;
      default:
        setSliderValue(0);
    }
  }, [location]);

  // Check if the current path should show the slider
  const shouldShowSlider = ['/', '/chat', '/walkietalkie', '/photoOCR'].includes(location.pathname);  // Changed '/lecture' to '/photoOCR'

  if (!shouldShowSlider) {
    return children;
  }

  return (
    <>
      <div className="slider-container">
        <div className="slider-background">
          <div className="slider-fill" ref={sliderFillRef}></div>
        </div>
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max="2"
          step="1"
          value={sliderValue}
          onChange={handleSliderChange}
          className={`slider ${sliderClass}`}
        />
        <div className="slider-labels">
          <div className={`label-container ${sliderValue === 0 ? 'selected' : ''}`}>
            <img src={getSliderThumbStyle(0)} alt="Chat" className="label-image" />
          </div>
          <div className={`label-container ${sliderValue === 1 ? 'selected' : ''}`}>
            <img src={getSliderThumbStyle(1)} alt="Walkie Talkie" className="label-image" />
          </div>
          <div className={`label-container ${sliderValue === 2 ? 'selected' : ''}`}>
            <img src={getSliderThumbStyle(2)} alt="Lecture" className="label-image" />
          </div>
        </div>
      </div>
      {children}
    </>
  );
};

export default Slidebar;
