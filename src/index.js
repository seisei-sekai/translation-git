import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';  // Main page component

import Chat from './pages/Chat/Chat';
import Chatroom from './pages/Chatroom/Chatroom';
import LandingPage from './pages/LandingPage/LandingPage';
import Login from './pages/Login/Login';
import Register from './pages/Login/Register';
import MyPlan from './pages/MyPlan/MyPlan';
import People from './pages/People/People';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import ProfilePublic from './pages/Profile/Profile_public';  // Import the new public profile component
import Walkietalkie from './pages/WalkieTalkie/Walkietalkie';  // Add this line
import PhotoOCR from './pages/PhotoOCR/photoOCR';  // Changed from Lecture to PhotoOCR

import ChatroomSetting from './pages/Chatroom/ChatroomSetting';  // Add this line
import ChatGuest from './pages/ChatGuest/ChatGuest';  // Add this line
import './i18n';  // Make sure to import i18n here to initialize it globally

import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';  // Import routing tools
import Layout from './components/Layout';  // Import the new Layout component
import Slidebar from './components/Slidebar';
import { SidebarProvider } from './contexts/SidebarContext';

import ChatroomEnterPage from './pages/Chatroom/ChatroomEnterPage';  // Add this line

// Add this import at the top with other page imports
import Map from './pages/Map/Map';
import RegisterGoogle from './pages/Login/Register_google';
import PaymentSuccess from './pages/MyPlan/PaymentSuccess';
import DashboardAdmin from './pages/Dashboard/DashboardAdmin';  // Add this import
import DebugPage from './pages/DebugPage/DebugPage';

import { useNavigate, useLocation } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SidebarProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Routes that should have the Slidebar */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/walkietalkie" element={<Slidebar><Walkietalkie /></Slidebar>} />
            {/* <Route path="/lecture" element={<Slidebar><Lecture /></Slidebar>} />
            <Route path="/photoOCR" element={<Slidebar><PhotoOCR /></Slidebar>} />  // Changed from '/lecture' to '/photoOCR'

            {/* Routes without the Slidebar */}
            <Route path="/map" element={<Slidebar><Map /></Slidebar>} /> 
            <Route path="/chatroom" element={<Chatroom />} />
            <Route path="/people" element={<People />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/myplan" element={<MyPlan />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login_page" element={<Login />} />
            <Route path="/register_page" element={<Register />} />
            <Route path="/landingpage" element={<LandingPage />} />
            <Route path="/profile_public/:userId" element={<ProfilePublic />} />
            {/* <Route path="/chatroom-setting" element={<ChatroomSetting />} />
            <Route path="/chat_guest" element={<ChatGuest />} /> */}
            {/* Add this new route */}
            <Route path="/enter_chatroom/:chatroomIdCoded" element={<ChatroomEnterPage />} />
            <Route path="/register_google" element={<RegisterGoogle />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/dashboard_admin" element={<Slidebar><DashboardAdmin /></Slidebar>} />
            <Route path="/debug_admin" element={<DebugPage />} />
          </Routes>
        </Layout>
      </Router>
    </SidebarProvider>
  </React.StrictMode>
);

// Performance reporting (optional)
reportWebVitals();
