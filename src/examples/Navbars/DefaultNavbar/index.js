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

import { useState, useEffect } from "react";

// react-router components
import { Link, useNavigate } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import Container from "@mui/material/Container";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Material Dashboard 2 React example components
import DefaultNavbarMobile from "examples/Navbars/DefaultNavbar/DefaultNavbarMobile.js";

// Material Dashboard 2 React base styles
import breakpoints from "assets/theme/base/breakpoints";

// Material Dashboard 2 React context
import { useMaterialUIController } from "context";

// Import logo
import logo from "assets/images/logo.png";

function DefaultNavbar({ transparent, light, action }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const navigate = useNavigate();

  const [mobileNavbar, setMobileNavbar] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  const openMobileNavbar = ({ currentTarget }) => setMobileNavbar(currentTarget.parentNode);
  const closeMobileNavbar = () => setMobileNavbar(false);

  const scrollToSection = (sectionId) => {
    // Always navigate to the info page with hash
    // The info page will handle the scrolling
    navigate(`/info#${sectionId}`);
  };

  useEffect(() => {
    // A function that sets the display state for the DefaultNavbarMobile.
    function displayMobileNavbar() {
      if (window.innerWidth < breakpoints.values.lg) {
        setMobileView(true);
        setMobileNavbar(false);
      } else {
        setMobileView(false);
        setMobileNavbar(false);
      }
    }

    /** 
     The event listener that's calling the displayMobileNavbar function when 
     resizing the window.
    */
    window.addEventListener("resize", displayMobileNavbar);

    // Call the displayMobileNavbar function to set the state with the initial value.
    displayMobileNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", displayMobileNavbar);
  }, []);

  return (
    <Container>
      <MDBox
        py={1}
        px={{ xs: 4, sm: transparent ? 2 : 3, lg: transparent ? 0 : 2 }}
        my={3}
        mx={3}
        width="calc(100% - 48px)"
        borderRadius="lg"
        shadow={transparent ? "none" : "md"}
        color={light ? "white" : "dark"}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        position="absolute"
        left={0}
        zIndex={3}
        sx={({
          palette: { transparent: transparentColor, white, background },
          functions: { rgba },
        }) => ({
          backgroundColor: transparent
            ? transparentColor.main
            : rgba(darkMode ? background.sidenav : white.main, 0.8),
          backdropFilter: transparent ? "none" : `saturate(200%) blur(30px)`,
        })}
      >
        <MDBox
          component={Link}
          to="/"
          py={transparent ? 1.5 : 0.75}
          lineHeight={1}
          pl={{ xs: 0, lg: 1 }}
          display="flex"
          alignItems="center"
        >
          <MDBox
            component="img"
            src={logo}
            alt="Akiba Logo"
            width="24px"
            height="24px"
            mr={1}
          />
          <MDTypography variant="button" fontWeight="bold" color={light ? "white" : "dark"}>
            Akiba
          </MDTypography>
        </MDBox>
        <MDBox color="inherit" display={{ xs: "none", lg: "flex" }} m={0} p={0}>
          <MDBox
            component="button"
            onClick={() => scrollToSection("hero")}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              p: 1,
              mx: 0.5,
              borderRadius: 1,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: light 
                  ? "rgba(255, 255, 255, 0.1)" 
                  : "rgba(0, 0, 0, 0.04)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="medium" 
              color={light ? "white" : "dark"}
              sx={{ textTransform: "none" }}
            >
              About
            </MDTypography>
          </MDBox>
          <MDBox
            component="button"
            onClick={() => scrollToSection("getting-started")}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              p: 1,
              mx: 0.5,
              borderRadius: 1,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: light 
                  ? "rgba(255, 255, 255, 0.1)" 
                  : "rgba(0, 0, 0, 0.04)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="medium" 
              color={light ? "white" : "dark"}
              sx={{ textTransform: "none" }}
            >
              Get Started
            </MDTypography>
          </MDBox>
          <MDBox
            component="button"
            onClick={() => scrollToSection("pricing")}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              p: 1,
              mx: 0.5,
              borderRadius: 1,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: light 
                  ? "rgba(255, 255, 255, 0.1)" 
                  : "rgba(0, 0, 0, 0.04)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="medium" 
              color={light ? "white" : "dark"}
              sx={{ textTransform: "none" }}
            >
              Pricing
            </MDTypography>
          </MDBox>
          <MDBox
            component="button"
            onClick={() => scrollToSection("faq")}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              p: 1,
              mx: 0.5,
              borderRadius: 1,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: light 
                  ? "rgba(255, 255, 255, 0.1)" 
                  : "rgba(0, 0, 0, 0.04)",
                transform: "translateY(-1px)",
              },
            }}
          >
            <MDTypography 
              variant="button" 
              fontWeight="medium" 
              color={light ? "white" : "dark"}
              sx={{ textTransform: "none" }}
            >
              FAQs
            </MDTypography>
          </MDBox>
        </MDBox>
        {action &&
          (action.type === "internal" ? (
            <MDBox display={{ xs: "none", lg: "inline-block" }}>
              <MDButton
                component={Link}
                to={action.route}
                variant="gradient"
                color={action.color ? action.color : "info"}
                size="small"
                sx={{
                  transition: "transform 0.3s",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
              >
                {action.label}
              </MDButton>
            </MDBox>
          ) : (
            <MDBox display={{ xs: "none", lg: "inline-block" }}>
              <MDButton
                component="a"
                href={action.route}
                target="_blank"
                rel="noreferrer"
                variant="gradient"
                color={action.color ? action.color : "info"}
                size="small"
                sx={{
                  mt: -0.3,
                  transition: "transform 0.3s",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
              >
                Download App
              </MDButton>
            </MDBox>
          ))}
        <MDBox
          display={{ xs: "inline-block", lg: "none" }}
          lineHeight={0}
          py={1.5}
          pl={1.5}
          color="inherit"
          sx={{ 
            cursor: "pointer",
            borderRadius: 1,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: light 
                ? "rgba(255, 255, 255, 0.1)" 
                : "rgba(0, 0, 0, 0.04)",
            },
          }}
          onClick={openMobileNavbar}
        >
          <Icon 
            fontSize="default"
            sx={{
              color: light 
                ? "white" 
                : darkMode 
                  ? "rgba(255, 255, 255, 0.9)" 
                  : "rgba(0, 0, 0, 0.8)",
              filter: darkMode 
                ? "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" 
                : "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                color: light 
                  ? "white" 
                  : darkMode 
                    ? "white" 
                    : "rgba(0, 0, 0, 1)",
                filter: darkMode 
                  ? "drop-shadow(0 2px 4px rgba(0,0,0,0.7))" 
                  : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
              },
            }}
          >
            {mobileNavbar ? "close" : "menu"}
          </Icon>
        </MDBox>
      </MDBox>
      {mobileView && <DefaultNavbarMobile open={mobileNavbar} close={closeMobileNavbar} />}
    </Container>
  );
}

// Setting default values for the props of DefaultNavbar
DefaultNavbar.defaultProps = {
  transparent: false,
  light: false,
  action: false,
};

// Typechecking props for the DefaultNavbar
DefaultNavbar.propTypes = {
  transparent: PropTypes.bool,
  light: PropTypes.bool,
  action: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.shape({
      type: PropTypes.oneOf(["external", "internal"]).isRequired,
      route: PropTypes.string.isRequired,
      color: PropTypes.oneOf([
        "primary",
        "secondary",
        "info",
        "success",
        "warning",
        "error",
        "dark",
        "light",
      ]),
      label: PropTypes.string.isRequired,
    }),
  ]),
};

export default DefaultNavbar;
