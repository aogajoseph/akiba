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

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Switch from "@mui/material/Switch";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function PlatformSettings() {
  const [phoneNumber, hidePhoneNumber] = useState(true);
  const [emailAddress, hideEmailAddress] = useState(false);
  const [location, hideLocation] = useState(true);
  const [socialLinks, hideSocialLinks] = useState(false);

  return (
    <Card sx={{ boxShadow: "none" }}>
      <MDBox p={2}>
        <MDTypography variant="h6" fontWeight="medium" textTransform="capitalize">
          qiuck settings
        </MDTypography>
      </MDBox>
      <MDBox pt={1} pb={2} px={2} lineHeight={1.25}>
        <MDTypography variant="caption" fontWeight="bold" color="text" textTransform="uppercase">
          privacy
        </MDTypography>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch checked={phoneNumber} onChange={() => hidePhoneNumber(!phoneNumber)} />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Hide Phone Number
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch checked={emailAddress} onChange={() => hideEmailAddress(!emailAddress)} />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Hide Email Address
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch checked={location} onChange={() => hideLocation(!location)} />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Hide Location
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox mt={0.5}>
            <Switch checked={socialLinks} onChange={() => hideSocialLinks(!socialLinks)} />
          </MDBox>
          <MDBox width="80%" ml={0.5}>
            <MDTypography variant="button" fontWeight="regular" color="text">
              Hide Social Links
            </MDTypography>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default PlatformSettings;
