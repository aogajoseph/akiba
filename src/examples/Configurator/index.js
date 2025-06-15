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

// @mui material components
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import XIcon from "@mui/icons-material/X"; 
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { FaWhatsapp } from "react-icons/fa";
import SettingsIcon from "@mui/icons-material/Settings";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Custom styles for the Configurator
import ConfiguratorRoot from "examples/Configurator/ConfiguratorRoot";

// Material Dashboard 2 React context
import {
  useMaterialUIController,
  setOpenConfigurator,
  setTransparentSidenav,
  setWhiteSidenav,
  setFixedNavbar,
  setSidenavColor,
  setDarkMode,
} from "context";
import { Tooltip } from "@mui/material";

function Configurator() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    openConfigurator,
    fixedNavbar,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
  } = controller;
  const [disabled, setDisabled] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const sidenavColors = ["primary", "dark", "info", "success", "warning", "error"];

  const appUrl = encodeURIComponent("https://akiba.app");
  const message = encodeURIComponent("Join me on Akiba - The smart way to save together with family and friends!");

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${message}%20${appUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${appUrl}`,
    x: `https://twitter.com/intent/tweet?text=${message}&url=${appUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${appUrl}`,
  };
  
  // Use the useEffect hook to change the button state for the sidenav type based on window size.
  useEffect(() => {
    // A function that sets the disabled state of the buttons for the sidenav type.
    function handleDisabled() {
      return window.innerWidth > 1200 ? setDisabled(false) : setDisabled(true);
    }

    // The event listener that's calling the handleDisabled function when resizing the window.
    window.addEventListener("resize", handleDisabled);

    // Call the handleDisabled function to set the state with the initial value.
    handleDisabled();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleDisabled);
  }, []);

  const handleCloseConfigurator = () => setOpenConfigurator(dispatch, false);
  const handleTransparentSidenav = () => {
    setTransparentSidenav(dispatch, true);
    setWhiteSidenav(dispatch, false);
  };
  const handleWhiteSidenav = () => {
    setWhiteSidenav(dispatch, true);
    setTransparentSidenav(dispatch, false);
  };
  const handleDarkSidenav = () => {
    setWhiteSidenav(dispatch, false);
    setTransparentSidenav(dispatch, false);
  };
  const handleFixedNavbar = () => setFixedNavbar(dispatch, !fixedNavbar);
  const handleDarkMode = () => setDarkMode(dispatch, !darkMode);

  const handleHelpDialogOpen = () => {
    setHelpDialogOpen(true);
  };

  const handleHelpDialogClose = () => {
    setHelpDialogOpen(false);
  };

  // sidenav type buttons styles
  const sidenavTypeButtonsStyles = ({
    functions: { pxToRem },
    palette: { white, dark, background },
    borders: { borderWidth },
  }) => ({
    height: pxToRem(39),
    background: darkMode ? background.sidenav : white.main,
    color: darkMode ? white.main : dark.main,
    border: `${borderWidth[1]} solid ${darkMode ? white.main : dark.main}`,

    "&:hover, &:focus, &:focus:not(:hover)": {
      background: darkMode ? background.sidenav : white.main,
      color: darkMode ? white.main : dark.main,
      border: `${borderWidth[1]} solid ${darkMode ? white.main : dark.main}`,
    },
  });

  // sidenav type active button styles
  const sidenavTypeActiveButtonStyles = ({
    functions: { pxToRem, linearGradient },
    palette: { white, gradients, background },
  }) => ({
    height: pxToRem(39),
    background: darkMode ? white.main : linearGradient(gradients.dark.main, gradients.dark.state),
    color: darkMode ? background.sidenav : white.main,

    "&:hover, &:focus, &:focus:not(:hover)": {
      background: darkMode ? white.main : linearGradient(gradients.dark.main, gradients.dark.state),
      color: darkMode ? background.sidenav : white.main,
    },
  });

  const socialIconStyle = {
    fontSize: "1.25rem",
    transition: "transform 0.2s ease-in-out",
    "&:hover": {
      transform: "scale(1.1)",
    },
  };

  return (
    <ConfiguratorRoot variant="permanent" ownerState={{ openConfigurator }}>
      <MDBox
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        pt={4}
        pb={0.5}
        px={3}
      >
        <MDBox>
          <MDTypography variant="h5">Dashboard Settings</MDTypography>
        </MDBox>

        <Icon
          sx={({ typography: { size }, palette: { dark, white } }) => ({
            fontSize: `${size.lg} !important`,
            color: darkMode ? white.main : dark.main,
            stroke: "currentColor",
            strokeWidth: "2px",
            cursor: "pointer",
            transform: "translateY(5px)",
          })}
          onClick={handleCloseConfigurator}
        >
          close
        </Icon>
      </MDBox>

      <Divider />

      <MDBox pt={0.5} pb={3} px={3}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" lineHeight={1}>
          <MDTypography variant="h6">Dark Mode</MDTypography>
          <Switch checked={darkMode} onChange={handleDarkMode} />
        </MDBox>

        <Divider />

        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={3}
          lineHeight={1}
        >
          <MDTypography variant="h6">Fixed Navbar</MDTypography>
          <Switch checked={fixedNavbar} onChange={handleFixedNavbar} />
        </MDBox>

        <Divider />

        <MDBox mt={3} lineHeight={1}>
          <MDTypography variant="button" color="text">
            Backgrounds
          </MDTypography>

          <MDBox
            sx={{
              display: "flex",
              mt: 2,
              mr: 1,
            }}
          >
            <MDButton
              color="dark"
              variant="gradient"
              onClick={handleWhiteSidenav}
              disabled={disabled}
              fullWidth
              sx={
                whiteSidenav && !transparentSidenav
                  ? sidenavTypeActiveButtonStyles
                  : sidenavTypeButtonsStyles
              }
            >
              Light
            </MDButton>
            <MDBox sx={{ mx: 1, width: "6rem", minWidth: "6rem" }}>
              <MDButton
                color="dark"
                variant="gradient"
                onClick={handleTransparentSidenav}
                disabled={disabled}
                fullWidth
                sx={
                  transparentSidenav && !whiteSidenav
                    ? sidenavTypeActiveButtonStyles
                    : sidenavTypeButtonsStyles
                }
              >
                Clear
              </MDButton>
            </MDBox>
            <MDButton
              color="dark"
              variant="gradient"
              onClick={handleDarkSidenav}
              disabled={disabled}
              fullWidth
              sx={
                !transparentSidenav && !whiteSidenav
                  ? sidenavTypeActiveButtonStyles
                  : sidenavTypeButtonsStyles
              }
            >
              Dark
            </MDButton>
          </MDBox>
        </MDBox>

        <Divider />

        <MDBox>
        <MDTypography variant="button" color="text">
            Colors
          </MDTypography>

          <MDBox mb={0.5}>
            {sidenavColors.map((color) => (
              <IconButton
                key={color}
                sx={({
                  borders: { borderWidth },
                  palette: { white, dark, background },
                  transitions,
                }) => ({
                  width: "24px",
                  height: "24px",
                  padding: 0,
                  border: `${borderWidth[1]} solid ${darkMode ? background.sidenav : white.main}`,
                  borderColor: () => {
                    let borderColorValue = sidenavColor === color && dark.main;

                    if (darkMode && sidenavColor === color) {
                      borderColorValue = white.main;
                    }

                    return borderColorValue;
                  },
                  transition: transitions.create("border-color", {
                    easing: transitions.easing.sharp,
                    duration: transitions.duration.shorter,
                  }),
                  backgroundImage: ({ functions: { linearGradient }, palette: { gradients } }) =>
                    linearGradient(gradients[color].main, gradients[color].state),

                  "&:not(:last-child)": {
                    mr: 1,
                  },

                  "&:hover, &:focus, &:active": {
                    borderColor: darkMode ? white.main : dark.main,
                  },
                })}
                onClick={() => setSidenavColor(dispatch, color)}
              />
            ))}
          </MDBox>
        </MDBox>

        <Divider />

        <MDBox mt={2} textAlign="left">
          <MDBox mb={0.5}>
            <MDTypography variant="h6">Share the Akiba experience!</MDTypography>
            <MDTypography variant="button" color="text">
              Help others discover the <span style={{ display: 'block' }}>joy of saving together</span>
            </MDTypography>
          </MDBox>

          <MDBox display="flex" justifyContent="left" gap={1}>
            <Tooltip title="Share on WhatsApp">
              <IconButton 
                component="a" 
                href={shareLinks.whatsapp} 
                target="_blank" 
                rel="noreferrer"
                sx={{
                  backgroundColor: "rgba(37, 211, 102, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(37, 211, 102, 0.2)",
                  },
                }}
              >
                <FaWhatsapp style={{ ...socialIconStyle, color: "#25D366" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on Facebook">
              <IconButton 
                component="a" 
                href={shareLinks.facebook} 
                target="_blank" 
                rel="noreferrer"
                sx={{
                  backgroundColor: "rgba(24, 119, 242, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(24, 119, 242, 0.2)",
                  },
                }}
              >
                <FacebookIcon sx={{ ...socialIconStyle, color: "#1877F2" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on X">
              <IconButton 
                component="a" 
                href={shareLinks.x} 
                target="_blank" 
                rel="noreferrer"
                sx={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                  },
                }}
              >
                <XIcon sx={{ ...socialIconStyle, color: "#000000" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on LinkedIn">
              <IconButton 
                component="a" 
                href={shareLinks.linkedin} 
                target="_blank" 
                rel="noreferrer"
                sx={{
                  backgroundColor: "rgba(10, 102, 194, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(10, 102, 194, 0.2)",
                  },
                }}
              >
                <LinkedInIcon sx={{ ...socialIconStyle, color: "#0A66C2" }} />
              </IconButton>
            </Tooltip>
          </MDBox>
        </MDBox>
      </MDBox>

      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onClose={handleHelpDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <MDTypography variant="h6" fontWeight="medium">
            How can we help you?
          </MDTypography>
        </DialogTitle>
        <DialogContent>
          <MDBox mt={2}>
            <TextField
              autoFocus
              multiline
              rows={4}
              fullWidth
              label="Describe your issue or question"
              variant="outlined"
            />
          </MDBox>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={handleHelpDialogClose} color="secondary">
            Cancel
          </MDButton>
          <MDButton onClick={handleHelpDialogClose} color="info">
            Send
          </MDButton>
        </DialogActions>
      </Dialog>
    </ConfiguratorRoot>
  );
}

export default Configurator;
