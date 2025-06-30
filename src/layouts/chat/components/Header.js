import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Card, Grid } from "@mui/material";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Akiba React base styles
import breakpoints from "assets/theme/base/breakpoints";

// Images
import defaultProfileImg from "assets/images/profile.png";

function Header({ contact, children }) {
  const [tabsOrientation, setTabsOrientation] = useState("horizontal");

  useEffect(() => {
    // A function that sets the orientation state of the tabs.
    function handleTabsOrientation() {
      return window.innerWidth < breakpoints.values.sm
        ? setTabsOrientation("vertical")
        : setTabsOrientation("horizontal");
    }

    /** 
     The event listener that's calling the handleTabsOrientation function when resizing the window.
    */
    window.addEventListener("resize", handleTabsOrientation);

    // Call the handleTabsOrientation function to set the state with the initial value.
    handleTabsOrientation();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleTabsOrientation);
  }, [tabsOrientation]);

  return (
    <MDBox position="relative" mb={5}>
      <MDBox
        display="flex"
        alignItems="center"
        position="relative"
        minHeight="3.5rem"
        borderRadius="xl"
      />
      <Card
        sx={{
          position: "relative",
          mt: -8,
          mx: 3,
          py: 2,
          px: 2,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <MDBox height="100%" mt={0.5} lineHeight={1}>
              <MDTypography variant="h5" fontWeight="medium">
                {contact?.name || "Private Messaging"}
              </MDTypography>
              <MDTypography
                variant="button"
                color={contact?.online ? "success" : "text.secondary"}
                fontWeight="regular"
              >
                2 Online
              </MDTypography>
            </MDBox>
          </Grid>
        </Grid>
        {children}
      </Card>
    </MDBox>
  );
}

// Setting default props for the Header
Header.defaultProps = {
  contact: {
    name: "Private Messaging",
    avatar: defaultProfileImg,
    online: true,
  },
  children: "",
};

// Typechecking props for the Header
Header.propTypes = {
  contact: PropTypes.shape({
    name: PropTypes.string,
    avatar: PropTypes.string,
    online: PropTypes.bool,
  }),
  children: PropTypes.node,
};

export default Header;
