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
  AvatarGroup,
  useTheme,
  Chip,
  Button
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import PhoneIcon from "@mui/icons-material/Phone";
import MicIcon from "@mui/icons-material/Mic";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Link } from "react-router-dom";
import ChatContent from "./ChatContent";
import ChatInputArea from "./ChatInputArea";
import MDTypography from "components/MDTypography";

const ChatArea = ({ selectedContact, onSendMessage }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
  
  const handleClearChat = () => {
    // In a real app, this would clear the chat history
    console.log("Clearing chat history");
    handleMenuClose();
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, this would start/stop voice recording
    if (isRecording) {
      // Stop recording logic
      console.log("Recording stopped");
    } else {
      // Start recording logic
      console.log("Recording started");
      
      // Simulate stopping after 5 seconds
      setTimeout(() => {
        setIsRecording(false);
        console.log("Recording automatically stopped after 5 seconds");
      }, 5000);
    }
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
        <img 
          src="/assets/images/illustrations/chat-placeholder.svg" 
          alt="Select a chat" 
          style={{ width: '120px', height: '120px', opacity: 0.7, marginBottom: '1rem' }}
        />
        <MDTypography variant="h6" color="text.secondary" textAlign="center">
          Select a group to start chatting
        </MDTypography>
        <MDTypography variant="body2" color="text.secondary" textAlign="center" mt={1}>
          Choose from your existing groups or create a new one
        </MDTypography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      flex={1}
      minHeight={0}
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
        <Avatar 
          src={selectedContact.avatar} 
          alt={selectedContact.name}
          sx={{ 
            width: 40, 
            height: 40,
          }}
        />
        <Box ml={2} flex={1}>
          <MDTypography variant="subtitle1" fontWeight="medium" color="text.primary">
            {selectedContact.name}
          </MDTypography>
          <Typography variant="caption" color="text.secondary">
            {selectedContact.members
              ? `${selectedContact.members.filter(m => m.online).length} online`
              : "Group chat"}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center">
          <Tooltip title="Clear chat history">
            <IconButton size="small" sx={{ mx: 0.5 }} onClick={handleClearChat}>
              <CleaningServicesIcon fontSize="small" sx={{ color: isDarkMode ? "#fff" : "inherit" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Account info">
            <IconButton 
              size="small" 
              sx={{ mx: 0.5 }}
              component={Link}
              to="/profile"
            >
              <HelpOutlineIcon fontSize="small" />
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
            <MenuItem onClick={toggleMute}>
              {isMuted ? "Unmute notifications" : "Mute notifications"}
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>Report this group</MenuItem>
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
          isGroupChat={true}
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
      
      {/* Voice Recording Indicator */}
      {isRecording && (
        <Box 
          p={1} 
          bgcolor={isDarkMode ? "error.dark" : "error.light"}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center">
            <MicIcon color="error" sx={{ mr: 1, animation: "pulse 1.5s infinite" }} />
            <Typography variant="body2" color="error.contrastText">
              Recording voice message...
            </Typography>
          </Box>
          <Button 
            size="small" 
            variant="contained" 
            color="error" 
            onClick={toggleRecording}
          >
            Stop
          </Button>
        </Box>
      )}
      
      {/* Chat Input Area */}
      <ChatInputArea 
        onSendMessage={onSendMessage} 
        onAttachMedia={() => setShowMediaPreview(true)}
        onStartRecording={toggleRecording}
        isGroupChat={true}
        showEmojiPicker={true}
        showAttachments={true}
        showCallButton={true}
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
    members: PropTypes.array,
    messages: PropTypes.array,
  }),
  onSendMessage: PropTypes.func.isRequired,
};

export default ChatArea;
