import React, { useState, useEffect } from "react";
import { 
  Grid, 
  IconButton,  
  useMediaQuery, 
  useTheme, 
  Box,
  Fab,
  Zoom,
  CircularProgress
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Import Chat Components
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";

// Import data
import { contacts } from "./data";

function Chat() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const navigate = useNavigate();

  // Simulate loading when changing contacts
  useEffect(() => {
    if (selectedContact) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // Simulate network delay
      return () => clearTimeout(timer);
    }
  }, [selectedContact]);

  const handleSendMessage = (message) => {
    if (!selectedContact) return;
    
    const newMessage = { 
      content: message, 
      isSender: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sent"
    };
    
    // Create a deep copy of the selected contact to avoid direct state mutation
    const updatedContact = JSON.parse(JSON.stringify(selectedContact));
    updatedContact.messages = [...updatedContact.messages, newMessage];
    updatedContact.lastMessage = "You: " + message;
    updatedContact.lastMessageTime = newMessage.timestamp;
    
    // Update the contact in the contacts array
    const updatedContacts = contacts.map(contact => 
      contact.id === selectedContact.id ? updatedContact : contact
    );
    
    // Update state
    setSelectedContact(updatedContact);
    
    // Simulate message delivery status updates
    setTimeout(() => {
      const deliveredMessage = { ...newMessage, status: "delivered" };
      const updatedMessages = updatedContact.messages.map((msg, idx) => 
        idx === updatedContact.messages.length - 1 ? deliveredMessage : msg
      );
      
      const deliveredContact = { ...updatedContact, messages: updatedMessages };
      setSelectedContact(deliveredContact);
      
      // Simulate read status after another delay
      setTimeout(() => {
        const readMessage = { ...deliveredMessage, status: "read" };
        const finalMessages = updatedMessages.map((msg, idx) => 
          idx === updatedMessages.length - 1 ? readMessage : msg
        );
        
        const readContact = { ...deliveredContact, messages: finalMessages };
        setSelectedContact(readContact);
      }, 3000);
    }, 1500);
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleContactSelect = (contact) => {
    // If it's a forum notification, navigate to the forum page
    if (contact.isForumNotification) {
      navigate("/forum");
      return;
    }
    
    setSelectedContact(contact);
    if (isMobile) {
      toggleDrawer();
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />
        <MDBox mt={3} mb={3} sx={{ pb: { xs: 10, sm: 3 } }}>
          <MDBox
            sx={{
              textAlign: "center",
              fontSize: "13px",
              fontStyle: "italic",
              color: isDarkMode ? "text.secondary" : "#A0A0A0",
              marginBottom: 1,
            }}
          >
            Only you and your recipient can see these messages
          </MDBox>
          <Grid container spacing={1} sx={{ height: "calc(100vh - 220px)" }}>
            {isMobile ? (
              // Mobile View
              <>
                {!selectedContact ? (
                  // Contact list view on mobile
                  <Grid item xs={12} sx={{ height: "100%" }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      mb={2}
                      px={1}
                    >
                      <MDTypography variant="h6">Chats</MDTypography>
                      <IconButton color="primary" onClick={() => setSearchMode(!searchMode)}>
                        <SearchIcon />
                      </IconButton>
                    </Box>
                    <Sidebar
                      contacts={contacts}
                      activeContactId={selectedContact?.id || 0}
                      onSelectContact={handleContactSelect}
                    />
                  </Grid>
                ) : (
                  // Chat view on mobile
                  <Grid item xs={12} sx={{ height: "100%" }}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      mb={2}
                    >
                      <IconButton onClick={() => setSelectedContact(null)}>
                        <ArrowBackIcon />
                      </IconButton>
                      <MDTypography variant="h6" ml={1}>
                        {selectedContact.name}
                      </MDTypography>
                    </Box>
                    <ChatArea
                      selectedContact={selectedContact}
                      onSendMessage={handleSendMessage}
                    />
                  </Grid>
                )}
                
                {/* Floating action button for new chat */}
                <Zoom in={!selectedContact}>
                  <Fab 
                    color="primary" 
                    aria-label="new chat"
                    sx={{
                      position: 'fixed',
                      bottom: { xs: 120, sm: 80 },
                      right: { xs: 24, sm: 16 },
                      zIndex: 1201,
                    }}
                  >
                    <AddIcon />
                  </Fab>
                </Zoom>
              </>
            ) : (
              // Desktop View
              <>
                <Grid item xs={12} md={3} sx={{ height: "100%" }}>
                  <Sidebar
                    contacts={contacts}
                    activeContactId={selectedContact?.id || 0}
                    onSelectContact={handleContactSelect}
                  />
                </Grid>
                <Grid item xs={12} md={9} sx={{ height: "100%" }}>
                  {isLoading ? (
                    <Box 
                      display="flex" 
                      justifyContent="center" 
                      alignItems="center" 
                      height="100%"
                    >
                      <CircularProgress />
                    </Box>
                  ) : (
                    <ChatArea
                      selectedContact={selectedContact}
                      onSendMessage={handleSendMessage}
                    />
                  )}
                </Grid>
              </>
            )}
          </Grid>
        </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Chat;
