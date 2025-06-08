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
import Grid from "@mui/material/Grid";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
// import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import DefaultNavbar from "examples/Navbars/DefaultNavbar";
import PageLayout from "examples/LayoutContainers/PageLayout";

// Authentication layout components
import Footer from "layouts/authentication/components/Footer";

function CoverLayout({ coverHeight, image, children }) {
  return (
    <PageLayout>
      <MDBox
        position="relative"
        width="100%"
        minHeight="100vh"
        display="flex"
        flexDirection="column"
      >
        <MDBox flex={1}>
          <DefaultNavbar
            action={{
              type: "external",
              route: "https://creative-tim.com/product/material-dashboard-react",
              label: "free download",
            }}
            transparent
            light
          />
          <MDBox
            width="calc(100% - 2rem)"
            minHeight={coverHeight}
            borderRadius="xl"
            mx={2}
            my={2}
            pt={6}
            pb={28}
            sx={{
              backgroundImage: ({ functions: { linearGradient, rgba }, palette: { gradients } }) =>
                image &&
                `${linearGradient(
                  rgba(gradients.dark.main, 0.4),
                  rgba(gradients.dark.state, 0.4)
                )}, url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <MDBox mt={{ xs: -20, lg: -18 }} px={1} width="calc(100% - 2rem)" mx="auto">
            <Grid container spacing={1} justifyContent="center">
              <Grid item xs={11} sm={9} md={5} lg={4} xl={3}>
                <MDBox sx={{
                  '& .MuiCard-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(10px)',
                  },
                  '& .MuiInputBase-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.5) !important',
                  },
                  '& .MuiSelect-select': {
                    backgroundColor: 'rgba(255, 255, 255, 0.5) !important',
                  },
                  '& .MuiStepLabel-label': {
                    color: 'rgba(0, 0, 0, 0.87)',
                  },
                  '& .MuiStepIcon-root': {
                    backgroundColor: 'transparent',
                  },
                  '& .gradient-background': {
                    opacity: '0.9 !important',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(0, 0, 0, 0.8) !important',
                    opacity: 1,
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(0, 0, 0, 0.8)',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'rgba(0, 0, 0, 0.87)',
                  }
                }}>
                  {children}
                </MDBox>
              </Grid>
            </Grid>
          </MDBox>
        </MDBox>
        <Footer light={false} />
      </MDBox>
    </PageLayout>
  );
}

// Setting default props for the CoverLayout
CoverLayout.defaultProps = {
  coverHeight: "35vh",
};

// Typechecking props for the CoverLayout
CoverLayout.propTypes = {
  coverHeight: PropTypes.string,
  image: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default CoverLayout;
