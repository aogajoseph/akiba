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
import Divider from "@mui/material/Divider";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ProfileInfoCard from "examples/Cards/InfoCards/ProfileInfoCard";
import ConnectedAccounts from "examples/Lists/ProfilesList";
import DefaultProjectCard from "examples/Cards/ProjectCards/DefaultProjectCard";

// Overview page components
import Header from "layouts/profile/components/Header";
import ProfileSettings from "layouts/profile/components/ProfileSettings";

// Data
import profilesListData from "layouts/profile/data/profilesListData";

function Profile() {
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
              <ProfileInfoCard
                title="Bio"
                description={"Hi there, I'm Joseph! I'm here to save, connect and achieve shared goals with the Akiba family."}
                info={{
                  fullName: "Joseph Aoga",
                  mobile: "(254) 722 2222 22",
                  email: "josephaoga@gmail.com",
                  location: "Kenya",
                }}
                social={[
                  {
                    link: "https://www.facebook.com/CreativeTim/",
                    icon: <FacebookIcon />,
                    color: "facebook",
                  },
                  {
                    link: "https://twitter.com/creativetim",
                    icon: <TwitterIcon />,
                    color: "twitter",
                  },
                  {
                    link: "https://www.instagram.com/creativetimofficial/",
                    icon: <InstagramIcon />,
                    color: "instagram",
                  },
                ]}
                action={{}}
                shadow={false}
              />
            </MDBox>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", xl: "block" }, mx: 0 }} />
            <MDBox flex={1} minWidth={0} display="flex">
              <ConnectedAccounts title="Connected Accounts" profiles={profilesListData} shadow={false} />
            </MDBox>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", xl: "block" }, mx: 0 }} />
            <MDBox flex={1} minWidth={0} display="flex">
              <ProfileSettings />
            </MDBox>
          </MDBox>
        </MDBox>
      </Header>
      <Footer />
    </DashboardLayout>
  );
}

export default Profile;
