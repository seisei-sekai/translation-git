import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import RecordRTC from 'recordrtc';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import './Chat.css'; // Import the CSS file for chat styling
import convertUtcToLocal from'../../utils/convertUTCtoCurrent'; // Import the CSS file for chat styling
import Compressor from 'compressorjs';
import { useTranslation } from 'react-i18next'; // Import the hook for automatic system language detection
import { setGlobalState, getGlobalState } from '../../globalState';
import { Link, useNavigate } from 'react-router-dom'; // Add this import
import ChatStatusBar from './ChatStatusBar'; // Add this import at the top
import SidebarContext from '../../contexts/SidebarContext'; // Import SidebarContext
import './ChatList.css'; // Import the CSS file for ChatList styling
import { useSwipeable } from 'react-swipeable'; // Add this import
import Note from './Note'; // Add this import
import WelcomePage from './WelcomePage'; // Add this import
import translate from 'translate';
// import { franc } from 'franc';
import { saveAs } from 'file-saver';
import EmojiPicker from 'emoji-picker-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import mainstream from './Language/1_mainstream.json';
import modernDialect from './Language/2_modern_dialect.json';
import ancientLanguage from './Language/3_ancient_language.json';
import functionalLanguage from './Language/4_functional_language.json';
let socket =  io(process.env.REACT_APP_API_URL || window.location.origin, {
  path: '/socket.io/',
});
const CryptoJS = require('crypto-js');
const local_url =process.env.REACT_APP_BACKEND_URL;
const local_frontend_url = process.env.REACT_APP_FRONTEND_URL;


let time_remaining = 60;

function Chat() {
  // Add the Google Analytics useEffect here, at the start of the component
  // useEffect(() => {
  //   // Load Google Analytics
  //   const script1 = document.createElement('script');
  //   script1.async = true;
  //   script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-TMCHYWVY1W';
  //   document.head.appendChild(script1);

  //   // Initialize gtag
  //   window.dataLayer = window.dataLayer || [];
  //   function gtag(){window.dataLayer.push(arguments);}
  //   gtag('js', new Date());
  //   gtag('config', 'G-TMCHYWVY1W');

  //   // Cleanup
  //   return () => {
  //     document.head.removeChild(script1);
  //   };
  // }, []);

  const { t, i18n } = useTranslation();  // Destructure t function to access translations
  const systemLanguage = navigator.language.split('-')[0]; // Get the ISO-639-1 language code
  const [systemLanguageInitial, setSystemLanguageInitial] = useState(''); // New state variable
  const [isRecording, setIsRecording] = useState(false);
  const [localAudioUrl, setLocalAudioUrl] = useState(null);
  const [recorder, setRecorder] = useState(null); // State to manage RecordRTC object
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [userId, setUserId] = useState(null); // State to store the UID
  const [username, setUsername] = useState(''); // State to store the username
  const [messages, setMessages] = useState([]); // State to store translations
  const [selectedLanguageMe, setSelectedLanguageMe] = useState(getGlobalState('selectedLanguageMe')); // for the selected language in the box
  const [selectedLanguageMePreview, setSelectedLanguageMePreview] = useState(getGlobalState('selectedLanguageMePreview'));
  const [visibleMessages, setVisibleMessages] = useState({});
  const [visibleOriginals, setVisibleOriginals] = useState({});
  const isLoggedIn = getGlobalState('isLoggedIn');
  const currUserId = getGlobalState('currUserId');
  const currUserName = getGlobalState('currUserName');
  const currLanguageMe = getGlobalState('selectedLanguageMe');
  const [currChatroomName, setCurrChatroomName] = useState(getGlobalState('currChatroomName'));
  const [message, setMessage] = useState(''); // For the text input
  const [photoFile, setPhotoFile] = useState(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState(null);
  const MAX_RETRIES = 3; //for sio resend
  const RETRY_DELAY = 2000; // 2 seconds //for sio resend
  //recording button countdown
  const [timeRemaining, setTimeRemaining] = useState(time_remaining); // 60 seconds countdown
  const [timerInterval, setTimerInterval] = useState(null); // For the countdown interval
  const recordButtonRef = useRef(null);
  const [sid, setSid] = useState(null); // State to store the socket ID (sid)
  const navigate = useNavigate(); // Add this hook
  const [isMemoOn, setIsMemoOn] = useState(false); // Add this state
  const [isExpanded, setIsExpanded] = useState(false);
  const textInputRef = useRef(null);
  const [isSliding, setIsSliding] = useState(false); // UPDATED: Manage isSliding state
  const { toggleSidebar, setShowMenuButton } = useContext(SidebarContext); // Destructure from context
  const [chatrooms, setChatrooms] = useState([]);
  const [showNote, setShowNote] = useState(false);
  const [showWelcomePage, setShowWelcomePage] = useState(getGlobalState('firstTimeUse'));
  const [stream, setStream] = useState(null);
  const inactivityTimeoutRef = useRef(null);
  // Add this new state for tracking TTS status
  const [ttsStatus, setTtsStatus] = useState({});
  // Add these new states at the beginning of the Chat component
  const [hasEnabledVoice, setHasEnabledVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Add new state for split view
  const [isSplit, setIsSplit] = useState(false);
  // Add new state variables
  const [selectedLanguageMeFirst, setSelectedLanguageMeFirst] = useState(getGlobalState('selectedLanguageMeFirst'));
  const [selectedLanguageMeSecond, setSelectedLanguageMeSecond] = useState(getGlobalState('selectedLanguageMeSecond'));
  // Add this new state for loading message
  const [loadingMessage, setLoadingMessage] = useState(null);
  // Add these new state variables at the beginning of the Chat component
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const [streamingTranslation, setStreamingTranslation] = useState('');
  const [streamingTranslationFirst, setStreamingTranslationFirst] = useState('');
  const [streamingTranslationSecond, setStreamingTranslationSecond] = useState('');
  const recognitionRef = useRef(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  // Add this constant near other state declarations
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null });
  const longPressTimeout = useRef(null);
  const touchStartPosition = useRef({ x: 0, y: 0 });
  const [textContextMenu, setTextContextMenu] = useState({ 
    visible: false, 
    x: 0, 
    y: 0, 
    text: '',
    messageId: null,
    translatedText: null
  });
  // Add a ref for the textarea
  const editTextareaRef = useRef(null);
  // Add this state to track focus
  const [isTextBoxFocused, setIsTextBoxFocused] = useState(false);
  // Add new state for left bubble context menu
  const [leftBubbleContextMenu, setLeftBubbleContextMenu] = useState({ 
    visible: false, 
    x: 0, 
    y: 0, 
    text: '',
    messageId: null,
    translatedText: null
  });
  // Add new state for reply
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState([]);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const chatContentRef = useRef(null);
  // Add this state near your other state declarations
  const [showSourceLanguageMenu, setShowSourceLanguageMenu] = useState(false);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState(getGlobalState('selectedSourceLanguage'));
  const [otherUsersLoadingMessages, setOtherUsersLoadingMessages] = useState({});
  const [otherUsersTranscripts, setOtherUsersTranscripts] = useState({});
  const [otherUsersTranslations, setOtherUsersTranslations] = useState({});
  // First, add these state variables for the custom dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // const [selectedCategory, setSelectedCategory] = useState('Mainstream Languages');
  const dropdownRef = useRef(null);

  // Add these state variables
  const [selectedMainCategory, setSelectedMainCategory] = useState('Mainstream Languages');
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);  // No subgroup needed for Mainstream
  const [selectedCategory, setSelectedCategory] = useState(null);  // No category needed for Mainstream
  const [selectedLanguage, setSelectedLanguage] = useState('English'); // Add this for tracking selected language
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

// Add these new state variables near the top of your component
const MESSAGE_LOAD_INCREMENT = 6;
const INITIAL_DISPLAY_COUNT = 6;
const [displayedMessageCount, setDisplayedMessageCount] = useState(INITIAL_DISPLAY_COUNT);

const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
const scrollThreshold = 100; // pixels from top to trigger load more

// // Add this new effect to handle scroll events
// useEffect(() => {
//   const handleScroll = () => {
//     if (!chatContentRef.current || isLoadingMoreMessages) return;

//     const { scrollTop } = chatContentRef.current;
    
//     if (scrollTop < scrollThreshold) {
//       setIsLoadingMoreMessages(true);
      
//       // Simulate network delay
//       setTimeout(() => {
//         setDisplayedMessageCount(prev => {
//           const newCount = prev + 5;
//           // Don't exceed total message count
//           return Math.min(newCount, messages.length);
//         });
//         setIsLoadingMoreMessages(false);
//       }, 500);
//     }
//   };

//   const chatContent = chatContentRef.current;
//   if (chatContent) {
//     chatContent.addEventListener('scroll', handleScroll);
//     return () => chatContent.removeEventListener('scroll', handleScroll);
//   }
// }, [isLoadingMoreMessages, messages.length]);









  
  const dropdownPreviewRef = useRef(null);
  // Preview states
  const [isDropdownOpenPreview, setIsDropdownOpenPreview] = useState(false);
  const [selectedMainCategoryPreview, setSelectedMainCategoryPreview] = useState('Mainstream Languages');
  const [selectedSubgroupPreview, setSelectedSubgroupPreview] = useState(null);
  const [selectedCategoryPreview, setSelectedCategoryPreview] = useState(null);
  const [selectedLanguagePreview, setSelectedLanguagePreview] = useState('English');
  const [selectedSubcategoryPreview, setSelectedSubcategoryPreview] = useState(null);
  const [aiOutput, setAiOutput] = useState('');
  const [showAiOutput, setShowAiOutput] = useState(false);
  // Add a new state for editable AI output
const [editableAiOutput, setEditableAiOutput] = useState('');

// Update the useEffect to set initial value when aiOutput changes
useEffect(() => {
  setEditableAiOutput(aiOutput);
}, [aiOutput]);
  
  // Keep the local state for customFilterContent
  const [customFilterContent, setCustomFilterContent] = useState('');
  // Add this ref at the top of your component with other refs
  const menuRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);

  // Add this handler function
  const handlePreviewClick = (e) => {
    e.preventDefault(); // Prevent losing focus
    e.stopPropagation(); // Prevent event bubbling
    setShowPreview(true);
  };
  // Add this handler to close the preview
const handleClosePreview = () => {
  setShowPreview(false);
};
const handleLanguageChangePreview = (event, position = 'single') => {


  let newLanguage = event.target.value;
  // console.log('Preview language changed to:', newLanguage);
  if (newLanguage === "Custom") {
    setGlobalState('isCustomFilterPreview', true);
    newLanguage = customFilterContent ;
  } else {
    setGlobalState('isCustomFilterPreview', false);
  }
  const value = newLanguage;




  setSelectedLanguageMePreview(value);
  setGlobalState('selectedLanguageMePreview', value);
};

const handlePreviewTranslation = async () => {
  try {
    // console.log('Preview translation params:', {
    //   user_id: getGlobalState('currUserId'),
    //   language: selectedLanguageMePreview,
    //   text: message
    // });

    let languageToSend = selectedMainCategoryPreview === 'Custom Mode' 
      ? customFilterContent  // Use custom filter content when in Custom Mode
      : selectedLanguageMePreview



    const response = await axios.post(`${local_url}/api/preview-translate`, {
      user_id: getGlobalState('currUserId'),
      language:languageToSend,
      text: message,
      lowCostMode: getGlobalState('lowCostMode'),
      isGuestMode: getGlobalState('isGuestMode'),
      currHostUserId: getGlobalState('currHostUserId')
    });

    if (response.data.translation) {
      setAiOutput(response.data.translation);
      setShowAiOutput(true);
    }
  } catch (error) {
    console.error('Preview translation error:', error);
    toast.error(t('Preview translation failed'));
  }
};


  useEffect(() => {
    if (getGlobalState('firstTimeUse') === true) {
      setShowWelcomePage(true);
    } else {
      setShowWelcomePage(true); // temporaritly change
    }


  }, []);

  const handleCloseWelcomePage = () => {
    setShowWelcomePage(false);
    setGlobalState('firstTimeUse', false);
    localStorage.setItem('firstTimeUse', 'false');
  };

  // Update the menu button visibility based on isSliding
  useEffect(() => {
    // setShowMenuButton(isSliding);
    setShowMenuButton(true);
  }, [isSliding, setShowMenuButton]);
  // Optionally, reset isSliding and hide the menu button when sliding ends
  // useEffect(() => {
  //   if (!isSliding) {
  //     setShowMenuButton(false);
  //   }
  // }, [isSliding, setShowMenuButton]);

  
  useEffect(() => {
    if (getGlobalState('initialRenderRef')) {
      setGlobalState('initialRenderRef', false);

      const isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouchCapable);
      let lang = "original_text_raw";

      setSelectedLanguageMe(lang);
      setGlobalState('selectedLanguageMe', lang);
      setGlobalState('selectedLanguageMeFirst', lang);
      setGlobalState('selectedLanguageMeSecond', lang);
      setSystemLanguageInitial(lang);
      fetchMessages(getGlobalState('currChatroomId'), lang, selectedLanguageMeFirst, selectedLanguageMeSecond, isSplit);
    }
  }, []); // Empty dependency array ensures this runs only once

  useEffect(() => {
    // Update local state when global state changes
    setCurrChatroomName(getGlobalState('currChatroomName'));
  }, []);



  // Handle photo selection or taken photo
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        const photoUrl = URL.createObjectURL(file);
        setLocalPhotoUrl(photoUrl);
        setPhotoFile(file); 
        // console.log(file);
        // console.log("file")

        new Compressor(file, {
            quality: 0.4, // Compress image to 60% of the original quality
            success(result) {
                sendPhotoToServer(result).then((interpretation) => {
                    setMessages(prev => [...prev, {
                        userId: userId,
                        username: username,
                        original_text:  photoUrl,
                        translated_text: interpretation,
                        content_type: 'photo',
                        timestamp: new Date().toISOString(),

                    }]);
                });
            },
            error(err) {
                console.log(err.message);
            }
        });
    }
};

const sendPhotoToServer = (file) => {

  // console.log("Selected language:", getGlobalState('selectedLanguageMe'));
  // console.log("Low cost mode:", getGlobalState('lowCostMode'));
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('chatroomId', getGlobalState('currChatroomId'));
  formData.append('photo', file, CryptoJS.MD5(Date.now() + Math.random().toString()).toString().concat(".jpeg"));
  formData.append('username', username);
  formData.append('systemLanguage', getSystemLanguageInitial(navigator.language.split('-')[0]));
  formData.append('selectedLanguageMeFirst', getGlobalState('selectedLanguageMe'));
  formData.append('lowCostMode', getGlobalState('lowCostMode'));
  formData.append('isGuestMode', getGlobalState('isGuestMode'));
  formData.append('currHostUserId', getGlobalState('currHostUserId'));

  axios.post(`${local_url}/api/upload-message-photo`, formData)
    .then((response) => {
      // console.log('Photo interpretation:', response.data);

      fetchMessages(
        getGlobalState('currChatroomId'),
        getGlobalState('selectedLanguageMe'),
        getGlobalState('selectedLanguageMeFirst'),
        getGlobalState('selectedLanguageMeSecond'),
        isSplit
      );

      return response.data.message; // Adjust this if you return the photo URL from the server
    })
    .catch((error) => {
      console.error(t('Error fetching photo interpretation:'), error);
    });
};

