import React, { useState } from "react";
import { Grid } from "@mui/material";

// Akiba React components
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Import Chat Components
import Header from "./components/Header";
import ChatArea from "./components/ChatArea";

// Import data
import { groupChat } from "./data"; // Import the updated data structure

function Profile() {
  const [selectedGroupChat, setSelectedGroupChat] = useState(groupChat);

  const handleSendMessage = (message) => {
    const newMessage = {
      sender: "You", // The sender is always you when sending a message
      content: message,
      timestamp: new Date().toLocaleTimeString(),
      isSender: true, // Mark as sender message
    };
    const updatedMessages = [...selectedGroupChat.messages, newMessage];
    setSelectedGroupChat({ ...selectedGroupChat, messages: updatedMessages });
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />
      <Header>
        <MDBox mt={3} mb={3}>
          <MDBox
            sx={{
              textAlign: "center",
              fontSize: "13px",
              fontStyle: "italic",
              color: "#A0A0A0",
              marginBottom: 1,
            }}
          >
            Messages here are seen by everyone in this group.
          </MDBox>
          <Grid container spacing={1}>
            {/* Desktop View */}
            <Grid item xs={12}>
              <ChatArea
                selectedContact={selectedGroupChat} // Pass the group chat
                messages={
                  selectedGroupChat.messages.map((msg) => ({
                    ...msg,
                    isSender: msg.sender === "You", // Check if the message sender is "You"
                  })) || []
                }
                onSendMessage={handleSendMessage}
              />
            </Grid>
          </Grid>
        </MDBox>
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Profile;
