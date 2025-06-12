/**
=========================================================
* Akiba - v1.0.0
=========================================================

* Product Page: https://www.aogajoseph.github.io/akiba/
* Copyright 2025 Joseph Onyango (https://www.aogajoseph.github.io/)

Coded by Joseph Onyango

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Activity log data
import activities from "layouts/statements/data/activityLogData";

function ActivityLog() {
  const [menu, setMenu] = useState(null);

  const openMenu = ({ currentTarget }) => setMenu(currentTarget);
  const closeMenu = () => setMenu(null);

  const renderActivities = activities.map(
    ({ icon, color, title, description, time }, key) => (
      <MDBox key={key} component="li" py={1} pr={2} mb={key !== activities.length - 1 ? 1 : 0}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center">
          <MDBox display="flex" alignItems="center">
            <MDBox mr={2}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: (theme) => theme.palette[color].main,
                  color: "#fff",
                }}
              >
                <Icon>{icon}</Icon>
              </Avatar>
            </MDBox>
            <MDBox display="flex" flexDirection="column">
              <MDTypography variant="button" fontWeight="medium" gutterBottom>
                {title}
              </MDTypography>
              <MDTypography variant="caption" color="text" fontWeight="regular">
                {description}
              </MDTypography>
            </MDBox>
          </MDBox>
          <MDTypography variant="caption" color="text" fontWeight="regular">
            {time}
          </MDTypography>
        </MDBox>
        {key !== activities.length - 1 && (
          <Divider component="li" sx={{ ml: 7, mt: 1, opacity: 0.25 }} />
        )}
      </MDBox>
    )
  );

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={2} px={2} display="flex" justifyContent="space-between" alignItems="center">
        <MDTypography variant="h6" fontWeight="medium">
          Activity Log
        </MDTypography>
        <MDBox display="flex" alignItems="center">
          <MDBox color="text" px={2}>
            <Icon 
              sx={{ 
                cursor: "pointer", 
                fontWeight: "bold",
                color: (theme) => theme.palette.mode === "dark" ? "white" : "inherit"
              }} 
              fontSize="small" 
              onClick={openMenu}
            >
              more_vert
            </Icon>
          </MDBox>
          <Menu
            id="simple-menu"
            anchorEl={menu}
            anchorOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(menu)}
            onClose={closeMenu}
          >
            <MenuItem onClick={closeMenu}>View all</MenuItem>
            <MenuItem onClick={closeMenu}>Search</MenuItem>
            <MenuItem onClick={closeMenu}>Filter</MenuItem>
          </Menu>
        </MDBox>
      </MDBox>
      <MDBox p={2}>
        <MDBox component="ul" display="flex" flexDirection="column" p={0} m={0} sx={{ listStyle: "none" }}>
          {renderActivities}
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default ActivityLog; 