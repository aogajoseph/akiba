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

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Divider from "@mui/material/Divider";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function SummaryCard() {
  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={2} px={2} display="flex" justifyContent="space-between" alignItems="center">
        <MDTypography variant="h6" fontWeight="medium">
          Account Summary
        </MDTypography>
        <MDBox color="text" px={2}>
          <Icon sx={{ 
            cursor: "pointer", 
            fontWeight: "bold", 
            color: (theme) => theme.palette.mode === "dark" ? "white" : "inherit" 
          }} fontSize="small">
            refresh
          </Icon>
        </MDBox>
      </MDBox>
      <MDBox p={2}>
        <Grid container spacing={2}>
          {/* Current Balance */}
          <Grid item xs={12}>
            <MDBox
              p={2}
              bgColor="info"
              variant="gradient"
              borderRadius="lg"
              coloredShadow="info"
              sx={{ textAlign: "center" }}
            >
              <MDTypography variant="h6" color="white" fontWeight="medium">
                Current Balance
              </MDTypography>
              <MDTypography variant="h3" color="white" fontWeight="bold" gutterBottom>
                KES 25,500.00
              </MDTypography>
              <MDTypography variant="caption" color="white" fontWeight="regular">
                As of January 28, 2025
              </MDTypography>
            </MDBox>
          </Grid>

          {/* Monthly Summary */}
          <Grid item xs={12}>
            <MDBox
              p={2}
              bgColor="white"
              borderRadius="lg"
              shadow="sm"
              sx={{ border: "1px solid #eee" }}
            >
              <MDTypography variant="h6" fontWeight="medium" mb={2} color="text.primary">
                January 2025 Summary
              </MDTypography>
              
              <MDBox display="flex" justifyContent="space-between" mb={1}>
                <MDTypography variant="button" color="text.primary" fontWeight="regular">
                  Opening Balance:
                </MDTypography>
                <MDTypography variant="button" color="text.primary" fontWeight="medium">
                  KES 10,000.00
                </MDTypography>
              </MDBox>
              
              <MDBox display="flex" justifyContent="space-between" mb={1}>
                <MDTypography variant="button" color="text.primary" fontWeight="regular">
                  Total Deposits:
                </MDTypography>
                <MDTypography variant="button" fontWeight="medium" color="success">
                  + KES 49,200.00
                </MDTypography>
              </MDBox>
              
              <MDBox display="flex" justifyContent="space-between" mb={1}>
                <MDTypography variant="button" color="text.primary" fontWeight="regular">
                  Total Withdrawals:
                </MDTypography>
                <MDTypography variant="button" fontWeight="medium" color="error">
                  - KES 33,700.00
                </MDTypography>
              </MDBox>
              
              <Divider />
              
              <MDBox display="flex" justifyContent="space-between" mt={1}>
                <MDTypography variant="button" fontWeight="medium" color="text.primary">
                  Closing Balance:
                </MDTypography>
                <MDTypography variant="button" fontWeight="bold" color="text.primary">
                  KES 25,500.00
                </MDTypography>
              </MDBox>
            </MDBox>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={6}>
            <MDBox
              p={2}
              bgColor="success"
              variant="gradient"
              borderRadius="lg"
              coloredShadow="success"
              sx={{ height: "100%" }}
            >
              <MDBox display="flex" alignItems="center">
                <MDBox mr={2}>
                  <Icon sx={{ color: "#fff", fontSize: 30 }}>trending_up</Icon>
                </MDBox>
                <MDBox>
                  <MDTypography variant="h6" color="white" fontWeight="medium">
                    Raised
                  </MDTypography>
                  <MDTypography variant="h4" color="white" fontWeight="bold">
                    +49.2K
                  </MDTypography>
                </MDBox>
              </MDBox>
            </MDBox>
          </Grid>

          <Grid item xs={12} md={6}>
            <MDBox
              p={2}
              bgColor="error"
              variant="gradient"
              borderRadius="lg"
              coloredShadow="error"
              sx={{ height: "100%" }}
            >
              <MDBox display="flex" alignItems="center">
                <MDBox mr={2}>
                  <Icon sx={{ color: "#fff", fontSize: 30 }}>trending_down</Icon>
                </MDBox>
                <MDBox>
                  <MDTypography variant="h6" color="white" fontWeight="medium">
                    Spent
                  </MDTypography>
                  <MDTypography variant="h4" color="white" fontWeight="bold">
                    -33.7K
                  </MDTypography>
                </MDBox>
              </MDBox>
            </MDBox>
          </Grid>

          {/* Savings Goals Progress */}
          <Grid item xs={12}>
            <MDBox
              p={2}
              bgColor="white"
              borderRadius="lg"
              shadow="sm"
              sx={{ border: "1px solid #eee" }}
            >
              <MDTypography variant="button" color="text.primary" fontWeight="medium">
                Savings Goals Progress
              </MDTypography>
              
              <MDBox display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                <MDTypography variant="caption" color="text.primary">
                  Emergency Fund
                </MDTypography>
                <MDTypography variant="caption" color="text.primary">
                  100%
                </MDTypography>
              </MDBox>
              <MDBox
                sx={{
                  height: "6px",
                  width: "100%",
                  borderRadius: "3px",
                  bgcolor: "#f0f2f5",
                  mt: 0.5,
                  position: "relative",
                }}
              >
                <MDBox
                  sx={{
                    height: "6px",
                    borderRadius: "3px",
                    width: "100%",
                    position: "absolute",
                    bgcolor: "success.main",
                  }}
                />
              </MDBox>
              
              <MDBox display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                <MDTypography variant="caption" color="text.primary">
                  Home Purchase
                </MDTypography>
                <MDTypography variant="caption" color="text.primary">
                  45%
                </MDTypography>
              </MDBox>
              <MDBox
                sx={{
                  height: "6px",
                  width: "100%",
                  borderRadius: "3px",
                  bgcolor: "#f0f2f5",
                  mt: 0.5,
                  position: "relative",
                }}
              >
                <MDBox
                  sx={{
                    height: "6px",
                    borderRadius: "3px",
                    width: "45%",
                    position: "absolute",
                    bgcolor: "info.main",
                  }}
                />
              </MDBox>
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
    </Card>
  );
}

export default SummaryCard; 