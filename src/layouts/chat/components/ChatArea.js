import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import ChatContent from "./ChatContent";
import ChatInputArea from "./ChatInputArea";

const ChatArea = ({ selectedContact, onSendMessage }) => {
  if (!selectedContact) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        flex="1"
        height="100%"
        bgcolor="grey.100"
        color="grey.500"
      >
        Select a contact to start chatting.
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" flex="1" height="100%">
      {/* Chat Content */}
      <ChatContent messages={selectedContact.messages} />

      {/* Chat Input Area */}
      <ChatInputArea onSendMessage={onSendMessage} />
    </Box>
  );
};

// Prop types validation
ChatArea.propTypes = {
  selectedContact: PropTypes.shape({
    messages: PropTypes.array.isRequired,
  }),
  onSendMessage: PropTypes.func.isRequired,
};

export default ChatArea;
