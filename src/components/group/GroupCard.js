import React from 'react';
import PropTypes from 'prop-types';
import { Card, IconButton, Menu, MenuItem } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';

function GroupCard({ name, members, balance, accountNumber }) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card>
      <MDBox p={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center">
          <MDTypography variant="h6" fontWeight="medium">
            {name}
          </MDTypography>
          <IconButton onClick={handleClick}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleClose}>View Details</MenuItem>
            <MenuItem onClick={handleClose}>Edit Group</MenuItem>
            <MenuItem onClick={handleClose}>Invite Members</MenuItem>
          </Menu>
        </MDBox>
        <MDBox mt={2}>
          <MDTypography variant="body2" color="text">
            Members: {members}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Balance: KES {balance}
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Account: {accountNumber}
          </MDTypography>
        </MDBox>
      </MDBox>
    </Card>
  );
}

GroupCard.propTypes = {
  name: PropTypes.string.isRequired,
  members: PropTypes.number.isRequired,
  balance: PropTypes.number.isRequired,
  accountNumber: PropTypes.string.isRequired,
};

export default GroupCard; 