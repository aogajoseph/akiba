/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import Menu from "@mui/material/Menu";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";

// react-router components
import { useNavigate } from "react-router-dom";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React context
import { useMaterialUIController } from "context";

function DefaultNavbarMobile({ open, close }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const navigate = useNavigate();
  const { width } = open && open.getBoundingClientRect();

  const scrollToSection = (sectionId) => {
    close();
    // Always navigate to the info page with hash
    // The info page will handle the scrolling
    navigate(`/info#${sectionId}`);
  };

  const menuItems = [
    { name: "About", section: "hero" },
    { name: "Get Started", section: "getting-started" },
    { name: "Pricing", section: "pricing" },
    { name: "FAQs", section: "faq" },
  ];

  return (
    <Menu
      getContentAnchorEl={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      anchorEl={open}
      open={Boolean(open)}
      onClose={close}
      MenuListProps={{ 
        style: { 
          width: `calc(${width}px - 4rem)`,
          padding: 0,
        } 
      }}
      PaperProps={{
        sx: {
          backgroundColor: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: 2,
          boxShadow: darkMode 
            ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
          mt: 1,
          animation: 'slideIn 0.2s ease-out',
          '@keyframes slideIn': {
            '0%': {
              opacity: 0,
              transform: 'translateY(-10px) scale(0.95)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
        }
      }}
    >
      <MDBox 
        px={0.5} 
        py={1}
        sx={{
          backgroundColor: 'transparent',
        }}
      >
        {menuItems.map((item, index) => (
          <MDBox key={item.name}>
            <ListItem
              onClick={() => scrollToSection(item.section)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                pl: 3,
                pr: 2,
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: darkMode 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(4px)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                }
              }}
            >
              <ListItemText
                primary={
                  <MDTypography
                    variant="button"
                    fontWeight="medium"
                    color={darkMode ? "white" : "dark"}
                    sx={{
                      fontSize: '0.875rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.name}
                  </MDTypography>
                }
              />
            </ListItem>
            {index < menuItems.length - 1 && (
              <Divider 
                sx={{ 
                  mx: 2, 
                  opacity: 0.3,
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }} 
              />
            )}
          </MDBox>
        ))}
      </MDBox>
    </Menu>
  );
}

// Typechecking props for the DefaultNavbarMenu
DefaultNavbarMobile.propTypes = {
  open: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
  close: PropTypes.oneOfType([PropTypes.func, PropTypes.bool, PropTypes.object]).isRequired,
};

export default DefaultNavbarMobile;
