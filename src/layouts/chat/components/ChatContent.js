import React from "react";
import PropTypes from "prop-types";
import { Box, Divider, Typography, useTheme } from "@mui/material";
import MessageBubble from "./MessageBubble"; // Import the reusable component
import MDTypography from "components/MDTypography";

// Helper function to format date for the date divider
const formatDate = (timestamp) => {
  // This is a placeholder. In a real app, you'd use proper date formatting
  return timestamp;
};

// Helper function to check if two messages are from the same sender and close in time
const shouldGroupMessages = (message1, message2) => {
  if (!message1 || !message2) return false;
  
  // Group if same sender and within 5 minutes (placeholder logic)
  return message1.isSender === message2.isSender && 
         message1.sender === message2.sender;
};

// Helper function to check if we need to show a date divider
const shouldShowDateDivider = (prevMessage, currMessage) => {
  if (!prevMessage) return true;
  
  // This is placeholder logic. In a real app, you'd compare actual dates
  return prevMessage.timestamp.split(' ')[0] !== currMessage.timestamp.split(' ')[0];
};

const ChatContent = ({ messages, contact }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  return (
    <Box
      flex="1"
      overflow="auto"
      p={1.5}
      bgcolor={isDarkMode ? "background.default" : "grey.100"}
      display="flex"
      flexDirection="column"
      borderRadius="1px"
    >
      {/* Welcome message for empty chats */}
      {messages.length === 0 && (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          height="100%"
          p={3}
        >
          <Box 
            sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: "50%", 
              bgcolor: isDarkMode ? "grey.800" : "grey.200",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2
            }}
          >
            {contact?.avatar ? (
              <img 
                src={contact.avatar} 
                alt={contact.name} 
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
              />
            ) : (
              <MDTypography variant="h3" color="text.secondary">
                {contact?.name?.charAt(0) || "?"}
              </MDTypography>
            )}
          </Box>
          <MDTypography variant="h6" color="text.primary" textAlign="center">
            {contact?.name || "Chat"}
          </MDTypography>
          <MDTypography variant="body2" color="text.secondary" textAlign="center" mt={1}>
            No messages yet. Start the conversation!
          </MDTypography>
        </Box>
      )}

      {/* Message history */}
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const showDateDivider = shouldShowDateDivider(prevMessage, message);
        const isGroupedWithPrevious = !showDateDivider && shouldGroupMessages(prevMessage, message);
        const isGroupedWithNext = shouldGroupMessages(message, nextMessage);
        
        return (
          <React.Fragment key={index}>
            {/* Date divider */}
            {showDateDivider && (
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                my={1.5}
              >
                <Divider sx={{ flex: 1, borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    px: 2, 
                    py: 0.5, 
                    bgcolor: isDarkMode ? "grey.900" : "grey.200",
                    borderRadius: 10,
                    fontSize: "0.7rem",
                  }}
                >
                  {formatDate(message.timestamp)}
                </Typography>
                <Divider sx={{ flex: 1, borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
              </Box>
            )}
            
            {/* System messages (like "User joined the chat") */}
            {message.type === "system" ? (
              <Box 
                display="flex" 
                justifyContent="center" 
                my={1}
              >
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    px: 2, 
                    py: 0.5, 
                    bgcolor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    borderRadius: 10,
                    fontSize: "0.75rem",
                  }}
                >
                  {message.content}
                </Typography>
              </Box>
            ) : (
              /* Regular message bubble */
              <Box 
                mb={isGroupedWithNext ? 0.5 : 1.5}
                mt={isGroupedWithPrevious ? 0.5 : 1}
                mx={0.5}
              >
                <MessageBubble
                  content={message.content}
                  sender={message.sender}
                  timestamp={message.timestamp}
                  isSender={message.isSender}
                  status={message.status}
                  reactions={message.reactions}
                  replyTo={message.replyTo}
                  attachmentType={message.attachmentType}
                  attachmentUrl={message.attachmentUrl}
                />
              </Box>
            )}
            
            {/* Unread messages divider */}
            {message.isFirstUnread && (
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                my={1.5}
              >
                <Divider sx={{ flex: 1, borderColor: theme.palette.error.main }} />
                <Typography 
                  variant="caption" 
                  color="error"
                  sx={{ 
                    px: 2, 
                    py: 0.5, 
                    bgcolor: isDarkMode ? "rgba(244,67,54,0.1)" : "rgba(244,67,54,0.1)",
                    borderRadius: 10,
                    fontSize: "0.75rem",
                  }}
                >
                  Unread messages
                </Typography>
                <Divider sx={{ flex: 1, borderColor: theme.palette.error.main }} />
              </Box>
            )}
          </React.Fragment>
        );
      })}
      
      {/* Typing indicator */}
      {contact?.typing && (
        <Box 
          display="flex" 
          alignItems="center" 
          ml={2} 
          mt={1}
        >
          <Box 
            sx={{ 
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              bgcolor: isDarkMode ? "grey.800" : "grey.300",
              borderRadius: 10,
              width: "fit-content",
            }}
          >
            <Box 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: "50%", 
                bgcolor: "text.secondary",
                animation: "bounce 1.5s infinite",
                animationDelay: "0s",
                "@keyframes bounce": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-5px)" },
                },
              }} 
            />
            <Box 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: "50%", 
                bgcolor: "text.secondary",
                animation: "bounce 1.5s infinite",
                animationDelay: "0.2s",
              }} 
            />
            <Box 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: "50%", 
                bgcolor: "text.secondary",
                animation: "bounce 1.5s infinite",
                animationDelay: "0.4s",
              }} 
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Prop types validation
ChatContent.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      content: PropTypes.string.isRequired,
      sender: PropTypes.string,
      timestamp: PropTypes.string.isRequired,
      isSender: PropTypes.bool.isRequired,
      status: PropTypes.string,
      reactions: PropTypes.array,
      replyTo: PropTypes.object,
      attachmentType: PropTypes.string,
      attachmentUrl: PropTypes.string,
      type: PropTypes.string,
      isFirstUnread: PropTypes.bool,
    })
  ).isRequired,
  contact: PropTypes.object,
};

export default ChatContent;
