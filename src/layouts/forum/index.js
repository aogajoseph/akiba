import React, { useState, useEffect } from "react";
import { 
  Grid, 
  Box, 
  Tabs, 
  Tab, 
  Fab, 
  Zoom, 
  IconButton, 
  InputAdornment,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  CircularProgress
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Import Chat Components
import ChatArea from "./components/ChatArea";

// Import data
import { groupChat } from "./data";

function Forum() {
  const [selectedGroupChat, setSelectedGroupChat] = useState(groupChat);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const navigate = useNavigate();

  // Get all members from the group
  const allMembers = groupChat.members || [];
  
  // Filter members based on search query and tab value
  const filteredMembers = allMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (tabValue === 1) {
      // Online members
      return matchesSearch && member.online;
    } else if (tabValue === 2) {
      // Offline members
      return matchesSearch && !member.online;
    }
    
    // All members
    return matchesSearch;
  });

  // Simulate loading when changing groups
  useEffect(() => {
    if (selectedGroupChat) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // Simulate network delay
      return () => clearTimeout(timer);
    }
  }, [selectedGroupChat]);

  const handleSendMessage = (message) => {
    const newMessage = {
      sender: "You",
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSender: true,
      status: "sent",
    };
    
    // Create a deep copy of the selected group to avoid direct state mutation
    const updatedGroup = JSON.parse(JSON.stringify(selectedGroupChat));
    updatedGroup.messages = [...updatedGroup.messages, newMessage];
    updatedGroup.lastMessage = "You: " + message;
    updatedGroup.lastMessageTime = newMessage.timestamp;
    
    // Update state
    setSelectedGroupChat(updatedGroup);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleMemberSelect = (member) => {
    // Navigate to chat with this member
    navigate("/chat", { state: { selectedMemberId: member.id } });
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const renderMembersList = () => (
    <Box 
      sx={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: isDarkMode ? "background.paper" : "#f5f5f5",
        borderRadius: 1,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Collapse button */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          right: -16,
          transform: "translateY(-50%)",
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={toggleSidebar}
          sx={{
            bgcolor: isDarkMode ? "background.paper" : "#fff",
            boxShadow: 2,
            width: 32,
            height: 32,
            "&:hover": {
              bgcolor: isDarkMode ? "background.default" : "#f5f5f5",
            },
          }}
          size="small"
        >
          {sidebarCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Header with search */}
      <Box 
        p={2} 
        display="flex" 
        flexDirection="column" 
        gap={2}
        borderBottom={1}
        borderColor="divider"
      >
        <MDTypography variant="h6" color="text.primary">Forum</MDTypography>
        <TextField 
          fullWidth 
          size="small" 
          placeholder="Search members..." 
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="text.secondary" />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: isDarkMode ? "background.default" : "#fff",
            },
            "& .MuiInputBase-input": {
              color: isDarkMode ? "white" : "inherit"
            },
            "& .MuiInputBase-input::placeholder": {
              color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
              opacity: 1
            }
          }}
        />
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.5,
            },
          }}
        >
          <Tab label="All" />
          <Tab label="Online" />
          <Tab label="Offline" />
        </Tabs>
      </Box>
      
      {/* Members list */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        <List disablePadding>
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <React.Fragment key={member.id}>
                <ListItem
                  button
                  onClick={() => handleMemberSelect(member)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    "&:hover": {
                      bgcolor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 123, 255, 0.05)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge 
                      color="success" 
                      variant="dot" 
                      overlap="circular"
                      invisible={!member.online}
                      sx={{
                        "& .MuiBadge-badge": {
                          height: 10,
                          width: 10,
                          borderRadius: "50%",
                          border: `2px solid ${isDarkMode ? "#424242" : "#fff"}`,
                        }
                      }}
                    >
                      <Avatar 
                        src={member.avatar} 
                        alt={member.name}
                        sx={{ width: 40, height: 40 }}
                      />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography
                          variant="subtitle2"
                          fontWeight="normal"
                        >
                          {member.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={member.online ? "success.main" : "text.secondary"}
                        >
                          {member.online ? "Online" : "Offline"}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          maxWidth: "100%",
                        }}
                      >
                        {member.role === "admin" ? "Group Admin" : "Member"}
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))
          ) : (
            <Box p={3} textAlign="center">
              <MDTypography variant="body2" color="text.secondary">
                No members found
              </MDTypography>
            </Box>
          )}
        </List>
      </Box>
    </Box>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box display="flex" flexDirection="column" minHeight="100vh">
        <MDBox mb={2} />
        <Box flexGrow={1} display="flex" flexDirection="column">
          <MDBox mt={3} mb={3} flexGrow={1} display="flex" flexDirection="column">
            <MDBox
              sx={{
                textAlign: "center",
                fontSize: "13px",
                fontStyle: "italic",
                color: isDarkMode ? "text.secondary" : "#A0A0A0",
                marginBottom: 1,
              }}
            >
              Everyone in the group can see these messages.
            </MDBox>
            <Grid container spacing={1} sx={{ height: "calc(100vh - 220px)" }}>
              {isMobile ? (
                // Mobile View
                <>
                  {!selectedGroupChat ? (
                    // Group list view on mobile
                    <Grid item xs={12} sx={{ height: "100%" }}>
                      {renderMembersList()}
                    </Grid>
                  ) : (
                    // Chat view on mobile
                    <Grid item xs={12} sx={{ height: "100%" }}>
                      <Box 
                        display="flex" 
                        alignItems="center" 
                        mb={2}
                      >
                        <IconButton onClick={() => setSelectedGroupChat(null)}>
                          <ArrowBackIcon />
                        </IconButton>
                        <MDTypography variant="h6" ml={1}>
                          Account Forum
                        </MDTypography>
                      </Box>
                      {isLoading ? (
                        <Box 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center" 
                          height="calc(100% - 40px)"
                        >
                          <CircularProgress />
                        </Box>
                      ) : (
                        <ChatArea
                          selectedContact={selectedGroupChat}
                          onSendMessage={handleSendMessage}
                        />
                      )}
                    </Grid>
                  )}
                  
                  {/* Floating action button for new group */}
                  <Zoom in={!selectedGroupChat}>
                    <Fab 
                      color="primary" 
                      aria-label="new group"
                      sx={{
                        position: 'fixed',
                        bottom: 80,
                        right: 16,
                      }}
                    >
                      <AddIcon />
                    </Fab>
                  </Zoom>
                </>
              ) : (
                // Desktop View
                <>
                  {!sidebarCollapsed && (
                    <Grid item xs={12} md={4} sx={{ height: "100%" }}>
                      {renderMembersList()}
                    </Grid>
                  )}
                  <Grid 
                    item 
                    xs={12} 
                    md={sidebarCollapsed ? 12 : 8} 
                    sx={{ 
                      height: "100%",
                      position: "relative",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {sidebarCollapsed && (
                      <IconButton
                        onClick={toggleSidebar}
                        sx={{
                          position: "absolute",
                          left: 16,
                          top: 16,
                          bgcolor: isDarkMode ? "background.paper" : "#fff",
                          boxShadow: 2,
                          zIndex: 10,
                          "&:hover": {
                            bgcolor: isDarkMode ? "background.default" : "#f5f5f5",
                          },
                        }}
                        size="small"
                      >
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                    )}
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
                        selectedContact={{...selectedGroupChat, name: "Account Forum"}}
                        onSendMessage={handleSendMessage}
                      />
                    )}
                  </Grid>
                </>
              )}
            </Grid>
          </MDBox>
        </Box>
        <Footer />
      </Box>
    </DashboardLayout>
  );
}

export default Forum;
