import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import RecordRTC from 'recordrtc';
import './Walkietalkie.css';
import translate from 'translate';
import { useTranslation } from 'react-i18next';
import { getGlobalState, setGlobalState } from '../../globalState';

let socket = io(process.env.REACT_APP_API_URL || window.location.origin, {
  path: '/socket.io/',
});

const Walkietalkie = () => {
  const { t } = useTranslation();
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recorder, setRecorder] = useState(null);
  const [timeSlice, setTimeSlice] = useState(3000);
  const [browserTranscript, setBrowserTranscript] = useState('');
  const [isBrowserRecognitionActive, setIsBrowserRecognitionActive] = useState(false);
  const recognitionRef = useRef(null);

  const timerRef = useRef(null);

  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [singleChunkTranscript, setSingleChunkTranscript] = useState('');
  const [threeChunkTranscript, setThreeChunkTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  const [translatedBrowserTranscript, setTranslatedBrowserTranscript] = useState('');
  const [translatedSingleChunkTranscript, setTranslatedSingleChunkTranscript] = useState('');
  const [translatedThreeChunkTranscript, setTranslatedThreeChunkTranscript] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('zh');

  const [singleChunkTranslation, setSingleChunkTranslation] = useState('');
  const [threeChunkTranslation, setThreeChunkTranslation] = useState('');

  const [isReferenceRecording, setIsReferenceRecording] = useState(false);
  const [referenceRecordingTime, setReferenceRecordingTime] = useState(0);
  const [isVoiceCloneTTSEnabled, setIsVoiceCloneTTSEnabled] = useState(false);
  const [referenceRecorder, setReferenceRecorder] = useState(null);

  const [referenceText, setReferenceText] = useState('');
  const [referenceLanguage, setReferenceLanguage] = useState('english');

  const languageNames = {
    'en-US': 'English',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-BR': 'Portuguese',
    'ru-RU': 'Russian',
    'zh-CN': 'Chinese',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'ar-SA': 'Arabic',
    'hi-IN': 'Hindi',
    'nl-NL': 'Dutch',
    'pl-PL': 'Polish',
    'sv-SE': 'Swedish',
    'tr-TR': 'Turkish',
    'th-TH': 'Thai',
    'vi-VN': 'Vietnamese'
  };

  const handleTranslation = async (text, targetLang, setTranslatedState) => {
    try {
      translate.engine = "google";
      translate.from = selectedLanguage.split('-')[0]; // Use the current speech recognition language as source
      const result = await translate(text, targetLang);
      setTranslatedState(result);
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);

  const [hasEnabledVoice, setHasEnabledVoice] = useState(false);

  useEffect(() => {
    const enableVoice = () => {
      if (!hasEnabledVoice && 'speechSynthesis' in window) {
        const lecture = new SpeechSynthesisUtterance('');
        lecture.volume = 0;
        window.speechSynthesis.speak(lecture);
        setHasEnabledVoice(true);
      }
    };

    document.addEventListener('click', enableVoice);
    return () => document.removeEventListener('click', enableVoice);
  }, [hasEnabledVoice]);

  const speakText = useCallback((text) => {
    if ('speechSynthesis' in window && isTTSEnabled) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLanguage;
      utterance.rate = speechRate;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      // For iOS, we need to break the text into shorter phrases
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        const phrases = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
        phrases.forEach((phrase, index) => {
          setTimeout(() => {
            const phraseUtterance = new SpeechSynthesisUtterance(phrase);
            phraseUtterance.lang = targetLanguage;
            phraseUtterance.rate = speechRate;
            if (index === 0) phraseUtterance.onstart = () => setIsSpeaking(true);
            if (index === phrases.length - 1) phraseUtterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(phraseUtterance);
          }, index * 250); // Add a small delay between phrases
        });
      } else {
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [targetLanguage, isTTSEnabled, speechRate]);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    console.log('Component mounted');
    socket = io(process.env.REACT_APP_API_URL || window.location.origin, {
      path: '/socket.io/',
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });
    socket.emit('test_message', 'Hello from the client! Walkietalkie');

    socket.on('transcription', (data) => {
      setTranscript((prev) => prev + ' ' + data.transcription);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    socket.on('single_chunk_transcription', (data) => {
      console.log('Received single chunk transcription:', data);
      setSingleChunkTranscript((prev) => prev + ' ' + data.transcription);
      setSingleChunkTranslation((prev) => {
        const newTranslation = prev + ' ' + data.translation;
        if (isTTSEnabled) {
          speakText(data.translation);
        }
        return newTranslation;
      });
      setSingleChunkTranslation((prev) => prev + ' ' + data.translation);
      
      if (data.cloned_voice_file) {
        const audio = new Audio(`data:audio/mp3;base64,${data.cloned_voice_file}`);
        audio.play().catch(e => console.error('Error playing audio:', e));
      }
    });

    socket.on('three_chunk_transcription', (data) => {
      setThreeChunkTranscript((prev) => prev + ' ' + data.transcription);
      setThreeChunkTranslation((prev) => prev + ' ' + data.translation);
    });
    // Initialize SpeechRecognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 3;
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Update the transcript with both final and interim results
        const fullTranscript = finalTranscript + ' ' + interimTranscript;
        setBrowserTranscript(fullTranscript);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        if (isBrowserRecognitionActive) {
          console.log('Restarting speech recognition');
          recognitionRef.current.start();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech') {
          console.log('No speech detected. Restarting...');
          recognitionRef.current.stop();
          recognitionRef.current.start();
        }
      };

      // Check available languages
      checkAvailableLanguages();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [speakText, isTTSEnabled]);

  useEffect(() => {
    if (browserTranscript && browserTranscript.trim() !== '') {
      handleTranslation(browserTranscript, targetLanguage, setTranslatedBrowserTranscript);
    }
  }, [browserTranscript, targetLanguage]);

  useEffect(() => {
    if (singleChunkTranscript && singleChunkTranscript.trim() !== '') {
      handleTranslation(singleChunkTranscript, targetLanguage, setTranslatedSingleChunkTranscript);
    }
  }, [singleChunkTranscript, targetLanguage]);

  useEffect(() => {
    if (threeChunkTranscript && threeChunkTranscript.trim() !== '') {
      handleTranslation(threeChunkTranscript, targetLanguage, setTranslatedThreeChunkTranscript);
    }
  }, [threeChunkTranscript, targetLanguage]);

  useEffect(() => {
    let interval;
    if (isReferenceRecording) {
      interval = setInterval(() => {
        setReferenceRecordingTime((prevTime) => {
          if (prevTime >= 60) {
            stopReferenceRecording();
            return 60;
          }
          return prevTime + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReferenceRecording]);

  const startReferenceRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new RecordRTC(stream, {
          type: 'audio',
          mimeType: 'audio/webm',
          recorderType: RecordRTC.StereoAudioRecorder,
          numberOfAudioChannels: 1,
          timeSlice: 1000,
          desiredSampRate: 16000,
        });
        setReferenceRecorder(recorder);
        recorder.startRecording();
        setIsReferenceRecording(true);
        setReferenceRecordingTime(0);
      })
      .catch((err) => console.error('Error accessing microphone:', err));
  };

  const stopReferenceRecording = () => {
    if (referenceRecorder) {
      referenceRecorder.stopRecording(() => {
        const blob = referenceRecorder.getBlob();
        const userId = getGlobalState('currUserId');
        const formData = new FormData();
        formData.append('audio', blob, `${userId}.webm`);
        formData.append('userId', userId);

        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload-reference-audio`, {
          method: 'POST',
          body: formData,
        })
        .then(response => response.json())
        .then(data => console.log('Reference audio uploaded:', data))
        .catch(error => console.error('Error uploading reference audio:', error));

        setIsReferenceRecording(false);
        setReferenceRecorder(null);
      });
    }
  };

  const toggleReferenceRecording = () => {
    if (isReferenceRecording) {
      stopReferenceRecording();
    } else {
      startReferenceRecording();
    }
  };

  const toggleVoiceCloneTTS = () => {
    setIsVoiceCloneTTSEnabled(!isVoiceCloneTTSEnabled);
  };

  const checkAvailableLanguages = () => {
    const languageCodes = [
      'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'zh-CN', 'ja-JP', 'ko-KR',
      'ar-SA', 'hi-IN', 'nl-NL', 'pl-PL', 'sv-SE', 'tr-TR', 'th-TH', 'vi-VN'
      // Add more language codes as needed
    ];

    const supported = [];

    languageCodes.forEach(lang => {
      const tempRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      try {
        tempRecognition.lang = lang;
        supported.push(lang);
      } catch (e) {
        // Language not supported
      }
    });

    setAvailableLanguages(supported);
  };

  const startRecording = () => {
    console.log("startRecording function called");
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        console.log("Got user media stream");
        const options = {
          mimeType: 'audio/webm;codecs=opus',
          numberOfAudioChannels: 1,
          recorderType: RecordRTC.StereoAudioRecorder,
          checkForInactiveTracks: true,
          timeSlice: timeSlice,
          audioBitsPerSecond: 16000,
          ondataavailable: (blob) => {
            console.log("ondataavailable triggered", blob);
            if (blob && socket) {
              const userId = getGlobalState('currUserId');
              console.log("Current user ID:", userId); // Debug: Log the user ID
              const dataToSend = { 
                buffer: blob, 
                targetLanguage,
                userId: userId,
                isVoiceCloneTTSEnabled: isVoiceCloneTTSEnabled
              };
              console.log("Sending data to server:", dataToSend); // Debug: Log the data being sent
              socket.emit('audio_chunk', dataToSend);
              console.log('Audio chunk sent to server');
            }
          },
        };

        const recordRTC = new RecordRTC(stream, options);
        console.log("RecordRTC instance created");
        setRecorder(recordRTC);

        recordRTC.startRecording();
        console.log("Recording started");

        timerRef.current = setInterval(() => {
          setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);

        setIsRecording(true);
        console.log("isRecording set to true");
      })
      .catch((err) => {
        console.error('Error accessing microphone:', err);
      });
  };

  const stopRecording = () => {
    console.log("stopRecording function called");
    if (recorder) {
      recorder.stopRecording(() => {
        console.log("Recording stopped");
        recorder.destroy();
        setRecorder(null);
      });
      clearInterval(timerRef.current);
      setIsRecording(false);
      console.log("isRecording set to false");
      if (socket) {
        socket.emit('stop_stream');
        console.log("stop_stream event emitted");
      }
    }
  };

  const toggleRecording = () => {
    console.log("toggleRecording function called");
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
      if (isBrowserRecognitionActive) {
        recognitionRef.current.stop();
        recognitionRef.current.start();
      }
    }
  };

  const toggleBrowserRecognition = () => {
    if (isBrowserRecognitionActive) {
      recognitionRef.current.stop();
      setIsBrowserRecognitionActive(false);
    } else {
      recognitionRef.current.lang = selectedLanguage;
      recognitionRef.current.start();
      setIsBrowserRecognitionActive(true);
    }
  };

  const handleTargetLanguageChange = (e) => {
    setTargetLanguage(e.target.value);
  };

  const [expandedContainers, setExpandedContainers] = useState({
    browser: true,
    translatedBrowser: true,
    singleChunk: true,
    translatedSingleChunk: true,
    singleChunkTranslation: true,
    threeChunk: true,
    translatedThreeChunk: true,
    threeChunkTranslation: true
  });

  const toggleContainer = (containerId) => {
    setExpandedContainers(prev => ({
      ...prev,
      [containerId]: !prev[containerId]
    }));
  };

  const renderTranscriptContainer = (title, content, containerId) => (
    <div className={`transcript-container ${expandedContainers[containerId] ? 'expanded' : ''}`}>
      <div className="transcript-header" onClick={() => toggleContainer(containerId)}>
        <h3>{title}</h3>
        <span className="expand-icon">{expandedContainers[containerId] ? '▲' : '▼'}</span>
      </div>
      {expandedContainers[containerId] && (
        <div className="transcript-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          {content}
        </div>
      )}
    </div>
  );

  const [price, setPrice] = useState(0);

  useEffect(() => {
    setPrice(recordingTime * 0.0003333333);
  }, [recordingTime]);

  const getReferenceText = () => {
    switch (referenceLanguage) {
      case 'english':
        return "In the quiet of the morning, the first rays of sunlight stream through the window, gently illuminating the room. Outside, the trees sway softly in the breeze, their leaves rustling like a whisper of nature's breath. Birds chirp in the distance, as if welcoming the dawn of a new day. In moments like these, we often overlook the beauty in the simplicity of life. Yet, it is in these small, fleeting moments that we find true peace and happiness. May you also find a moment of quiet joy in your day today.";
      case 'japanese':
        return "朝の静かな時間、窓から差し込む柔らかな光が、今日という新しい一日の始まりを告げます。風に揺れる木々の葉が、自然の息吹を感じさせ、穏やかな心地を与えてくれる。遠くから聞こえる鳥のさえずりは、まるで世界が目覚める瞬間を祝うかのようです。日常の中で、私たちはつい忙しさに追われてしまうけれど、こうした小さな瞬間こそが、人生の豊かさを教えてくれます。あなたも、今日のどこかで、この静かな幸せを見つけられますように。";
      case 'chinese':
        return "清晨的阳光洒在窗边，带来了一天的温暖与希望。每一片叶子都在微风中轻轻摇曳，仿佛在诉说着生命的美好与宁静。远处传来鸟儿的啼鸣，像是在迎接新的一天的到来。在这样的时刻，心灵也变得格外宁静。我们常常忽视了这些微小的瞬间，而它们，恰恰是生活中最美的点滴。愿你也能在每一天里，找到属于自己的宁静与幸福。";
      default:
        return '';
    }
  };

  useEffect(() => {
    setReferenceText(getReferenceText());
  }, [referenceLanguage]);

  return (
    <div className="walkietalkie-container">
      <div style={{ height: '50px' }}></div>
      <h2 style={{ color: 'white' }}>{t('Yoohi Real-Time Transcription and Translation')}</h2>

      <div className="time-slice-selector">
        <label htmlFor="timeSlice">{t('Time Chunk Duration (ms)')}: </label>
        <select
          id="timeSlice"
          value={timeSlice}
          onChange={(e) => setTimeSlice(Number(e.target.value))}
        >
          <option value={1000}>1000</option>
          <option value={2000}>2000</option>
          <option value={2500}>2500</option>
          <option value={3000}>3000</option>
          <option value={3500}>3500</option>
          <option value={4000}>4000</option>
          <option value={5000}>5000</option>
          <option value={7000}>7000</option>
          <option value={10000}>10000</option>
        </select>
      </div>

      <div className="floating-record-button">
        <button
          onClick={() => {
            console.log("Record button clicked");
            toggleRecording();
            toggleBrowserRecognition();
          }}
          className={`floating-record-btn ${isRecording ? 'recording' : ''}`}
        >
          {isRecording ? t('Stop') : t('Record')}
        </button>
      </div>
      <p>{t('Recording Time')}: {formatTime(recordingTime)}</p>
      <p>{t('Estimated Price')}: ${price.toFixed(6)} USD</p>
      {/* <div className="transcript-container">
        <h3>Server Transcript:</h3>
        <div className="transcript-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          {transcript}
        </div>
        <button onClick={copyToClipboard} className="copy-button">
          {isCopied ? 'Copied!' : 'Copy Transcript'}
        </button>
      </div> */}


<div className="language-preference">
        <label htmlFor="languageSelect">{t('Preferred Recognition Language')}: </label>
        <select
          id="languageSelect"
          value={selectedLanguage}
          onChange={handleLanguageChange}
        >
          {availableLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {languageNames[lang] || lang}
            </option>
          ))}
        </select>
      </div>
      {/* <button
        onClick={toggleBrowserRecognition}
        className={`browser-recognition-button ${isBrowserRecognitionActive ? 'active' : ''}`}
      >
        {isBrowserRecognitionActive ? 'Stop Browser Recognition' : 'Start Browser Recognition'}
      </button> */}
      <div className="language-preference">
        <label htmlFor="targetLanguageSelect">{t('Target Translation Language')}: </label>
        <select
          id="targetLanguageSelect"
          value={targetLanguage}
          onChange={handleTargetLanguageChange}
        >
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="ru">Russian</option>
          <option value="ko">Korean</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
          <option value="nl">Dutch</option>
          <option value="pl">Polish</option>
          <option value="sv">Swedish</option>
          <option value="tr">Turkish</option>
          <option value="vi">Vietnamese</option>

        </select>
      </div>

      <div className="tts-controls">
        <button onClick={() => setIsTTSEnabled(!isTTSEnabled)}>
          {isTTSEnabled ? t('Disable TTS') : t('Enable TTS')}
        </button>
        {isSpeaking && (
          <button onClick={stopSpeech}>{t('Stop Speech')}</button>
        )}
        <div>
          <label htmlFor="speechRate">{t('Speech Rate')}: {speechRate.toFixed(1)}x</label>
          <input
            type="range"
            id="speechRate"
            min="0.5"
            max="2"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="reference-recording-controls">
        <div className="reference-text-container">
          <select
            value={referenceLanguage}
            onChange={(e) => setReferenceLanguage(e.target.value)}
            className="reference-language-select"
          >
            <option value="english">English</option>
            <option value="japanese">Japanese</option>
            <option value="chinese">Chinese</option>
          </select>
          <textarea
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            className="reference-text-box"
            rows={5}
            placeholder="Text to read for reference"
          />
        </div>
        <button
          onClick={toggleReferenceRecording}
          className={`reference-record-button ${isReferenceRecording ? 'recording' : ''}`}
        >
          {isReferenceRecording ? `Stop Reference Recording (${referenceRecordingTime}s)` : 'Start Reference Recording'}
        </button>
      </div>

      <div className="voice-clone-tts-controls">
        <button
          onClick={toggleVoiceCloneTTS}
          className={`voice-clone-tts-button ${isVoiceCloneTTSEnabled ? 'enabled' : ''}`}
        >
          {isVoiceCloneTTSEnabled ? 'Disable Voice Clone TTS' : 'Enable Voice Clone TTS'}
        </button>
      </div>

      <div className="transcripts-grid">
        <div className="transcript-category">
          <h4>{t('Transcripts')}</h4>
          {renderTranscriptContainer(`${t('Browser Transcript')} (${selectedLanguage}) ${t('Google(Free)')}`, browserTranscript, 'browser')}
          {renderTranscriptContainer(t('Single Chunk Transcript OpenAI'), singleChunkTranscript, 'singleChunk')}
          {renderTranscriptContainer(t('Three Chunk Transcript OpenAI'), threeChunkTranscript, 'threeChunk')}
        </div>
        <div className="transcript-category">
          <h4>{t('Translations')}</h4>
          {renderTranscriptContainer(t('Translated Browser Transcript Google(Free)'), translatedBrowserTranscript, 'translatedBrowser')}
          {renderTranscriptContainer(t('Translated Single Chunk Google(Free)'), translatedSingleChunkTranscript, 'translatedSingleChunk')}
          {renderTranscriptContainer(
            `${t('Single Chunk Translation OpenAI')} ${isSpeaking ? t('(Speaking...)') : ''}`, 
            singleChunkTranslation, 
            'singleChunkTranslation'
          )}
          {renderTranscriptContainer(t('Translated Three Chunk Google(Free)'), translatedThreeChunkTranscript, 'translatedThreeChunk')}
          {renderTranscriptContainer(t('Three Chunk Translation OpenAI'), threeChunkTranslation, 'threeChunkTranslation')}
        </div>
      </div>



    </div>
  );
};

export default Walkietalkie;
