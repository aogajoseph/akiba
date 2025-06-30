import React, { useState } from "react";
import PropTypes from "prop-types";
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  useTheme 
} from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
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
  status = "sent", 
  reactions = [], 
  replyTo = null,
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

  const getStatusIcon = () => {
    switch (status) {
      case "sent":
        return <DoneIcon fontSize="inherit" />;
      case "delivered":
        return <DoneAllIcon fontSize="inherit" />;
      case "read":
        return <DoneAllIcon fontSize="inherit" sx={{ color: theme.palette.info.main }} />;
      default:
        return null;
    }
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
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Reply preview if this message is a reply */}
      {replyTo && (
        <Box 
          display="flex" 
          justifyContent={isSender ? "flex-end" : "flex-start"} 
          mb={0.5}
          mx={1.5}
        >
          <Box
            sx={{
              p: 0.75,
              borderLeft: `2px solid ${theme.palette.info.main}`,
              bgcolor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
              borderRadius: 1,
              maxWidth: "60%",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              {replyTo.sender}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {replyTo.content}
            </Typography>
          </Box>
        </Box>
      )}

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
          
          {/* Timestamp and status */}
          <Box 
            display="flex" 
            justifyContent="flex-end" 
            alignItems="center" 
            mt={0.5}
            sx={{ opacity: 0.7 }}
          >
            <Typography variant="caption" fontSize="0.65rem" mr={0.5}>
              {timestamp}
            </Typography>
            {isSender && (
              <Typography variant="caption" fontSize="0.65rem" display="flex" alignItems="center">
                {getStatusIcon()}
              </Typography>
            )}
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
  sender: PropTypes.string,
  timestamp: PropTypes.string.isRequired,
  isSender: PropTypes.bool.isRequired,
  status: PropTypes.oneOf(["sent", "delivered", "read"]),
  reactions: PropTypes.arrayOf(
    PropTypes.shape({
      emoji: PropTypes.string.isRequired,
      user: PropTypes.string.isRequired,
    })
  ),
  replyTo: PropTypes.shape({
    sender: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }),
  attachmentType: PropTypes.oneOf(["image", "video", "audio", "file", null]),
  attachmentUrl: PropTypes.string,
};

export default MessageBubble;
