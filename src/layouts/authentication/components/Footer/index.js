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

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React base styles
import typography from "assets/theme/base/typography";

function Footer({ light }) {
  const { size } = typography;

  return (
    <MDBox position="absolute" width="100%" bottom={0} py={2} px={1}>
      <Container>
        <MDBox
          width="100%"
          display="flex"
          flexDirection={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          alignItems="center"
          px={1.5}
        >
          <MDBox
            display="flex"
            justifyContent="flex-start"
            alignItems="center"
            flexWrap="wrap"
            color={light ? "white" : "text"}
            fontSize={size.xs}
            px={1.5}
            sx={{
              opacity: 0.9
            }}
          >
            &copy;{new Date().getFullYear()} Akiba Technologies Ltd. All Rights Reserved.
          </MDBox>
          <MDBox
            component="ul"
            sx={({ breakpoints, palette: { grey, text, info } }) => ({
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
              listStyle: "none",
              mt: 3,
              mb: 0,
              p: 0,
              "& li": {
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  "& a": {
                    color: info.main,
                  },
                },
              },
              [breakpoints.up("lg")]: {
                mt: 0,
              },
            })}
          >
            <MDBox component="li" pr={1} lineHeight={1}>
              <Link href="#" target="_blank" style={{ textDecoration: "none" }}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  color={light ? "white" : "text"}
                  sx={{ 
                    opacity: 0.9,
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      opacity: 1,
                      transform: "translateY(-2px)",
                      color: "info.main",
                      fontWeight: "medium"
                    }
                  }}
                >
                  Terms
                </MDTypography>
              </Link>
            </MDBox>
            <MDBox component="li" px={1} lineHeight={1}>
              <Link href="#" target="_blank" style={{ textDecoration: "none" }}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  color={light ? "white" : "text"}
                  sx={{ 
                    opacity: 0.9,
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      opacity: 1,
                      transform: "translateY(-2px)",
                      color: "info.main",
                      fontWeight: "medium"
                    }
                  }}
                >
                  Privacy
                </MDTypography>
              </Link>
            </MDBox>
            <MDBox component="li" px={1} lineHeight={1}>
              <Link href="#" target="_blank" style={{ textDecoration: "none" }}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  color={light ? "white" : "text"}
                  sx={{ 
                    opacity: 0.9,
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      opacity: 1,
                      transform: "translateY(-2px)",
                      color: "info.main",
                      fontWeight: "medium"
                    }
                  }}
                >
                  Help
                </MDTypography>
              </Link>
            </MDBox>
            <MDBox component="li" pl={1} lineHeight={1}>
              <Link href="#" target="_blank" style={{ textDecoration: "none" }}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  color={light ? "white" : "text"}
                  sx={{ 
                    opacity: 0.9,
                    transition: "all 0.3s ease-in-out",
                    "&:hover": {
                      opacity: 1,
                      transform: "translateY(-2px)",
                      color: "info.main",
                      fontWeight: "medium"
                    }
                  }}
                >
                  Contact Us
                </MDTypography>
              </Link>
            </MDBox>
          </MDBox>
        </MDBox>
      </Container>
    </MDBox>
  );
}

// Setting default props for the Footer
Footer.defaultProps = {
  light: false,
};

// Typechecking props for the Footer
Footer.propTypes = {
  light: PropTypes.bool,
};

export default Footer;