const getSystemLanguageInitial = (systemLanguage) => {
  // console.log("getSystemLanguageInitial param:", systemLanguage);
  switch(systemLanguage) {
    case 'zh':
      return 'Chinese';
    case 'ja':
      return 'Japanese'; 
    case 'en':
      return 'English';
    case 'ar':
      return 'Arabic';
    case 'es':
      return 'Spanish';
    case 'fr':
      return 'French';
    case 'ru':
      return 'Russian';
    case 'pt':
      return 'Portuguese';
    case 'de':
      return 'German';
    case 'hi':
      return 'Hindi';
    case 'bn':
      return 'Bengali';
    case 'ko':
      return 'Korean';
    case 'it':
      return 'Italian';
    case 'tr':
      return 'Turkish';
    case 'vi':
      return 'Vietnamese';
    case 'nl':
      return 'Dutch';
    default:
      return 'English';
  }
};



const handleSendMessage = () => {
  console.log('[SEND MESSAGE] Button clicked');
  console.log('[SEND MESSAGE] Message content:', message);
  console.log('[SEND MESSAGE] Message length:', message.length);
  console.log('[SEND MESSAGE] Message trimmed:', message.trim());
  
  if (message.trim()) {
    const payload = {
      userId: getGlobalState('currUserId'),
      username: currUserName,
      chatroomId: getGlobalState('currChatroomId'),
      message: message,
      toLanguageMe: selectedLanguageMe,
      toLanguageMeFirst: selectedLanguageMeFirst,
      toLanguageMeSecond: selectedLanguageMeSecond,
      isSplit: isSplit,
      replyToMessageId: replyToMessage ? replyToMessage.id : -1,
      lowCostMode: getGlobalState('lowCostMode'),
      isGuestMode: getGlobalState('isGuestMode'),
      currHostUserId: getGlobalState('currHostUserId')
    };
    
    console.log('[SEND MESSAGE] Emitting upload_text event with payload:', payload);
    socket.emit('upload_text', payload);
    console.log('[SEND MESSAGE] Event emitted successfully');
    
    setMessage('');
    setReplyToMessage(null); // Clear the reply preview after sending
    
    // Reset textarea height
    if (textInputRef.current) {
      textInputRef.current.style.height = '40px'; // Reset to initial height
      
      // Reset container height
      const container = textInputRef.current.closest('.text-box-container');
      if (container) {
        container.style.minHeight = '60px'; // Reset to initial container height
      }
    }
  } else {
    console.log('[SEND MESSAGE] Message is empty, not sending');
  }
};



// This Effect hook is check currentChatroom when enter for the first time in /chat
useEffect(() => {
    // Check if a UID exists in localStorage
    let storedUserId = getGlobalState('currUserId');
    let storedUsername = getGlobalState('currUserName');

    // if (true) { // temporarily change for usablle
    if (!storedUserId || !storedUsername) {
        // If no UID, generate a new one for first-time guest users
        const newUserId = uuidv4();
        const newUsername = `User_${newUserId.slice(0, 6)}`; // Example: "User_ab12"
      
        // Automatically register the guest user
        axios.post(`${local_url}/api/register`, {
            userId: newUserId,  // Use the generated UUID as the account name
            username: newUsername,
            email: `${newUserId}@guest_yoohi.com`,  // Using a default email for guest users
            password: newUserId  // For guest users, use the same UUID as password
        })
        .then(() => {
            // After successful registration, log in the user automatically
            return axios.post(`${local_url}/api/login`, {
                userId: newUserId,
                password: newUserId  // Log in with the same UUID
            });
        })
        .then(response => {

            // Log successful guest user registration and login
            // console.log('LLLLLL', {
            //   userId: newUserId,
            //   username: newUsername
            // });
            setUserId(newUserId);
            setUsername(newUsername);
            setGlobalState('currUserId', newUserId);
            setGlobalState('currUserName', newUsername);
            setGlobalState('currUserAvatar', response.data.user_avatar)
            // Fetch translations after successful login
            

            fetchMessages(
              getGlobalState('currChatroomId'),
              getGlobalState('selectedLanguageMe'),
              getGlobalState('selectedLanguageMeFirst'),
              getGlobalState('selectedLanguageMeSecond'),
              isSplit
              );
        })
        .catch(error => {
            console.error('Error registering or logging in the guest user:', error);
        });
    } else {
        // If userId and username exist, fetch past translations
        // console.log('KKKKK:', {
        //   userId: storedUserId,
        //   username: storedUsername
        // });

        setUserId(storedUserId);
        setUsername(storedUsername);
        setGlobalState('currUserId', storedUserId);
        setGlobalState('currUserName', storedUsername);







        
        if (getGlobalState('isLoggedIn')) {
          axios.get(`${local_url}/api/last-used-chatroom/${storedUserId}`)
          .then(response => {
            // console.log('MMMMMMMLast used chatroom detailsMMMMMMM:', {
            //   chatroomId: response.data.last_used_chatroom_id,
            //   chatroomName: response.data.name,
            //   isPrivate: response.data.is_private === '1'
            // });
            const lastUsedChatroomId = response.data.last_used_chatroom_id;
            const chatroomName = response.data.name;
            const isPrivate = response.data.is_private === '1';  // Convert string to boolean
            
            setGlobalState('currChatroomId', lastUsedChatroomId);
            setGlobalState('currChatroomName', chatroomName);
            setGlobalState('is_chatroom_private', isPrivate);
            
            fetchMessages(
              lastUsedChatroomId,
              getGlobalState('selectedLanguageMe'),
              getGlobalState('selectedLanguageMeFirst'),
              getGlobalState('selectedLanguageMeSecond'),
              isSplit
            );
          })
          .catch(error => {
            console.error('Error fetching chatroom details:', error);
          });
        }
    }

    // Emit a join event to the server to join the current chatroom
    socket.emit('join_room', { chatroomId: getGlobalState('currChatroomId'), userId: currUserId });


    // Cleanup WebSocket listener on component unmount
    return () => {
      //socket.disconnect(); 
    };
}, [currUserId, selectedLanguageMe]);





useEffect(() => {
  socket = io(process.env.REACT_APP_API_URL || window.location.origin, {
    path: '/socket.io/',
  });
  // const socket = io(local_url);
  socket.on('connect', () => {
    const currentSid = socket.id; // Get the current socket ID
    setSid(currentSid); // Save the sid in state
    // console.log('Connected to the server with SID:', currentSid);
    socket.emit('join_room', { chatroomId: getGlobalState('currChatroomId'), userId });
    socket.emit('test_message', 'Hello from the client!');
});

socket.on('test_response', (data) => {
    console.log('Received response from server:', data);
});


socket.on('user_joined_chatroom', (notification) => {
  // console.log('Received join notification:', notification);
  // console.log('Current user ID:', getGlobalState('currUserId'));
  
  if (notification.userId !== getGlobalState('currUserId')) {
    // console.log('Adding join notification to messages');
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, {
        id: `join-${Date.now()}`,
        content_type: 'join_notification',
        username: notification.username,
        userId: notification.userId,
        timestamp: notification.timestamp,
        avatar: notification.avatar
      }];
      // console.log('Updated messages:', newMessages);
      return newMessages;
    });
  } else {
    console.log('Skipping notification for self');
  }
});




socket.on('check_token_status_is_negative',  (data) => {
        // Set states directly since we know tokens are zero or negative
        setGlobalState('isTokenNegative', true);
        setGlobalState('selectedLanguageMe', 'original_text_raw');
        setGlobalState('selectedLanguageMePreview', 'original_text_raw');
        setSelectedLanguageMe('original_text_raw');
        setSelectedLanguageMePreview('original_text_raw');
});



