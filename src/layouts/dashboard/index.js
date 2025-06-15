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

// @mui material components
import Grid from "@mui/material/Grid";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import ReportsLineChart from "examples/Charts/LineCharts/ReportsLineChart";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

// @mui icons
import SavingsIcon from "@mui/icons-material/AccountBalanceWallet";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WalletIcon from "@mui/icons-material/Wallet";
// Data
import reportsBarChartData from "layouts/dashboard/data/reportsBarChartData";
import reportsLineChartData from "layouts/dashboard/data/reportsLineChartData";

// Dashboard components
import SavingGoals from "layouts/dashboard/components/Projects";
import RecentActivities from "layouts/dashboard/components/OrdersOverview";

// Material Dashboard 2 React context
import { useMaterialUIController } from "context";

function Dashboard() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const { sales, tasks } = reportsLineChartData;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="info"
                icon={<SavingsIcon />}
                title="Current Balance"
                count={
                  <MDBox display="flex" justifyContent="flex-end">
                    <MDBox mr={0.5} fontSize="1rem" mt={1} color={darkMode ? "white" : "dark"}>
                      Kes
                    </MDBox>
                    <MDBox fontSize="1rem" mt={1} color={darkMode ? "white" : "dark"}>
                      1,250,000
                    </MDBox>
                  </MDBox>
                }
                percentage={{
                  color: "success",
                  amount: "+12%",
                  label: "this quarter",
                }}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="success"
                icon={<WalletIcon />}
                title="Contributions"
                count={
                  <MDBox display="flex" justifyContent="flex-end">
                    <MDBox mr={0.5} fontSize="1rem" mt={1} color={darkMode ? "white" : "dark"}>
                      Kes
                    </MDBox>
                    <MDBox fontSize="1rem" mt={1} color={darkMode ? "white" : "dark"}>
                      2,500,000
                    </MDBox>
                  </MDBox>
                }
                percentage={{
                  color: "secondary",
                  label: "Since Jan 15, 2024",
                }}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="primary"
                icon={<GroupsIcon />}
                title="Members"
                count={
                  <MDBox display="flex" justifyContent="flex-end">
                    <MDBox fontSize="1rem" mt={1} color={darkMode ? "white" : "dark"}>
                      1232
                    </MDBox>
                  </MDBox>
                }
                percentage={{
                  color: "success",
                  amount: "+5",
                  label: "this week",
                }}
              />
            </MDBox>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <ComplexStatisticsCard
                color="warning"
                icon={<EmojiEventsIcon />}
                title="Goals"
                count={
                  <MDBox display="flex" justifyContent="flex-end">
                    <MDBox fontSize="1rem" mt={1} color={darkMode ? "white" : "dark"}>
                     27/60
                    </MDBox>
                  </MDBox>
                }
                percentage={{
                  color: "success",
                  amount: "+3",
                  label: "this month",
                }}
              />
            </MDBox>
          </Grid>
        </Grid>
        <MDBox mt={4.5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsBarChart
                  color="info"
                  title="Daily Contributions"
                  description={
                    <>
                      <strong>36</strong> Contributions today
                    </>
                  }
                  date="updates every 5 Mins"
                  chart={reportsBarChartData}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsLineChart
                  color="success"
                  title="Deposits"
                  description={
                    <>
                      <strong>Kes 15,000</strong> today
                    </>
                  }
                  date="updates every 1 Hour"
                  chart={sales}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <MDBox mb={3}>
                <ReportsLineChart
                  color="dark"
                  title="Withdrawals"
                  description={
                    <>
                      <strong>Kes 5,000</strong> today
                    </>
                  }
                  date="updates every 1 Hour"
                  chart={tasks}
                />
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
        <MDBox>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={8}>
              <SavingGoals />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <RecentActivities />
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboard;
