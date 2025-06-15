/* eslint-disable react/prop-types */
/* eslint-disable react/function-component-definition */
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
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDProgress from "components/MDProgress";

// Images
import LogoAsana from "assets/images/small-logos/logo-asana.svg";
import logoGithub from "assets/images/small-logos/github.svg";
import logoAtlassian from "assets/images/small-logos/logo-atlassian.svg";
import logoSlack from "assets/images/small-logos/logo-slack.svg";
import logoSpotify from "assets/images/small-logos/logo-spotify.svg";
import logoInvesion from "assets/images/small-logos/logo-invision.svg";

// Utility function for amount formatting
const formatAmount = (amount) => {
  return `${amount.toLocaleString()}/=`;
};

export default function data(providedData = {}) {
  const SavingGoal = ({ image, description }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDAvatar src={image} description={description} size="sm" variant="rounded" />
      <MDTypography display="block" variant="button" fontWeight="medium" ml={1} lineHeight={1}>
        {description}
      </MDTypography>
    </MDBox>
  );

  const Progress = ({ color, value }) => (
    <MDBox display="flex" alignItems="center">
      <MDTypography variant="caption" color="text" fontWeight="medium">
        {value}%
      </MDTypography>
      <MDBox ml={0.5} width="9rem">
        <MDProgress variant="gradient" color={color} value={value} />
      </MDBox>
    </MDBox>
  );

  // Default data if no data is provided
  const defaultGoals = [
    {
      id: "1",
      name: "New car",
      image: LogoAsana,
      budget: 2500,
      raised: 500,
      status: "open",
      completion: 60,
      deadline: new Date("2025-12-31"),
    },
    {
      id: "2",
      name: "Don's Graduation",
      image: logoGithub,
      budget: 5000,
      raised: 5000,
      status: "closed",
      completion: 100,
      deadline: new Date("2025-02-11"),
    },
    {
      id: "3",
      name: "Angie's Wedding",
      image: logoAtlassian,
      budget: 3400,
      raised: 2000,
      status: "open",
      completion: 30,
      deadline: new Date("2024-11-01"),
    },
    {
      id: "4",
      name: "Family Vacation",
      image: logoSpotify,
      budget: 14000,
      raised: 5000,
      status: "open",
      completion: 80,
      deadline: new Date("2025-06-14"),
    },
    {
      id: "5",
      name: "New House",
      image: logoSlack,
      budget: 1000,
      raised: 200,
      status: "open",
      completion: 0,
      deadline: new Date("2025-07-12"),
    },
    {
      id: "6",
      name: "Investment",
      image: logoInvesion,
      budget: 2300,
      raised: 1000,
      status: "closed",
      completion: 100,
      deadline: new Date("2025-05-18"),
    },
  ];

  const goals = providedData.goals || defaultGoals;

  return {
    columns: [
      { Header: "goal", accessor: "savingGoal", width: "45%", align: "left" },
      { Header: "budget", accessor: "budget", align: "left" },
      { Header: "raised", accessor: "raised", align: "left" },
      { Header: "deadline", accessor: "deadline", align: "left" },
      { Header: "completion", accessor: "completion", align: "left" },
      { Header: "status", accessor: "status", align: "center" },
    ],

    rows: goals.map((goal) => ({
      savingGoal: <SavingGoal image={goal.image} description={goal.name} />,
      budget: (
        <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
          {formatAmount(goal.budget)}
        </MDTypography>
      ),
      status: (
        <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
          {goal.status}
        </MDTypography>
      ),
      deadline: (
        <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
          {goal.deadline.toLocaleDateString()}
        </MDTypography>
      ),
      completion: <Progress color={goal.completion === 100 ? "success" : goal.completion > 50 ? "info" : "error"} value={goal.completion} />,
      raised: (
        <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
          {formatAmount(goal.raised)}
        </MDTypography>
      ),
    })),
  };
}
