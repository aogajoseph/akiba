/* eslint-disable react/prop-types */
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
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";

// Images
import team2 from "assets/images/team-2.jpg";
import team3 from "assets/images/team-3.jpg";
import team4 from "assets/images/team-4.jpg";

export default function data() {
  const Member = ({ image, name, role }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDAvatar src={image} name={name} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
        <MDTypography variant="caption">{role}</MDTypography>
      </MDBox>
    </MDBox>
  );

  const Contacts = ({ phoneNumber, email }) => (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography display="block" variant="caption" color="text" fontWeight="medium">
        {phoneNumber}
      </MDTypography>
      <MDTypography variant="caption">{email}</MDTypography>
    </MDBox>
  );

  return {
    columns: [
      { Header: "member", accessor: "member", width: "45%", align: "left" },
      { Header: "contacts", accessor: "contacts", align: "left" },
      { Header: "status", accessor: "status", align: "center" },
      { Header: "date joined", accessor: "dateJoined", align: "center" },
      { Header: "connect", accessor: "action", align: "center" },
    ],

    rows: [
      {
        member: <Member image={team2} name="John Michael" role="Main Admin" />,
        contacts: <Contacts phoneNumber="+254 721 465 221" email="johnmichael@gmail.com" />,
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        dateJoined: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Apr 23, 2018
          </MDTypography>
        ),
        action: (
          <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
            Chat
          </MDTypography>
        ),
      },
      {
        member: <Member image={team3} name="Alexa Liras" role="Member" />,
        contacts: <Contacts phoneNumber="+263 726 857 5124" email="alexaliras@gmail.com" />,
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="offline" color="dark" variant="gradient" size="sm" />
          </MDBox>
        ),
        dateJoined: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Jan 11, 2019
          </MDTypography>
        ),
        action: (
          <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
            Chat
          </MDTypography>
        ),
      },
      {
        member: <Member image={team4} name="Laurent Perrier" role="Member" />,
        contacts: <Contacts phoneNumber="+1 258 456 8745" email="laurentperrier@gmail.com" />,
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        dateJoined: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
           Sep 19, 2019
          </MDTypography>
        ),
        action: (
          <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
            Chat
          </MDTypography>
        ),
      },
      {
        member: <Member image={team3} name="Michael Levi" role="Sub-Admin" />,
        contacts: <Contacts phoneNumber="+254 711 248 476" email="michaellevi@gmail.com" />,
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        dateJoined: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Dec 24, 2008
          </MDTypography>
        ),
        action: (
          <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
            Chat
          </MDTypography>
        ),
      },
      {
        member: <Member image={team3} name="Richard Gran" role="Member" />,
        contacts: <Contacts phoneNumber="+254 112 875 631" email="richardgran@gmail.com" />,
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="offline" color="dark" variant="gradient" size="sm" />
          </MDBox>
        ),
        dateJoined: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Apr 10, 2010
          </MDTypography>
        ),
        action: (
          <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
            Chat
          </MDTypography>
        ),
      },
      {
        member: <Member image={team4} name="Miriam Eric" role="Sub-Admin" />,
        contacts: <Contacts phoneNumber="+254 715 417 485" email="miriameric@gmail.com" />,
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="offline" color="dark" variant="gradient" size="sm" />
          </MDBox>
        ),
        dateJoined: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Sep 14, 2020
          </MDTypography>
        ),
        action: (
          <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
            Chat
          </MDTypography>
        ),
      },
    ],
  };
}
