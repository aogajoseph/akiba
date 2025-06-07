import React from "react";
import PropTypes from "prop-types";
import { List, ListItem, ListItemText, Avatar, Badge } from "@mui/material";

const Sidebar = ({ contacts, activeContactId }) => {
  return (
    <List>
      {contacts.map((contact) => (
        <ListItem
          key={contact.id}
          button
          sx={{
            padding: 1,
            backgroundColor: contact.id === activeContactId ? "rgba(0, 123, 255, 0.2)" : "inherit",
            "&:hover": {
              backgroundColor: "rgba(0, 123, 255, 0.08)",
            },
          }}
        >
          <Badge color={contact.online ? "success" : "default"} variant="dot" overlap="circular">
            <Avatar
              alt={contact.name}
              src={contact.avatar}
              sx={{
                borderRadius: "50%",
                border: contact.online ? "2px solid green" : "2px solid gray",
              }}
            />
          </Badge>
          <ListItemText
            primary={
              <span
                style={{
                  fontSize: "small",
                  fontWeight: "bold",
                  color: contact.online ? "green" : "gray",
                }}
              >
                {contact.name}
              </span>
            }
            secondary={
              <span
                style={{
                  fontSize: "small",
                  color: "gray",
                  fontStyle: "italic",
                }}
              >
                {contact.lastMessage}
              </span>
            }
            sx={{
              marginLeft: 2,
              "& .MuiListItemText-secondary": {
                marginTop: -0.5,
              },
            }}
          />
        </ListItem>
      ))}
    </List>
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
    })
  ).isRequired,
  activeContactId: PropTypes.number.isRequired,
};

export default Sidebar;
