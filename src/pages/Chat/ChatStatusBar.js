import React, { useState, useRef, useEffect, useContext } from 'react';
import { getGlobalState, setGlobalState,resetGlobalState } from '../../globalState';
import './ChatStatusBar.css';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SidebarContext from '../../contexts/SidebarContext';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import axios from 'axios';
import { toast } from 'react-toastify';
import Notification from './Notification';



const MAX_HEIGHT = 220;
const MIN_HEIGHT = 70;
const MAX_SCANNER_HEIGHT = 420;
const MAX_CHATROOM_DETAILS_HEIGHT = 470; // New constant for chatroom details
const MAX_CHATROOM_DETAILS_HEIGHT_DETAIL= 530; // New constant for chatroom details

const local_url = process.env.REACT_APP_BACKEND_URL;

function ChatStatusBar({ onBackClick, isSliding }) {
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [isQRExpanded, setIsQRExpanded] = useState(false);
  const [showSwipingText, setShowSwipingText] = useState(false);
  const [isQRScannerExpanded, setIsQRScannerExpanded] = useState(false);
  const [scannerHeight, setScannerHeight] = useState(0);
  const barRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toggleSidebar } = useContext(SidebarContext);
  const [qrUrl, setQrUrl] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [showScannerSwipingText, setShowScannerSwipingText] = useState(false);
  const [isChatroomDetailsExpanded, setIsChatroomDetailsExpanded] = useState(false);
  const [showChatroomDetailsSwipingText, setShowChatroomDetailsSwipingText] = useState(false);
  const [chatrooms, setChatrooms] = useState([]);
  const [newChatroomName, setNewChatroomName] = useState('');
  const [newChatroomPassword, setNewChatroomPassword] = useState('');
  const [enterChatroomId, setEnterChatroomId] = useState('');
  const [enterChatroomPassword, setEnterChatroomPassword] = useState('');
  const [showCreateChatroomPopup, setShowCreateChatroomPopup] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    nonRegisteredEnterable: '1',
    tokenSpendingMode: '0',
    tokenSpendingEnterpriseCode: '',
    filterAllowanceMode: '0',
  });
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);
  const [dynamicCode, setDynamicCode] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [dynamicCodeInput, setDynamicCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [menuNotificationVisible, setMenuNotificationVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isUnpaidUser, setIsUnpaidUser] = useState(false);

  // useEffect(() => {
  //   if (getGlobalState('isGuestMode')) {
  //     setGlobalState('isLoggedIn', false);
  //     const leaveTimeStr = getGlobalState('GuestLeaveTime');
  //     if (!leaveTimeStr) {
  //       alert(t('Please join this chatroom again'));
  //       resetGlobalState();
  //       navigate('/');
  //       toast.info(t('Invalid guest session'), {
  //         position: "bottom-center",
  //         autoClose: 3000
  //       });
  //       return;
  //     }

  //     const leaveTime = new Date(leaveTimeStr);
  //     const now = new Date();
      
  //     if (isNaN(leaveTime.getTime()) || now > leaveTime) {
  //       alert(t('Please join this chatroom again'));
  //       resetGlobalState();
  //       navigate('/');
  //       toast.info(t('Guest session expired'), {
  //         position: "bottom-center",
  //         autoClose: 3000
  //       });
  //     }

  //     const checkInterval = setInterval(() => {
  //       const currentTime = new Date();
  //       if (currentTime > leaveTime) {
  //         alert(t('Please join this chatroom again'));
  //         resetGlobalState();
  //         navigate('/');
  //         toast.info(t('Guest session expired'), {
  //           position: "bottom-center",
  //           autoClose: 3000
  //         });
  //         clearInterval(checkInterval);
  //       }
  //     }, 60000);

  //     return () => clearInterval(checkInterval);
  //   }
  // }, [navigate, t]);

  const GroupAvatar = ({ chatroomId, onUserCountChange }) => {
    const [users, setUsers] = useState([]);
    
    useEffect(() => {
      if (chatroomId) {
        axios.get(`${local_url}/api/chatroom-users/${chatroomId}`)
          .then(response => {
            const usersList = response.data.users;
            setUsers(usersList.slice(0, 9));
            onUserCountChange(usersList.length);
          })
          .catch(error => {
            console.error('Error fetching chatroom users:', error);
          });
      }
    }, [chatroomId, onUserCountChange]);
  
    const getGridClass = () => {
      const count = users.length;
      if (count === 2) return 'single';
      
      switch (count) {
        case 1: return 'single';
        case 3: return 'grid-3';
        case 4: return 'grid-4';
        case 5: return 'grid-5';
        case 6: return 'grid-6';
        case 7: return 'grid-7';
        case 8: return 'grid-8';
        case 9: return 'grid-9';
        default: return 'single';
      }
    };
    
    const getPositionClass = (index, total) => {
      if (total === 3 && index === 0) return 'center-top';
      if (total === 5 && index >= 2) return 'bottom-row';
      if (total === 7) {
        if (index < 3) return 'top-row';
        if (index < 6) return 'middle-row';
        return 'bottom-single';
      }
      if (total === 8) {
        if (index < 3) return 'top-row';
        if (index < 6) return 'middle-row';
        return 'bottom-row';
      }
      return '';
    };
    const renderAvatars = () => {
      if (users.length === 2) {
        const otherUser = users.find(user => user.user_id !== getGlobalState('currUserId'));
        // console.log('Current User ID:', getGlobalState('currUserId'));
        // console.log('Users:', users);
        if (otherUser) {
          return (
            <div className="avatar-tile">
              <img 
                src={otherUser.avatar ? `${local_url}/uploads/avatars/${otherUser.avatar}` : `${local_url}/user_avatar/default_avatar_1.png`}
                alt={otherUser.username}
                className="user-avatar"
              />
            </div>
          );
        }
      }

      return users.map((user, index) => (
        <div 
          key={index} 
          className={`avatar-tile ${getPositionClass(index, users.length)}`}
        >
          <img 
            src={user.avatar ? `${local_url}/uploads/avatars/${user.avatar}` : `${local_url}/user_avatar/default_avatar_1.png`}
            alt={user.username}
            className="user-avatar"
          />
        </div>
      ));
    };
  
    return (
      <div className={`group-avatar ${getGridClass()}`}>
        {renderAvatars()}
      </div>
    );
  };
  
  const ChatroomButton = ({ chatroom, onEnterChatroom }) => {
    const [userCount, setUserCount] = useState(0);
    
    return (
      <button 
        className="chatroom-circle-button" 
        onClick={() => onEnterChatroom(chatroom.id, chatroom.name, chatroom.password)}
        title={chatroom.name}
      >
        <GroupAvatar 
          chatroomId={chatroom.id} 
          onUserCountChange={setUserCount}
        />
        <span className="chatroom-name-grid">
          {chatroom.name} ({userCount})
        </span>
      </button>
    );
  };
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleBackButtonClick = () => {
    if (onBackClick) {
      onBackClick();
    }
  };

  const handleBarClick = (e) => {
    if (e.target === e.currentTarget) {
      toggleHeight();
    }
  };

  const handleAudioClick = () => {
    navigate('/walkietalkie');
  };


  const toggleHeight = () => {
    if (height === MAX_HEIGHT || height === MAX_SCANNER_HEIGHT || height === MAX_CHATROOM_DETAILS_HEIGHT) {
      setHeight(MIN_HEIGHT);
      setIsQRExpanded(false);
      setIsQRScannerExpanded(false);
      setIsChatroomDetailsExpanded(false);
    } else {
      if (isQRScannerExpanded) {
        setHeight(MAX_SCANNER_HEIGHT);
      } else if (isChatroomDetailsExpanded) {
        setHeight(MAX_CHATROOM_DETAILS_HEIGHT);
      } else {
        setHeight(MAX_HEIGHT);
        setIsQRExpanded(true);

        fetchChatroomCodedId();

      }
    }
  };
  const [chatroomCode, setChatroomCode] = useState(getGlobalState('currChatroomCode'));

  const fetchChatroomCodedId = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${local_url}/api/get-chatroom-id-coded`,
        {
          chatroomId: getGlobalState('currChatroomId')
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setGlobalState('currChatroomCode', response.data.enter_coded_id);
        setChatroomCode(response.data.enter_coded_id);
      } else {
        console.error(t('Failed to fetch chatroom code'));
        toast.error(t('Failed to fetch chatroom code'), {
          position: "bottom-center",
          autoClose: 3000
        });
      }
    } catch (error) {
      console.error(t('Error fetching chatroom code'));
      toast.error(t('Error fetching chatroom code'), {
        position: "bottom-center",
        autoClose: 3000
      });
    }
  };
  const toggleQRExpansion = () => {
    setIsQRExpanded(prev => !prev);
    setHeight(prev => prev === MIN_HEIGHT ? MAX_HEIGHT : MIN_HEIGHT);
  };

  const handleChatroomSettingClick = () => {
    navigate('/chatroom');
  };


  const toggleQRScanner = () => {
    setIsQRScannerExpanded(!isQRScannerExpanded);
    setHeight(!isQRScannerExpanded ? MAX_SCANNER_HEIGHT : MIN_HEIGHT);
    setIsQRExpanded(false);
  };


  useEffect(() => {
    if (isQRScannerExpanded) {
      setTimeout(() => setShowScannerSwipingText(true), 100);
    } else {
      setShowScannerSwipingText(false);
    }
  }, [isQRScannerExpanded]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (facingMode === 'environment') {
        setFacingMode('user');
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      const tracks = cameraStream.getTracks();
      tracks.forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const switchCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };
  const handleJumpToUrl = () => {
    if (qrUrl) {
      if (cameraStream) {
        const tracks = cameraStream.getTracks();
        tracks.forEach(track => {
          track.stop();
          track.enabled = false;
        });
        setCameraStream(null);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
      }

      setIsQRScannerExpanded(false);
      
      setTimeout(() => {
        window.open(qrUrl, '_blank');
      }, 100);
    }
  };
  useEffect(() => {
    if (isQRScannerExpanded) {
      startCamera();
    } else {
      stopCamera();
    }

    let animationFrameId;
    if (isQRScannerExpanded) {
      const detectQRCode = async () => {
        if (videoRef.current && videoRef.current.readyState === 4 && !videoRef.current.paused) {
          try {
            if (!zxingReaderRef.current) {
              zxingReaderRef.current = new BrowserMultiFormatReader();
            }
            try {
              const result = await zxingReaderRef.current.decodeOnce(videoRef.current);
              setQrUrl(result.getText());
            } catch (error) {
              if (!(error instanceof NotFoundException)) {
                console.error('ZXing QR Code detection failed:', error);
              }
              setQrUrl('');
            }
          } catch (error) {
            console.error('QR Code detection failed:', error);
          }
        }
        animationFrameId = requestAnimationFrame(detectQRCode);
      };

      detectQRCode();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
      }
      stopCamera();
    };
  }, [isQRScannerExpanded, facingMode]);



  useEffect(() => {
    if (isQRExpanded) {
      const timer = setTimeout(() => {
        setShowSwipingText(true);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setShowSwipingText(false);
    }
  }, [isQRExpanded]);

  const toggleChatroomDetails = () => {
    const newExpandedState = !isChatroomDetailsExpanded;
    setIsChatroomDetailsExpanded(newExpandedState);
    setHeight(newExpandedState ? MAX_CHATROOM_DETAILS_HEIGHT : MIN_HEIGHT);
    setIsQRExpanded(false);
    setIsQRScannerExpanded(false);

    if (newExpandedState) {
      fetchChatrooms();
    }
  };

  useEffect(() => {
    if (isChatroomDetailsExpanded) {
      const timer = setTimeout(() => {
        setShowChatroomDetailsSwipingText(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowChatroomDetailsSwipingText(false);
    }
  }, [isChatroomDetailsExpanded]);

  useEffect(() => {
    if (isChatroomDetailsExpanded) {
      fetchChatrooms();
    }
  }, [isChatroomDetailsExpanded]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${local_url}/api/user-info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((response) => {
        if (isChatroomDetailsExpanded) {
          fetchChatrooms();
        }
      })
      .catch((error) => {
        // console.log("User info fetch error:", error);
        setGlobalState('isLoggedIn', false);
        resetGlobalState();
      });
    } else {
      setGlobalState('isLoggedIn', false);
      resetGlobalState();
    }
  }, [isChatroomDetailsExpanded]);

  const fetchChatrooms = () => {
    // console.log('Environment Variables:', {
    //   REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
    // });
    // console.log('Current Chatroom:', {
    //   id: getGlobalState('currChatroomId'),
    //   name: getGlobalState('currChatroomName'),
    //   userId: getGlobalState('currUserId'),
    //   username: getGlobalState('currUserName'),
    //   isLoggedIn: getGlobalState('isLoggedIn')
    // });

    const userId = getGlobalState('currUserId');
    const token = localStorage.getItem('token');
    
    axios.get(`${local_url}/api/user-chatrooms/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => {
        const visiblePublicChatrooms = response.data.chatrooms.filter(chatroom => 
          chatroom.is_private === '0' && !chatroom.is_invisible
        );
        // console.log('Visible public chatrooms:', visiblePublicChatrooms);
        setChatrooms(visiblePublicChatrooms);
      })
      .catch((error) => {
        console.error('Error fetching chatrooms:', error);
      });
  };

  const handleCreateChatroom = () => {
    let chatroomName = newChatroomName.trim();
    const chatroomEmptyName = chatroomName === "" ? '1' : '0';
    if (chatroomEmptyName === '1') {
      chatroomName = 'New Chatroom';
    }
    const chatroomPassword = newChatroomPassword.trim();

    // console.log('fffffuck');
    // console.log(getGlobalState('currUserId'));
    axios.post(`${local_url}/api/create-chatroom`, {
      isEmpty: chatroomEmptyName,
      chatroomName: chatroomName,
      creatorId: getGlobalState('currUserId'),
      password: chatroomPassword,
      advancedOptions: {
        ...advancedOptions,

      }
    })
    .then((response) => {
      setGlobalState('currChatroomId', response.data.chatroomId);
      setGlobalState('currChatroomName', chatroomName);
      setGlobalState('currChatroomCode', response.data.codedId);
      setNewChatroomName('');
      setNewChatroomPassword('');
      setAdvancedOptions({
        nonRegisteredEnterable: '1',
        tokenSpendingMode: '0',
        tokenSpendingEnterpriseCode: '',
        filterAllowanceMode: '0',

      });
      enterChatroom(response.data.chatroomId, chatroomName, chatroomPassword);
      setShowCreateChatroomPopup(false);
    })
    .catch((error) => {
      console.error('Error creating chatroom:', error);
    });
  };

  const enterChatroom = (chatroomId, chatroomName, chatroomPassword = '') => {
    const userId = getGlobalState('currUserId');
    setGlobalState('is_chatroom_private', false);
    // console.log('fffffuck');
    // console.log(getGlobalState('currUserId'));
    axios.post(`${local_url}/api/join-chatroom`, {
      userId: userId,
      chatroomId: chatroomId,
      password: chatroomPassword
    })
    .then((response) => {
      if (response.status === 200) {
        setGlobalState('currChatroomId', chatroomId);
        setGlobalState('currChatroomName', chatroomName);
        setGlobalState('isCreator', response.data.is_creator);

        // console.log('Entering chatroom with ID:', chatroomId);
        // console.log('Entering chatroom with Name:', chatroomName);
        // console.log('Is creator:', response.data.is_creator);
        window.location.href = `${window.location.origin}/chat`;
      }
    })
    .catch((error) => {
      if (error.response && error.response.status === 403) {
        console.error(t('Incorrect password'));
      } else {
        console.error('Error joining chatroom:', error);
      }
    });
  };



  const joinPublicChatroom = () => {
    const publicChatroomId = 1;
    const publicChatroomName = 'Public Chatroom';
    enterChatroom(publicChatroomId, publicChatroomName);
  };

  const toggleCreateChatroomPopup = () => {
    setShowCreateChatroomPopup(!showCreateChatroomPopup);
  };

  const handlePrivateChatroom = () => {
    const token = localStorage.getItem('token');
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
      setGlobalState('is_chatroom_private', true);
      window.location.href = `${window.location.origin}/chat`;
    })
    .catch((error) => {
      console.error('Error accessing private chatroom:', error);
    });
  };

  const handleQRCodeClick = (e) => {
    e.stopPropagation();
    setShowQRModal(true);
  };

  const downloadQRCode = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const background = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = `${process.env.PUBLIC_URL}/qrcode_download_template.png`;
      });

      canvas.width = background.width || 800;
      canvas.height = background.height || 600;
      ctx.drawImage(background, 0, 0);

      const existingQRCanvas = document.querySelector('.qr-code-modal canvas');
      if (!existingQRCanvas) {
        throw new Error('QR code canvas not found');
      }

      const qrWidth = canvas.width * 0.3;
      const qrHeight = qrWidth;
      const x = (canvas.width - qrWidth) / 2;
      const y = canvas.height * 0.6 - qrHeight / 2;
      ctx.drawImage(existingQRCanvas, x, y, qrWidth, qrHeight);

      if (navigator.userAgent.match(/(iPhone|iPod|iPad)/i)) {
        const imgData = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        
        const link = document.createElement('a');
        link.href = imgData;
        link.download = 'qrcode.png';
        link.target = '_blank';
        
        document.body.appendChild(link);
        
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } else {
        canvas.toBlob(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'qrcode.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 'image/png');
      }
    } catch (error) {
      console.error('Error during download:', error);
      alert('Failed to download QR code. Please try again.');
    }
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setShowProfileMenu(!showProfileMenu);
    if (!showProfileMenu) {
      setMenuVisible(true);
    }
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu') && !event.target.closest('.chatroom-setting-button')) {
        setMenuVisible(false);
        setTimeout(() => {
          setShowProfileMenu(false);
        }, 200);
      }
    };
  
    document.addEventListener('click', handleClickOutside);
  
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProfileMenu]);
  
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('accountName');
  resetGlobalState();
  setGlobalState('isLoggedIn', false);
  alert(t('Logged out successfully'));
  window.location.reload();
  // navigate('/login_page');
};

