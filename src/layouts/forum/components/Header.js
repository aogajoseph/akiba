import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Card, Grid, AppBar, Tabs, Tab, Icon, Tooltip, Badge } from "@mui/material";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

// Akiba React base styles
import breakpoints from "assets/theme/base/breakpoints";

// Images
import defaultProfileImg from "assets/images/profile.png";

function Header({ contact, children }) {
  const [tabsOrientation, setTabsOrientation] = useState("horizontal");
  const [tabValue, setTabValue] = useState(0);

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

  const handleSetTabValue = (event, newValue) => setTabValue(newValue);

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
            <Badge color={contact?.online ? "success" : "default"} variant="dot" overlap="circular">
              <MDAvatar
                src={contact?.avatar || defaultProfileImg}
                alt={contact?.name}
                size="xl"
                shadow="sm"
              />
            </Badge>
          </Grid>
          <Grid item>
            <MDBox height="100%" mt={0.5} lineHeight={1}>
              <MDTypography variant="h5" fontWeight="medium">
                {contact?.name || "Family Forum"}
              </MDTypography>
              <MDTypography
                variant="button"
                color={contact?.online ? "success" : "text.secondary"}
                fontWeight="regular"
              >
                4 Members
              </MDTypography>
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={4} sx={{ ml: "auto" }}>
            <AppBar position="static">
              <Tabs orientation={tabsOrientation} value={tabValue} onChange={handleSetTabValue}>
                <Tooltip title="About Group">
                  <Tab
                    label="About"
                    icon={
                      <Icon fontSize="small" sx={{ mt: -0.25 }}>
                        description
                      </Icon>
                    }
                  />
                </Tooltip>
                <Tooltip title="See Members">
                  <Tab
                    label="Members"
                    icon={
                      <Icon fontSize="small" sx={{ mt: -0.25 }}>
                        people
                      </Icon>
                    }
                  />
                </Tooltip>
                <Tooltip title="Find Messages">
                  <Tab
                    label="Search"
                    icon={
                      <Icon fontSize="small" sx={{ mt: -0.25 }}>
                        search
                      </Icon>
                    }
                  />
                </Tooltip>
              </Tabs>
            </AppBar>
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
    name: "Family Forum",
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
