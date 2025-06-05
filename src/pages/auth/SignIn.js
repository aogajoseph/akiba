import React from 'react';
import { Link } from 'react-router-dom';
import { Grid, Card } from '@mui/material';
import MDBox from 'components/MDBox';
import MDTypography from 'components/MDTypography';
import LoginForm from 'components/auth/LoginForm';

function SignIn() {
  return (
    <MDBox
      width="100vw"
      height="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Grid container justifyContent="center">
        <Grid item xs={11} sm={9} md={5} lg={4} xl={3}>
          <Card>
            <LoginForm />
            <MDBox mt={3} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Don't have an account?{" "}
                <MDTypography
                  component={Link}
                  to="/auth/sign-up"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  textGradient
                >
                  Sign up
                </MDTypography>
              </MDTypography>
            </MDBox>
          </Card>
        </Grid>
      </Grid>
    </MDBox>
  );
}

export default SignIn; 