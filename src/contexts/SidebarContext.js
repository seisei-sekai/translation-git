import React, { createContext, useState, useContext } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  // const [showSidebar, setShowSidebar] = useState(false);
  // const [showMenuButton, setShowMenuButton] = useState(false);
  // const [chatHomeMenuButtonState, setChatHomeMenuButtonState] = useState(false);

  // const toggleSidebar = () => {
  //   setShowSidebar(!showSidebar);
  // };

  const [showSidebar, setShowSidebar] = useState(false);
  const [showMenuButton, setShowMenuButton] = useState(true);
  const [chatHomeMenuButtonState, setChatHomeMenuButtonState] = useState(true);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <SidebarContext.Provider value={{ 
      showSidebar, 
      toggleSidebar, 
      showMenuButton, 
      setShowMenuButton,
      chatHomeMenuButtonState,
      setChatHomeMenuButtonState
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export default SidebarContext;
