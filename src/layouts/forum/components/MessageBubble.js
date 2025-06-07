import React from "react";
import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";

const MessageBubble = ({ content, sender, timestamp, isSender }) => {
  return (
    <Box display="flex" justifyContent={isSender ? "flex-end" : "flex-start"} mb={1}>
      <Box
        p={2}
        bgcolor={isSender ? "info.main" : "grey.300"}
        color={isSender ? "#fff" : "black"}
        borderRadius="10px"
        maxWidth="70%"
        boxShadow={1}
      >
        <Typography
          variant="caption"
          component="div"
          color={isSender ? "grey.200" : "grey.600"}
          mb={0.5}
        >
          {!isSender && `${sender}  `} <span style={{ marginLeft: "0px" }}>{timestamp}</span>
        </Typography>
        <Typography variant="body2">{content}</Typography>
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
};

export default MessageBubble;
