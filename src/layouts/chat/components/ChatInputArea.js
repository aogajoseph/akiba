import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import { 
  Box, 
  TextField, 
  IconButton, 
  Popover, 
  Paper, 
  Grid, 
  Tooltip, 
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import MicIcon from "@mui/icons-material/Mic";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ImageIcon from "@mui/icons-material/Image";
import VideocamIcon from "@mui/icons-material/Videocam";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ContactsIcon from "@mui/icons-material/Contacts";
import MDTypography from "components/MDTypography";

// Mock emoji picker data
const emojis = ["😊", "😂", "😍", "👍", "❤️", "🎉", "🔥", "👏", "🙏", "😎", "🤔", "😢", "😡", "🥳", "😴", "🤗", "🤩", "😇", "🤑", "😋"];

const ChatInputArea = ({ onSendMessage, onAttachMedia }) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const handleSend = () => {
    if (message.trim() !== "") {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleAttachClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAttachClose = () => {
    setAnchorEl(null);
  };

  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    handleEmojiClose();
  };

  const handleFileSelect = (type) => {
    handleAttachClose();
    if (type === "media" && onAttachMedia) {
      onAttachMedia();
    } else {
      // Simulate file selection
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleRecordingToggle = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      // Simulate sending voice message
      onSendMessage("[Voice message]");
    }
  };

  return (
    <Box 
      display="flex" 
      flexDirection="column"
      bgcolor={isDarkMode ? "background.paper" : "white"} 
      borderTop={`1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#ddd"}`}
    >
      {/* Reply preview (conditionally rendered) */}
      {false && (
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="space-between"
          p={1.5} 
          pl={2}
          borderBottom={`1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#ddd"}`}
        >
          <Box display="flex" alignItems="center">
            <Box 
              sx={{ 
                width: 4, 
                height: 40, 
                bgcolor: "primary.main", 
                borderRadius: 1, 
                mr: 2 
              }} 
            />
            <Box>
              <MDTypography variant="caption" fontWeight="medium" color="primary">
                Replying to Angela
              </MDTypography>
              <MDTypography variant="body2" color="text.secondary" noWrap>
                Thanks Dad, I will send the draft by the end of the day.
              </MDTypography>
            </Box>
          </Box>
          <IconButton size="small">
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      
      {/* Input area */}
      <Box 
        display="flex" 
        alignItems="center" 
        p={1.5} 
        gap={1}
      >
        <Tooltip title="Attach files">
          <IconButton color="inherit" onClick={handleAttachClick}>
            <AttachFileIcon />
          </IconButton>
        </Tooltip>
        
        <Box 
          flex={1} 
          bgcolor={isDarkMode ? "background.default" : "grey.100"} 
          borderRadius={4}
          p={0.5}
          pl={2}
          display="flex"
          alignItems="center"
        >
          <TextField
            fullWidth
            placeholder={isRecording ? "Recording audio..." : "Type your message..."}
            value={isRecording ? "" : message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            variant="standard"
            multiline
            maxRows={4}
            disabled={isRecording}
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              "& .MuiInputBase-root": {
                fontSize: "0.9rem",
              },
            }}
          />
          <Tooltip title="Emoji">
            <IconButton size="small" onClick={handleEmojiClick}>
              <EmojiEmotionsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        {message.trim() === "" ? (
          <Tooltip title={isRecording ? "Send voice message" : "Record voice message"}>
            <IconButton 
              color={isRecording ? "error" : "inherit"} 
              onClick={handleRecordingToggle}
              sx={{
                animation: isRecording ? "pulse 1.5s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                  "100%": { opacity: 1 },
                },
              }}
            >
              <MicIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Send message">
            <IconButton color="primary" onClick={handleSend}>
              <SendIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        multiple
      />
      
      {/* Attachment menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleAttachClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <MenuItem onClick={() => handleFileSelect("image")}>
          <ListItemIcon>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Photo</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect("video")}>
          <ListItemIcon>
            <VideocamIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Video</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect("file")}>
          <ListItemIcon>
            <InsertDriveFileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Document</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect("location")}>
          <ListItemIcon>
            <LocationOnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Location</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFileSelect("contact")}>
          <ListItemIcon>
            <ContactsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Contact</ListItemText>
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
        <Paper sx={{ p: 2, maxWidth: 280 }}>
          <MDTypography variant="subtitle2" mb={1}>
            Emojis
          </MDTypography>
          <Grid container spacing={1}>
            {emojis.map((emoji, index) => (
              <Grid item key={index}>
                <Box
                  sx={{
                    p: 0.5,
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                      borderRadius: "4px",
                    },
                  }}
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Popover>
    </Box>
  );
};

// Prop types validation
ChatInputArea.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  onAttachMedia: PropTypes.func,
};

export default ChatInputArea;
