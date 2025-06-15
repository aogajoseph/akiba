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

function MembershipInfoCard({ title, shadow, data = {} }) {
  const navigate = useNavigate();
  const { mainAdmin, subAdmins = [], members = [] } = data;

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
        {/* Main Admin Section */}
        <MDBox mt={0.5}>
          <MDTypography variant="button" fontWeight="bold" mb={1}>
            Main Admin
          </MDTypography>
          <MDBox 
            display="flex" 
            flexDirection="column" 
            alignItems="left"
            sx={{ cursor: 'pointer' }}
            onClick={() => handleProfileClick(mainAdmin?.id)}
          >
            <MDAvatar
              src={mainAdmin?.avatar || "https://i.pravatar.cc/150?img=1"}
              alt={mainAdmin?.name || "Main Admin"}
              size="sm"
              shadow="sm"
            />
            <MDTypography variant="caption" mt={0.5}>
              {truncateText(mainAdmin?.name || "Joseph")}
            </MDTypography>
          </MDBox>
        </MDBox>

        {/* Sub Admins Section */}
        <MDBox mt={1}>
          <MDTypography variant="button" fontWeight="bold" mb={1}>
            Sub Admins ({subAdmins.length || 3})
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
            {(subAdmins.length ? subAdmins : [1, 2, 3]).map((admin, index) => (
              <MDBox 
                key={admin.id || index} 
                display="flex" 
                flexDirection="column" 
                alignItems="left"
                sx={{ cursor: 'pointer' }}
                onClick={() => handleProfileClick(admin.id)}
              >
                <MDAvatar
                  src={admin.avatar || `https://i.pravatar.cc/150?img=${index + 2}`}
                  alt={admin.name || `Sub Admin ${index + 1}`}
                  size="sm"
                  shadow="sm"
                />
                <MDTypography variant="caption" mt={0.5}>
                  {truncateText(admin.name || `Admin ${index + 1}`)}
                </MDTypography>
              </MDBox>
            ))}
          </Box>
        </MDBox>

        {/* Members Section */}
        <MDBox mt={1}>
          <MDTypography variant="button" fontWeight="bold" mb={1}>
            Members ({members.length || 100})
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
            {(members.length ? members.slice(0, 10) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((member, index) => (
              <MDBox 
                key={member.id || index} 
                display="flex" 
                flexDirection="column" 
                alignItems="left"
                sx={{ cursor: 'pointer' }}
                onClick={() => handleProfileClick(member.id)}
              >
                <MDAvatar
                  src={member.avatar || `https://i.pravatar.cc/150?img=${index + 5}`}
                  alt={member.name || `Member ${index + 1}`}
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

// Setting default props for the MembershipInfoCard
MembershipInfoCard.defaultProps = {
  shadow: true,
  data: {},
};

// Typechecking props for the MembershipInfoCard
MembershipInfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  shadow: PropTypes.bool,
  data: PropTypes.shape({
    mainAdmin: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      avatar: PropTypes.string,
    }),
    subAdmins: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        avatar: PropTypes.string,
      })
    ),
    members: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        avatar: PropTypes.string,
      })
    ),
  }),
};

export default MembershipInfoCard;
