import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@mui/material';
import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';

function TransactionCard({ type, amount, sender, timestamp, status }) {
  const isDeposit = type === 'deposit';
  const statusColor = status === 'completed' ? 'success' : 
                     status === 'pending' ? 'warning' : 'error';

  return (
    <Card>
      <MDBox p={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center">
          <MDBox>
            <MDTypography variant="button" fontWeight="medium" color={isDeposit ? 'success' : 'error'}>
              {isDeposit ? '+' : '-'} Kes {amount}
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block">
              From: {sender}
            </MDTypography>
          </MDBox>
          <MDBox textAlign="right">
            <MDTypography variant="caption" color={statusColor}>
              {status}
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block">
              {new Date(timestamp).toLocaleString()}
            </MDTypography>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

TransactionCard.propTypes = {
  type: PropTypes.oneOf(['deposit', 'withdrawal']).isRequired,
  amount: PropTypes.number.isRequired,
  sender: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['completed', 'pending', 'failed']).isRequired,
};

export default TransactionCard; 