const handleMoreClick = (e) => {
  e.stopPropagation();
  setIsMoreExpanded(!isMoreExpanded);
  setHeight(isMoreExpanded ? MAX_HEIGHT : MAX_CHATROOM_DETAILS_HEIGHT_DETAIL);
  if (isMoreExpanded) {
    const qrWrapper = document.querySelector('.qr-code-wrapper');
    if (qrWrapper) {
      qrWrapper.classList.remove('expanded');
    }
    setTimeout(() => {
      setIsMoreExpanded(false);
    }, 300);
  } else {
    setIsMoreExpanded(true);
  }
};

useEffect(() => {
  const handleClickOutside = (event) => {
    const qrWrapper = document.querySelector('.qr-code-wrapper');
    if (isMoreExpanded && qrWrapper && !qrWrapper.contains(event.target)) {
      qrWrapper.classList.remove('expanded');
      setTimeout(() => {
        setIsMoreExpanded(false);
      }, 300);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isMoreExpanded]);

useEffect(() => {
  const fetchDynamicCode = async () => {
    if (isQRExpanded && getGlobalState('currChatroomId')) {
      try {
        const response = await axios.post(`${local_url}/api/get-dynamic-code`, {
          chatroomId: getGlobalState('currChatroomId'),
          userId: getGlobalState('currUserId')
        });
        setDynamicCode(response.data.dynamicCode);
      } catch (error) {
        console.error('Error fetching dynamic code:', error);
      }
    }
  };

  if (isQRExpanded &&!isSliding) {
    fetchDynamicCode();

  } else {
    setDynamicCode(null);
  }
}, [isQRExpanded]);

const DetailedInfo = ({ onClose }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [chatroomDetails, setChatroomDetails] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedPassword, setEditedPassword] = useState('');
  const [advancedOptions, setAdvancedOptions] = useState({
    nonRegisteredEnterable: '1',
    tokenSpendingMode: '0',
    filterAllowanceMode: '0',
    tokenSpendingEnterpriseCode: ''
  });
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [editedAnnouncement, setEditedAnnouncement] = useState('');

  const isCreator = getGlobalState('isCreator');

  useEffect(() => {
    fetchChatroomDetails();
  }, []);


  const fetchChatroomDetails = async () => {
    try {
      const response = await axios.get(`${local_url}/api/get-chatroom-meta-details`, {
        params: {
          userId: getGlobalState('currUserId'),
          chatroomId: getGlobalState('currChatroomId')
        }
      });
      console.log("Fetched Chatroom Details:", response.data);
      setChatroomDetails(response.data);
      setEditedName(response.data.name);
      setEditedPassword(response.data.password || '');
      setAdvancedOptions({
        nonRegisteredEnterable: response.data.non_registered_enterable,
        tokenSpendingMode: response.data.token_spending_mode,
        filterAllowanceMode: response.data.filter_allowance_mode,
        tokenSpendingEnterpriseCode: response.data.token_spending_enterprise_code || ''
      });
      setGlobalState('currChatroomName', response.data.name);
    } catch (error) {
      console.error("Error fetching chatroom details:", error);
      toast.error(t('Failed to load chatroom details'), {
        position: "bottom-center",
        autoClose: 2000
      });
    }
  };

  const handleUpdate = async (updates) => {
    if (!isCreator) return;

    try {
      const response = await axios.post(`${local_url}/api/set-chatroom-meta-details`, {
        userId: getGlobalState('currUserId'),
        chatroomId: getGlobalState('currChatroomId'),
        updates: updates
      });

      if (response.status === 200) {
        toast.success(t('Update successful'), {
          position: "bottom-center",
          autoClose: 2000
        });
        fetchChatroomDetails();
      }
    } catch (error) {
      toast.error(t('Update failed: ') + error.response?.data?.error || t('Unknown error'), {
        position: "bottom-center",
        autoClose: 2000
      });
    }
  };

  const handleNameUpdate = () => {
    if (editedName !== chatroomDetails.name) {
      handleUpdate({ name: editedName });
    }
    setIsEditingName(false);
  };

  const handlePasswordUpdate = () => {
    if (editedPassword !== chatroomDetails.password) {
      handleUpdate({ password: editedPassword });
    }
    setIsEditingPassword(false);
  };

  const handleAdvancedOptionUpdate = (key, value) => {
    const updates = { [key]: value };
    handleUpdate(updates);
  };

  useEffect(() => {
    if (chatroomDetails) {
      setEditedAnnouncement(chatroomDetails.group_announcement_text || '');
    }
  }, [chatroomDetails]);

  const handleAnnouncementUpdate = () => {
    if (editedAnnouncement !== chatroomDetails.group_announcement_text) {
      handleUpdate({ group_announcement_text: editedAnnouncement });
    }
    setIsEditingAnnouncement(false);
  };

  const handleRemoveUser = (kickedUserId) => {
    if (window.confirm(t('Are you sure you want to remove this user from the room?'))) {
      const token = localStorage.getItem('token');
      axios.post(`${local_url}/api/creator-remove-user`, {
        creatorId: getGlobalState('currUserId'),
        kickedUserId: kickedUserId,
        chatroomId: getGlobalState('currChatroomId')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((response) => {
        if (response.status === 200) {
          toast.success(t('User removed successfully'), {
            position: "bottom-center",
            autoClose: 2000
          });
          fetchChatroomDetails();
        }
      })
      .catch((error) => {
        toast.error(t('Failed to remove user: ') + error.response?.data?.error || t('Unknown error'), {
          position: "bottom-center",
          autoClose: 2000
        });
      });
    }
  };

  return (
    <div className="detailed-info" onClick={e => e.stopPropagation()}>
      <div className="detailed-info-content">
        <div className="room-owner-row">
          <span className="info-label">{t('Room Owner')}:</span>
          <div className="owner-info">
            <Link to={`/profile_public/${chatroomDetails?.creator_id}`}>
              <img 
                src={`${local_url}/uploads/avatars/${chatroomDetails?.creator_avatar || 'default_avatar.png'}`}
                alt={t('Owner Avatar')}
                className="owner-avatar"
              />
            </Link>
            <Link to={`/profile_public/${chatroomDetails?.creator_id}`} className="owner-username">
              {chatroomDetails?.creator_name || t('Unknown')}
            </Link>
          </div>
        </div>

        <div className="room-members-row">
          <span className="info-label">{t('Room Members')}:</span>
          <div className="members-preview" onClick={() => setShowMembersModal(true)}>
            <div className="members-avatars">
              {chatroomDetails?.participants.slice(0, 3).map((participant, index) => (
                <img 
                  key={index}
                  src={`${local_url}/uploads/avatars/${participant.avatar}`}
                  alt={`Member ${index + 1}`}
                  className="member-avatar"
                />
              ))}
              {chatroomDetails?.participants.length > 3 && (
                <div className="more-members">
                  +{chatroomDetails.participants.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="info-row">
          <div className="label-row">
            <span className="info-label">{t('Chatroom Name')}:</span>
            {isCreator && !isEditingName && (
              <button className="edit-btn" onClick={() => setIsEditingName(true)}>
                {t('Edit')}
              </button>
            )}
          </div>
          <div className="info-content">
            {isEditingName && isCreator ? (
              <div className="edit-field">
                <input 
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="edit-input"
                />
                <div className="edit-actions">
                  <button className="cancel-btn" onClick={() => setIsEditingName(false)}>✕</button>
                  <button className="confirm-btn" onClick={handleNameUpdate}>✓</button>
                </div>
              </div>
            ) : (
              <div className="name-container">
                <span className="chatroom-name-text">
                  {chatroomDetails?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="info-row announcement-row">
          <div className="label-row">
            <span className="info-label">{t('Group Announcement')}:</span>
            {isCreator && !isEditingAnnouncement && (
              <button className="edit-btn" onClick={() => setIsEditingAnnouncement(true)}>
                {t('Edit')}
              </button>
            )}
          </div>
          <div className="info-content announcement-content">
            {isEditingAnnouncement && isCreator ? (
              <div className="edit-field">
                <textarea 
                  value={editedAnnouncement}
                  onChange={(e) => setEditedAnnouncement(e.target.value)}
                  className="edit-input announcement-input"
                  placeholder={t('Enter group announcement')}
                  maxLength={1000}
                />
                <div className="edit-actions">
                  <button className="cancel-btn" onClick={() => setIsEditingAnnouncement(false)}>✕</button>
                  <button className="confirm-btn" onClick={handleAnnouncementUpdate}>✓</button>
                </div>
              </div>
            ) : (
              <div className="announcement-container">
                <span className="announcement-text">
                  {chatroomDetails?.group_announcement_text || t('No announcement')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="advanced-settings">
          <div className="advanced-toggle" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
            {showAdvancedSettings ? '-  ' : '+  '} {t('Advanced Settings')}
          </div>
          
          {showAdvancedSettings && (
            <div className="advanced-options">
              <div className="option-row">
                <span className="option-label">{t('Password')}:</span>
                <div className="password-option-content">
                  {isEditingPassword && isCreator ? (
                    <div className="edit-field">
                      <input 
                        type={isPasswordVisible ? "text" : "password"}
                        value={editedPassword}
                        onChange={(e) => setEditedPassword(e.target.value)}
                        className="edit-input"
                      />
                      <div className="edit-actions">
                        <button className="cancel-btn" onClick={() => setIsEditingPassword(false)}>✕</button>
                        <button className="confirm-btn" onClick={handlePasswordUpdate}>✓</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="password-field">
                        <span>{isPasswordVisible ? chatroomDetails?.password : "********"}</span>
                        <button 
                          className="eye-toggle"
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        >
                          {isPasswordVisible ? "hide" : "show"}
                        </button>
                      </div>
                      {isCreator && (
                        <button className="edit-btn" onClick={() => setIsEditingPassword(true)}>
                          {t('Edit')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="option-row">
                <span className="option-label">{t('Guest Access')}:</span>
                <select 
                  value={advancedOptions.nonRegisteredEnterable}
                  onChange={(e) => {
                    if (isCreator) {
                      handleAdvancedOptionUpdate('non_registered_enterable', e.target.value);
                    }
                  }}
                  disabled={!isCreator}
                >
                  <option value="1">{t('Registered Users & Guest')}</option>
                  <option value="0">{t('Registered Users Only')}</option>
                </select>
              </div>

              <div className="action-buttons">
                <button className="export-btn" disabled>{t('Export Chat History')}</button>
                <button className="leave-btn" disabled>{t('Leave Room')}</button>
              </div>
            </div>
          )}
        </div>

        {showMembersModal && (
          <div className="members-modal">
            <div className="modal-content">
              <h3>{t('Room Members')}</h3>
              <button className="close-modal" onClick={() => setShowMembersModal(false)}>✕</button>
              <div className="members-list">
                {chatroomDetails?.participants.map((participant, index) => (
                  <div key={index} className="member-item">
                    <Link to={`/profile_public/${participant.user_id}`}>
                      <img 
                        src={`${local_url}/uploads/avatars/${participant.avatar}`}
                        alt={participant.user_id}
                        className="member-avatar"
                      />
                    </Link>
                    <Link to={`/profile_public/${participant.user_id}`} className="member-username">
                      {participant.user_id}
                    </Link>
                    {isCreator && participant.user_id !== getGlobalState('currUserId') && (
                      <button 
                        className="remove-user-btn"
                        onClick={() => handleRemoveUser(participant.user_id)}
                      >
                        {t('Remove')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const handleLeaveRoom = () => {
  if (window.confirm(t('Are you sure you want to leave this chatroom?'))) {
    const userId = getGlobalState('currUserId');
    const chatroomId = getGlobalState('currChatroomId');

    axios.post(`${local_url}/api/leave-chatroom`, {
      userId: userId,
      chatroomId: chatroomId
    })
    .then((response) => {
      if (response.status === 200) {
        alert(t('Left successfully!'));
        handlePrivateChatroom();
      }
    })
    .catch((error) => {
      console.error('Error leaving chatroom:', error);
      alert(t('Failed to leave chatroom. Please try again.'));
    });
  }
};

const joinChatroomAdvanced = () => {
  setShowJoinModal(true);
  setDynamicCodeInput('');
  setPasswordInput('');
  setShowPasswordField(false);
  setJoinError('');
};

const handleDynamicCodeSubmit = async () => {
  try {
    const formattedCode = dynamicCodeInput.toUpperCase();
    const response = await axios.post(`${local_url}/api/join-by-dynamic-code`, {
      dynamicCode: formattedCode,
      password: passwordInput || undefined
    });

    if (response.data.success) {
      setShowJoinModal(false);
      enterChatroom(response.data.chatroomId, response.data.chatroomName);
    } else if (response.data.requiresPassword && !passwordInput) {
      setShowPasswordField(true);
      setJoinError('Please enter the chatroom password');
    }
  } catch (error) {
    setJoinError(error.response?.data?.error || 'Failed to join chatroom');
  }
};

const renderJoinModal = () => {
  return (
    <div className={`join-modal ${showJoinModal ? 'show' : ''}`}>
      <div className="join-modal-content">
        <button className="close-modal" onClick={() => setShowJoinModal(false)}>×</button>
        
        <div className="join-method qr">
          <h3>{t('Method 1: Join by QR Code')}</h3>
          <p>{t('Please use the QR code scanner in the top left or your system camera to join the chatroom.')}</p>
        </div>

        <div className="join-method dynamic">
          <h3>{t('Method 2: Join by Dynamic Code')}</h3>
          <div className="input-group">
            <input
              type="text"
              maxLength="6"
              value={dynamicCodeInput}
              onChange={(e) => setDynamicCodeInput(e.target.value)}
              placeholder={t('Enter 6-digit code')}
            />
            {showPasswordField && (
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={t('Enter password')}
              />
            )}
            {joinError && <div className="error-message">{joinError}</div>}
            <button 
              className="join-button"
              onClick={handleDynamicCodeSubmit}
            >
              {t('Enter')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const handleNotificationClick = (e) => {
  e.stopPropagation();
  setShowNotificationMenu(!showNotificationMenu);
  setTimeout(() => {
    setMenuNotificationVisible(!menuNotificationVisible);
  }, 50);
};

const handleNotificationClose = () => {
  setMenuNotificationVisible(false);
  setTimeout(() => {
    setShowNotificationMenu(false);
  }, 200);
};

useEffect(() => {
  if (showProfileMenu && getGlobalState('isLoggedIn')) {
    const token = localStorage.getItem('token');
    axios.get(`${local_url}/api/get_usable_purchased_token`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      setGlobalState('usableToken', response.data.usable_token);
      setGlobalState('maxTokenInPlan', response.data.max_token_in_plan);
      
      if (response.data.usable_token < 0) {
        if (getGlobalState('isTokenNegative')) {
          setGlobalState('isTokenNegative', true);
          setGlobalState('selectedLanguageMe', 'original_text_raw');
          setGlobalState('selectedLanguageMePreview', 'original_text_raw');
        } else {
          setGlobalState('isTokenNegative', true);
          setGlobalState('selectedLanguageMe', 'original_text_raw');
          setGlobalState('selectedLanguageMePreview', 'original_text_raw');
          window.location.reload();
        }
      } else {
        if (getGlobalState('isTokenNegative')) {
          setGlobalState('isTokenNegative', false);
          window.location.reload();
        } else {
          setGlobalState('isTokenNegative', false);
        }
      }
    })
    .catch(error => {
      console.error('Error fetching token info:', error);
    });
  }
}, [showProfileMenu]);

useEffect(() => {
  const checkUserPaymentStatus = async () => {
    // Skip payment check for guest users
    if (getGlobalState('isGuestMode') === true || getGlobalState('isGuestMode') === 'true') {
      return;
    }
    
    if (getGlobalState('isLoggedIn')) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${local_url}/api/check-user-is-unpaid`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.isUnpaid) {
          setIsUnpaidUser(true);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }
  };

  checkUserPaymentStatus();
}, []);

const [showReferCode, setShowReferCode] = useState(false);
const [referCode, setReferCode] = useState('');
const [referCodeStatus, setReferCodeStatus] = useState('');

const handleReferCodeSubmit = async () => {
  try {
    const userId = getGlobalState('currUserId');
    const response = await axios.post(`${local_url}/api/refer-code-action`, {
      userId: getGlobalState('currUserId'),
      referCode: referCode
    });

    if (response.data.success) {
      setReferCodeStatus('success');
      window.location.reload();
    } else {
      setReferCodeStatus('error');
    }
  } catch (error) {
    console.error('Error submitting refer code:', error);
    setReferCodeStatus('error');
  }
};

  return (
    <>
      <div className={`chat-status-bar ${isSliding ? 'sliding' : ''}`} onClick={handleBarClick}>
        <div className="chatroom-name-setting">
          {isSliding ? (
            <div 
              className={`chat-status-bar ${height === MIN_HEIGHT ? 'minimized' : ''} ${isQRExpanded || isQRScannerExpanded || isChatroomDetailsExpanded ? 'expanded' : ''}`}
              style={{ height: `${height}px` }}
              ref={barRef}
              onClick={handleBarClick}
            >
              <div className="chatroom-name-chatlist">
                {t('Chats')}
              </div>
              <button 
                className={`button-top-left-menu`}
                onClick={toggleSidebar} 
                aria-label={t('Menu')}
              />
              <div className="toggle-button-container" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="toggle-button" 
                  onClick={toggleHeight}
                  onMouseDown={handleMouseDown}
                >
                  {!showMembersModal && <div className="toggle-icon"></div>}
                </button>
              </div>
              {isQRExpanded && (
                <div className="qr-code-expanded" onClick={handleBarClick}>
                  <div 
                    className={`qr-code-wrapper ${isMoreExpanded ? 'expanded' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {getGlobalState('is_chatroom_private') ? (
                      <div className="private-chat-layout">
                        <div className="private-chat-icon">
                          <img
                            src={`${process.env.PUBLIC_URL}/Cut.png`}
                            alt="Private Chat"
                            className="private-chat-image"
                          />
                        </div>
                        <div className="private-chat-text">
                          <div className="private-chat-title">
                            {getGlobalState('currUserName')}'s {t('Private room')}
                          </div>
                          <div className={`swiping-text ${showSwipingText ? 'show' : ''}`}>
                            <span className="private-room-text">{getGlobalState('currUserName')}'s {t('Private room')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!isMoreExpanded ? (
                          <QRCodeCanvas 
                            value={`${window.location.origin}/enter_chatroom/${chatroomCode}`}
                            size={200}
                            className="qr-code-icon-large"
                            imageSettings={{
                              src: `${process.env.PUBLIC_URL}/Cut.png`,
                              height: 40,
                              width: 40,
                              excavate: true
                            }}
                            onClick={handleQRCodeClick}
                          />
                        ) : (
                          <DetailedInfo onClose={() => setIsMoreExpanded(false)} />
                        )}
                      </>
                    )}
                  </div>
                  {!getGlobalState('is_chatroom_private') && !isMoreExpanded && (
                    <>
                      <div className={`swiping-text ${showSwipingText ? 'show' : ''}`}>
                        {t('Scan this QR code to join the session.')}
                        <div className="dynamic-code-container">
                          <div className="dynamic-code-label">{t('Dynamic Code')}</div>
                          <div className="dynamic-code-wrapper">
                            <div className="dynamic-code-display">{dynamicCode || '----'}</div>
                            <button 
                              className="copy-button"
                              onClick={() => {
                                navigator.clipboard.writeText(dynamicCode);
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {!getGlobalState('is_chatroom_private') && (
                    <button 
                      className="more-button"
                      onClick={handleMoreClick}
                    >
                      {t(isMoreExpanded ? 'Less' : 'More')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="fixed-button-container">
                <button className={`qr-code-button ${isSliding ? 'slide-out' : 'slide-in'}`} onClick={toggleQRScanner}>
                  <img
                    src={`${process.env.PUBLIC_URL}/qr-code-scan-empty-icon.png`} 
                    alt={t('QR Code Scan')}
                    className="qr-code-icon" 
                  />
                </button>
                
                <button className={`qr-code-button ${isSliding ? 'slide-out' : 'slide-in'}`} onClick={toggleQRExpansion}>
                  <img
                    src={`${process.env.PUBLIC_URL}/qr-code-scan-icon.webp`} 
                    alt={t('QR Code Scan')}
                    className="qr-code-icon" 
                  />
                </button>
              </div>

              <div className={`chatroom-name ${isSliding ? 'slide-out' : 'slide-in'}`}>
                {getGlobalState('currChatroomName') || ''}
              </div>

              <div className="fixed-button-container right">
                <button 
                  className={`chatroom-setting-button ${isSliding ? 'slide-out' : 'slide-in'}`} 
                  onClick={toggleChatroomDetails}
                >
                  <img
                    src={`${process.env.PUBLIC_URL}/group-icon.svg`} 
                    alt={t('Chatroom Setting')}
                    className="chatroom-setting-icon"
                  />
                </button>
                
                <button 
                  className={`chatroom-setting-button ${isSliding ? 'slide-out' : 'slide-in'} ${!getGlobalState('isLoggedIn') ? 'disabled' : ''}`}
                  onClick={(e) => getGlobalState('isLoggedIn') ? handleNotificationClick(e) : null}
                  disabled={!getGlobalState('isLoggedIn')}
                  title={!getGlobalState('isLoggedIn') ? t('Please login to view notifications') : ''}
                >
                  <img
                    src={`${process.env.PUBLIC_URL}/notification_button_1.svg`} 
                    alt={t('Notification')}
                    className={`chatroom-setting-icon ${!getGlobalState('isLoggedIn') ? 'disabled' : ''}`}
                  />
                  {showNotificationMenu && getGlobalState('isLoggedIn') && (
                    <Notification 
                      menuVisible={menuNotificationVisible}
                      onClose={handleNotificationClose}
                    />
                  )}
                </button>
                


                {/* <button className={`chatroom-setting-button ${isSliding ? 'slide-out' : 'slide-in'}`} onClick={handleAudioClick}>
                  <img
                    src={`${process.env.PUBLIC_URL}/walkie-talkie-icon.svg`} 
                    alt={t('Walkie Talkie')}
                    className="chatroom-setting-icon"
                  />
                </button> */}
                
                {/* <button className={`chatroom-setting-button ${isSliding ? 'slide-out' : 'slide-in'}`} onClick={() => navigate('/map')}>
                  <img
                    src={`${process.env.PUBLIC_URL}/setting_map_icon.svg`} 
                    alt={t('Map')}
                    className="chatroom-setting-icon"
                  />
                </button> */}

                <button className={`chatroom-setting-button ${isSliding ? 'slide-out' : 'slide-in'}`} onClick={handleProfileClick}>
                  <img
                    src={getGlobalState('isLoggedIn') ? `${local_url}/uploads/avatars/${getGlobalState("currUserAvatar")}` : `${local_url}/user_avatar/default_avatar_1.png`}
                    alt={t('UserProfileSetting')}
                    className="chatroom-setting-icon-user"
                  />
                  {showProfileMenu && (
                    <div className={`profile-menu ${menuVisible ? 'show' : ''}`}>
                      {getGlobalState('isLoggedIn') ? (
                        <>
                          <div className="profile-menu-header">
                            {t('Welcome back')}, {getGlobalState('currUserName')}!
                          </div>
                          <div className="profile-menu-item token-display">
                            {t('Token')}: {getGlobalState('usableToken')}/{getGlobalState('maxTokenInPlan')}
                          </div>
                          <div className="profile-menu-item" onClick={() => navigate('/profile')}>
                            {t('Profile')}
                          </div>
                          <div className="profile-menu-item" onClick={handleLogout}>
                            {t('Logout')}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="profile-menu-header">
                            {t('Welcome guest, please Login or Register')}
                          </div>
                          <div className="profile-menu-item" onClick={() => navigate('/login_page')}>
                            {t('Login')}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </button>
              </div>

              <div 
                className={`chat-status-bar ${height === MIN_HEIGHT ? 'minimized' : ''} ${isQRExpanded || isQRScannerExpanded || isChatroomDetailsExpanded ? 'expanded' : ''}`}
                style={{ height: `${height}px` }}
                ref={barRef}
                onClick={handleBarClick}
              >
                <div className="toggle-button-container" onClick={handleBarClick}>
                  <button 
                    className="toggle-button" 
                    onClick={toggleHeight}
                    onMouseDown={handleMouseDown}
                  >
                    {!showMembersModal && <div className="toggle-icon"></div>}
                  </button>
                </div>
                {isQRExpanded && (
                  <div className="qr-code-expanded" onClick={handleBarClick}>
                    <div 
                      className={`qr-code-wrapper ${isMoreExpanded ? 'expanded' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      {getGlobalState('is_chatroom_private') ? (
                        <div className="private-chat-layout">
                          <div className="private-chat-icon">
                            <img
                              src={`${process.env.PUBLIC_URL}/Cut.png`}
                              alt="Private Chat"
                              className="private-chat-image"
                            />
                          </div>
                          <div className="private-chat-text">
                            {/* <div className="private-chat-title">
                              {getGlobalState('currUserName')}'s {t('Private room')}
                            </div> */}
                            <div className={`swiping-text ${showSwipingText ? 'show' : ''}`}>
                              {getGlobalState('currUserName')}'s {t('Private room')}
                            </div>
                            <div className={`swiping-text ${showSwipingText ? 'show' : ''}`}>
                              <span className="private-room-text"> Messages only visible to user</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {!isMoreExpanded ? (
                            <QRCodeCanvas 
                              value={`${window.location.origin}/enter_chatroom/${chatroomCode}`}
                              size={200}
                              className="qr-code-icon-large"
                              imageSettings={{
                                src: `${process.env.PUBLIC_URL}/Cut.png`,

                              }}
                              onClick={handleQRCodeClick}
                            />
                          ) : (
                            <DetailedInfo onClose={() => setIsMoreExpanded(false)} />
                          )}
                        </>
                      )}
                    </div>
                    {!getGlobalState('is_chatroom_private') && !isMoreExpanded && (
                      <>
                        <div className={`swiping-text ${showSwipingText ? 'show' : ''}`}>
                          {t('Scan this QR code to join the session.')}
                          <div className="dynamic-code-container">
                            <div className="dynamic-code-label">{t('Dynamic Code')}</div>
                            <div className="dynamic-code-wrapper">
                              <div className="dynamic-code-display">{dynamicCode || '----'}</div>
                              <button 
                                className="copy-button"
                                onClick={() => {
                                  navigator.clipboard.writeText(dynamicCode);
                                }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {!getGlobalState('is_chatroom_private') && (
                      <button 
                        className="more-button"
                        onClick={handleMoreClick}
                      >
                        {t(isMoreExpanded ? 'Less' : 'More')}
                      </button>
                    )}
                  </div>
                )}
                {isQRScannerExpanded && (
                  <div className="qr-scanner-container">
                    <div className="camera-container">
                      <video ref={videoRef} autoPlay playsInline className="camera-view" />
                    </div>
                    <div className="qr-url-textbox">
                      <input 
                        type="text" 
                        value={qrUrl} 
                        readOnly 
                        placeholder={t('QR Code URL will appear here')}
                      />
                    </div>
                    <div className="button-container">
                      <button className="camera-switch" onClick={switchCamera}>
                        {t('Switch Camera')}
                      </button>
                      <button className="jump-to-url" onClick={handleJumpToUrl}>
                        {t('Go to Chatroom')}
                      </button>
                    </div>
                  </div>
                )}
                {isChatroomDetailsExpanded && (
                  <div className="chatrooms-detail-container" onClick={(e) => e.stopPropagation()}>
                    {!getGlobalState('isLoggedIn') ? (
                      <>
                        <h2 className="not-logged-in-message">{t('You are not logged in')}</h2>
                        <p className="login-instruction">{t('Please log in to create or join chatrooms.')}</p>
                        <Link to="/login_page" className="login-button">{t('Go to Login')}</Link>
                      </>
                    ) : (
                      <div className="chatroom-management">
                        <div className="chatroom-section">
                          <h2>{t('Chatrooms History')}</h2>
                          {chatrooms.length === 0 ? (
                            <p style={{ color: 'white' }}>{t('No chatrooms available.')}</p>
                          ) : (
                            <div className="chatroom-grid-container">
                              <div className="chatroom-grid">
                                {chatrooms.map((chatroom) => (
                                  <ChatroomButton
                                    key={chatroom.id}
                                    chatroom={chatroom}
                                    onEnterChatroom={enterChatroom}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="large-button-container">
                          <button className="large-chatroom-button" onClick={toggleCreateChatroomPopup}>
                            <img
                              src={`${process.env.PUBLIC_URL}/setting_create_chatroom_icon.svg`}
                              alt={t('Create Chatroom')}
                              className="large-button-icon"
                            />
                            <span className="large-button-text">{t('Create Chatroom')}</span>
                          </button>
                          <button className="large-chatroom-button" onClick={joinChatroomAdvanced}>
                            <img
                              src={`${process.env.PUBLIC_URL}/setting_public_chatroom_icon.svg`}
                              alt={t('Join Chatroom')}
                              className="large-button-icon"
                            />
                            <span className="large-button-text">{t('Join Chatroom')}</span>
                          </button>
                          <button className="large-chatroom-button" onClick={handlePrivateChatroom}>
                            <img
                              src={`${process.env.PUBLIC_URL}/setting_private_chatroom_icon.svg`}
                              alt={t('Go to Private Chatroom')}
                              className="large-button-icon"
                            />
                            <span className="large-button-text">{t('Go to Private Chatroom')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateChatroomPopup && (
        <div className="create-chatroom-popup">
          <button className="quit-button" onClick={toggleCreateChatroomPopup}>x</button>
          <div className="chatroom-section">
            <h2>{t('Create a Chatroom')}</h2>
            <div className="input-group">
              <div className="option-row-name column">
                <span className="option-label-name">{t('Chatroom Name')}:</span>
                <input
                  type="text"
                  placeholder={t('Enter new chatroom name (optional)')}
                  value={newChatroomName}
                  onChange={(e) => setNewChatroomName(e.target.value.slice(0, 20))}
                  maxLength={20}
                />
              </div>
              
              <div className="advanced-options-toggle" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}>
                {showAdvancedOptions ? '-' : '+'} {t('Advanced Options')}
              </div>
              
              {showAdvancedOptions && (
                <div className="advanced-options-container">
                  <div className="option-row">
                    <span className="option-label">{t('Password')}:</span>
                    <input
                      type="password"
                      placeholder={t('Enter password (optional)')}
                      value={newChatroomPassword}
                      onChange={(e) => setNewChatroomPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="option-row">
                    <span className="option-label">{t('Guest Access')}:</span>
                    <select
                      value={advancedOptions.nonRegisteredEnterable}
                      onChange={(e) => setAdvancedOptions({...advancedOptions, nonRegisteredEnterable: e.target.value})}
                    >
                      <option value="1">{t('Registered Users & Guest')}</option>
                      <option value="0">{t('Registered Users Only')}</option>
                    </select>
                  </div>
                
{/* 
                  <div className="option-row">
                    <span className="option-label">{t('Filter Allowance')}:</span>
                    <select
                      value={advancedOptions.filterAllowanceMode}
                      onChange={(e) => setAdvancedOptions({...advancedOptions, filterAllowanceMode: e.target.value})}
                    >
                      <option value="0">{t('Allow All Filter')}</option>
                      <option value="1">{t('Non-entertainment Only')}</option>
                    </select>
                  </div>



                  <div className="option-row">
                    <span className="option-label">{t('Token Mode')}:</span>
                    <select
                      value={advancedOptions.tokenSpendingMode}
                      onChange={(e) => setAdvancedOptions({...advancedOptions, tokenSpendingMode: e.target.value})}
                    >
                      <option value="0">{t('Individual')}</option>
                      <option value="1">{t('Creator')}</option>
                      <option value="2">{t('Enterprise')}</option>
                    </select>
                  </div>
                  
                  {advancedOptions.tokenSpendingMode === '2' && (
                    <div className="option-row">
                      <span className="option-label">{t('Enterprise Code')}:</span>
                      <input
                        type="text"
                        placeholder={t('Enter enterprise code')}
                        value={advancedOptions.tokenSpendingEnterpriseCode}
                        onChange={(e) => {
                          if (getGlobalState('isCreator')) {
                            setAdvancedOptions({
                              ...advancedOptions,
                              tokenSpendingEnterpriseCode: e.target.value
                            });
                          }
                        }}
                        disabled={!getGlobalState('isCreator')}
                      />
                    </div>
                  )} */}

                </div>
              )}
              
              <button className="action-button" onClick={handleCreateChatroom}>
                {t('Create Chatroom')}
              </button>
            </div>
          </div>
        </div>
      )}
      {isQRScannerExpanded && (
        <div className="mosaic-overlay" onClick={toggleQRScanner} />
      )}
            {/* Add overlays for all expanded states */}
            {isQRScannerExpanded && (
        <div className="mosaic-overlay" onClick={toggleQRScanner} />
      )}
      {isQRExpanded && (
        <div className="mosaic-overlay" onClick={toggleQRExpansion} />
      )}
      {isChatroomDetailsExpanded && (
        <div className="mosaic-overlay" onClick={toggleChatroomDetails} />
      )}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-header">
              {t('QR Code')}
              <button className="qr-modal-close" onClick={() => setShowQRModal(false)}>×</button>
            </div>
            <div className="qr-code-modal">
              <QRCodeCanvas 
                value={`${window.location.origin}/enter_chatroom/${chatroomCode}`}
                size={200}
                imageSettings={{
                  src: `${process.env.PUBLIC_URL}/Cut.png`,
                  height: 40,
                  width: 40,
                  excavate: true
                }}
              />
            </div>
            <div className="qr-modal-info">
              <div className="qr-info-item">
                <div className="qr-modal-label">{t('Chatroom Name')}</div>
                
                {getGlobalState('currChatroomName')}
              </div>
              <div className="qr-info-item url-container">
                <div className="qr-modal-label">{t('Share')}</div>
                <div className="url-copy-wrapper">
                  <input 
                    type="text" 
                    value={`${window.location.origin}/enter_chatroom/${chatroomCode}`}
                    readOnly
                    className="share-url-input"
                  />
                  <button 
                    className="copy-url-button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/enter_chatroom/${chatroomCode}`);
                      toast.success(t('URL copied to clipboard'), {
                        position: "bottom-center",
                        autoClose: 2000
                      });
                    }}
                  >
                    {t('Copy')}
                  </button>
                </div>
              </div>
            </div>
            <button className="qr-download-button" onClick={downloadQRCode}>
              {t('Download QR Code')}
            </button>
          </div>
        </div>
      )}

    {!getGlobalState('is_chatroom_private') && !getGlobalState('hidePrivateChatroomButton') && (
      <label className="private-room-btn" onClick={() => {
        if (!getGlobalState('isLoggedIn')) {
          toast.error('Please login first to create a private room', {
            position: "bottom-center",
            autoClose: 2000,
            style: {
              marginBottom: '50px',
              background: 'black',
              color: 'white',
            },
            progressStyle: {
              background: 'white'
            }
          });
          return;
        }
        handlePrivateChatroom();
      }}>
        <img
          src={`${process.env.PUBLIC_URL}/language_icon.png`}
          alt="Language"
          className="language-status-icon" 
        />
        {t('Private Chatroom')}
      </label>
    )}
      {showJoinModal && renderJoinModal()}
      {isUnpaidUser && (
        <div className="unpaid-overlay">
          <div className="unpaid-modal">
            <h2>{t('Choose a Plan')}</h2>
            <p>{t('You have to choose a plan to continue')}</p>
            <Link to="/myplan" className="upgrade-button">
              {t('View Plans')}
            </Link>


            
            <div className="refer-code-section">
              <div
                className="refer-code-toggle" 
                onClick={() => setShowReferCode(!showReferCode)}
                style={{ cursor: 'pointer', textDecoration: 'underline'}}
              >
                {t('Refer code')}
              </div>
              {/* <div className="free-tokens-promo" style={{ 
                marginTop: '15px',
                color: '#8FD193',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '13px'
              }}>
                {t('Congratulations! You have been granted free tokens.')}
                </div>
                <div className="free-tokens-promo" style={{ 
                marginTop: '5px',
                color: '#8FD193',
                fontWeight: 'bold',
                textAlign: 'center',
                fontSize: '13px'
              }}>
                {t('Enter "YOOHI23" in refer code to activate your account.')}
                </div> */}
              {showReferCode && (
                <div className="refer-code-input" style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    value={referCode}
                    onChange={(e) => setReferCode(e.target.value)}
                    placeholder={t('Enter refer code')}
                    style={{ marginRight: '10px' }}
                  />
                  <button onClick={handleReferCodeSubmit}>
                    {t('Submit')}
                  </button>
                  {referCodeStatus && (
                    <p className={`status-message ${referCodeStatus === 'success' ? 'success' : 'error'}`}>
                      {referCodeStatus === 'success' 
                        ? t('Successful') 
                        : t('Please ensure the refer code you input is valid')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatStatusBar;