// Add this socket listener after line 673
socket.on('already_leave_chatroom', (data) => {
  const { chatroomId, userId, is_leave } = data;
  
  // Check if this message is for the current user and chatroom
  if (chatroomId === getGlobalState('currChatroomId') && 
      userId === getGlobalState('currUserId') && 
      is_leave === true) {
    
    // Show alert and handle redirection
    if (window.confirm(t('You have been removed from the chatroom'))) {
      handlePrivateChatroom();
    }
    handlePrivateChatroom();
  }
});

  // WebSocket listener for real-time translations
  socket.on('new_message', (newMessage) => {
    // console.log('Received new message:', newMessage);
    if (newMessage.chatroom_id === getGlobalState('currChatroomId')) {
      // Clear loading message for this user
      setOtherUsersLoadingMessages(prev => {
        const newState = { ...prev };
        delete newState[newMessage.userId];
        return newState;
      });

      // Rest of your existing new_message handling code...
      if (newMessage.userId === currUserId) {
        setStreamingTranscript('');
        setStreamingTranslation('');
        setStreamingTranslationFirst('');
        setStreamingTranslationSecond('');
        setLoadingMessage(null);
      }



      
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, newMessage];
        
        // Only scroll if:
        // 1. There are more than 6 messages AND
        // 2. (User is near bottom OR it's user's own message)
        const shouldScroll = (prevMessages.length > 6) && (isScrolledNearBottom() || newMessage.userId === currUserId);
        
        // console.log('Message received, scroll decision:', { 
        //   messageCount: prevMessages.length,
        //   isNearBottom: isScrolledNearBottom(), 
        //   isOwnMessage: newMessage.userId === currUserId,
        //   shouldScroll 
        // });
        
        if (shouldScroll) {
          setTimeout(() => {
            if (chatContentRef.current) {
              chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
            }
          }, 100);
        }
      
        return updatedMessages;
      });

      // Handle unseen messages
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${newMessage.id}`);
        if (messageElement && 
            !isInViewport(messageElement) && 
            newMessage.userId !== currUserId) {
          setUnseenMessages(prev => [...prev, newMessage.id]);
          setShowJumpButton(true);
        }
      }, 100);
    }
    
    // Get the IDs of currently displayed messages
    const displayedMessageIds = messages.slice(-displayedMessageCount).map(message => message.id).join(',');

    fetchMessagesOnDemand(
      getGlobalState('currChatroomId'),
      getGlobalState('selectedLanguageMe'),
      getGlobalState('selectedLanguageMeFirst'),
      getGlobalState('selectedLanguageMeSecond'),
      isSplit,
      displayedMessageIds
    );
  });

  // for changing the language and make the updated translationshow up one by one
  socket.on('received_translated_existed_single_language', (data) => {
    // console.log('Received updated translation:', data);
    
    setMessages(prevMessages => {
      // console.log('Previous messages:', prevMessages);
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === data.id) {
          console.log('Updating message:', msg);
          return { ...data };
        }
        return msg;
      });
      // console.log('Updated messages:', updatedMessages);
      return updatedMessages;
    });
  });

  
  socket.on('receive_recall_message_status', (data) => {
    // console.log('Received recall status:', data);
    
    setMessages(prevMessages => {
      // console.log('Previous messages:', prevMessages);
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === data.messageId) {
          // console.log('Updating message:', msg);
          return { ...msg, is_recalled: '1', recall_username: data.username };
        }
        return msg;
      });
      // console.log('Updated messages:', updatedMessages);
      return updatedMessages;
    });
  });

  socket.on('receive_edited_message', (data) => {
    // console.log('Received edited message:', data);
    setMessages(prevMessages => {
      return prevMessages.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            original_text: data.editedText,
            translations: data.translations,
            is_edited: '1'
          };
        }
        return msg;
      });
    });

    fetchMessages(
      getGlobalState('currChatroomId'),
      getGlobalState('selectedLanguageMe'),
      getGlobalState('selectedLanguageMeFirst'),
      getGlobalState('selectedLanguageMeSecond'),
      isSplit
    );
  });

  socket.on('user_speaking_to_client_start', (data) => {
    // console.log('Received speaking start:', data); // Debug log
    if (data.userId !== getGlobalState('currUserId')) {
      setOtherUsersLoadingMessages(prev => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          username: data.username,
          avatar:data.avatar, 
          content_type: 'loading',
          timestamp: new Date().toISOString()
        }
      }));
    }
  });

  socket.on('user_speaking_to_client_stop', (data) => {
    // console.log('Received speaking stop:', data); // Debug log
    if (data.userId !== getGlobalState('currUserId') && 
    otherUsersLoadingMessages[data.userId]) {
      // Set loading message to show "Translation Result Enhancing by AI"
      setOtherUsersLoadingMessages(prev => ({
        ...prev,
        [data.userId]: {
          ...prev[data.userId],
          enhancing: true // Add flag to show enhancement message
        }
      }));

      // Clear transcripts and translations as before
      setOtherUsersTranscripts(prev => {
        const newState = { ...prev };
        delete newState[data.userId];
        return newState;
      });

      setOtherUsersTranslations(prev => {
        const newState = { ...prev };
        delete newState[data.userId];
        return newState;
      });
    }
  });


  socket.on('user_speaking_to_client_content_transcript', async (data) => {
    // console.log('Received transcript:', data);
    if (data.userId !== getGlobalState('currUserId')) {
      // Update transcript
      setOtherUsersTranscripts(prev => ({
        ...prev,
        [data.userId]: {
          username: data.username,
          avatar: data.avatar, 
          streamingTranscript: data.streamingTranscript
        }
      }));
  // Listen for response
socket.on('avatar_response', (response) => {
  // console.log("mmmmmmmmm");
    setGlobalState('currUserAvatar', response.user_avatar);
    // Use the avatar URL as needed
// Add this event listener
socket.on('text_upload_failed', (error) => {
  console.error('Text upload failed:', error);
  // Optionally, notify the user about the failure
});
});
      // Handle translation
      try {
        translate.engine = "google";
        const sourceLang = getSimpleLanguageCode(selectedSourceLanguage);
        translate.from = sourceLang;

        // Always translate for single view (since isSplit is always false)
        const targetLang = getLanguageCode(getGlobalState('selectedLanguageMe')).split('-')[0];
        
        if (sourceLang !== targetLang) {
          let translatedText = await translate(data.streamingTranscript, targetLang);
          // console.log('Translation result:', translatedText); // Debug log
          
          setOtherUsersTranslations(prev => {
            const newState = {
              ...prev,
              [data.userId]: {
                username: data.username,
                avatar: data.avatar,
                translatedText: translatedText
              }
            };
            // console.log('Updated translations state:', newState); // Debug log
            return newState;
          });
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    }
  });



    // Fetch chatrooms when component mounts
    socket.emit('fetch_chatrooms', { userId: getGlobalState('currUserId') });

    // Listen for chatrooms update
    socket.on('chatrooms_fetched', (data) => {
      setChatrooms(data.chatrooms);
    });




  // Cleanup: Disconnect the WebSocket when the component unmounts
  return () => {
    socket.disconnect();
  };
}, []);  // The empty dependency array ensures this runs only once when the component mounts


const fetchMessagesOnDemand = (chatroomId, language, languageFirst, languageSecond, splitMode, messageIds) => {
  // console.log("fetchMessagesOnDemand", { chatroomId, language, languageFirst, languageSecond, splitMode, messageIds });
  
  const firstLang = splitMode ? languageFirst : language;
  const secondLang = splitMode ? languageSecond : language;

  axios.get(`${local_url}/api/get-messages-on-demand/${chatroomId}/${language}/${firstLang}/${secondLang}/${splitMode}`, {
    params: {
      userId: getGlobalState('currUserId'),
      message_ids: messageIds,
      lowCostMode: getGlobalState('lowCostMode'),
      isGuestMode: getGlobalState('isGuestMode'),
      currHostUserId: getGlobalState('currHostUserId'),
      socketId: socket.id  // Add this line to send the socket ID
    }
  })
    .then(response => {
      // Update only the messages that were fetched
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        response.data.messages.forEach(updatedMsg => {
          const index = updatedMessages.findIndex(msg => msg.id === updatedMsg.id);
          if (index !== -1) {
            updatedMessages[index] = {
              ...updatedMsg,
              is_recalled: updatedMsg.is_recalled || '0',
              recall_username: updatedMsg.recall_username || updatedMsg.username,
              reply_to_message_id: updatedMsg.reply_to_message_id || -1,
            };
          }
        });
        return updatedMessages;
      });
      console.log("Updated messages with new translations");
    })
    .catch(error => {
      console.error(t('Error fetching messages on demand:'), error);
    });
};



  const fetchMessages = (chatroomId, language, languageFirst, languageSecond, splitMode) => {
    // console.log("fetchMessages", { chatroomId, language, languageFirst, languageSecond, splitMode });
    
    // const firstLang = splitMode ? languageFirst : language;
    // const secondLang = splitMode ? languageSecond : language;

    //1.2 change for updating the small load
    let lang_raw = "original_text_raw";
    language = lang_raw;
    const firstLang = splitMode ? languageFirst : language;
    const secondLang = splitMode ? languageSecond : language;
    axios.get(`${local_url}/api/all-messages/${chatroomId}/${language}/${firstLang}/${secondLang}/${splitMode}`, {
      params: {
        userId: getGlobalState('currUserId'),
        lowCostMode: getGlobalState('lowCostMode'),
        isGuestMode: getGlobalState('isGuestMode'),
        currHostUserId: getGlobalState('currHostUserId')
      }
    })
      .then(response => {
        // Make sure each message has the correct recall status
        const messages = response.data.messages.map(msg => ({
          ...msg,
          is_recalled: msg.is_recalled || '0',
          recall_username: msg.recall_username || msg.username,
          reply_to_message_id: msg.reply_to_message_id || -1,
        }));
        setMessages(messages);
        // console.log("Fetched messages for chatroom:", chatroomId);
      })
      .catch(error => {
        console.error(t('Error fetching all messages:'), error);
      });
  };



  const handlePrivateChatroom = () => {
    const token = getGlobalState('token');
    if (!token) {
      console.error('User not logged in');
      return;
    }

    axios.post(`${local_url}/api/private-chatroom`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((response) => {
      const { chatroomId, chatroomName } = response.data;
      setGlobalState('currChatroomId', chatroomId);
      setGlobalState('currChatroomName', chatroomName);
      setGlobalState('is_chatroom_private', true); // Set to true for private chatroom
      window.location.href = `${window.location.origin}/chat`;
    })
    .catch((error) => {
      console.error('Error accessing private chatroom:', error);
    });
  };




    // useEffect to handle side effects based on `isRecording` state
    useEffect(() => {
      if (isRecording) {
        startRecording(); // Start recording when `isRecording` is true
      } else {
        stopRecording(); // Stop recording when `isRecording` is false
      }
    }, [isRecording]); // Trigger when `isRecording` changes

      // Add this function to handle source language changes
    const handleSourceLanguageChange = (language) => {
        setSelectedSourceLanguage(language);
        if (language === 'System Language') {
            language = getGlobalState('selectedSourceLanguage');
        }
        setGlobalState('selectedSourceLanguage', language);
        
        
        const restartRecognition = () => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.lang = getLanguageCode(language);
              recognitionRef.current.start();
            }
          } catch (error) {
            console.error('Error in restart attempt:', error);
            setTimeout(restartRecognition, 100);
          }
        };
      
        if (recognitionRef.current) {
          // Add onend handler before stopping
          recognitionRef.current.onend = () => {
            // Remove the onend handler to prevent multiple restarts
            recognitionRef.current.onend = null;
            setTimeout(restartRecognition, 100);
          };
      
          try {
            recognitionRef.current.abort(); // Use abort() instead of stop() to force immediate stop
          } catch (error) {
            console.error('Error stopping recognition:', error);
            // If abort fails, try stop
            try {
              recognitionRef.current.stop();
            } catch (secondError) {
              console.error('Error on second stop attempt:', secondError);
              // If both fail, try to restart anyway
              setTimeout(restartRecognition, 100);
            }
          }
        }
      };

      const [finalTranscript, setFinalTranscript] = useState('');
      const getSimpleLanguageCode = (language) => {
        const languageCodes = {
          'Chinese': 'zh',
          'Japanese': 'ja',
          'English': 'en',
          'Arabic': 'ar',
          'Spanish': 'es',
          'French': 'fr',
          'Russian': 'ru',
          'Portuguese': 'pt',
          'German': 'de',
          'Hindi': 'hi',
          'Bengali': 'bn',
          'Korean': 'ko',
          'Italian': 'it',
          'Turkish': 'tr',
          'Vietnamese': 'vi',
          'Dutch': 'nl'
        };
        return languageCodes[language] || 'en';
      };

// Also add error handler to the recognition setup
const setupRecognition = () => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 3;
    recognitionRef.current.lang = getLanguageCode(selectedSourceLanguage);


    // Add error handler
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (isRecording) {
        setTimeout(() => {
          try {
            // Only try to start if we're not already running
            if (recognitionRef.current && !recognitionRef.current.running) {
              recognitionRef.current.start();
            }
          } catch (error) {
            console.error('Error in error recovery:', error);
            setTimeout(() => setupRecognition(), 100);
          }
        }, 100);
      }
    };

    // Add state tracking
    recognitionRef.current.running = false;

    // Track recognition state
    recognitionRef.current.onstart = () => {
      recognitionRef.current.running = true;
    };

    recognitionRef.current.onend = () => {
      recognitionRef.current.running = false;
    };


// Then modify the onresult handler in setupRecognition
recognitionRef.current.onresult = async (event) => {
  let interimTranscript = '';
  let currentFinalTranscript = finalTranscript; // Get current final transcript

  for (let i = event.resultIndex; i < event.results.length; ++i) {
    const transcript = event.results[i][0].transcript;
    
    if (event.results[i].isFinal) {
      // Add to final transcript when the result is final
      currentFinalTranscript += transcript;
      setFinalTranscript(currentFinalTranscript);
    } else {
      // Add to interim transcript when the result is not final
      interimTranscript += transcript;
    }
  }

  // Combine final and interim transcripts for display
  const fullTranscript = interimTranscript;
  
  
// Update the state
setStreamingTranscript(fullTranscript);

// // Emit immediately using the fullTranscript
// console.log('Emitting transcript:', fullTranscript);
if (isRecording) {
socket.emit('user_speaking_from_client_content_transcript', {
  userId: getGlobalState('currUserId'),
  username: getGlobalState('currUserName'),
  chatroomId: getGlobalState('currChatroomId'),
  streamingTranscript: fullTranscript  // Use fullTranscript directly
});
    };
  
  // Translation logic
  try {
    translate.engine = "google";
    const sourceLang = getSimpleLanguageCode(selectedSourceLanguage); 
    translate.from = sourceLang;
    
    if (isSplit) {
      // Translate for split view
      const firstLang = getLanguageCode(selectedLanguageMeFirst).split('-')[0];
      const secondLang = getLanguageCode(selectedLanguageMeSecond).split('-')[0];
      
      let translatedTextFirst = await translate(fullTranscript, firstLang);
      let translatedTextSecond = await translate(fullTranscript, secondLang);
      
      setStreamingTranslationFirst(translatedTextFirst);
      setStreamingTranslationSecond(translatedTextSecond);
    } else {
      // Translate for single view
      const targetLang = getLanguageCode(selectedLanguageMe).split('-')[0];
      if (sourceLang !== targetLang) {
        let translatedText = await translate(fullTranscript, targetLang);
        setStreamingTranslation(translatedText);
      } else {
        setStreamingTranslation('');
      }
    }
  } catch (error) {
    console.error('Translation error:', error);
  }
};


      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setTimeout(() => setupRecognition(), 100);
      }
  }
};

const startRecording = () => {
        setStreamingTranscript('');
        setStreamingTranslation('');
        setStreamingTranslationFirst('');
        setStreamingTranslationSecond('');
       setFinalTranscript(''); // Add this line at the beginning of startRecording
       
  // Also clear the old recognition instance
  if (recognitionRef.current) {
    // console.log("CDCD");
    try {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      // console.log("ABABABABABAB");
    } catch(e) {
      console.error('Error aborting speech recognition:', e);
    }
    recognitionRef.current = null;
  }

       
        setIsRecording(true);
        setShowSourceLanguageMenu(true); // Show the menu when recording starts
        setTimeRemaining(time_remaining); // Reset the timer
        // console.log("B")
        // console.log(isRecording);

// Request avatar
      socket.emit('get_avatar_socket', { userId:getGlobalState('currUserId') });
        socket.emit('user_speaking_from_client_start', {
          userId: getGlobalState('currUserId'),
          username: getGlobalState('currUserName'),
          chatroomId: getGlobalState('currChatroomId')
        });
        // Add loading message when recording starts
        setLoadingMessage({
          userId: currUserId,
          username: currUserName,
          avatar:getGlobalState("currUserAvatar"),
          content_type: 'loading',
          streamingTranscript: '',
          streamingTranslation: '',
          streamingTranslationFirst: '',
          streamingTranslationSecond: ''
        });

        // Start the countdown timer
        const interval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              // console.log("A")
              // console.log(isRecording);
              // setIsRecording(); // Set recording to false when timer hits zero
              toggleRecording();
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerInterval(interval); // Save the interval for later clearing
        setupRecognition();
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((mediaStream) => {
            setStream(mediaStream);
            const options = {
              mimeType: 'audio/webm;codecs=opus',
              numberOfAudioChannels: 1,
              recorderType: RecordRTC.StereoAudioRecorder,
              checkForInactiveTracks: true,
              timeSlice: 1000,
              audioBitsPerSecond: 16000,
            };
    
            const recordRTC = new RecordRTC(mediaStream, options);
            setRecorder(recordRTC);
            recordRTC.startRecording();

            // Set up inactivity timeout
            resetInactivityTimeout();
          })
          .catch(error => {
            console.error('Error accessing microphone:', error);
            setIsRecording(false);
          });
};

  const stopRecording = () => {

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    socket.emit('user_speaking_from_client_stop', {
      userId: getGlobalState('currUserId'),
      username: getGlobalState('currUserName'),
      chatroomId: getGlobalState('currChatroomId')
    });
            // Stop the stream tracks
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              setStream(null);
            }
    if (recorder) {
      recorder.stopRecording(() => {
        const audioBlob = recorder.getBlob();
        console.log(`Audio Blob size: ${audioBlob.size / 1024} KB`); // Log the blob size
        const audioUrl = URL.createObjectURL(audioBlob);
        setLocalAudioUrl(audioUrl);
        sendAudioToServer(audioBlob);
        setIsRecording(false); // Update recording state
        recorder.destroy(); // Optional: Clear recorder object
        setRecorder(null);
        clearInterval(timerInterval); // Stop the countdown



        // Reset inactivity timeout
        resetInactivityTimeout();
        setShowSourceLanguageMenu(false); // Hide the menu when recording stops
        setStreamingTranscript('');
        setStreamingTranslation('');
        setStreamingTranslationFirst('');
        setStreamingTranslationSecond('');
       setFinalTranscript(''); // Add this line at the beginning of startRecording
             // **New: Clear the loadingMessage state**
      // setLoadingMessage(null);
      });
    }
  };

  const resetInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }, 600); // 60 seconds (1 minute) of inactivity
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const toggleRecording = () => {
    setIsRecording(!isRecording); 
  };
 
  
  const sendAudioToServer = (audioBlob, retryCount = 0) => {
    const reader = new FileReader();
    const audioElement = new Audio(URL.createObjectURL(audioBlob));
    
    audioElement.onloadedmetadata = () => {
        const durationInMinutes = audioElement.duration / 60; // Convert seconds to minutes
        
        reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1];
            console.log('Audio duration in minutes:', durationInMinutes);

            socket.emit('upload_audio', {
                userId: getGlobalState('currUserId'),
                chatroomId: getGlobalState('currChatroomId'),
                audio: base64Audio,
                username: username,
                toLanguageMe: selectedLanguageMe,
                toLanguageMeFirst: selectedLanguageMeFirst,
                toLanguageMeSecond: selectedLanguageMeSecond,
                isSplit: isSplit,
                replyToMessageId: replyToMessage ? replyToMessage.id : -1,
                lowCostMode: getGlobalState('lowCostMode'),
                durationInMinutes: durationInMinutes || 0.1, // Provide default value
                isGuestMode: getGlobalState('isGuestMode'),
                currHostUserId: getGlobalState('currHostUserId')
            }, (ack) => {
                if (!ack && retryCount < MAX_RETRIES) {
                    console.log(`Retry attempt ${retryCount + 1} for audio upload`);
                    setTimeout(() => sendAudioToServer(audioBlob, retryCount + 1), RETRY_DELAY);
                } else if (!ack) {
                    console.error('Failed to upload audio after maximum retries');
                }
            });
        };
        reader.readAsDataURL(audioBlob);
        
        // Clean up
        URL.revokeObjectURL(audioElement.src);
    };
    setReplyToMessage(null); // Clear the reply preview after sending
  };

  // Add this event listener
  socket.on('audio_upload_failed', (error) => {
    console.error('Audio upload failed:', error);
    // Optionally, notify the user about the failure
  });






  // Clear History Button
  const clearHistory = () => {
    axios.delete(`${local_url}/api/clear-history/${getGlobalState('currChatroomId')}`)
      .then(response => {
        console.log('History cleared successfully.');
        setMessages([]); // Clear the messages state
      })
      .catch(error => {
        console.error('Error clearing history:', error);
      });
  };
  
  // this is for the right button
  const toggleMessageVisibility = (index) => {
    setVisibleMessages(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }));
  };
  const toggleOriginalVisibility = (index) => {
    setVisibleOriginals(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }));
  };

 
  // const languageOptions = ['Chinese', 'English', 'Japanese', 'Arabic', 'Spanish', 'French', 'Russian', 'Portuguese', 'German', 'Hindi', 'Bengali', 'Korean', 'Italian', 'Turkish', 'Vietnamese', 'Dutch'];
  const languageOptions = [
    'Chinese',
     'English',
      'Japanese',
       'Arabic', 
       'Spanish',
        'French',
         'Russian',
          'Portuguese',
           'German',
            'Hindi',
             'Bengali', 
             'Korean',
              'Italian', 
              'Turkish',
               'Vietnamese', 
               'Dutch',
  ];
  
  const languageOptionsStreamingDetect = [
    'System Language',
    'Chinese',
     'English',
      'Japanese',
       'Arabic', 
       'Spanish',
        'French',
         'Russian',
          'Portuguese',
           'German',
            'Hindi',
             'Bengali', 
             'Korean',
              'Italian', 
              'Turkish',
               'Vietnamese', 
               'Dutch',
  ];
  // Update the language selection handler
  const handleLanguageChange = (e, position) => {
    console.log('[LANGUAGE CHANGE] Dropdown triggered');
    console.log('[LANGUAGE CHANGE] Event:', e);
    console.log('[LANGUAGE CHANGE] Position:', position);
    
    let newLanguage = e.target.value;
    console.log('[LANGUAGE CHANGE] New language selected:', newLanguage);
    
    if (newLanguage === "Custom") {
      console.log('[LANGUAGE CHANGE] Custom mode activated');
      setGlobalState('isCustomFilter', true);
      newLanguage = customFilterContent ;
    } else {
      setGlobalState('isCustomFilter', false);
    }

    if (!isSplit) {
      console.log('[LANGUAGE CHANGE] Single mode - updating language to:', newLanguage);
      // Single mode - update all states to maintain sync
      setSelectedLanguageMe(newLanguage);
      // setSelectedLanguageMeFirst(newLanguage);
      // setSelectedLanguageMeSecond(newLanguage);
      setGlobalState('selectedLanguageMe', newLanguage);
      // setGlobalState('selectedLanguageMeFirst', newLanguage);
      // setGlobalState('selectedLanguageMeSecond', newLanguage);
      
      console.log('[LANGUAGE CHANGE] Fetching all messages...');
      fetchMessages(
        getGlobalState('currChatroomId'),
        newLanguage,
        newLanguage,
        newLanguage,
        false
      );

    // Get the IDs of currently displayed messages
    const displayedMessageIds = messages.slice(-displayedMessageCount).map(message => message.id).join(',');
    console.log('[LANGUAGE CHANGE] Fetching on-demand messages for IDs:', displayedMessageIds);

    fetchMessagesOnDemand(
      getGlobalState('currChatroomId'),
      getGlobalState('selectedLanguageMe'),
      getGlobalState('selectedLanguageMeFirst'),
      getGlobalState('selectedLanguageMeSecond'),
      isSplit,
      displayedMessageIds
    );


    } else {
      console.log('[LANGUAGE CHANGE] Split mode - position:', position, 'language:', newLanguage);
      // Split mode - update respective state
      if (position === 'left') {
        console.log('[LANGUAGE CHANGE] Updating left language');
        setSelectedLanguageMeFirst(newLanguage);
        setGlobalState('selectedLanguageMeFirst', newLanguage);
        setSelectedLanguageMe(newLanguage); // Keep main state in sync with left
        setGlobalState('selectedLanguageMe', newLanguage);
      } else {
        console.log('[LANGUAGE CHANGE] Updating right language');
        setSelectedLanguageMeSecond(newLanguage);
        setGlobalState('selectedLanguageMeSecond', newLanguage);
      }
      console.log('[LANGUAGE CHANGE] Fetching messages for split mode');
      fetchMessages(
        getGlobalState('currChatroomId'),
        getGlobalState('selectedLanguageMe'),
        getGlobalState('selectedLanguageMeFirst'),
        getGlobalState('selectedLanguageMeSecond'),
        true
      );
    }
    console.log('[LANGUAGE CHANGE] Language change completed');
  };

  // Add this function to handle the Memo toggle
  const handleMemoToggle = () => {
    setShowNote(prevState => !prevState);
  };

  const handleTextBoxClick = () => {
    setIsExpanded(true);
    document.querySelector('.floating-record-btn').classList.add('moved');
    document.querySelector('.text-box-container').classList.add('expanded');
  };

  const handleTextBoxBlur = () => {
    setIsExpanded(false);
    document.querySelector('.floating-record-btn').classList.remove('moved');
    document.querySelector('.text-box-container').classList.remove('expanded');
    setIsTextBoxFocused(false);
  };

  const handleBackClick = () => {
    setIsSliding(true);
  };

  const handleChatroomSelect = (chatroomId, chatroomName) => {
    // Update localStorage
    console.log("yesss")
    setGlobalState('currChatroomId', chatroomId);
    setGlobalState('currChatroomName', chatroomName);

    // Update global state
    setGlobalState('currChatroomId', chatroomId);
    setGlobalState('currChatroomName', chatroomName);

    // Set isSliding to false
    setIsSliding(false);

    // Fetch messages for the new chatroom
    fetchMessages(chatroomId, 
      getGlobalState('selectedLanguageMe'),
      getGlobalState('selectedLanguageMeFirst'),
      getGlobalState('selectedLanguageMeSecond'),
      isSplit);

    // Emit a join event to the server to join the new chatroom
    socket.emit('join_room', { 
      chatroomId: chatroomId, 
      userId: getGlobalState('currUserId') 
    }, (response) => {
      console.log('join_room event emitted', response);
    });

    console.log(`Attempting to join room: ${chatroomId}`);
  };

  // Add this swipe handler
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      if (eventData.initial[0] < window.innerWidth * 0.1) {
        setIsSliding(true);
      }
    },
    trackMouse: true,
  });

  // Add this helper function to convert language names to language codes
  const getLanguageCode = (language) => {
    // If language contains a hyphen, get the part before it
    if (language.includes('-')) {
      language = language.split('-')[0];
    }

    const languageCodes = {
      'Chinese': 'zh-CN',
      '中文':'zh-CN',
      '汉语':'zh-CN',
      'Japanese': 'ja-JP',
      '日本語': 'ja-JP',
      'English': 'en-US', 
      'European':'en-US', 
      'Arabic': 'ar-SA',
      'عربي': 'ar-SA',
      'Spanish': 'es-ES',
      'Español': 'es-ES',
      'French': 'fr-FR',
      'Français': 'fr-FR', 
      'Russian': 'ru-RU',
      'Русский': 'ru-RU',
      'Portuguese': 'pt-PT',
      'Português': 'pt-PT',
      'German': 'de-DE',
      'Deutsch': 'de-DE',
      'Hindi': 'hi-IN',
      'हिन्दी': 'hi-IN',
      'Bengali': 'bn-IN',
      'বাংলা': 'bn-IN',
      'Korean': 'ko-KR',
      '한국어': 'ko-KR',
      'Italian': 'it-IT',
      'Italiano': 'it-IT',
      'Turkish': 'tr-TR', 
      'Türkçe': 'tr-TR',
      'Vietnamese': 'vi-VN',
      'Tiếng Việt': 'vi-VN',
      'Dutch': 'nl-NL',
      'Nederlands': 'nl-NL'
    };
    return languageCodes[language] || 'en-US';
  };

  // Update the handleTtsToggle function
  const handleTtsToggle = (messageId, text, position = null) => {
    setTtsStatus(prev => {
      const newStatus = {
        ...prev,
        [messageId]: !prev[messageId]
      };
      
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      // If turning on TTS for this message
      if (newStatus[messageId]) {
        if ('speechSynthesis' in window) {
          // Get available voices first
          const voices = window.speechSynthesis.getVoices();
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Set language based on split mode and position
          let targetLanguage;
          if (isSplit && position) {
            targetLanguage = position === 'top' 
              ? getLanguageCode(getGlobalState('selectedLanguageMeFirst'))
              : getLanguageCode(getGlobalState('selectedLanguageMeSecond'));
          } else {
            targetLanguage = getLanguageCode(getGlobalState('selectedLanguageMe'));
          }

          // Find a matching voice for the target language
          const matchingVoice = voices.find(voice => 
            voice.lang.toLowerCase().includes(targetLanguage.toLowerCase().split('-')[0])
          );
          
          // Set the voice if found, otherwise use default
          if (matchingVoice) {
            utterance.voice = matchingVoice;
          }
          utterance.lang = targetLanguage;
          utterance.rate = 1.0;
          
          // For iOS, ensure voices are loaded
          if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
              const updatedVoices = window.speechSynthesis.getVoices();
              const voice = updatedVoices.find(v => 
                v.lang.toLowerCase().includes(targetLanguage.toLowerCase().split('-')[0])
              );
              if (voice) {
                utterance.voice = voice;
              }
              // Proceed with speech
              handleSpeech(utterance, text, messageId);
            };
          } else {
            // Proceed with speech directly if voices are already loaded
            handleSpeech(utterance, text, messageId);
          }
        }
      }
      
      return newStatus;
    });
  };

  // Helper function to handle the actual speech
  const handleSpeech = (utterance, text, messageId) => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setTtsStatus(prev => ({
        ...prev,
        [messageId]: false
      }));
    };

    if (isIOS) {
      // Split into shorter phrases for iOS
      const phrases = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
      phrases.forEach((phrase, index) => {
        setTimeout(() => {
          const phraseUtterance = new SpeechSynthesisUtterance(phrase);
          phraseUtterance.voice = utterance.voice;
          phraseUtterance.lang = utterance.lang;
          phraseUtterance.rate = utterance.rate;
          
          if (index === 0) {
            phraseUtterance.onstart = () => setIsSpeaking(true);
          }
          if (index === phrases.length - 1) {
            phraseUtterance.onend = () => {
              setIsSpeaking(false);
              setTtsStatus(prev => ({
                ...prev,
                [messageId]: false
              }));
            };
          }
          window.speechSynthesis.speak(phraseUtterance);
        }, index * 250);
      });
    } else {
      window.speechSynthesis.speak(utterance);
    }
  };

  // Add this useEffect for iOS compatibility
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

  // Add toggle handler
  const handleSplitToggle = () => {
    const newSplitState = !isSplit;
    setIsSplit(newSplitState);
    
    // Fetch messages with updated split state
    fetchMessages(
      getGlobalState('currChatroomId'),
      getGlobalState('selectedLanguageMe'),
      getGlobalState('selectedLanguageMeFirst'),
      getGlobalState('selectedLanguageMeSecond'),
      newSplitState
    );
  };

  // Add this new function to handle image clicks
  const handleImageClick = (imageSrc) => {
    setSelectedImage(imageSrc);
    setShowImageModal(true);
  };

  // Update the handleImageDownload function
  const handleImageDownload = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && isPWA) {
      // Fetch the image and save it using file-saver
      fetch(selectedImage)
        .then(response => response.blob())
        .then(blob => {
          saveAs(blob, 'chat-image.jpg');
        })
        .catch(error => {
          console.error('Error downloading image:', error);
        });
    } else {
      // For non-iOS devices, use direct file-saver
      saveAs(selectedImage, 'chat-image.jpg');
    }
  };

  // Update the onEmojiClick function
  const onEmojiClick = (emojiObject) => {
    const { emoji } = emojiObject;
    if (textInputRef.current) {
      // Store the current cursor position
      const start = textInputRef.current.selectionStart;
      const end = textInputRef.current.selectionEnd;
      const currentMessage = message || '';
      const before = currentMessage.substring(0, start);
      const after = currentMessage.substring(end);
      const newMessage = before + emoji + after;
      
      // Set the new message
      setMessage(newMessage);
      
      // Calculate and set the new cursor position (after the inserted emoji)
      const newCursorPosition = start + emoji.length;
      
      // Use setTimeout to ensure the cursor is set after the state update
      setTimeout(() => {
        textInputRef.current.focus();
        textInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    } else {
      setMessage((prevMessage) => (prevMessage || '') + emoji);
    }
  };

  // Add this useEffect to handle cursor position
  useEffect(() => {
    if (cursorPosition !== null && textInputRef.current) {
      textInputRef.current.selectionEnd = cursorPosition;
      setCursorPosition(null);
    }
  }, [cursorPosition]);

  // Update the emoji button click handler
  const handleEmojiButtonClick = (e) => {
    e.stopPropagation();
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Add this effect to handle clicking outside emoji picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmojiPicker && !e.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  // Add this new handler function
  const handlePhotoChangeRaw = async (e) => {
    const file = e.target.files[0];
    if (file) {
        const photoUrl = URL.createObjectURL(file);
        setLocalPhotoUrl(photoUrl);
        setPhotoFile(file);

        new Compressor(file, {
            quality: 0.4,
            success(result) {
                sendPhotoToServerRaw(result);
            },
            error(err) {
                console.log(err.message);
            }
        });
    }
  };

  // Add this new server communication function
  const sendPhotoToServerRaw = (file) => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('chatroomId', getGlobalState('currChatroomId'));
    formData.append('photo', file, CryptoJS.MD5(Date.now() + Math.random().toString()).toString().concat(".jpeg"));
    formData.append('username', username);
    
    axios.post(`${local_url}/api/upload-message-photo-raw`, formData)
        .then((response) => {
            // console.log('Photo uploaded:', response.data);
            fetchMessages(
                getGlobalState('currChatroomId'),
                getGlobalState('selectedLanguageMe'),
                getGlobalState('selectedLanguageMeFirst'),
                getGlobalState('selectedLanguageMeSecond'),
                isSplit
            );
        })
        .catch((error) => {
            console.error(t('Error uploading photo:'), error);
        });
  };

  // Update the image button to use a hidden input
  const imageInputRef = useRef(null);

  // Update the onClick handler for the image button
  const handleImageButtonClick = () => {
    imageInputRef.current.click();
  };

  // Add this function near the top of your component
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show toast notification
      toast.success(t('Text copied to clipboard'), {
        position: "bottom-center",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        style: {
          marginBottom: '100px',
          backgroundColor: '#000000',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center'
        }
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast.error(t('Failed to copy text'), {
        position: "bottom-center",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        style: {
          marginBottom: '100px',
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center'
        }
      });
    });
  };

  const handleTouchStart = (e, messageId) => {
    const touch = e.touches[0];
    touchStartPosition.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimeout.current = setTimeout(() => {
      const rect = e.target.getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        messageId
      });
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const moveThreshold = 10; // pixels
    
    if (Math.abs(touch.clientX - touchStartPosition.current.x) > moveThreshold ||
        Math.abs(touch.clientY - touchStartPosition.current.y) > moveThreshold) {
      clearTimeout(longPressTimeout.current);
    }
  };



// Update the handleTextClick function
const handleTextClick = (e, text, messageId, translatedText = null) => {
  e.preventDefault();
  const { left, top } = calculateMenuPosition(e.clientX, e.clientY);
  
  setTextContextMenu({
    visible: true,
    x: left,
    y: top,
    text: text,
    messageId: messageId,
    translatedText: translatedText
  });
};

  // Add these placeholder functions
  const handleCopyOriginalText = () => {
    if (textContextMenu.text) {
      copyToClipboard(textContextMenu.text);
      setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
    }
  };

  const handleEditOriginalText = () => {
    // console.log('Edit text:', textContextMenu.text);
    // console.log('Message ID:', textContextMenu.messageId);
    
    // Find the message index in the messages array
    const messageIndex = messages.findIndex(msg => msg.id === textContextMenu.messageId);
    
    // Set visibility for this message to true
    setVisibleMessages(prev => ({
      ...prev,
      [messageIndex]: true
    }));
    
    // Set editing state
    setMessages(prev => {
      const updated = prev.map(msg => ({
        ...msg,
        isEditing: msg.id === textContextMenu.messageId
      }));
      console.log('Updated messages:', updated);
      return updated;
    });
    
    setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
  };

  const handleRecallOriginalText = () => {
    // console.log('Recall triggered for message:', textContextMenu.messageId);
    // console.log('Current chatroom:', getGlobalState('currChatroomId'));
    // console.log('Current user:', getGlobalState('currUserId'));
    
    socket.emit('recall_message', {
      chatroomId: getGlobalState('currChatroomId'),
      messageId: textContextMenu.messageId,
      userId: getGlobalState('currUserId')
    }, (response) => {
      // Add callback to check if emit was successful
      console.log('Recall emit response:', response);
    });
    
    setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
  };

  // Add this effect to handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (textContextMenu.visible) {
        setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
      }
    };

    const chatContent = document.querySelector('.chat-content');
    if (chatContent) {
      chatContent.addEventListener('scroll', handleScroll);
      return () => chatContent.removeEventListener('scroll', handleScroll);
    }
  }, [textContextMenu.visible]);

  // Add this effect to handle clicking outside the menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if the click is outside the menu
      if (textContextMenu.visible && 
          !e.target.closest('.text-context-menu') && 
          !e.target.closest('.text-section')) {
        setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
      }
    };

    // Add the event listener to the document
    document.addEventListener('click', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [textContextMenu.visible]);

  // Update socket listener with logging
  useEffect(() => {
    socket.on('receive_recall_message_status', (data) => {
      console.log('Received recall status:', data);
      setMessages(prevMessages => {
        console.log('Updating messages for recall:', data.messageId);
        return prevMessages.map(msg => {
          if (msg.id === data.messageId) {
            console.log('Found message to recall:', msg);
            return { ...msg, is_recalled: '1', recall_username: data.username };
          }
          return msg;
        });
      });
    });

    return () => {
      socket.off('receive_recall_message_status');
    };
  }, []);

  // Add these new handler functions near your other handlers
  const handleResendEdit = (messageId) => {
    const editedText = editTextareaRef.current?.value;
    // console.log('Resend clicked for message:', messageId);
    // console.log('Edited text:', editedText);
    
    // Emit the edited text to server
    socket.emit('edit_existed_text', {
      userId: getGlobalState('currUserId'),
      messageId: messageId,
      editedText: editedText,
      chatroomId: getGlobalState('currChatroomId'),
      toLanguageMe: selectedLanguageMe,
      toLanguageMeFirst: selectedLanguageMeFirst,
      toLanguageMeSecond: selectedLanguageMeSecond,
      isSplit: isSplit,
      lowCostMode: getGlobalState('lowCostMode'),
      isGuestMode: getGlobalState('isGuestMode'),
      currHostUserId: getGlobalState('currHostUserId')
    });

    // Reset edit mode
    setMessages(prev => prev.map(msg => ({
      ...msg,
      isEditing: msg.id === messageId ? false : msg.isEditing
    })));
  };

  const handleCancelEdit = (messageId) => {
    setMessages(prev => prev.map(msg => ({
      ...msg,
      isEditing: msg.id === messageId ? false : msg.isEditing
    })));
  };

  const handleTextBoxFocus = () => {
    setIsTextBoxFocused(true);
  };



  // Add click handler for the entire document
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (textInputRef.current && !textInputRef.current.contains(event.target)) {
        setIsTextBoxFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add new handler for copying translated text
  const handleCopyTranslatedText = () => {
    if (textContextMenu.translatedText) {
      copyToClipboard(textContextMenu.translatedText);
      setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
    }
  };

  // Add handler for left bubble text click
  const handleLeftBubbleTextClick = (e, text, messageId, translatedText = null) => {
    e.preventDefault();
    console.log('Left bubble text clicked - MessageId:', messageId);
    
    setLeftBubbleContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      text: text,
      messageId: messageId,
      translatedText: translatedText
    });
  };

  // Add effect to handle clicking outside the left bubble menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (leftBubbleContextMenu.visible && 
          !e.target.closest('.text-context-menu') && 
          !e.target.closest('.text-section')) {
        setLeftBubbleContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [leftBubbleContextMenu.visible]);




  // Add handler function for reply
  const handleReplyMessage = (messageId) => {
    // console.log("Handling reply to message ID:", messageId); // Debug log
    // Find the message in messages array using messageId
    const messageToReply = messages.find(m => m.id === messageId);
    // console.log("Found message to reply to:", messageToReply); // Debug log
    
    if (messageToReply) {
      setReplyToMessage(messageToReply);
      // Close both context menus
      setTextContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
      setLeftBubbleContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
    }
  };




  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optional: Add highlight effect
      element.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1000);
    }
  };

  const isInViewport = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  const handleJumpToNew = () => {
    if (unseenMessages.length > 0) {
      // Jump to the first unseen message
      scrollToMessage(unseenMessages[0]);
      // Clear all unseen messages and hide the button
      setUnseenMessages([]);
      setShowJumpButton(false);
    }
  };

  useEffect(() => {
    const chatContent = document.querySelector('.chat-content');
    
    const handleScroll = () => {
      if (chatContent) {
        const isAtBottom = chatContent.scrollHeight - chatContent.scrollTop <= chatContent.clientHeight + 100;
        if (isAtBottom) {
          setShowJumpButton(false);
          setUnseenMessages([]);
        }
      }
    };

    if (chatContent) {
      chatContent.addEventListener('scroll', handleScroll);
      return () => chatContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

// Add this new function to calculate menu position
const calculateMenuPosition = (x, y, menuWidth = 200, menuHeight = 200) => {
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate initial position (centered on click)
  let left = x;
  let top = y;

  // Adjust horizontal position if menu would overflow
  if (left + menuWidth > viewportWidth) {
    left = viewportWidth - menuWidth - 10; // 10px padding from edge
  }
  if (left < 0) {
    left = 10; // 10px padding from edge
  }

  // Adjust vertical position if menu would overflow
  if (top + menuHeight > viewportHeight) {
    top = viewportHeight - menuHeight - 10;
  }
  if (top < 0) {
    top = 10;
  }

  return { left, top };
};

  // Add this function to process the language options
  const processLanguageOptions = () => {
    return [
      {
        group: "Original Text",
        languages: [] // Empty array since we don't need any sub-options
      },
      {
        group: "Mainstream Languages",
        languages: mainstream.languages || [] // Add fallback empty array
      },
      {
        group: "Modern Dialects",
        subgroups: Object.entries(modernDialect).map(([language, dialects]) => ({
          name: language,
          categories: Object.entries(dialects).map(([category, dialectList]) => ({
            name: category,
            languages: dialectList
          }))
        }))
      },
      {
        group: "Ancient Languages",
        subgroups: Object.entries(ancientLanguage).map(([language, styles]) => ({
          name: language,
          categories: Object.entries(styles).map(([category, styleList]) => ({
            name: category,
            languages: styleList
          }))
        }))
      },
      {
        group: "Functional Languages",
        subgroups: Object.entries(functionalLanguage).map(([language, styles]) => ({
          name: language,
          categories: Object.entries(styles).map(([category, styleList]) => ({
            name: category,
            languages: styleList
          }))
        }))
      },  {
        group: "Custom Mode",
        languages: ["Custom"]
      },
    ]
  };

  // Update the dropdown rendering
  const languageGroups = processLanguageOptions();

  // Add this effect to handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add useEffect to set initial values when component mounts
  useEffect(() => {
    if (languageGroups && languageGroups.length > 0) {
      const modernDialects = languageGroups.find(group => group.group === 'Modern Dialects');
      if (modernDialects && modernDialects.subgroups.length > 0) {
        const firstSubgroup = modernDialects.subgroups[0];
        setSelectedSubgroup(firstSubgroup.name);
        
        if (firstSubgroup.categories.length > 0) {
          const firstCategory = firstSubgroup.categories[0];
          setSelectedCategory(firstCategory.name);
        }
      }
    }
  }, []);

  // Add this useEffect to handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowNote(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Add this state to manage active tab
  const [activeTab, setActiveTab] = useState('filter'); // Options: 'filter', 'appearance', 'setting'

  // Add this state near your other state declarations
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Add this function to check if scrolled to bottom
  const isScrolledToBottom = () => {
    if (chatContentRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatContentRef.current;
      // Consider "bottom" if within 100px of actual bottom
      return scrollHeight - scrollTop - clientHeight < 100;
    }
    return true;
  };

  // Add this function to scroll to bottom
  const scrollToBottom = () => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  };

  // Add this effect to track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsAtBottom(isScrolledToBottom());
    };

    const chatContent = chatContentRef.current;
    if (chatContent) {
      chatContent.addEventListener('scroll', handleScroll);
      return () => chatContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Add this state near your other state declarations
  const [isNearBottom, setIsNearBottom] = useState(true);

// Add this helper function near the top of your component
const isScrolledNearBottom = () => {
  if (chatContentRef.current) {
    const { scrollHeight, scrollTop, clientHeight } = chatContentRef.current;
    const isNear = scrollHeight - scrollTop - clientHeight < 100;
    // console.log('Scroll check:', { 
    //   scrollHeight, 
    //   scrollTop, 
    //   clientHeight, 
    //   difference: scrollHeight - scrollTop - clientHeight,
    //   isNear 
    // });
    return isNear;
  }
  return true;
};

  // Add this effect to track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsNearBottom(isScrolledNearBottom());
    };

    const chatContent = chatContentRef.current;
    if (chatContent) {
      chatContent.addEventListener('scroll', handleScroll);
      return () => chatContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

// Add near your other state declarations
const [hideAIPhotoButton, setHideAIPhotoButton] = useState(getGlobalState('hideAIPhotoButton'));

// Add this handler function
const handleToggleAIPhotoButton = () => {
  const newValue = !hideAIPhotoButton;
  setHideAIPhotoButton(newValue);
  setGlobalState('hideAIPhotoButton', newValue);
};



// Add near your other state declarations
const [hidePrivateChatroomButton, setHidePrivateChatroomButton] = useState(getGlobalState('hidePrivateChatroomButton'));

// Add this handler function
const handleTogglePrivateChatroomButton = () => {
  const newValue = !hidePrivateChatroomButton;
  setHidePrivateChatroomButton(newValue);
  setGlobalState('hidePrivateChatroomButton', newValue);
};

// Add these state variables at the top of your component
const [selectedTheme, setSelectedTheme] = useState(getGlobalState('theme') || 'default');
const [customAccentColor, setCustomAccentColor] = useState(getGlobalState('accentColor') || '#ff8d29');

// Add this useEffect after your state declarations
useEffect(() => {
  // Initialize theme from global state
  const savedTheme = getGlobalState('theme') || 'default';
  document.documentElement.setAttribute('data-theme', savedTheme);
  setSelectedTheme(savedTheme);
}, []);

// Add console logs to debug
// Modify existing theme change handler to only apply in public rooms
const handleThemeChange = (theme) => {
  setSelectedTheme(theme);
  setGlobalState('theme', theme);
  // Apply theme when in public room
  if (!getGlobalState('is_chatroom_private')) {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

// Add these state variables
const [selectedPrivateTheme, setSelectedPrivateTheme] = useState(getGlobalState('privateTheme') || 'default-private');

// Add this handler
const handlePrivateThemeChange = (theme) => {
  setSelectedPrivateTheme(theme);
  setGlobalState('privateTheme', theme);
  if (getGlobalState('is_chatroom_private')) {
    document.documentElement.setAttribute('data-private-theme', theme);
  }
};

// Update the useEffect to handle both themes
useEffect(() => {
  const savedTheme = getGlobalState('theme') || 'default';
  const savedPrivateTheme = getGlobalState('privateTheme') || 'default-private';
  
  if (getGlobalState('is_chatroom_private')) {
    document.documentElement.setAttribute('data-private-theme', savedPrivateTheme);
  } else {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  
  setSelectedTheme(savedTheme);
  setSelectedPrivateTheme(savedPrivateTheme);
}, []);

// Add this effect to handle theme switching when changing room types
useEffect(() => {
  if (getGlobalState('is_chatroom_private')) {
    document.documentElement.setAttribute('data-private-theme', selectedPrivateTheme);
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', selectedTheme);
    document.documentElement.removeAttribute('data-private-theme');
  }
}, [getGlobalState('is_chatroom_private')]);





const [lowCostMode, setLowCostMode] = useState(getGlobalState('lowCostMode') === '1');
const handleToggleLowCostMode = () => {
  const newValue = !lowCostMode;
  setLowCostMode(newValue);
  setGlobalState('lowCostMode', newValue ? '1' : '0');
};







  return (
  <div>
    <ToastContainer />
    {showWelcomePage ? (
      <WelcomePage onClose={handleCloseWelcomePage} />
    ) : (
      
      <div className={`chat-page-wrapper`}>
        <div className={`chat-page ${isSliding ? 'slide-out' : ''}`}>
          <div className="chat-content" ref={chatContentRef}>
            {/* Chat bubbles */}
            <div className="chat-container">
            <div className="empty-space-top"></div>
            {messages && messages.length > displayedMessageCount && (
                <button 
                  className="load-more-btn"
                  onClick={() => {
                    setIsLoadingMoreMessages(true);
                    
                    // First update the display count
                    setDisplayedMessageCount(prev => {
                      const newCount = Math.min(prev + MESSAGE_LOAD_INCREMENT, messages.length);
                      
                      // Then fetch translations for the new set of displayed messages
                      const newDisplayedMessageIds = messages.slice(-newCount).map(message => message.id).join(',');
                      
                      fetchMessagesOnDemand(
                        getGlobalState('currChatroomId'),
                        getGlobalState('selectedLanguageMe'),
                        getGlobalState('selectedLanguageMeFirst'),
                        getGlobalState('selectedLanguageMeSecond'),
                        isSplit,
                        newDisplayedMessageIds
                      );
                      
                      return newCount;
                    });

                    setTimeout(() => {
                      setIsLoadingMoreMessages(false);
                    }, 500);
                  }}
                >
                  {isLoadingMoreMessages ? 'Loading...' : `Load Previous Messages`}
                </button>
              )}

              {/* Main messages */}
              {!getGlobalState('isLoggedIn') && !getGlobalState('isGuestMode') ? (
                <div className="no-message-login-overlay">
                  <div className="no-message-login">
                    <p>{t('Please Log in to use the Chatroom')}</p>
                    <button 
                      className="login-button"
                      onClick={() => navigate('/login_page')}
                    >
                      {t('Log in')}
                    </button>
                  </div>
                </div>
              ) : 
              
              messages && messages.length > 0 ? (
                <>
                  {isLoadingMoreMessages && (
                    <div className="loading-messages">
                      <div className="loading-spinner"></div>
                    </div>
                  )}
                  {messages.slice(-displayedMessageCount).map((message, index) => (
                    <div key={index} id={`message-${message.id}`} className={`message-container ${message.userId === userId ? 'right' : 'left'}`}>
                      {/* Avatar and Username */}
                      <div className="avatar-container">
                        <Link to={`/profile_public/${message.userId}`}>
                          <img
                            src={message.avatar ? `${local_url}/uploads/avatars/${message.avatar}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
                            alt={`${message.username}'s avatar`}
                            className="avatar-image"
                          />
                        </Link>
                        <Link to={`/profile_public/${message.userId}`} className="username-text">
                          {`${message.username}`}
                        </Link>
                      </div>
                      {message.content_type === 'join_notification' ? (
                        <div className="recalled-message-bubble join-notification">
                          <img 
                            src={message.avatar ? `${local_url}/uploads/avatars/${message.avatar}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
                            alt="Avatar"
                            className="user-avatar small"
                          />
                          <span className="join-username">{message.username}</span>
                          <span className="join-text">{t('joined the chatroom')}</span>
                          <span className="timestamp">{convertUtcToLocal(message.timestamp)}</span>
                        </div>
                      ) : message.is_recalled === '1' ? (
                        // Recalled message bubble
                        <div className="recalled-message-bubble">
                          <span>{message.username} recalled a message</span>
                        </div>
                      ) : (
                      /* Chat Bubble */
                      <div 
                        className={`chat-bubble ${message.userId === userId ? 'right' : 'left'}`}
                        onTouchStart={(e) => message.userId === userId && handleTouchStart(e, message.id)}
                        onTouchEnd={message.userId === userId ? handleTouchEnd : undefined}
                        onTouchMove={message.userId === userId ? handleTouchMove : undefined}
                      >
                        {/* Debug logs */}
                        {/* {console.log("Message:", message)}
                        {console.log("reply_to_message_id:", message.reply_to_message_id)}
                        {console.log("is_recalled:", message.is_recalled)} */}

                        {/* Reply bubble section */}
                        {message.reply_to_message_id !== -1 && (
                          (() => {
                            const repliedMessage = messages.find(m => m.id === message.reply_to_message_id);
                            return repliedMessage?.is_recalled === '1' ? (
                              <div className="reply-bubble">
                                <span>{repliedMessage?.username} recalled a message</span>
                              </div>
                            ) : (
                              <div className="reply-bubble" onClick={() => scrollToMessage(message.reply_to_message_id)}>
                                <div className="reply-bubble-header">
                                  <img 
                                    src={repliedMessage?.avatar ? `${local_url}/uploads/avatars/${repliedMessage.avatar}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
                                    alt="Avatar"
                                    className="reply-bubble-avatar"
                                  />
                                  <span className="reply-bubble-username">{repliedMessage?.username}</span>
                                  {repliedMessage?.is_edited === '1' && <span className="edited-indicator">(Edited)</span>}
                                </div>
                                <div className="reply-bubble-text">
                                  {(repliedMessage?.translations && 
                                    repliedMessage?.translations[selectedLanguageMe]) || 
                                    repliedMessage?.original_text}
                                </div>
                              </div>
                            );
                          })()
                        )}

                        {/* Message content */}
                        {message.content_type === 'photo' ? (
                          <>
                            {/* Handling photo bubble */}
                            <div>
                              <img
                                src={`${process.env.PUBLIC_URL}/${message.original_text}`}
                                alt={`${process.env.PUBLIC_URL}/${message.original_text}`}
                                className="chat-photo"
                                onClick={() => handleImageClick(`${process.env.PUBLIC_URL}/${message.original_text}`)}
                                style={{ cursor: 'pointer' }}
                              />
                              {/* Add null check for translated_text */}
                              {message.translated_text && message.translated_text.split('\n').map((line, index) => (
                                <p key={index}>{line}</p>
                              ))}

                              <button className="chat-bubble-btn" onClick={() => toggleMessageVisibility(index)}>
                                {visibleMessages[index] ? t('Hide Original Text') : t('Show Original Text')}
                              </button>
                              {visibleMessages[index] && (
                                <span style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text' }}>
                                  {""}
                                </span>
                              )}

                              <div className="timestamp">
                                <strong>{t('Sent at:')} </strong> {convertUtcToLocal(message.timestamp)}
                                {message.is_edited === '1' && (
                                  <span className="edited-indicator"> (Edited)</span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Handling text bubbles */}
                            {message.userId !== userId ? (
                              <>
                                <p className={`text-section translated-text left`} 
                                   onClick={(e) => handleLeftBubbleTextClick(
                                     e,
                                     message.original_text,
                                     message.id,
                                     (message.translations && message.translations[selectedLanguageMe]) || message.original_text
                                   )}>
                                  <span style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer' }}>
                                    {(message.translations && message.translations[selectedLanguageMe]) || message.original_text}
                                  </span>
                                </p>
                                <img 
                                  src={`${process.env.PUBLIC_URL}/${ttsStatus[message.id] ? 'bubble_tts_on.svg' : 'bubble_tts_off.svg'}`}
                                  alt="TTS"
                                  className="tts-icon right"
                                  onClick={() => handleTtsToggle(message.id, (message.translations && message.translations[selectedLanguageMe]) || message.original_text)}
                                />
                                {visibleOriginals[index] && (
                                  <p className={`text-section original-text left`}>
                                    <strong>{t('Original Text')}:</strong>{' '}
                                    <span 
                                      style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer' }}
                                      onClick={(e) => handleLeftBubbleTextClick(
                                        e,
                                        message.original_text,
                                        message.id,
                                        (message.translations && message.translations[selectedLanguageMe]) || message.original_text
                                      )}
                                    >
                                      {message.original_text}
                                    </span>
                                  </p>
                                )}
                                <button className="chat-bubble-btn" onClick={() => toggleOriginalVisibility(index)}>
                                  {visibleOriginals[index] ? t('Hide Original Text') : t('Show Original Text')}
                                </button>
                              </>
                            ) : (
                              <>
                                {isSplit ? (
                                  // Split view for right bubbles with two TTS buttons
                                  <div className="split-bubble-container">
                                    {/* Top TTS button */}
                                    <img 
                                      src={`${process.env.PUBLIC_URL}/${ttsStatus[message.id] ? 'bubble_tts_on.svg' : 'bubble_tts_off.svg'}`}
                                      alt="TTS"
                                      className="tts-icon-split top"
                                      onClick={() => handleTtsToggle(
                                        message.id, 
                                        (message.translations && message.translations[selectedLanguageMeFirst]) || message.original_text,
                                        'top'
                                      )}
                                    />
                                    {/* Bottom TTS button */}
                                    <img 
                                      src={`${process.env.PUBLIC_URL}/${ttsStatus[message.id] ? 'bubble_tts_on.svg' : 'bubble_tts_off.svg'}`}
                                      alt="TTS"
                                      className="tts-icon-split bottom"
                                      onClick={() => handleTtsToggle(
                                        message.id,
                                        (message.translations && message.translations[selectedLanguageMeSecond]) || message.original_text,
                                        'bottom'
                                      )}
                                    />
                                    {/* Split text container */}
                                    <div className="split-text-container right">
                                      <p className="text-section split-text top" 
                                         onClick={() => copyToClipboard((message.translations && message.translations[selectedLanguageMeFirst]) || message.original_text)}>
                                        <span style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer' }}>
                                          {(message.translations && message.translations[selectedLanguageMeFirst]) || message.original_text}
                                        </span>
                                      </p>
                                      <div className="split-line"></div>
                                      <p className="text-section split-text bottom"
                                         onClick={() => copyToClipboard((message.translations && message.translations[selectedLanguageMeSecond]) || message.original_text)}>
                                        <span style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer' }}>
                                          {(message.translations && message.translations[selectedLanguageMeSecond]) || message.original_text}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  // Original single language view
                                  <>
                                    <img 
                                      src={`${process.env.PUBLIC_URL}/${ttsStatus[message.id] ? 'bubble_tts_on.svg' : 'bubble_tts_off.svg'}`}
                                      alt="TTS"
                                      className="tts-icon left"
                                      onClick={() => handleTtsToggle(
                                        message.id, 
                                        (message.translations && message.translations[selectedLanguageMe]) || message.original_text
                                      )}
                                    />
                                    <p className={`text-section original-text right`}>
                                      <span 
                                        style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'pointer' }}
                                        onClick={(e) => handleTextClick(
                                     e,
                                     message.original_text,
                                     message.id,
                                     (message.translations && message.translations[selectedLanguageMe]) || message.original_text
                                        )}
                                      >
                                        {(message.translations && message.translations[selectedLanguageMe]) || message.original_text}
                                      </span>
                                    </p>
                                  </>
                                )}
                                {visibleMessages[index] && (
                                  <div className="text-section translated-text right">
                                    <span 
                                      style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text' }}
                                      onClick={(e) => handleTextClick(
                                        e, 
                                        message.original_text, 
                                        message.id,
                                        (message.translations && message.translations[selectedLanguageMe]) || message.original_text
                                      )}
                                    >
                                      <strong>{t('Original Text')}:</strong>{' '}
                                    </span>
                                    {message.isEditing ? (
                                      <>
                                        <textarea
                                          ref={editTextareaRef}
                                          style={{ 
                                            display: 'block',
                                            width: '100%',
                                            minHeight: '60px',
                                            padding: '8px',
                                            marginTop: '5px',
                                            borderRadius: '5px',
                                            border: '1px solid #ddd'
                                          }}
                                          defaultValue={message.original_text}
                                        />
                                        <div className="edit-buttons">
                                          <button 
                                            className="edit-button resend" 
                                            onClick={() => handleResendEdit(message.id)}
                                          >
                                            {t('Resend')}
                                          </button>
                                          <button 
                                            className="edit-button cancel" 
                                            onClick={() => handleCancelEdit(message.id)}
                                          >
                                            {t('Cancel')}
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <span 
                                        style={{ display: 'block', userSelect: 'text', WebkitUserSelect: 'text' }}
                                        onClick={(e) => handleTextClick(
                                          e, 
                                          message.original_text, 
                                          message.id,
                                          (message.translations && message.translations[selectedLanguageMe]) || message.original_text
                                        )}
                                      >
                                        {message.original_text}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <button className="chat-bubble-btn" onClick={() => toggleMessageVisibility(index)}>
                                  {visibleMessages[index] ? t('Hide Original Text') : t('Show Original Text')}
                                </button>
                              </>
                            )}
                            <div className="timestamp">
                              <strong>{t('Sent at:')} </strong> {convertUtcToLocal(message.timestamp)}
                              {message.is_edited === '1' && (
                                <span className="edited-indicator"> (Edited)</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (

                
    // If no messages, show loading messages or "No Messages"
     // If no messages, show loading message at top or loading messages or "No Messages"
  loadingMessage ? (
    <div className="message-container right">
    {/* Source Language Menu */}
    {showSourceLanguageMenu && (
      <div className="source-language-menu">
        <span className="source-language-label">Detected Language:</span>
        <select
          value={selectedSourceLanguage}
          onChange={(e) => handleSourceLanguageChange(e.target.value)}
          className="source-language-select"
        >
          {languageOptionsStreamingDetect.map((lang) => (
            <option key={lang} value={lang}>
              {t(lang)}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* Your existing loading message content */}
    <div className="avatar-container">
      <img
        src={loadingMessage.avatar ? `${local_url}/uploads/avatars/${getGlobalState("currUserAvatar")}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
        alt={`${loadingMessage.username}'s avatar`}
        className="avatar-image"
      />
      <span className="username-text">{loadingMessage.username}</span>
    </div>
    <div className={`chat-bubble right`}>
      {isSplit ? (
        <div className="split-streaming-container right">
          {streamingTranslationFirst && (
            <>
              <p className="text-section split-streaming-first">
                {streamingTranslationFirst}
              </p>
              <div className="split-line"></div>
              <p className="text-section split-streaming-second">
                {streamingTranslationSecond}
              </p>
              <div className="split-line"></div>
              <p className="text-section split-streaming-transcript">
                {streamingTranscript}
              </p>
              <div className="split-line"></div>
            </>
          )}
          <p className="text-section loading-text right">
            Loading...
          </p>
        </div>
      ) : (
        <div className="streaming-container">
          {streamingTranslation && (
            <>
              <p className="text-section streaming-translation">
                {streamingTranslation}
              </p>
              <div className="split-line"></div>
            </>
          )}
          {streamingTranscript && (
            <>
              <p className="text-section streaming-transcript">
                {streamingTranscript}
              </p>
              <div className="split-line"></div>
            </>
          )}
          <p className="text-section loading-text right">
            Translating by AI...
          </p>
        </div>
      )}
    </div>
  </div>
  ) : Object.keys(otherUsersLoadingMessages).length > 0 ? (
      // Show loading messages if they exist
      Object.values(otherUsersLoadingMessages).map((loadingMsg, index) => (
        <div 
          key={`loading-${loadingMsg.userId}-${index}`} 
          className={`message-container ${loadingMsg.userId === currUserId ? 'right' : 'left'}`}
        >
          <div className="avatar-container">
            <img
              src={loadingMsg.avatar ? `${local_url}/uploads/avatars/${loadingMsg.avatar}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
              alt="avatar"
              className="avatar-image"
            />
            <span className="username-text">{loadingMsg.username}</span>
          </div>

          <div className={`chat-bubble left`}>
            <div className="message-content">
              <div className="text-section">
                {otherUsersTranslations[loadingMsg.userId]?.translatedText && (
                  <p className="text-section streaming-translation">
                    {otherUsersTranslations[loadingMsg.userId].translatedText}
                  </p>
                )}
                <div className="split-line"></div>
                <p className="text-section streaming-transcript">
                  {otherUsersTranscripts[loadingMsg.userId]?.streamingTranscript || (
                    <div className="loading-indicator">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))
    ) : (
      // If no messages and no loading messages, show "No Messages"
      <div className="no-messages">
        <p>{t('No Messages in the Chatroom')}</p>
      </div>
    )
              )}
          {/* Add loading message */}
          {messages && messages.length > 0 && loadingMessage && (
            <div className="message-container right">
              {/* Source Language Menu */}
              {showSourceLanguageMenu && (
                <div className="source-language-menu">
                  <span className="source-language-label">Detected Language:</span>
                  <select
                    value={selectedSourceLanguage}
                    onChange={(e) => handleSourceLanguageChange(e.target.value)}
                    className="source-language-select"
                  >
                    {languageOptionsStreamingDetect.map((lang) => (
                      <option key={lang} value={lang}>
                        {t(lang)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Your existing loading message content */}
              <div className="avatar-container">
                <img
                  src={loadingMessage.avatar ? `${local_url}/uploads/avatars/${getGlobalState("currUserAvatar")}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
                  alt={`${loadingMessage.username}'s avatar`}
                  className="avatar-image"
                />
                <span className="username-text">{loadingMessage.username}</span>
              </div>
              <div className={`chat-bubble right`}>
                {isSplit ? (
                  <div className="split-streaming-container right">
                    {streamingTranslationFirst && (
                      <>
                        <p className="text-section split-streaming-first">
                          {streamingTranslationFirst}
                        </p>
                        <div className="split-line"></div>
                        <p className="text-section split-streaming-second">
                          {streamingTranslationSecond}
                        </p>
                        <div className="split-line"></div>
                        <p className="text-section split-streaming-transcript">
                          {streamingTranscript}
                        </p>
                        <div className="split-line"></div>
                      </>
                    )}
                    <p className="text-section loading-text right">
                      Loading...
                    </p>
                  </div>
                ) : (
                  <div className="streaming-container">
                    {streamingTranslation && (
                      <>
                        <p className="text-section streaming-translation">
                          {streamingTranslation}
                        </p>
                        <div className="split-line"></div>
                      </>
                    )}
                    {streamingTranscript && (
                      <>
                        <p className="text-section streaming-transcript">
                          {streamingTranscript}
                        </p>
                        <div className="split-line"></div>
                      </>
                    )}
                    <p className="text-section loading-text right">
                      Translating by AI...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

{/* Other Users' Loading Messages */}
{messages && messages.length > 0 && Object.keys(otherUsersLoadingMessages).length > 0 && 
  Object.values(otherUsersLoadingMessages).map((loadingMsg, index) => (
    <div 
      key={`loading-${loadingMsg.userId}-${index}`} 
      className={`message-wrapper ${loadingMsg.userId === currUserId ? 'right' : 'left'}`}
    >
      <div className="message-container">
        <div className="avatar-username-container">
          <div className="avatar-container">
            <img
              src={loadingMsg.avatar ? `${local_url}/uploads/avatars/${loadingMsg.avatar}` : `${process.env.PUBLIC_URL}/user_avatar/default_avatar_1.png`}
              alt="avatar"
              className="avatar-image"
            />
          </div>
          <div className="username-container">
            <span className="username-text">{loadingMsg.username}</span>
          </div>
        </div>

        <div className={`chat-bubble left`}>
          <div className="message-content">
            <div className="text-section">
              {/* Original Text */}


              {/* Translated Text */}
              {otherUsersTranslations[loadingMsg.userId]?.translatedText && (
               <p className="text-section streaming-translation">
                  {otherUsersTranslations[loadingMsg.userId].translatedText}
                </p>
              )}
              <div className="split-line"></div>
                <p className="text-section streaming-transcript">
                {otherUsersTranscripts[loadingMsg.userId]?.streamingTranscript || (
                  <div className="loading-indicator">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </p>


            </div>
          </div>
        </div>
      </div>
    </div>
  ))
}
          <div className="empty-space"></div>

            </div>
          </div>

          {/* Reply preview - show above text input when replying */}
          {replyToMessage && (
            <div className="reply-preview-container">
              <div className="reply-preview-content">
                <div className="reply-preview-header">
                  {replyToMessage.username}
                </div>
                <div className="reply-preview-text">
                  {replyToMessage.original_text}
                </div>
              </div>
              <button 
                className="reply-preview-close" 
                onClick={() => setReplyToMessage(null)}
              >
                ×
              </button>
            </div>
          )}

          <div className={`chat-controls ${!getGlobalState('isLoggedIn') && !getGlobalState('isGuestMode') ? 'disabled' : ''}`}>
            {/* Recording button */}
            <button
              ref={recordButtonRef}
              onClick={(e) => {
                if (getGlobalState('isTokenNegative')) {
                  e.preventDefault();
                  toast.error(t('Token insufficient. Please purchase a token pack'), {
                    position: "bottom-center",
                    autoClose: 2000
                  });
                  return;
                }
                if (!isTouchDevice) toggleRecording(e);
              }}
              onTouchStart={(e) => {
                if (getGlobalState('isTokenNegative')) {
                  e.preventDefault();
                  toast.error(t('Token insufficient. Please purchase a token pack'), {
                    position: "bottom-center",
                    autoClose: 2000
                  });
                  return;
                }
                if (isTouchDevice) toggleRecording(e);
              }}
              className={`floating-record-btn ${isRecording ? 'recording' : ''} ${getGlobalState('isTokenNegative') ? 'disabled' : ''}`}
            >
              <img 
                src={`${process.env.PUBLIC_URL}/mic_fill_button.svg`}
                alt="Microphone"
                className="mic-icon"
              />
              {isRecording ? `${t('Stop')} \n`.concat(timeRemaining) : t('Speak')}
              <svg className="record-timer" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" />
              </svg>
            </button>
        {/* Photo selection button - only show in private chatrooms */}

        {getGlobalState('is_chatroom_private') && !hideAIPhotoButton && (
          <label className={`floating-photo-btn ${getGlobalState('isTokenNegative') ? 'disabled' : ''}`}>
            {t('Photo')}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (getGlobalState('isTokenNegative')) {
                  e.preventDefault();
                  toast.error(t('Token insufficient. Please purchase a token pack'), {
                    position: "bottom-center",
                    autoClose: 2000
                  });
                  return;
                }
                handlePhotoChange(e);
              }}
            />
          </label>
        )}

            {/* Text input for messages */}
            <div className="text-box-container">
            <textarea
              placeholder={""}
              className="text-input"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                // Auto-adjust height
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 5 * 24) + 'px';
                
                // Adjust container height
                const container = e.target.closest('.text-box-container');
                if (container) {
                  container.style.minHeight = Math.min(e.target.scrollHeight + 20, 5 * 24 + 20) + 'px';
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              ref={textInputRef}
              onFocus={handleTextBoxFocus}
              onBlur={handleTextBoxBlur}
              rows="1"
            />
              <button className="send-btn" onClick={handleSendMessage}>
                {t('Send')}
              </button>
              <div className={`text-box-icons ${isTextBoxFocused ? 'focused' : ''}`}>
                <div className="emoji-picker-container">
                  <img 
                    src={`${process.env.PUBLIC_URL}/textbox_emoji_button.svg`}
                    alt="Emoji"
                    className="text-box-icon"
                    onClick={handleEmojiButtonClick}
                  />
                  {showEmojiPicker && (
                    <div className="emoji-picker-wrapper">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        searchDisabled
                        skinTonesDisabled
                        width="100%"
                        height={window.innerWidth <= 768 ? 300 : 400}
                        lazyLoadEmojis={true}
                      />
                    </div>
                  )}
                </div>
                <div className="raw-img-button">
                  <img 
                    src={`${process.env.PUBLIC_URL}/textbox_image_button.svg`}
                    alt="Image"
                    className="text-box-icon"
                    onClick={handleImageButtonClick}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChangeRaw}
                  />
                </div>
                <button 
                className="send-btn-preview" 
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Close keyboard by blurring any active element
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  // Alternative method to ensure keyboard is dismissed
                  if (textInputRef.current) {
                    textInputRef.current.blur();
                  }
                  handlePreviewClick(e);
                }}
              >
                {t('Preview')}
              </button>


              </div>

            </div>
          </div>
        </div>

        <div className="chatlist-container" onClick={(e) => console.log('Click registered at:', e.clientX, e.clientY)}>
          {/* Add this new div for the grid line */}
          
          {!isLoggedIn && (
            <div className="login-prompt">
              <p>{t('Please login to see chatrooms')}</p>
            </div>
          )}
          <div className="chatrooms-list">
            {chatrooms.map((chatroom) => (
              <div 
                key={chatroom.id} 
                className="chatroom-item"
                onClick={() => {
                  console.log('Chatroom clicked:', chatroom.name);
                  handleChatroomSelect(chatroom.id, chatroom.name);
                }}
              >
                <div className="chatroom-item-container">
                  <div className="list-chatroom-thumbnail">
                    <img 
                      src={`${process.env.PUBLIC_URL}/group-icon.svg`}
                      alt="Group Icon" 
                      className="group-icon"
                    />
                  </div>
                  <div className="list-chatroom-name">
                    {chatroom.name}
                  </div>
                </div>
              </div>
            ))}


          </div>
          {/* This div will serve as the background */}
          <div className="chat-background"></div>
        </div>





        <ChatStatusBar onBackClick={handleBackClick} isSliding={isSliding} />


{showNote && (
  <div className="scrollable-menu-overlay" onClick={(e) => {
    if (e.target.className === 'scrollable-menu-overlay') {
      setShowNote(false);
    }
  }}>
    <div className="scrollable-menu-container" ref={menuRef}>
      <div className="menu-tabs">
        <button 
          className={`menu-tab ${activeTab === 'filter' ? 'active' : ''}`}
          onClick={() => setActiveTab('filter')}
        >
          {t('Filter')}
        </button>
        <button 
          className={`menu-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          {t('Appearance')}
        </button>
        <button 
          className={`menu-tab ${activeTab === 'setting' ? 'active' : ''}`}
          onClick={() => setActiveTab('setting')}
        >
          {t('Settings')}
        </button>
        
      </div>
      
      <div className="scrollable-menu-content">
        {activeTab === 'filter' && (
          <div className="custom-filter-section">
            <h3>{t('Custom Filter')}</h3>
            <textarea
              className="custom-filter-input"
              value={customFilterContent}
              onChange={(e) => setCustomFilterContent(e.target.value)}
              placeholder={t('Enter your custom filter...')}
            />
            <button 
              className="custom-filter-submit"
              onClick={() => {
                if (customFilterContent) {
                  if (getGlobalState('isCustomFilter')) {
                    handleLanguageChange({ target: { value: "Custom" }}, isSplit ? 'right' : 'single');
                  }
                }
                setShowNote(false); // Close the overlay after applying
              }}
            >
              {t('Apply Filter')}
            </button>
          </div>
        )}


{activeTab === 'appearance' && (
  <div className="appearance-section">
    {/* Public Room Settings */}
    <div className="room-appearance-section">
      <h3>{t('Public Room Appearance Settings')}</h3>
      <div className="appearance-option">
        <h4>{t('Theme')}</h4>
        <div className="theme-grid">
          {['default', 'dark', 'light', 'blue', 'green', 'orange', 'purple', 'elegant', 'animated'].map((theme) => (
            <div 
              key={theme}
              className={`theme-option ${theme} ${selectedTheme === theme ? 'selected' : ''}`}
              onClick={() => handleThemeChange(theme)}
            >
              { theme.charAt(0).toUpperCase() + theme.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Private Room Settings */}
    <div className="room-appearance-section private">
      <h3>{t('Private Room Appearance Settings')}</h3>
      <div className="appearance-option">
        <h4>{t('Theme')}</h4>
        <div className="theme-grid">
          {['default-private', 'modern', 'elegant', 'cozy'].map((theme) => (
            <div 
              key={theme}
              className={`theme-option ${theme} ${selectedPrivateTheme === theme ? 'selected' : ''}`}
              onClick={() => handlePrivateThemeChange(theme)}
            >
              {theme.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}


      {activeTab === 'setting' && (
        <div className="settings-container">
          <div className="setting-item">
            <label className="setting-label">
              {t('Hide AI Photo Button in Private Chatroom')}
            </label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={hideAIPhotoButton}
                onChange={handleToggleAIPhotoButton}
                id="hideAIPhotoButton"
              />
              <label htmlFor="hideAIPhotoButton" className="toggle-label"></label>
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              {t('Hide Private Chatroom Button')}
            </label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={hidePrivateChatroomButton}
                onChange={handleTogglePrivateChatroomButton}
                id="hidePrivateChatroomButton"
              />
              <label htmlFor="hidePrivateChatroomButton" className="toggle-label"></label>
            </div>
          </div>
          {/* ... other settings ... */}
          
          <div className="setting-item">
              <label className="setting-label">
                {t('Low-cost mode (mini model)')}
              </label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={lowCostMode}
                  onChange={handleToggleLowCostMode}
                  id="lowCostMode"
                />
                <label htmlFor="lowCostMode" className="toggle-label"></label>
              </div>
            </div>
        </div>
      )}
      </div>
    </div>
  </div>
)}

        {/* Language selection dropdowns */}
        <div className={`chat-controls ${!getGlobalState('isLoggedIn') && !getGlobalState('isGuestMode') ? 'disabled' : ''}`}>
                  {/* <ChatStatusBar onBackClick={handleBackClick} /> */}
        <button
          className="floating-memo-btn"
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            setShowNote(prev => !prev); // Simply toggle the state
          }}
        >
          {showNote ? t('Less') : t('More')}
        </button>



         <div className="language-display-icon-container" >  {/* onClick={handleSplitToggle} dual language */}
            <img 
              src={`${process.env.PUBLIC_URL}/${isSplit ? 'language_icon_two.png' : 'language_icon.png'}`}
              alt="Language" 
              className="language-display-icon"
            />
          </div>
          <div className={`dropdowns-container ${isSplit ? 'split' : ''}`}>
            {isSplit && (
              <div className="select-container-left">
                <select
                  className="select-language-right"
                  onChange={(e) => handleLanguageChange(e, 'left')}
                  value={selectedLanguageMeFirst}
                >
                  {languageGroups.map((group, index) => (
                    <optgroup key={index} label={group.group}>
                      {group.languages.map((lang) => (
                        <option key={lang} value={lang}>
                          {t(lang)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            <div className="select-container-right">
              <div className="select-container" ref={dropdownRef}>
              <div 
                  className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''} ${getGlobalState('isTokenNegative') ? 'disabled' : ''}`}
                  onClick={(e) => {
                    if (getGlobalState('isTokenNegative')) {
                      e.preventDefault();
                      toast.error(t('Token insufficient. Please purchase a token pack'), {
                        position: "bottom-center",
                        autoClose: 2000
                      });
                      return;
                    }
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                >
                    {getGlobalState('isCustomFilter') ? t('Custom Mode') : (isSplit ? selectedLanguageMeSecond : t(selectedLanguageMe))}
                </div>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    {/* First Level: Always visible */}
                    <div className="categories-column main-categories">
                      {languageGroups.map((group, index) => (
                        <div
                          key={index}
                          className={`category-item ${selectedMainCategory === group.group ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedMainCategory(group.group);
                            if (group.group === "Original Text") {
                              handleLanguageChange({ target: { value: "original_text_raw" }}, isSplit ? 'right' : 'single');
                              setIsDropdownOpen(false);
                            } else if (group.group === "Custom Mode") {
                              handleLanguageChange({ target: { value: "Custom" }}, isSplit ? 'right' : 'single');
                              setIsDropdownOpen(false);
                            } else if (group.group === 'Mainstream Languages') {
                              setSelectedSubgroup(null);
                              setSelectedCategory(null);
                              setSelectedSubcategory(null);
                            } else {
                              // For other categories, auto-select first subgroup and category
                              const firstSubgroup = group.subgroups?.[0];
                              if (firstSubgroup) {
                                setSelectedSubgroup(firstSubgroup.name);
                                const firstCategory = firstSubgroup.categories?.[0];
                                if (firstCategory) {
                                  setSelectedCategory(firstCategory.name);
                                }
                              }
                            }
                          }}
                        >
                          {t(group.group)}
                        </div>
                      ))}
                    </div>
                    
                    {selectedMainCategory === 'Original Text' ? (
                      // Don't render any subcategories for Original Text
                      null
                    ) : selectedMainCategory === 'Custom Mode' ? (
                      // Don't render any subcategories for Custom Mode
                      null
                    ) : selectedMainCategory === 'Mainstream Languages' ? (
                      // Render mainstream languages
                      <div className="languages-column">
                        {languageGroups
                          .find(group => group.group === 'Mainstream Languages')
                          ?.languages.map((lang, index) => (
                            <div
                              key={index}
                              className="language-item"
                              onClick={() => {
                                handleLanguageChange({ target: { value: lang }}, isSplit ? 'right' : 'single');
                                setIsDropdownOpen(false);
                              }}
                            >
                              {t(lang)}
                            </div>
                        ))}
                      </div>
                    ) : (
                      // Render other categories (Modern Dialects and Ancient Languages)
                      <>
                        <div className="categories-column subgroups">
                          {languageGroups
                            .find(group => group.group === selectedMainCategory)
                            ?.subgroups?.map((subgroup, index) => (
                              <div
                                key={index}
                                className={`category-item ${selectedSubgroup === subgroup.name ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectedSubgroup(subgroup.name);
                                  if (subgroup.categories?.[0]) {
                                    setSelectedCategory(subgroup.categories[0].name);
                                  }
                                }}
                              >
                                {subgroup.name}
                              </div>
                            ))}
                        </div>
                        
                        {selectedSubgroup && (
                          <div className="categories-column categories">
                            {languageGroups
                              .find(group => group.group === selectedMainCategory)
                              ?.subgroups.find(sub => sub.name === selectedSubgroup)
                              ?.categories.map((category, index) => (
                                <div
                                  key={index}
                                  className={`category-item ${selectedCategory === category.name ? 'active' : ''}`}
                                  onClick={() => setSelectedCategory(category.name)}
                                >
                                  {category.name}
                                </div>
                              ))}
                          </div>
                        )}
                        
                        {selectedCategory && (
                          <div className="categories-column subcategories">
                            {languageGroups
                              .find(group => group.group === selectedMainCategory)
                              ?.subgroups.find(sub => sub.name === selectedSubgroup)
                              ?.categories.find(cat => cat.name === selectedCategory)
                              ?.languages.map((lang, index) => (
                                <div
                                  key={index}
                                  className={`language-item ${selectedSubcategory === lang ? 'active' : ''}`}
                                  onClick={() => {
                                    handleLanguageChange({ target: { value:  `${selectedSubgroup }-${lang}`  }}, isSplit ? 'right' : 'single');
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  {t(lang)}
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add this button somewhere in your JSX, for example, near the language controls */}

      </div>
    )}

    {showImageModal && (
      <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
        <div className="image-modal-content" onClick={e => e.stopPropagation()}>
          <button className="image-modal-close" onClick={() => setShowImageModal(false)}>×</button>
          <img src={selectedImage} alt="Enlarged" className="enlarged-image" />
          <button className="image-download-button" onClick={handleImageDownload}>
            {isIOS ? t('Save Image') : t('Download Image')}
          </button>
        </div>
      </div>
    )}


    {/* Context menu for text operations that allows copying, editing and recalling 
        the original text. Appears when text is selected and provides quick access 
        to common text manipulation functions. Position is dynamically set based on 
        cursor location stored in textContextMenu state. */}

    {textContextMenu.visible && (
      <div 
        className="text-context-menu"
        style={{
          position: 'fixed',
          left: `${textContextMenu.x}px`,
          top: `${textContextMenu.y}px`,
          // transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="text-context-menu-option" onClick={handleCopyTranslatedText}>
          {t('Copy Translated Text')}
        </div>
        <div className="text-context-menu-option" onClick={handleCopyOriginalText}>
          {t('Copy Original Text')}
        </div>
        <div className="text-context-menu-option" onClick={handleEditOriginalText}>
          {t('Edit Original Text')}
        </div>
        <div className="text-context-menu-option" onClick={handleRecallOriginalText}>
          {t('Recall Original Text')}
        </div>
        <div className="text-context-menu-option" onClick={() => handleReplyMessage(textContextMenu.messageId)}>
          {t('Reply to this Message')}
        </div>
      </div>
    )}

    {leftBubbleContextMenu.visible && (
      <div 
        className="text-context-menu"
        style={{
          position: 'fixed',
          left: `${leftBubbleContextMenu.x}px`,
          top: `${leftBubbleContextMenu.y}px`,
          // transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="text-context-menu-option" 
             onClick={() => {
               copyToClipboard(leftBubbleContextMenu.translatedText);
               setLeftBubbleContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
             }}>
          {t('Copy Translated Text')}
        </div>
        <div className="text-context-menu-option" 
             onClick={() => {
               copyToClipboard(leftBubbleContextMenu.text);
               setLeftBubbleContextMenu({ visible: false, x: 0, y: 0, text: '', messageId: null, translatedText: null });
             }}>
          {t('Copy Original Text')}
        </div>
        <div className="text-context-menu-option" onClick={() => handleReplyMessage(leftBubbleContextMenu.messageId)}>
          {t('Reply to this Message')}
        </div>
      </div>
    )}

    {replyToMessage && (
      <div className="reply-preview-container">
        <div className="reply-preview-content">
          <div className="reply-preview-header">
            {replyToMessage.username}
          </div>
          <div className="reply-preview-text">
            {replyToMessage.original_text}
          </div>
        </div>
        <button className="reply-preview-close" onClick={() => setReplyToMessage(null)}>
          ×
        </button>
      </div>
    )}

    {showJumpButton && (
      <button 
        className={`jump-to-new-button ${unseenMessages.length === 0 ? 'hidden' : ''}`}
        onClick={handleJumpToNew}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M7 10l5 5 5-5" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        {unseenMessages.length > 0 && (
          <span className="unseen-count">{unseenMessages.length}</span>
        )}
      </button>
    )}

    {/* Other Users' Loading Messages */}
    {showPreview && (
  <div className="preview-overlay" onClick={handleClosePreview}>
    <div className="preview-container" onClick={(e) => e.stopPropagation()}>
      <div className="preview-header">
        <h3>{t('Preview Message')}</h3>
        <button className="preview-close" onClick={handleClosePreview}>×</button>
      </div>
      <div className="preview-content">

      <textarea
          className="text-input-preview"
          placeholder={t('Enter your message')}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
          rows="4"
        />
<div className="preview-filter-row">

  <div className="select-container-preview" ref={dropdownPreviewRef}>
  <div 
      className={`dropdown-trigger-preview ${isDropdownOpenPreview ? 'active' : ''} ${getGlobalState('isTokenNegative') ? 'disabled' : ''}`}
      onClick={(e) => {
        if (getGlobalState('isTokenNegative')) {
          e.preventDefault();
          toast.error(t('Token insufficient. Please purchase a token pack'), {
            position: "bottom-center",
            autoClose: 2000
          });
          return;
        }
        setIsDropdownOpenPreview(!isDropdownOpenPreview);
      }}
    >
      {getGlobalState('isCustomFilterPreview') ? t('Custom Mode') : t(selectedLanguageMePreview)}
    </div>
    {isDropdownOpenPreview && (
      <div className="dropdown-menu-preview">
        <div className="categories-column-preview main-categories-preview">
          {languageGroups.map((group, index) => (
            <div
              key={index}
              className={`category-item-preview ${selectedMainCategoryPreview === group.group ? 'active' : ''}`}
              onClick={() => {
                setSelectedMainCategoryPreview(group.group);
                if (group.group === "Original Text") {
                  handleLanguageChangePreview({ target: { value: "original_text_raw" }});
                  setIsDropdownOpenPreview(false);
                } else if (group.group === "Custom Mode") {
                  handleLanguageChangePreview({ target: { value: "Custom" }});
                  setIsDropdownOpenPreview(false);
                } else if (group.group === 'Mainstream Languages') {
                  setSelectedSubgroupPreview(null);
                  setSelectedCategoryPreview(null);
                  setSelectedSubcategoryPreview(null);
                } else {
                  const firstSubgroup = group.subgroups?.[0];
                  if (firstSubgroup) {
                    setSelectedSubgroupPreview(firstSubgroup.name);
                    const firstCategory = firstSubgroup.categories?.[0];
                    if (firstCategory) {
                      setSelectedCategoryPreview(firstCategory.name);
                    }
                  }
                }
              }}
            >
              {t(group.group)}
            </div>
          ))}
        </div>
        
        {selectedMainCategoryPreview === 'Original Text' ? null : 
         selectedMainCategoryPreview === 'Custom Mode' ? null : 
         selectedMainCategoryPreview === 'Mainstream Languages' ? (
          <div className="languages-column-preview">
            {languageGroups
              .find(group => group.group === 'Mainstream Languages')
              ?.languages.map((lang, index) => (
                <div
                  key={index}
                  className="language-item-preview"
                  onClick={() => {
                    handleLanguageChangePreview({ target: { value: lang }});
                    setIsDropdownOpenPreview(false);
                  }}
                >
                  {t(lang)}
                </div>
            ))}
          </div>
        ) : (
          <>
            <div className="categories-column-preview subgroups-preview">
              {languageGroups
                .find(group => group.group === selectedMainCategoryPreview)
                ?.subgroups?.map((subgroup, index) => (
                  <div
                    key={index}
                    className={`category-item-preview ${selectedSubgroupPreview === subgroup.name ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSubgroupPreview(subgroup.name);
                      if (subgroup.categories?.[0]) {
                        setSelectedCategoryPreview(subgroup.categories[0].name);
                      }
                    }}
                  >
                    {subgroup.name}
                  </div>
                ))}
            </div>
            
            {selectedSubgroupPreview && (
              <div className="categories-column-preview categories-preview">
                {languageGroups
                  .find(group => group.group === selectedMainCategoryPreview)
                  ?.subgroups.find(sub => sub.name === selectedSubgroupPreview)
                  ?.categories.map((category, index) => (
                    <div
                      key={index}
                      className={`category-item-preview ${selectedCategoryPreview === category.name ? 'active' : ''}`}
                      onClick={() => setSelectedCategoryPreview(category.name)}
                    >
                      {category.name}
                    </div>
                  ))}
              </div>
            )}
            
            {selectedCategoryPreview && (
              <div className="categories-column-preview subcategories-preview">
                {languageGroups
                  .find(group => group.group === selectedMainCategoryPreview)
                  ?.subgroups.find(sub => sub.name === selectedSubgroupPreview)
                  ?.categories.find(cat => cat.name === selectedCategoryPreview)
                  ?.languages.map((lang, index) => (
                    <div
                      key={index}
                      className={`language-item-preview ${selectedSubcategoryPreview === lang ? 'active' : ''}`}
                      onClick={() => {
                        handleLanguageChangePreview({ target: { value: `${selectedSubgroupPreview}-${lang}` }});
                        setIsDropdownOpenPreview(false);
                      }}
                    >
                      {t(lang)}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    )}
  </div>


</div>
<button 
  className="filter-apply-btn"
  onClick={() => {
    if (selectedMainCategoryPreview === 'Custom Mode') {
      setGlobalState('isCustomFilterPreview', true);
    }
    handlePreviewTranslation();
  }}
>
  {t('Preview')}
</button>
{/* Add this after the preview-filter-row */}
{selectedMainCategoryPreview === 'Custom Mode' && (
  <div className="custom-filter-container">
    <textarea
      className="custom-filter-textarea"
      value={customFilterContent}
      onChange={(e) => setCustomFilterContent(e.target.value)}
      placeholder={t('Your Custom Prompt')}
      rows="3"
    />
  </div>
)}

{/* Update the AI output container */}
{showAiOutput && (
  <div className="ai-output-container">
    <div className="ai-output-header">
      {t('AI Result')}

    </div>
    <textarea
      className="ai-output-textarea"

      value={editableAiOutput}
      onChange={(e) => setEditableAiOutput(e.target.value)}
      rows="4"
      placeholder={t('AI processing result will appear here...')}
    />
<div className="ai-output-buttons">
<button 
    className="copy-to-clipboard-btn"
    onClick={() => {
      copyToClipboard(editableAiOutput);
      // toast.success(t('Copied to clipboard!'));
    }}
  >
    {t('Copy Result')}
  </button>
  <button 
    className="copy-to-textbox-btn"
    onClick={() => {
      setMessage(editableAiOutput);
      setShowPreview(false);
      setShowAiOutput(false);
    }}
  >
    {t('Copy Result to Textbox')}
  </button>

</div>
  </div>
)}
      </div>
    </div>
  </div>
)}

  </div>
  );
}

export default Chat;
