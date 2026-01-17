import React, { useState, useRef, useEffect } from 'react';
import './Note.css';
import './ContextMenu.css';
import io from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { FaEllipsisV } from 'react-icons/fa';

// Move socket initialization outside of the component
let socketa = null;

function Note() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [selector, setSelector] = useState({ visible: false, x: 0, y: 0 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    // Initialize socket connection
    socketa = io(process.env.REACT_APP_API_URL || window.location.origin, {
      path: '/socket.io/',
    });

    return () => {
      // Safely disconnect socket on component unmount
      if (socketa) {
        socketa.disconnect();
      }
    };
  }, []);  

  useEffect(() => {
    // Check if the device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      setIsMobile(/iPhone|iPod|iPad|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleContainerClick = (e) => {
    if (e.target === containerRef.current) {
      handleClick(e);
    }
  };

  const handleClick = (e) => {
    const textarea = textareaRef.current;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const clickedLine = Math.floor(e.nativeEvent.offsetY / lineHeight) + 1;
    
    // Fill previous lines with empty strings
    const lines = content.split('\n');
    while (lines.length < clickedLine) {
      lines.push('');
    }
    
    setContent(lines.join('\n'));
    
    // Set cursor position
    setTimeout(() => {
      const cursorPosition = lines.slice(0, clickedLine - 1).join('\n').length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
      textarea.focus();
    }, 0);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const selection = window.getSelection().toString();
    if (selection) {
      setSelector({ visible: true, x: e.clientX, y: e.clientY });
    }
  };

  const handleOptionClick = (action) => {
    const textarea = textareaRef.current;
    switch (action) {
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        document.execCommand('paste');
        break;
      case 'cut':
        document.execCommand('cut');
        break;
      case 'selectAll':
        textarea.select();
        break;
      case 'askAI':
        setShowAiPrompt(true);
        break;
    }
    setSelector({ visible: false, x: 0, y: 0 });
  };

  const handleAskAI = () => {
    const promptText = aiPrompt;
    
    if (socketa) {
      console.log('Sending to server:', { selectedText, promptText }); // Debug log
      socketa.emit('ask_ai', { selectedText, promptText }, (response) => {
        if (response && response.error) {
          console.error('Error from AI:', response.error);
        } else if (response && response.aiResponse) {
          insertAIResponse(response.aiResponse);
        } else {
          console.error('Unexpected response from server');
        }
      });
    } else {
      console.error('Socket connection not available');
    }

    setShowAiPrompt(false);
    setAiPrompt('');
    setSelectedText('');
  };

  const insertAIResponse = (aiResponse) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const currentContent = textarea.value;

    const beforeSelection = currentContent.substring(0, selectionEnd);
    const afterSelection = currentContent.substring(selectionEnd);

    const newContent = `${beforeSelection}\n\nAI Response:\n${aiResponse}\n\n${afterSelection}`;
    setContent(newContent);

    // Set cursor position after the inserted AI response
    setTimeout(() => {
      const newPosition = selectionEnd + aiResponse.length + 15; // 15 accounts for added newlines and "AI Response:"
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    // Load content from localStorage when component mounts
    const savedContent = localStorage.getItem('noteContent');
    if (savedContent) {
      setContent(savedContent);
    }

    // Set up interval to save content every 5 seconds
    const saveInterval = setInterval(() => {
      localStorage.setItem('noteContent', content);
    }, 5000);

    // Clean up interval on component unmount
    return () => clearInterval(saveInterval);
  }, []);

  // Add a separate effect for saving content
  useEffect(() => {
    localStorage.setItem('noteContent', content);
  }, [content]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selector.visible && !e.target.closest('.text-selector')) {
        setSelector({ visible: false, x: 0, y: 0 });
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selector.visible]);

  const handleCloseAiPrompt = () => {
    setShowAiPrompt(false);
    setAiPrompt('');
  };

  const handleMobileSelection = () => {
    const selection = window.getSelection().toString();
    if (selection) {
      setSelectedText(selection);
      setMobileMenuVisible(true);
    }
  };

  const handleMobileOptionClick = (action) => {
    const textarea = textareaRef.current;
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(selectedText);
        break;
      case 'paste':
        navigator.clipboard.readText().then(text => {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentContent = textarea.value;
          const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
          setContent(newContent);
          textarea.setSelectionRange(start + text.length, start + text.length);
        });
        break;
      case 'cut':
        navigator.clipboard.writeText(selectedText).then(() => {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const currentContent = textarea.value;
          const newContent = currentContent.substring(0, start) + currentContent.substring(end);
          setContent(newContent);
          textarea.setSelectionRange(start, start);
        });
        break;
      case 'selectAll':
        textarea.select();
        break;
      case 'askAI':
        setShowAiPrompt(true);
        break;
    }
    setMobileMenuVisible(false);
  };

  return (
    <div ref={containerRef} className="note-container" onClick={handleContainerClick}>
      <div className="private-note-label">{t('Private Note')}</div>
      <div className="note-content-wrapper">
        <div className="line-numbers">
          {content.split('\n').map((_, index) => (
            <div key={index} className="line-number">{index + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('Click anywhere to start taking note...')}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={handleContextMenu}
          onTouchEnd={handleMobileSelection}
        />
      </div>
      {selector.visible && (
        <div 
          className="text-selector"
          style={{ position: 'fixed', top: selector.y, left: selector.x }}
        >
          <button onClick={() => handleOptionClick('copy')}>{t('Copy')}</button>
          <button onClick={() => handleOptionClick('paste')}>{t('Paste')}</button>
          <button onClick={() => handleOptionClick('cut')}>{t('Cut')}</button>
          <button onClick={() => handleOptionClick('selectAll')}>{t('Select All')}</button>
          <button onClick={() => handleOptionClick('askAI')}>{t('Ask AI')}</button>
        </div>
      )}
      {isMobile && (
        <button className="mobile-menu-button" onClick={() => setMobileMenuVisible(true)}>
          <FaEllipsisV />
        </button>
      )}
      {isMobile && mobileMenuVisible && (
        <div className="mobile-menu">
          <button onClick={() => handleMobileOptionClick('askAI')}>{t('Ask AI')}</button>
          <button onClick={() => setMobileMenuVisible(false)}>{t('Cancel')}</button>
        </div>
      )}
      {showAiPrompt && (
        <div className="ai-prompt">
          <button className="close-button" onClick={handleCloseAiPrompt}>×</button>
          <div className="ai-prompt-header">
            <h3>{t('Ask AI (ChatGPT 4o)')}</h3>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={t('Enter your prompt for AI...')}
          />
          <button onClick={handleAskAI}>{t('Ask AI')}</button>
        </div>
      )}
    </div>
  );
}

export default Note;
