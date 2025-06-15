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

// prop-types is library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

// Utility function for text truncation
const truncateText = (text, maxLength = 5) => {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

// Utility function for amount formatting
const formatAmount = (amount) => {
  return `${amount.toLocaleString()}/=`;
};

function LeaderboardCard({ title, shadow, data = {} }) {
  const navigate = useNavigate();
  const { topContributors = [], consistentContributors = [], activeMembers = [] } = data;

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <Card sx={{ height: "100%", boxShadow: !shadow && "none" }}>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" pt={2} px={2}>
        <MDTypography variant="h6" fontWeight="medium" textTransform="capitalize">
          {title}
        </MDTypography>
      </MDBox>
      <MDBox opacity={0.9}>
        <Divider />
      </MDBox>
      <MDBox px={2}>  
        {/* Top Contributors Section */}
        <MDBox mt={0.5}>
          <MDTypography variant="button" fontWeight="bold" mb={1}>
            Top Contributors ({topContributors.length || 5})
          </MDTypography>
          <Box sx={{ 
            display: 'flex', 
            overflowX: 'auto',
            gap: 1.5,
            pb: 1,
            '&::-webkit-scrollbar': {
              height: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
          }}>
            {(topContributors.length ? topContributors : [1, 2, 3, 4, 5]).map((contributor, index) => (
              <MDBox 
                key={contributor.id || index} 
                display="flex" 
                flexDirection="column" 
                alignItems="left"
                sx={{ cursor: 'pointer' }}
                onClick={() => handleProfileClick(contributor.id)}
              >
                <MDAvatar
                  src={contributor.avatar || `https://i.pravatar.cc/150?img=${index + 10}`}
                  alt={contributor.name || `Top Contributor ${index + 1}`}
                  size="sm"
                  shadow="sm"
                />
                <MDTypography variant="caption" mt={0.5}>
                  {formatAmount(contributor.amount || (10000 - index * 1000))}
                </MDTypography>
              </MDBox>
            ))}
          </Box>
        </MDBox>

        {/* Consistent Contributors Section */}
        <MDBox mt={1}>
          <MDTypography variant="button" fontWeight="bold" mb={1}>
            Regular Contributors ({consistentContributors.length || 10})
          </MDTypography>
          <Box sx={{ 
            display: 'flex', 
            overflowX: 'auto',
            gap: 1.5,
            pb: 1,
            '&::-webkit-scrollbar': {
              height: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
          }}>
            {(consistentContributors.length ? consistentContributors : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((contributor, index) => (
              <MDBox 
                key={contributor.id || index} 
                display="flex" 
                flexDirection="column" 
                alignItems="left"
                sx={{ cursor: 'pointer' }}
                onClick={() => handleProfileClick(contributor.id)}
              >
                <MDAvatar
                  src={contributor.avatar || `https://i.pravatar.cc/150?img=${index + 15}`}
                  alt={contributor.name || `Consistent Contributor ${index + 1}`}
                  size="sm"
                  shadow="sm"
                />
                <MDTypography variant="caption" mt={0.5}>
                  {truncateText(contributor.name || `Contributor ${index + 1}`)}
                </MDTypography>
              </MDBox>
            ))}
          </Box>
        </MDBox>

        {/* Most Active Members Section */}
        <MDBox mt={1}>
          <MDTypography variant="button" fontWeight="bold" mb={1}>
            Most Active Members ({activeMembers.length || 17})
          </MDTypography>
          <Box sx={{ 
            display: 'flex', 
            overflowX: 'auto',
            gap: 1.5,
            pb: 1,
            '&::-webkit-scrollbar': {
              height: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
          }}>
            {(activeMembers.length ? activeMembers.slice(0, 10) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((member, index) => (
              <MDBox 
                key={member.id || index} 
                display="flex" 
                flexDirection="column" 
                alignItems="left"
                sx={{ cursor: 'pointer' }}
                onClick={() => handleProfileClick(member.id)}
              >
                <MDAvatar
                  src={member.avatar || `https://i.pravatar.cc/150?img=${index + 25}`}
                  alt={member.name || `Active Member ${index + 1}`}
                  size="sm"
                  shadow="sm"
                />
                <MDTypography variant="caption" mt={0.5}>
                  {truncateText(member.name || `Member ${index + 1}`)}
                </MDTypography>
              </MDBox>
            ))}
          </Box>
        </MDBox>
      </MDBox>
    </Card>
  );
}

// Setting default props for the LeaderboardCard
LeaderboardCard.defaultProps = {
  shadow: true,
  data: {},
};

// Typechecking props for the LeaderboardCard
LeaderboardCard.propTypes = {
  title: PropTypes.string.isRequired,
  shadow: PropTypes.bool,
  data: PropTypes.shape({
    topContributors: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        avatar: PropTypes.string,
        amount: PropTypes.number,
      })
    ),
    consistentContributors: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        avatar: PropTypes.string,
      })
    ),
    activeMembers: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        avatar: PropTypes.string,
      })
    ),
  }),
};

export default LeaderboardCard;
