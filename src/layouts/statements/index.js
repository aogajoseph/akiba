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
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ShareIcon from "@mui/icons-material/Share";
import PrintIcon from "@mui/icons-material/Print";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Akiba React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Transactions from "layouts/statements/data/transactions";
import Footer from "examples/Footer";

// Custom components
import SummaryCard from "layouts/statements/components/SummaryCard";
import ActivityLog from "layouts/statements/components/ActivityLog";

// Data
import detailedTransactionsData from "layouts/statements/data/detailedTransactionsData";

function Statements() {
  const { columns, rows } = detailedTransactionsData();

  const handleDownload = () => {
    console.log("Download statement");
  };

  const handleShare = () => {
    console.log("Share statement");
  };

  const handlePrint = () => {
    console.log("Print statement");
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Full Statement Section */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDBox>
                  <MDTypography variant="h6" color="white">
                    Full Statement - January 2025
                  </MDTypography>
                  <MDTypography variant="caption" color="white" fontWeight="light">
                    Detailed transaction history for the period
                  </MDTypography>
                </MDBox>
                <MDBox display="flex">
                  <Tooltip title="Download Statement">
                    <IconButton onClick={handleDownload} sx={{ color: "#fff" }}>
                      <FileDownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share Statement">
                    <IconButton onClick={handleShare} sx={{ color: "#fff" }}>
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Statement">
                    <IconButton onClick={handlePrint} sx={{ color: "#fff" }}>
                      <PrintIcon />
                    </IconButton>
                  </Tooltip>
                </MDBox>
              </MDBox>
              <MDBox pt={3}>
                <Transactions
                  table={{ columns, rows }}
                  isSorted={true}
                  entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
                  showTotalEntries={true}
                  noEndBorder
                  pagination={{ variant: "gradient", color: "info" }}
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>

        {/* Summary Statement and Activity Log Section */}
        <Grid container spacing={3} mt={1}>
          {/* Summary Statement Card */}
          <Grid item xs={12} md={6}>
            <SummaryCard />
          </Grid>

          {/* Activity Log */}
          <Grid item xs={12} md={6}>
            <ActivityLog />
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Statements;
