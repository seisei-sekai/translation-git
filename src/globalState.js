   // src/globalState.js
const local_url = process.env.REACT_APP_BACKEND_URL;

const defaults = {
  currChatroomId: '0',
  currChatroomName: 'Public Chatroom', 
  currChatroomCode:'',
  currUserId: null,
  currUserName: null,
  currUserAvatar: `${local_url}/user_avatar/default_avatar_1.png`,
  selectedLanguageMe: 'English',
  selectedLanguageMeFirst: 'English',
  selectedLanguageMeSecond: 'English',
  selectedLanguageMePreview: 'English',
  initialRenderRef: true,
  firstTimeUse: true,
  userCurrentLocation: null,
  uiLanguage: navigator.language,
  is_chatroom_private: false,
  selectedSourceLanguage: navigator.language.split('-')[0],
  isCreator: false,
  isLoggedIn: false,
  token: null,
  isGuestMode:false,
  currHostUserId:null,
  GuestJoinTime:null,
  GuestLeaveTime:null,
  isCustomFilter: false,
  isCustomFilterPreview: false,
  customFilterContent: '',
  hideAIPhotoButton: false,
  hidePrivateChatroomButton: false,
  theme: 'default',
  accentColor: '#ff8d29',
  lowCostMode: '0',
  usableToken: 0,
  maxTokenInPlan: 0,
  isTokenNegative:false,
  debugPwd:'',
  isDebugPanelOn:false
};

const storage = {
  get(key) {
    const value = localStorage.getItem(key);
    if (value === null) return defaults[key];
    
    // Handle boolean values
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    return value;
  },

  set(key, value) {
    localStorage.setItem(key, value);
  },

  getAll() {
    return Object.keys(defaults).reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {});
  },

  reset() {
    localStorage.clear();
    Object.entries(defaults).forEach(([key, value]) => {
      this.set(key, value);
    });
    return this.getAll();
  },

  init() {
    Object.entries(defaults).forEach(([key, value]) => {
      if (localStorage.getItem(key) === null) {
        this.set(key, value);
      }
    });
    return this.getAll();
  }
};

// Initialize storage
let globalState = storage.init();

// Keep existing API
export const setGlobalState = (key, value) => {
  storage.set(key, value);
};

export const getGlobalState = (key) => {
  return storage.get(key);
};

export const resetGlobalState = () => {
  globalState = storage.reset();
  return globalState;
};

export default globalState;