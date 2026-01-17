// src/pages/ChatGuest/ChatGuest.js
import React from 'react';
import { Link } from 'react-router-dom';

function ChatGuest() {
  return (
    <div>
      <h1>Welcome to ChatGuest page</h1>
      <Link to="/">Go back to Main Page</Link> 
    </div>
  );
}

export default ChatGuest;
