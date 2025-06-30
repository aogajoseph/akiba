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

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import AccountInfoCard from "layouts/account/components/AccountInfoCard";
import MembershipInfoCard from "layouts/account/components/MembershipInfoCard";
import LeaderboardCard from "layouts/account/components/LeaderboardCard";
import SavingGoals from "layouts/account/components/SavingGoals"

// Overview page components
import Header from "layouts/account/components/Header";

function Account() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mb={2} />
      <Header>
        <MDBox mt={5} mb={3}>
          <MDBox
            display={{ xs: "block", xl: "flex" }}
            flexDirection="row"
            alignItems="stretch"
            width="100%"
          >
            <MDBox flex={1} minWidth={0} display="flex">
              <AccountInfoCard
                title="Account Info"
                description={"This account was created to manage shared goals for Joseph's Family in a transparent and organized space."}
                info={{
                  "Account Name": "Joseph's Family",
                  "Account ID": "AKB-JFY-001",
                  "Account Type": "Family",
                  "Created By": "Joseph Onyango",
                  "Creation Date": "June 13, 2025",
                  "Link": "https://akiba/jfy001/invite",
                }}
                shadow={false}
              />
            </MDBox>

            <MDBox flex={1} minWidth={0} display="flex">
              <MembershipInfoCard
                title="Membership"
                shadow={false}
              />
            </MDBox>
            
            <MDBox flex={1} minWidth={0} display="flex">
              <LeaderboardCard
                title="Leaderboard"
                shadow={false}
              />
            </MDBox>
          </MDBox>
          <SavingGoals />
        </MDBox>
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Account;
