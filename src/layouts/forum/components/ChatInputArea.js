import React, { useState } from "react";
import PropTypes from "prop-types";
import { 
  Box, 
  TextField, 
  IconButton, 
  Tooltip, 
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Popover
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import MicIcon from "@mui/icons-material/Mic";
import PhoneIcon from "@mui/icons-material/Phone";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VideocamIcon from "@mui/icons-material/Videocam";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import MDBox from "components/MDBox";

// Emoji data for the picker
const emojiCategories = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"]
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👏", "🙌", "👐", "🤲", "🙏", "🤝"]
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘"]
  },
  {
    name: "Objects",
    emojis: ["📱", "💻", "⌨️", "📷", "🎮", "🎧", "🎵", "🎬", "📚", "✏️", "📝", "💰", "🎁", "🏆", "🏅", "🥇"]
  }
];

const ChatInputArea = ({ 
  onSendMessage, 
  onAttachMedia, 
  isGroupChat = false,
  showEmojiPicker = true,
  showAttachments = true,
  showCallButton = false,
  onStartRecording,
  onStartCall
}) => {
  const [message, setMessage] = useState("");
  const [attachMenuAnchor, setAttachMenuAnchor] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = (event) => {
    setAttachMenuAnchor(event.currentTarget);
  };

  const handleAttachClose = () => {
    setAttachMenuAnchor(null);
  };

  const handleAttachOption = (type) => {
    handleAttachClose();
    if (onAttachMedia) {
      onAttachMedia(type);
    }
    // In a real app, this would open a file picker or camera
  };
  
  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };
  
  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };
  
  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
  };

  const handleCallClick = () => {
    if (onStartCall) {
      onStartCall();
    } else {
      console.log("Call functionality not implemented");
    }
  };

  return (
    <Box 
      display="flex"
      flexDirection="column"
      bgcolor={isDarkMode ? "background.paper" : "white"}
      borderTop={`1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#ddd"}`}
      width="100%"
      maxWidth={{ xs: '100%', sm: '100%', md: 900 }}
      mx="auto"
      px={{ xs: 1, sm: 4, md: 10 }}
      p={1.5}
    >
      <Box 
        display="flex" 
        alignItems="center" 
        gap={1}
        width="100%"
      >
        {/* Attachment button */}
        {showAttachments && (
          <Tooltip title="Attach file">
            <IconButton onClick={handleAttachClick} size="medium">
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {/* Input background */}
        <Box 
          flex={1} 
          bgcolor={isDarkMode ? "background.default" : "grey.100"} 
          borderRadius={4}
          p={0.5}
          pl={2}
          display="flex"
          alignItems="center"
          minWidth={0}
        >
          <TextField
            fullWidth
            placeholder={isGroupChat ? "Talk to the group..." : "Type a message..."}
            multiline
            maxRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            variant="standard"
            size="small"
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.9rem',
              },
              '& .MuiInputBase-input': {
                color: isDarkMode ? 'white' : 'inherit',
              },
              '& .MuiInputBase-input::placeholder': {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                opacity: 1,
              },
            }}
          />
          {/* Emoji picker button */}
          {showEmojiPicker && (
            <Tooltip title="Add emoji">
              <IconButton onClick={handleEmojiClick} size="small">
                <EmojiEmotionsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {/* Voice recording button */}
        <Tooltip title="Voice message">
          <IconButton onClick={onStartRecording} size="medium">
            <MicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {/* Call button */}
        {showCallButton && (
          <Tooltip title="Voice call">
            <IconButton onClick={handleCallClick} size="medium">
              <PhoneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {/* Send button */}
        <Tooltip title="Send message">
          <IconButton 
            color="primary" 
            onClick={handleSend} 
            disabled={!message.trim()}
            size="medium"
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {/* Attachment menu */}
      <Menu
        anchorEl={attachMenuAnchor}
        open={Boolean(attachMenuAnchor)}
        onClose={handleAttachClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <MenuItem onClick={() => handleAttachOption("image")}>
          <ListItemIcon sx={{ color: "#757575" }}>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Image"
            primaryTypographyProps={{ fontSize: '0.9rem' }} 
          />
        </MenuItem>
        <MenuItem onClick={() => handleAttachOption("video")}>
          <ListItemIcon sx={{ color: "#757575" }}>
            <VideocamIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Video"
            primaryTypographyProps={{ fontSize: '0.9rem' }} 
          />
        </MenuItem>
        <MenuItem onClick={() => handleAttachOption("document")}>
          <ListItemIcon sx={{ color: "#757575" }}>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Document"
            primaryTypographyProps={{ fontSize: '0.9rem' }} 
          />
        </MenuItem>
        <MenuItem onClick={() => handleAttachOption("pdf")}>
          <ListItemIcon sx={{ color: "#757575" }}>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="PDF"
            primaryTypographyProps={{ fontSize: '0.9rem' }} 
          />
        </MenuItem>
        <MenuItem onClick={() => handleAttachOption("file")}>
          <ListItemIcon sx={{ color: "#757575" }}>
            <InsertDriveFileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="Other File"
            primaryTypographyProps={{ fontSize: '0.9rem' }} 
          />
        </MenuItem>
      </Menu>
      
      {/* Emoji picker */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={handleEmojiClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Box 
          sx={{ 
            width: 300, 
            maxHeight: 300, 
            overflow: "auto",
            p: 1,
            bgcolor: isDarkMode ? "background.paper" : "#fff",
          }}
        >
          {emojiCategories.map((category, index) => (
            <MDBox key={index} mb={1}>
              <Box sx={{ fontSize: "0.75rem", fontWeight: "bold", mb: 0.5, color: "text.secondary" }}>
                {category.name}
              </Box>
              <Box 
                sx={{ 
                  display: "flex", 
                  flexWrap: "wrap",
                  gap: 0.5
                }}
              >
                {category.emojis.map((emoji, emojiIndex) => (
                  <Box 
                    key={emojiIndex}
                    onClick={() => addEmoji(emoji)}
                    sx={{ 
                      fontSize: "1.5rem", 
                      cursor: "pointer",
                      p: 0.5,
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: "action.hover"
                      }
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            </MDBox>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

// PropTypes validation
ChatInputArea.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  onAttachMedia: PropTypes.func,
  isGroupChat: PropTypes.bool,
  showEmojiPicker: PropTypes.bool,
  showAttachments: PropTypes.bool,
  showCallButton: PropTypes.bool,
  onStartRecording: PropTypes.func,
  onStartCall: PropTypes.func
};

export default ChatInputArea;
