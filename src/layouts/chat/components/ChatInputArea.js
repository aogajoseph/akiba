import React, { useState } from "react";
import PropTypes from "prop-types";
import { Box, TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

const ChatInputArea = ({ onSendMessage }) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() !== "") {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <Box display="flex" alignItems="center" p={2} bgcolor="white" borderTop="1px solid #ddd">
      <TextField
        fullWidth
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSend()}
        variant="outlined"
        size="small"
      />
      <IconButton color="info" onClick={handleSend}>
        <SendIcon />
      </IconButton>
    </Box>
  );
};

// Prop types validation
ChatInputArea.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
};

export default ChatInputArea;
