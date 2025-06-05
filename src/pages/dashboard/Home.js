import React from 'react';
import { Grid } from '@mui/material';
import MDBox from 'components/MDBox';
import DashboardLayout from 'layouts/dashboard';
import GroupCard from 'components/group/GroupCard';
import TransactionCard from 'components/financial/TransactionCard';

function Home() {
  return (
    <DashboardLayout>
      <MDBox py={3}>
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid item xs={12} md={6} lg={3}>
            <MDBox mb={1.5}>
              <GroupCard
                name="Family Savings"
                members={25}
                balance={50000}
                accountNumber="AK-001-2024"
              />
            </MDBox>
          </Grid>

          {/* Recent Transactions */}
          <Grid item xs={12}>
            <MDBox mb={1.5}>
              <TransactionCard
                type="deposit"
                amount={1000}
                sender="John Doe"
                timestamp={new Date().toISOString()}
                status="completed"
              />
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default Home; 