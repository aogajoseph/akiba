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

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Akiba React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Transactions from "layouts/statements/data/transactions";

// Data
import fullStatementsData from "layouts/statements/data/fullStatementsData";
import summaryStatementsData from "layouts/statements/data/summaryStatementsData";

function Tables() {
  const { columns, rows } = fullStatementsData();
  const { columns: pColumns, rows: pRows } = summaryStatementsData();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
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
              >
                <MDTypography variant="h6" color="white">
                  Summary Statement
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <Transactions
                  table={{ columns: pColumns, rows: pRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
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
              >
                <MDTypography variant="h6" color="white">
                  Full Statement
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <Transactions
                  table={{ columns, rows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Tables;
