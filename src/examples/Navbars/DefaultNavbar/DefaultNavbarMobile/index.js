import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React context
import { useMaterialUIController } from "context";

function DefaultNavbarMobile({ routes, close }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const navigate = useNavigate();
  const { collapse } = routes;

  const scrollToSection = (sectionId) => {
    close();
    // Always navigate to the info page with hash
    // The info page will handle the scrolling
    navigate(`/info#${sectionId}`);
  };

  const renderRoutes = collapse.map(({ name, icon, route, key }) => (
    <ListItem key={key} component={Link} to={route} onClick={close}>
      <MDBox py={1} display="flex" alignItems="center">
        <MDBox mr={1}>
          <Icon>{icon}</Icon>
        </MDBox>
        <MDTypography variant="button" fontWeight="regular" color="text">
          {name}
        </MDTypography>
      </MDBox>
    </ListItem>
  ));

  return (
    <MDBox
      bgColor={darkMode ? "background.sidenav" : "white"}
      position="absolute"
      top="0"
      left="0"
      right="0"
      display="flex"
      alignItems="center"
      zIndex={99}
      height="100vh"
      maxHeight="100vh"
      sx={{ 
        overflowY: "auto",
        backgroundColor: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <MDBox width="100%" pt={2} pb={3} px={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDTypography 
            variant="h6" 
            fontWeight="medium" 
            color={darkMode ? "white" : "dark"}
          >
            Menu
          </MDTypography>
          <Icon 
            sx={{ 
              cursor: "pointer",
              color: darkMode ? "white" : "dark",
            }} 
            onClick={close}
          >
            close
          </Icon>
        </MDBox>
        <List>
          <ListItem 
            onClick={() => scrollToSection("hero")}
            sx={{
              cursor: "pointer",
              borderRadius: 1,
              mb: 0.5,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: darkMode 
                  ? "rgba(255, 255, 255, 0.08)" 
                  : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="regular" 
              color={darkMode ? "white" : "dark"}
            >
              About
            </MDTypography>
          </ListItem>
          <ListItem 
            onClick={() => scrollToSection("getting-started")}
            sx={{
              cursor: "pointer",
              borderRadius: 1,
              mb: 0.5,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: darkMode 
                  ? "rgba(255, 255, 255, 0.08)" 
                  : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="regular" 
              color={darkMode ? "white" : "dark"}
            >
              Get Started
            </MDTypography>
          </ListItem>
          <ListItem 
            onClick={() => scrollToSection("pricing")}
            sx={{
              cursor: "pointer",
              borderRadius: 1,
              mb: 0.5,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: darkMode 
                  ? "rgba(255, 255, 255, 0.08)" 
                  : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="regular" 
              color={darkMode ? "white" : "dark"}
            >
              Pricing
            </MDTypography>
          </ListItem>
          <ListItem 
            onClick={() => scrollToSection("faq")}
            sx={{
              cursor: "pointer",
              borderRadius: 1,
              mb: 0.5,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: darkMode 
                  ? "rgba(255, 255, 255, 0.08)" 
                  : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="regular" 
              color={darkMode ? "white" : "dark"}
            >
              FAQs
            </MDTypography>
          </ListItem>
          {renderRoutes}
        </List>
      </MDBox>
    </MDBox>
  );
}

DefaultNavbarMobile.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  open: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]).isRequired,
  close: PropTypes.func.isRequired,
};

export default DefaultNavbarMobile; 