import React, { useState } from "react";
import { Grid, IconButton, Drawer, useMediaQuery, useTheme } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group"; // Import the user icon

// Akiba React components
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Import Chat Components
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";

// Import data
import { contacts } from "./data";

function Profile() {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const theme = useTheme(); // Access the current theme

  const handleSendMessage = (message) => {
    const newMessage = { content: message, isSender: true };
    const updatedMessages = [...selectedContact.messages, newMessage];
    setSelectedContact({ ...selectedContact, messages: updatedMessages });
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
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
            One-on-One Messaging
          </MDBox>
          <Grid container spacing={1}>
            {isMobile ? (
              // Mobile View
              <>
                <IconButton
                  onClick={toggleDrawer}
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    color: "green",
                  }}
                >
                  <GroupIcon />
                </IconButton>
                <Drawer
                  anchor="right"
                  open={isDrawerOpen}
                  onClose={toggleDrawer}
                  sx={{
                    "& .MuiDrawer-paper": {
                      backgroundColor: theme.palette.mode === "dark" ? "#fff" : "#000",
                      color: theme.palette.mode === "dark" ? "#fff" : "#000",
                    },
                  }}
                >
                  <Sidebar
                    contacts={contacts}
                    activeContactId={selectedContact.id}
                    onSelectContact={(contact) => {
                      setSelectedContact(contact);
                      toggleDrawer();
                    }}
                  />
                </Drawer>
                <Grid item xs={12}>
                  <ChatArea
                    selectedContact={selectedContact}
                    messages={selectedContact.messages || []}
                    onSendMessage={handleSendMessage}
                  />
                </Grid>
              </>
            ) : (
              // Desktop View
              <>
                <Grid item xs={12} md={3}>
                  <Sidebar
                    contacts={contacts}
                    activeContactId={selectedContact.id}
                    onSelectContact={setSelectedContact}
                  />
                </Grid>
                <Grid item xs={12} md={9}>
                  <ChatArea
                    selectedContact={selectedContact}
                    messages={selectedContact.messages || []}
                    onSendMessage={handleSendMessage}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </MDBox>
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Profile;
