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

import { useState } from "react";

// react-routers components
import { Link } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";

// Akiba React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

function PlatformSettings() {
  const [showProfile, setShowProfile] = useState(true);
  const [displayTransactions, setDisplayTransactions] = useState(false);
  const [activate2FA, setActivate2FA] = useState(true);
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [smsAndEmailAlerts, setSmsAndEmailAlerts] = useState(false);

  return (
    <Card sx={{ boxShadow: "none" }}>
      <MDBox p={2}>
        <MDTypography variant="h6" marginLeft="-8px" fontWeight="medium" textTransform="capitalize">
          admin settings
        </MDTypography>
      </MDBox>
      <MDBox pt={1} pb={2} px={2} lineHeight={1.25}>
        <MDTypography
          variant="caption"
          marginLeft="-9px"
          fontWeight="bold"
          color="text"
          textTransform="uppercase"
        >
          account users
        </MDTypography>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-4}>
          <MDBox mt={0.5}>
            <MDButton
              component={Link}
              variant="text"
              color="info"
              sx={{ textTransform: "capitalize" }}
            >
              add new admins
            </MDButton>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-4}>
          <MDBox mt={0.5}>
            <MDButton
              component={Link}
              variant="text"
              color="info"
              sx={{ textTransform: "capitalize" }}
            >
              add new members
            </MDButton>
          </MDBox>
        </MDBox>
        <MDTypography
          variant="caption"
          marginLeft="-9px"
          fontWeight="bold"
          color="text"
          textTransform="uppercase"
        >
          danger zone
        </MDTypography>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-4}>
          <MDBox mt={0.5}>
            <MDButton
              component={Link}
              variant="text"
              color="error"
              sx={{ textTransform: "capitalize" }}
            >
              delete members
            </MDButton>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-4}>
          <MDBox mt={0.5}>
            <MDButton
              component={Link}
              variant="text"
              color="error"
              sx={{ textTransform: "capitalize" }}
            >
              delete admins
            </MDButton>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-4}>
          <MDBox mt={0.5}>
            <MDButton
              component={Link}
              variant="text"
              color="error"
              sx={{ textTransform: "capitalize" }}
            >
              transfer admin rights
            </MDButton>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mb={0.5} ml={-1.5}>
          <MDBox width="40%" ml={0.5}>
            <MDTypography variant="caption" fontWeight="regular" color="text">
              Pending Invitations:
            </MDTypography>
          </MDBox>
          <MDBox mt={0}>
            <MDTypography variant="caption" fontWeight="regular" fontStyle="italic" color="text">
              No pending invites
            </MDTypography>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default PlatformSettings;
