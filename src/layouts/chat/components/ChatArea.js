import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { 
  Box, 
  Avatar, 
  Typography, 
  IconButton, 
  Divider, 
  Tooltip,
  Menu,
  MenuItem,
  Badge,
  useTheme
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PhoneIcon from "@mui/icons-material/Phone";
import VideocamIcon from "@mui/icons-material/Videocam";
import PersonIcon from "@mui/icons-material/Person";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import ChatContent from "./ChatContent";
import ChatInputArea from "./ChatInputArea";
import MDTypography from "components/MDTypography";

const ChatArea = ({ selectedContact, onSendMessage }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    handleMenuClose();
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedContact?.messages]);

  if (!selectedContact) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flex="1"
        height="100%"
        bgcolor={isDarkMode ? "background.paper" : "grey.100"}
        color="text.secondary"
        borderRadius={1}
        p={3}
      >
        
        <MDTypography variant="h6" color="text.secondary" textAlign="center">
          Select a contact to start chatting
        </MDTypography>
        <MDTypography variant="body2" color="text.secondary" textAlign="center" mt={1}>
          Choose from your existing conversations or start a new chat
        </MDTypography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      flex="1" 
      height="100%" 
      bgcolor={isDarkMode ? "background.paper" : "#fff"}
      borderRadius={1}
      overflow="hidden"
      boxShadow={1}
    >
      {/* Chat Header */}
      <Box 
        display="flex" 
        alignItems="center" 
        p={1.5}
        bgcolor={isDarkMode ? "background.default" : "grey.100"}
      >
        <Box position="relative">
          <Avatar 
            src={selectedContact.avatar} 
            alt={selectedContact.name}
            sx={{ 
              width: 40, 
              height: 40,
              border: selectedContact.online ? 
                `2px solid ${theme.palette.success.main}` : 
                `2px solid transparent`,
            }}
          />
          {selectedContact.online && (
            <Badge
              overlap="circular"
              variant="dot"
              color="success"
              sx={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                '& .MuiBadge-badge': {
                  height: 10,
                  width: 10,
                  borderRadius: '50%',
                  border: `2px solid ${isDarkMode ? "#424242" : "#fff"}`,
                },
              }}
            />
          )}
        </Box>
        <Box ml={2} flex={1}>
          <MDTypography variant="subtitle1" fontWeight="medium">
            {selectedContact.name}
          </MDTypography>
          <Typography variant="caption" color="text.secondary">
            {selectedContact.online ? 
              (selectedContact.typing ? "Typing..." : "Online") : 
              selectedContact.lastSeen || "Offline"}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Tooltip title={isMuted ? "Unmute notifications" : "Mute notifications"}>
            <IconButton size="small" sx={{ mx: 0.5 }} onClick={toggleMute}>
              {isMuted ? <NotificationsOffIcon fontSize="small" /> : <NotificationsIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Voice call">
            <IconButton size="small" sx={{ mx: 0.5 }}>
              <PhoneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Video call">
            <IconButton size="small" sx={{ mx: 0.5 }}>
              <VideocamIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View profile">
            <IconButton size="small" sx={{ mx: 0.5 }}>
              <PersonIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={handleMenuClick} sx={{ ml: 0.5 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>Search in conversation</MenuItem>
            <MenuItem onClick={handleMenuClose}>Clear chat</MenuItem>
            <MenuItem onClick={handleMenuClose}>Block this user</MenuItem>
            <MenuItem onClick={handleMenuClose}>Report this user</MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Chat Content */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: "auto", 
          bgcolor: isDarkMode ? "background.default" : "#f5f7fa",
          backgroundImage: isDarkMode ? 
            "linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)" : 
            "linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          p: 1,
        }}
      >
        <ChatContent 
          messages={selectedContact.messages} 
          contact={selectedContact}
        />
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Media Preview Area (conditionally rendered) */}
      {showMediaPreview && (
        <Box 
          p={2} 
          bgcolor={isDarkMode ? "background.paper" : "#fff"}
          borderTop={1}
          borderColor="divider"
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <MDTypography variant="subtitle2">Attachment Preview</MDTypography>
            <IconButton size="small" onClick={() => setShowMediaPreview(false)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box 
            display="flex" 
            gap={1} 
            sx={{ overflowX: "auto", pb: 1 }}
          >
            {[1, 2, 3].map((item) => (
              <Box 
                key={item}
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: "grey.300",
                  borderRadius: 1,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Image {item}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Chat Input Area */}
      <ChatInputArea 
        onSendMessage={onSendMessage} 
        onAttachMedia={() => setShowMediaPreview(true)}
      />
    </Box>
  );
};

// Prop types validation
ChatArea.propTypes = {
  selectedContact: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    avatar: PropTypes.string,
    online: PropTypes.bool,
    typing: PropTypes.bool,
    lastSeen: PropTypes.string,
    messages: PropTypes.array,
  }),
  onSendMessage: PropTypes.func.isRequired,
};

export default ChatArea;
