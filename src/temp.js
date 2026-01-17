import { useTranslation } from 'react-i18next';

function Chat() {
  const { t } = useTranslation(); // Hook from react-i18next

  return (
    <div>
      {/* Recording button */}
      <button
        ref={recordButtonRef}
        onClick={!isTouchDevice ? toggleRecording : undefined} // Use toggleRecording for click events
        onTouchStart={isTouchDevice ? toggleRecording : undefined} // Use toggleRecording for touch events
        className={`floating-record-btn ${isRecording ? 'recording' : ''}`}
      >
        {isRecording ? `${t('Stop')} \n`.concat(timeRemaining) : t('Speak')}
        <svg className="record-timer" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" />
        </svg>
      </button>

      {/* Language selection dropdowns */}
      <div className="dropdowns-container">
        <div className="select-container-left">
          <select
            className="select-language-left"
            onChange={(e) => setSelectedLanguageOther(e.target.value)}
            value={selectedLanguageOther}
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {t(lang)} {/* Use i18n for language options */}
              </option>
            ))}
          </select>
        </div>
        <div className="select-container-right">
          <select
            className="select-language-right"
            onChange={(e) => setSelectedLanguageMe(e.target.value)}
            value={selectedLanguageMe}
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {t(lang)} {/* Use i18n for language options */}
              </option>
            ))}
          </select>
        </div>
      </div>
  
      {/* Chat bubbles */}
      <div className="chat-container">
        {translations.map((translation, index) => (
          <div key={index} className={`message-container ${translation.username === username ? 'right' : 'left'}`}>
            {/* Avatar and Username */}
            <div className="avatar-container">
              <img
                src={translation.avatar ? translation.avatar : local_frontend_url.concat('/').concat("user_avatar/default_avatar_1.png")} 
                alt={`${translation.username}'s avatar`}
                className="avatar-image"
                onClick={() => window.location.href = `/profile/${translation.username}`} 
              />
              <p className="username-text">{translation.username}</p>
            </div>
  
            {/* Chat Bubble */}
            <div className={`chat-bubble ${translation.username === username ? 'right' : 'left'}`}>
              {translation.content_type === 'photo' ? (
                <>
                  {/* Handling photo bubble */}
                  <div className="photo-bubble">
                    <img
                      src={local_frontend_url.concat('/').concat(translation.original_text.slice(7))}
                      alt={local_frontend_url.concat('/').concat(translation.original_text.slice(7))}
                      className="chat-photo"
                    />
                  </div>
                  <p>{translation.translated_text}</p>
                  <p className="timestamp">
                    <strong>{t('Sent at:')} </strong> {convertUtcToLocal(translation.timestamp)}
                  </p>
                </>
              ) : (
                <>
                  {/* Handling text bubbles */}
                  {translation.username !== username ? (
                    <>
                      <p className={`text-section translated-text left`}>
                        <span style={{ display: 'block' }}>
                          {extractTextByLanguage(translation.translated_text, selectedLanguageOther)}
                        </span>
                      </p>
                      {visibleOriginals[index] && (
                        <p className={`text-section original-text left`}>
                          <strong>{t('Original Text')}:</strong>{' '}
                          <span style={{ display: 'block' }}>{translation.original_text}</span>
                        </p>
                      )}
                      <button className="chat-bubble-btn" onClick={() => toggleOriginalVisibility(index)}>
                        {visibleOriginals[index] ? t('Hide Original Text') : t('Show Original Text')}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className={`text-section original-text right`}>
                        <span style={{ display: 'block' }}>{translation.original_text}</span>
                      </p>
                      {visibleTranslations[index] && (
                        <p className={`text-section translated-text right`}>
                          <strong>{t('Translated Text')}:</strong>{' '}
                          <span style={{ display: 'block' }}>
                            {extractTextByLanguage(translation.translated_text, selectedLanguageMe)}
                          </span>
                        </p>
                      )}
                      <button className="chat-bubble-btn" onClick={() => toggleTranslationVisibility(index)}>
                        {visibleTranslations[index] ? t('Hide Translated Text') : t('Show Translated Text')}
                      </button>
                    </>
                  )}
                  <p className="timestamp">
                    <strong>{t('Sent at:')} </strong> {convertUtcToLocal(translation.timestamp)}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
  
      {/* Clear history button */}
      <button onClick={clearHistory}>
        {t('Clear History')}
      </button>
  
      {/* Text input for messages */}
      <div className="text-box-container">
        <input
          type="text"
          placeholder={t('Type a message...')}
          className="text-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button className="send-btn" onClick={handleSendMessage}>
          {t('Send')}
        </button>
      </div>
  
      {/* Photo selection button */}
      <label className="floating-photo-btn">
        {t('Photo')}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoChange}
        />
      </label>
  
      {/* Optionally, preview the selected photo */}
      {localPhotoUrl && (
        <div className="photo-preview">
          <img src={localPhotoUrl} alt={t('Selected')} style={{ maxWidth: '200px', marginTop: '10px' }} />
        </div>
      )}
    </div>
  );
}

export default Chat;
