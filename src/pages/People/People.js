// src/Page2.js
import React from 'react';
import { Link } from 'react-router-dom';

function People() {
  return (
    <div>
      <h1>Welcome to People page</h1>
      <Link to="/">Go back to Main Page</Link> 
    </div>
  );
}

export default People;
