import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import MessageBubble from "./MessageBubble"; // Import the new component

const ChatContent = ({ messages }) => {
  return (
    <Box
      flex="1"
      overflow="auto"
      p={2}
      bgcolor="grey.100"
      display="flex"
      flexDirection="column"
      borderRadius="1px"
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          content={message.content}
          sender={message.sender}
          timestamp={message.timestamp}
          isSender={message.isSender}
        />
      ))}
    </Box>
  );
};

// PropTypes validation
ChatContent.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      content: PropTypes.string.isRequired,
      sender: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      isSender: PropTypes.bool.isRequired,
    })
  ).isRequired,
};

export default ChatContent;
