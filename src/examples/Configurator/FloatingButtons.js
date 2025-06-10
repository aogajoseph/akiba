/**
=========================================================
* Akiba - v1.0.0
=========================================================
*/

// @mui material components
import { styled } from "@mui/material/styles";
import { Fab, Tooltip, Paper, InputBase, IconButton } from "@mui/material";

// @mui icons
import SettingsIcon from "@mui/icons-material/Settings";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React context
import { useMaterialUIController, setOpenConfigurator } from "context";
import { useState, useEffect } from "react";

const ChatWindow = styled(Paper)(({ theme, darkMode }) => ({
  position: 'absolute',
  bottom: '100%',
  right: 0,
  width: '300px',
  marginBottom: '1rem',
  borderRadius: '1rem',
  overflow: 'hidden',
  boxShadow: theme.shadows[10],
  backgroundColor: darkMode ? theme.palette.grey[900] : theme.palette.background.paper,
  color: darkMode ? theme.palette.common.white : theme.palette.text.primary,
}));

const ChatHeader = styled(MDBox)(({ theme, darkMode }) => ({
  padding: '0.75rem 1rem',
  backgroundColor: darkMode ? theme.palette.info.dark : theme.palette.info.main,
  color: 'white',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const ChatMessages = styled(MDBox)(({ theme, darkMode }) => ({
  height: '250px',
  overflowY: 'auto',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  backgroundColor: darkMode ? theme.palette.grey[900] : theme.palette.background.paper,
}));

const ChatInput = styled(MDBox)(({ theme, darkMode }) => ({
  padding: '0.75rem',
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  gap: '0.5rem',
  backgroundColor: darkMode ? theme.palette.grey[800] : theme.palette.grey[100],
}));

const Message = styled(MDBox)(({ theme, isUser, darkMode }) => ({
  maxWidth: '80%',
  padding: '0.5rem 1rem',
  lineHeight: '0.5',
  borderRadius: '1rem',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  backgroundColor: isUser
    ? (darkMode ? theme.palette.warning.dark : theme.palette.warning.main)
    : (darkMode ? theme.palette.grey[800] : theme.palette.grey[200]),
  color: isUser ? 'white' : (darkMode ? theme.palette.grey[100] : 'inherit'),
}));

const FloatingButtonsRoot = styled(MDBox)(({ theme, ownerState }) => {
  const { palette, borders, transitions } = theme;
  const { darkMode } = ownerState;

  return {
    position: "fixed",
    right: "2rem",
    bottom: "3rem",
    zIndex: 99999,
    display: "flex",
    flexDirection: "column",
    gap: ".8rem",

    "& .MuiFab-root": {
      boxShadow: borders.buttonBoxShadow,
      transition: transitions.create(["transform", "box-shadow", "background-color"], {
        easing: transitions.easing.easeInOut,
        duration: transitions.duration.shorter,
      }),
      backgroundColor: darkMode 
        ? "rgba(255, 255, 255, 0.85)" 
        : "rgba(66, 165, 245, 0.5)",

      "&:hover": {
        transform: "scale(1.05)",
        boxShadow: "lg",
        backgroundColor: darkMode 
          ? "rgba(255, 255, 255, 0.9)" 
          : "rgba(66, 165, 245, 0.95)",
      },

      "& .MuiSvgIcon-root": {
        fontSize: "2rem",
      },
    },

    "& .help-button": {
      backgroundColor: darkMode 
        ? "rgba(255, 255, 255, 0.85)" 
        : "rgba(255, 167, 38, 0.5)",

      "&:hover": {
        backgroundColor: darkMode 
          ? "rgba(255, 255, 255, 0.9)" 
          : "rgba(255, 167, 38, 0.95)",
      },
    },
  };
});

function FloatingButtons() {
  const [controller, dispatch] = useMaterialUIController();
  const { darkMode, openConfigurator } = controller;
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { text: "Hi! How can I help you today?", isUser: false }
  ]);

  // Handle configurator state
  const handleConfiguratorToggle = () => {
    if (showChat) setShowChat(false);
    setOpenConfigurator(dispatch, !openConfigurator);
  };

  // Handle chat state
  const handleHelpClick = () => {
    if (openConfigurator) setOpenConfigurator(dispatch, false);
    setShowChat(true);
  };

  const handleClose = () => {
    setShowChat(false);
    setMessage("");
  };

  // Listen for configurator events from other components
  useEffect(() => {
    const handleConfiguratorEvent = () => {
      if (showChat) setShowChat(false);
      setOpenConfigurator(dispatch, !openConfigurator);
    };

    document.addEventListener("openConfigurator", handleConfiguratorEvent);
    return () => {
      document.removeEventListener("openConfigurator", handleConfiguratorEvent);
    };
  }, [dispatch, openConfigurator, showChat]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([...messages, { text: message, isUser: true }]);
      setMessage("");
      // Here you would typically:
      // 1. Send the message to your backend
      // 2. Wait for the response
      // 3. Add the response to messages
      // For now, we'll just add a placeholder response
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: "Thanks for your message! Our team will get back to you soon.", 
          isUser: false 
        }]);
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <FloatingButtonsRoot ownerState={{ darkMode }}>
        <Tooltip title="Dashboard Settings" placement="left">
          <Fab
            onClick={handleConfiguratorToggle}
            aria-label="settings"
            className="main-button"
          >
            <SettingsIcon />
          </Fab>
        </Tooltip>
        <MDBox position="relative">
          <Tooltip title="Ask for Help" placement="left">
            <Fab
              onClick={handleHelpClick}
              aria-label="help"
              className="help-button"
            >
              <HeadsetMicIcon />
            </Fab>
          </Tooltip>
          {showChat && (
            <ChatWindow darkMode={darkMode}>
              <ChatHeader darkMode={darkMode}>
                <MDTypography variant="button" fontWeight="medium" color="white">
                  Akiba Support
                </MDTypography>
                <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </ChatHeader>
              <ChatMessages darkMode={darkMode}>
                {messages.map((msg, index) => (
                  <Message key={index} isUser={msg.isUser} darkMode={darkMode}>
                    <MDTypography variant="button" fontWeight="regular">
                      {msg.text}
                    </MDTypography>
                  </Message>
                ))}
              </ChatMessages>
              <ChatInput darkMode={darkMode}>
                <InputBase
                  fullWidth
                  multiline
                  maxRows={3}
                  sx={{
                    backgroundColor: darkMode ? '#f5f5f5' : 'white',
                    color: darkMode ? '#222' : 'inherit',
                    borderRadius: '1rem',
                    padding: '0.5rem',
                    fontSize: '0.9rem',
                    '::placeholder': {
                      color: darkMode ? '#888' : '#888',
                      opacity: 1,
                    },
                  }}
                  placeholder="Ask anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <IconButton 
                  onClick={handleSend} 
                  disabled={!message.trim()}
                  color="primary"
                >
                  <SendIcon />
                </IconButton>
              </ChatInput>
            </ChatWindow>
          )}
        </MDBox>
      </FloatingButtonsRoot>
    </>
  );
}

export default FloatingButtons; 