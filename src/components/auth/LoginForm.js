import React from "react";
import { Card, TextField, Button } from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function LoginForm() {
  return (
    <Card>
      <MDBox
        variant="gradient"
        bgColor="info"
        borderRadius="lg"
        coloredShadow="info"
        mx={2}
        mt={-3}
        p={2}
        mb={1}
        textAlign="center"
      >
        <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
          Sign in
        </MDTypography>
      </MDBox>
      <MDBox pt={4} pb={3} px={3}>
        <MDBox component="form" role="form">
          <MDBox mb={2}>
            <TextField type="email" label="Email" fullWidth />
          </MDBox>
          <MDBox mb={2}>
            <TextField type="password" label="Password" fullWidth />
          </MDBox>
          <MDBox mt={4} mb={1}>
            <Button variant="gradient" color="info" fullWidth>
              sign in
            </Button>
          </MDBox>
        </MDBox>
      </MDBox>
    </Card>
  );
}

export default LoginForm;
