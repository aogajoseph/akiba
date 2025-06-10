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
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import TimelineItem from "examples/Timeline/TimelineItem";

function RecentActivities() {
  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={3} px={3}>
        <MDTypography variant="h6" fontWeight="medium">
          Recent Activities
        </MDTypography>
        <MDBox mt={0} mb={2}>
          <MDTypography variant="button" color="info" fontWeight="regular" fontStyle="italic">
            <MDTypography variant="button" color="info" fontWeight="medium" fontStyle="italic">
              Kes 2,500 3:43PM
            </MDTypography>{" "}
            , John Doe
          </MDTypography>
        </MDBox>
      </MDBox>
      <MDBox p={2}>
        <TimelineItem
          color="success"
          icon="payment"
          title="Kes 2400, Benson Mutinda"
          dateTime="09 JUN 2:20 PM"
        />
        <TimelineItem
          color="error"
          icon="payment"
          title="Kes 1500, Ken Mwangi"
          dateTime="09 JUN 1:16 PM"
        />
        <TimelineItem
          color="info"
          icon="payment"
          title="Kes 1000, John Doe"
          dateTime="09 JUN 1:10 PM"
        />
        <TimelineItem
          color="warning"
          icon="payment"
          title="Kes 500, Jane Riziki"
          dateTime="09 JUN 10:05 AM"
        />
        <TimelineItem
          color="primary"
          icon="payment"
          title="Kes 200, Julius Baraza"
          dateTime="08 JUN 10:00 PM"
          lastItem
        />
      </MDBox>
    </Card>
  );
}

export default RecentActivities;
