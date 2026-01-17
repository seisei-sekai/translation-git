// src/Page2.js
import React from 'react';
import { Link } from 'react-router-dom';

function Settings() {
  return (
    <div>
      <h1>Welcome to Settings page</h1>
      <Link to="/">Go back to Main Page</Link> 
    </div>
  );
}

export default Settings;
