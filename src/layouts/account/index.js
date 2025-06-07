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
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Akiba React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import AccountInfoCard from "layouts/account/components/InfoCard";
import DataTable from "examples/Tables/DataTable";
import ConnectedAccounts from "layouts/account/components/ConnectedAccounts";
import SavingGoalsCard from "layouts/account/components/SavingGoalsCard";
import Footer from "examples/Footer";

// Profile page components
import Header from "layouts/account/components/Header";
import PlatformSettings from "layouts/account/components/Settings";

// Data
import ConnectedAccountsData from "layouts/account/data";
import projectsTableData from "layouts/tables/data/projectsTableData";

function Profile() {
  const { columns: pColumns, rows: pRows } = projectsTableData();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />
      <Header>
        <MDBox mt={3.5} mb={3}>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6} xl={4} sx={{ display: "flex" }}>
              <Divider orientation="vertical" sx={{ ml: -2, mr: 1 }} />
              <AccountInfoCard
                title="about"
                description="This account belongs to Jose's family. We save together as a family to acheive shared financial goals."
                info={{
                  accountName: "Jose's Family",
                  accountNumber: "0100 000 000",
                  activeMembers: 4,
                  firstAdmin: "Jose",
                  secondAdmin: "Martha",
                  thirdAdmin: "Don",
                  dateCreated: "Dec 23, 2024",
                }}
                action={{ route: "", tooltip: "Edit About" }}
                shadow={false}
              />
              <Divider orientation="vertical" sx={{ mx: 0 }} />
            </Grid>
            <Grid item xs={12} md={6} xl={4}>
              <PlatformSettings />
            </Grid>
            <Grid item xs={12} xl={4}>
              <ConnectedAccounts
                title="Connected Accounts"
                account={ConnectedAccountsData}
                shadow={false}
              />
            </Grid>
          </Grid>
        </MDBox>
        <MDBox p={2}>
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
                  Projects Table
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns: pColumns, rows: pRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
        </MDBox>
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Profile;
