import React, { useState } from "react";
import PropTypes from "prop-types";
import { 
  List, 
  ListItem, 
  ListItemText, 
  Avatar, 
  Badge, 
  TextField, 
  Box, 
  Typography, 
  Divider, 
  Tabs, 
  Tab,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Chip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import ForumIcon from "@mui/icons-material/Forum";
import MDTypography from "components/MDTypography";

const Sidebar = ({ contacts, activeContactId, onSelectContact }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  
  const isDarkMode = theme.palette.mode === "dark";
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleFilterChange = (event, newValue) => {
    setFilterValue(newValue);
  };

  // Separate forum notifications from regular contacts
  const forumNotifications = contacts.filter(contact => contact.isForumNotification);
  const regularContacts = contacts.filter(contact => !contact.isForumNotification);

  // Filter contacts based on search query and filter value
  const filteredContacts = regularContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterValue === 1) {
      return matchesSearch && contact.online;
    } else if (filterValue === 2) {
      return matchesSearch && contact.unread;
    }
    
    return matchesSearch;
  });

  // Group contacts by online status
  const onlineContacts = filteredContacts.filter(contact => contact.online);
  const offlineContacts = filteredContacts.filter(contact => !contact.online);

  const renderContactItem = (contact) => (
    <ListItem
      key={contact.id}
      button
      onClick={() => onSelectContact && onSelectContact(contact)}
      sx={{
        padding: 1,
        borderRadius: 1,
        mb: 0.5,
        backgroundColor: contact.id === activeContactId ? 
          (isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 123, 255, 0.1)") : 
          "inherit",
        "&:hover": {
          backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 123, 255, 0.05)",
        },
      }}
    >
      <Box position="relative">
        <Badge 
          color={contact.online ? "success" : "default"} 
          variant="dot" 
          overlap="circular"
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
            alt={contact.name}
            src={contact.avatar}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: contact.online ? 
                `2px solid ${theme.palette.success.main}` : 
                `2px solid ${isDarkMode ? "#555" : "#ddd"}`,
            }}
          />
        </Badge>
        {contact.unread && (
          <Badge
            badgeContent={contact.unreadCount || ""}
            color="error"
            sx={{
              position: "absolute",
              top: -5,
              right: -5,
            }}
          />
        )}
      </Box>
      <ListItemText
        primary={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="subtitle2"
              fontWeight={contact.unread ? "bold" : "normal"}
              color={contact.online ? 
                (isDarkMode ? theme.palette.success.light : theme.palette.success.dark) : 
                (isDarkMode ? "text.primary" : "text.secondary")}
            >
              {contact.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {contact.lastMessageTime}
            </Typography>
          </Box>
        }
        secondary={
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontSize: "0.75rem",
              color: contact.unread ? 
                (isDarkMode ? "text.primary" : "text.primary") : 
                "text.secondary",
              fontWeight: contact.unread ? "medium" : "normal",
              fontStyle: contact.typing ? "italic" : "normal",
            }}
          >
            {contact.typing ? "Typing..." : contact.lastMessage}
          </Typography>
        }
        sx={{
          marginLeft: 2,
          "& .MuiListItemText-secondary": {
            marginTop: -0.5,
          },
        }}
      />
    </ListItem>
  );

  const renderForumNotification = (notification) => (
    <ListItem
      key={notification.id}
      button
      onClick={() => onSelectContact && onSelectContact(notification)}
      sx={{
        padding: 1,
        borderRadius: 1,
        mb: 0.5,
        backgroundColor: isDarkMode ? "rgba(0, 123, 255, 0.1)" : "rgba(0, 123, 255, 0.05)",
        "&:hover": {
          backgroundColor: isDarkMode ? "rgba(0, 123, 255, 0.15)" : "rgba(0, 123, 255, 0.1)",
        },
      }}
    >
      <Box position="relative">
        <Badge 
          color="primary"
          variant="dot" 
          overlap="circular"
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
            alt={notification.name}
            src={notification.avatar}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "primary.main",
            }}
          >
            <ForumIcon fontSize="small" />
          </Avatar>
        </Badge>
        {notification.unread && (
          <Badge
            badgeContent={notification.unreadCount || ""}
            color="error"
            sx={{
              position: "absolute",
              top: -5,
              right: -5,
            }}
          />
        )}
      </Box>
      <ListItemText
        primary={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="subtitle2"
              fontWeight="medium"
              color="primary"
            >
              {notification.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {notification.lastMessageTime}
            </Typography>
          </Box>
        }
        secondary={
          <Box display="flex" alignItems="center">
            <Chip 
              label="New messages" 
              size="small" 
              color="primary" 
              variant="outlined" 
              sx={{ 
                height: 20, 
                fontSize: '0.65rem',
                mr: 0.5 
              }} 
            />
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
              }}
            >
              Tap to view in Forum
            </Typography>
          </Box>
        }
        sx={{
          marginLeft: 2,
          "& .MuiListItemText-secondary": {
            marginTop: -0.5,
          },
        }}
      />
    </ListItem>
  );

  return (
    <Box 
      sx={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: isDarkMode ? "background.paper" : "#f5f5f5",
        borderRadius: 1,
      }}
    >
      {/* Header with options */}
      <Box 
        p={2} 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center"
        borderBottom={1}
        borderColor="divider"
      >
        <MDTypography variant="h6" color="text.primary">Chats</MDTypography>
        <Box>
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>New Chat</MenuItem>
            <MenuItem onClick={handleMenuClose}>Mark All as Read</MenuItem>
            <MenuItem onClick={handleMenuClose}>Archive Chats</MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Search Bar */}
      <Box p={1.5}>
        <TextField 
          fullWidth 
          size="small" 
          placeholder="Search conversations..." 
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
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
      </Box>
      
      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: 1, py: 1 }}>
        <Tabs 
          value={filterValue} 
          onChange={handleFilterChange}
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
          <Tab label="Unread" />
        </Tabs>
      </Box>
      
      {/* Contacts List */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {/* Forum notifications section */}
        {forumNotifications.length > 0 && filterValue !== 1 && (
          <>
            <Box px={2} py={1}> 
            </Box>
            <List dense disablePadding sx={{ px: 1 }}>
              {forumNotifications.map(renderForumNotification)}
            </List>
            <Divider sx={{ my: 1 }} />
          </>
        )}
        
        {filterValue !== 1 && onlineContacts.length > 0 && (
          <>
            <Box px={2} py={1}>
              <MDTypography variant="overline" color="text.secondary">
                Online • {onlineContacts.length}
              </MDTypography>
            </Box>
            <List dense disablePadding sx={{ px: 1 }}>
              {onlineContacts.map(renderContactItem)}
            </List>
          </>
        )}
        
        {filterValue !== 1 && offlineContacts.length > 0 && (
          <>
            <Box px={2} py={1}>
              <MDTypography variant="overline" color="text.secondary">
                Offline • {offlineContacts.length}
              </MDTypography>
            </Box>
            <List dense disablePadding sx={{ px: 1 }}>
              {offlineContacts.map(renderContactItem)}
            </List>
          </>
        )}
        
        {filterValue === 1 && (
          <List dense disablePadding sx={{ px: 1 }}>
            {onlineContacts.map(renderContactItem)}
          </List>
        )}
        
        {filterValue === 2 && (
          <List dense disablePadding sx={{ px: 1 }}>
            {filteredContacts.filter(c => c.unread).map(renderContactItem)}
          </List>
        )}
        
        {filteredContacts.length === 0 && forumNotifications.length === 0 && (
          <Box p={3} textAlign="center">
            <MDTypography variant="body2" color="text.secondary">
              No contacts found
            </MDTypography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Prop types validation
Sidebar.propTypes = {
  contacts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      avatar: PropTypes.string,
      online: PropTypes.bool.isRequired,
      lastMessage: PropTypes.string.isRequired,
      lastMessageTime: PropTypes.string,
      unread: PropTypes.bool,
      unreadCount: PropTypes.number,
      typing: PropTypes.bool,
      isForumNotification: PropTypes.bool,
    })
  ).isRequired,
  activeContactId: PropTypes.number.isRequired,
  onSelectContact: PropTypes.func,
};

export default Sidebar;
