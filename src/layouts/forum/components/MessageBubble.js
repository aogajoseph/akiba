import React, { useState } from "react";
import PropTypes from "prop-types";
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip,
  useTheme
} from "@mui/material";
import ReplyIcon from "@mui/icons-material/Reply";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ForwardIcon from "@mui/icons-material/Forward";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MicIcon from "@mui/icons-material/Mic";

const MessageBubble = ({ 
  content, 
  sender, 
  timestamp, 
  isSender, 
  reactions = [],
  attachmentType = null,
  attachmentUrl = null
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  
  const handleReactionToggle = (event) => {
    event.stopPropagation();
    setShowReactions(!showReactions);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    // Delete functionality would go here
    console.log("Message deleted");
  };

  // Render attachment preview based on type
  const renderAttachment = () => {
    if (!attachmentType) return null;

    const attachmentStyle = {
      width: "100%",
      maxWidth: 200,
      borderRadius: 1,
      mb: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    };

    switch (attachmentType) {
      case "image":
        return (
          <Box sx={{ ...attachmentStyle, height: 120, bgcolor: "grey.300" }}>
            {attachmentUrl ? (
              <img 
                src={attachmentUrl} 
                alt="Attachment" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <ImageIcon sx={{ fontSize: 40, opacity: 0.6 }} />
            )}
          </Box>
        );
      case "video":
        return (
          <Box sx={{ ...attachmentStyle, height: 120, bgcolor: "grey.800" }}>
            {attachmentUrl ? (
              <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
                <img 
                  src={attachmentUrl} 
                  alt="Video thumbnail" 
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} 
                />
                <PlayCircleOutlineIcon 
                  sx={{ 
                    position: "absolute", 
                    top: "50%", 
                    left: "50%", 
                    transform: "translate(-50%, -50%)",
                    fontSize: 48,
                    color: "#fff"
                  }} 
                />
              </Box>
            ) : (
              <PlayCircleOutlineIcon sx={{ fontSize: 40, color: "#fff" }} />
            )}
          </Box>
        );
      case "audio":
        return (
          <Box 
            sx={{ 
              ...attachmentStyle, 
              height: 50, 
              bgcolor: isSender ? "primary.dark" : "grey.200",
              px: 2,
              py: 1,
            }}
          >
            <MicIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="caption" sx={{ flex: 1 }}>
              Audio message
            </Typography>
            <Typography variant="caption" color="text.secondary">
              0:12
            </Typography>
          </Box>
        );
      case "file":
      case "document":
      case "pdf":
        return (
          <Box 
            sx={{ 
              ...attachmentStyle, 
              height: "auto", 
              bgcolor: isSender ? "primary.dark" : "grey.200",
              p: 1.5,
              flexDirection: "column",
            }}
          >
            <InsertDriveFileIcon sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption" noWrap sx={{ maxWidth: "100%" }}>
              Document.pdf
            </Typography>
            <Typography variant="caption" color="text.secondary">
              245 KB
            </Typography>
          </Box>
        );
      case "location":
        return (
          <Box sx={{ ...attachmentStyle, height: 120, bgcolor: "grey.300" }}>
            {attachmentUrl ? (
              <img 
                src={attachmentUrl} 
                alt="Location" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            ) : (
              <Box 
                sx={{ 
                  width: "100%", 
                  height: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Location
                </Typography>
              </Box>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Main message bubble */}
      <Box 
        display="flex" 
        flexDirection="column"
        alignItems={isSender ? "flex-end" : "flex-start"} 
        mb={0.75}
        position="relative"
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
      >
        <Box
          sx={{
            p: attachmentType ? 0.75 : 1.25,
            bgcolor: isSender ? 
              (isDarkMode ? "primary.dark" : "info.main") : 
              (isDarkMode ? "grey.800" : "grey.300"),
            color: isSender ? "#fff" : (isDarkMode ? "#fff" : "text.primary"),
            borderRadius: "10px",
            borderTopRightRadius: isSender ? 0 : "10px",
            borderTopLeftRadius: isSender ? "10px" : 0,
            maxWidth: "65%",
            boxShadow: 1,
            position: "relative",
          }}
        >
          {/* Sender name for group chats */}
          {!isSender && sender && (
            <Typography
              variant="caption"
              component="div"
              fontWeight="medium"
              color={isDarkMode ? "primary.light" : "primary.dark"}
              mb={0.5}
            >
              {sender}
            </Typography>
          )}
          
          {/* Attachment if any */}
          {renderAttachment()}
          
          {/* Message content */}
          <Typography variant="body2" fontSize="0.875rem">{content}</Typography>
          
          {/* Timestamp */}
          <Box 
            display="flex" 
            justifyContent="flex-end" 
            alignItems="center" 
            mt={0.5}
            sx={{ opacity: 0.7 }}
          >
            <Typography variant="caption" fontSize="0.65rem">
              {timestamp}
            </Typography>
          </Box>
        </Box>
        
        {/* Reactions */}
        {reactions.length > 0 && (
          <Box 
            sx={{ 
              mt: -0.75, 
              mb: 0.5,
              px: 0.75,
              py: 0.25,
              bgcolor: isDarkMode ? "grey.900" : "#fff",
              borderRadius: 10,
              boxShadow: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              zIndex: 5,
              position: "relative",
            }}
          >
            {reactions.map((reaction, index) => (
              <Typography key={index} variant="caption" fontSize="0.8rem">
                {reaction.emoji}
              </Typography>
            ))}
            {reactions.length > 0 && (
              <Typography variant="caption" ml={0.5} color="text.secondary" fontSize="0.7rem">
                {reactions.length}
              </Typography>
            )}
          </Box>
        )}
        
        {/* Message actions */}
        {showReactions && (
          <Box 
            sx={{
              position: "absolute",
              top: -35,
              [isSender ? "right" : "left"]: 0,
              bgcolor: isDarkMode ? "grey.900" : "#fff",
              borderRadius: 10,
              boxShadow: 3,
              display: "flex",
              p: 0.5,
              zIndex: 10,
            }}
          >
            <Tooltip title="Reply">
              <IconButton size="small" onClick={handleReactionToggle}>
                <ReplyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="React">
              <IconButton size="small">
                😊
              </IconButton>
            </Tooltip>
            <Tooltip title="Forward">
              <IconButton size="small">
                <ForwardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy">
              <IconButton size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={handleDelete}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// PropTypes validation
MessageBubble.propTypes = {
  content: PropTypes.string.isRequired,
  sender: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
  isSender: PropTypes.bool.isRequired,
  reactions: PropTypes.arrayOf(
    PropTypes.shape({
      emoji: PropTypes.string.isRequired,
      user: PropTypes.string.isRequired,
    })
  ),
  attachmentType: PropTypes.oneOf(["image", "video", "audio", "file", "document", "pdf", "location", null]),
  attachmentUrl: PropTypes.string,
};

export default MessageBubble;
