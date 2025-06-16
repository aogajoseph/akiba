import { Link } from "react-router-dom";
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function DefaultNavbarMobile({ routes, open, close }) {
  const { collapse } = routes;

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
      bgColor="background.sidenav"
      position="absolute"
      top="0"
      left="0"
      right="0"
      display="flex"
      alignItems="center"
      zIndex={99}
      height="100vh"
      maxHeight="100vh"
      sx={{ overflowY: "auto" }}
    >
      <MDBox width="100%" pt={2} pb={3} px={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <MDTypography variant="h6" fontWeight="medium" color="text">
            Menu
          </MDTypography>
          <Icon sx={{ cursor: "pointer" }} onClick={close}>
            close
          </Icon>
        </MDBox>
        <List>
          <ListItem component={Link} to="/info" onClick={close}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              About
            </MDTypography>
          </ListItem>
          <ListItem component={Link} to="/info" onClick={close}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Getting Started
            </MDTypography>
          </ListItem>
          <ListItem component={Link} to="/info" onClick={close}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Pricing
            </MDTypography>
          </ListItem>
          <ListItem component={Link} to="/info" onClick={close}>
            <MDTypography variant="button" fontWeight="regular" color="text">
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