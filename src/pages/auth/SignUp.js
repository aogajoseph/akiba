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

// react-router-dom components
import { Link } from "react-router-dom";
import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Box from "@mui/material/Box";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgImage from "assets/images/banner.jpg";

const steps = ['Account Setup', 'Verification', 'Profile', 'Invitations'];

function SignUp() {
  const [activeStep, setActiveStep] = useState(0);
  const [accountType, setAccountType] = useState('family');

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const renderHelperIcon = (tooltip) => (
    <Tooltip title={tooltip} placement="top">
      <IconButton size="small" sx={{ ml: 1, p: 0 }}>
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  return (
    <CoverLayout image={bgImage}>
      <Box sx={{ 
        width: { md: '200%', lg: '250%' }, 
        maxWidth: '1000px',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        <Card sx={{ 
          width: '100%', 
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          '& .MuiInputBase-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiSelect-select': {
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiStepLabel-label': {
            color: 'rgba(0, 0, 0, 0.87)',
          },
          '& .MuiStepIcon-root': {
            backgroundColor: 'transparent',
          }
        }}>
          <MDBox
            variant="gradient"
            bgColor="info"
            borderRadius="lg"
            coloredShadow="success"
            mx={2}
            mt={-3}
            p={2.5}
            mb={1}
            textAlign="center"
            className="gradient-background"
            sx={{
              background: ({ functions: { linearGradient }, palette: { gradients } }) =>
                `${linearGradient(
                  gradients.info.main,
                  gradients.info.state
                )}`
            }}
          >
            <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
              Create Account
            </MDTypography>
            <MDTypography display="block" variant="button" color="white" my={1}>
              Step 1: Account Information
            </MDTypography>
          </MDBox>

          {/* Progress Stepper */}
          <MDBox px={4} pt={3} pb={1}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </MDBox>

          <MDBox pt={3} pb={3} px={5} flex={1}>
            <MDBox component="form" role="form" height="100%">
              {/* Account Information Section */}
              <MDBox mb={4}>
                <MDTypography variant="h6" fontWeight="medium" mb={3}>
                  Account Information
                </MDTypography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <MDBox display="flex" alignItems="center">
                      <MDInput
                        type="text"
                        label="Account Name"
                        variant="standard"
                        fullWidth
                      />
                      {renderHelperIcon("Choose a name that identifies your group")}
                    </MDBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="standard">
                      <InputLabel>Account Type</InputLabel>
                      <Select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        label="Account Type"
                      >
                        <MenuItem value="family">Family</MenuItem>
                        <MenuItem value="group">Group</MenuItem>
                        <MenuItem value="organization">Organization</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </MDBox>

              {/* Main Admin Details Section */}
              <MDBox mb={4}>
                <MDTypography variant="h6" fontWeight="medium" mb={3}>
                  Main Admin (Account Creator) Details
                </MDTypography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <MDInput 
                      type="text" 
                      label="Full Name" 
                      variant="standard" 
                      fullWidth 
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MDBox display="flex" alignItems="center">
                      <MDInput 
                        type="email" 
                        label="Email Address"
                        variant="standard" 
                        fullWidth 
                      />
                      {renderHelperIcon("You'll receive a verification code")}
                    </MDBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MDBox display="flex" alignItems="center">
                      <MDInput 
                        type="tel" 
                        label="Phone Number"
                        variant="standard" 
                        fullWidth 
                      />
                      {renderHelperIcon("Include country code, e.g. +254")}
                    </MDBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MDBox display="flex" alignItems="center">
                      <MDInput 
                        type="password" 
                        label="Create Password"
                        variant="standard" 
                        fullWidth 
                      />
                      {renderHelperIcon("Minimum 8 characters required")}
                    </MDBox>
                  </Grid>
                </Grid>
              </MDBox>

              <MDBox mt="auto">
                {/* Terms and Conditions */}
                <MDBox display="flex" alignItems="center" ml={-1} mt={2}>
                  <Checkbox />
                  <MDTypography
                    variant="button"
                    fontWeight="regular"
                    color="text"
                    sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
                  >
                    &nbsp;&nbsp;I agree to Akiba's&nbsp;
                  </MDTypography>
                  <MDTypography
                    component="a"
                    href="#"
                    variant="button"
                    fontWeight="bold"
                    color="info"
                    textGradient
                  >
                    Terms and Privacy Policy
                  </MDTypography>
                </MDBox>

                {/* Action Buttons */}
                <MDBox mt={4} mb={1}>
                  <MDButton variant="gradient" color="info" fullWidth onClick={handleNext}>
                    Next
                  </MDButton>
                </MDBox>
              </MDBox>
            </MDBox>

            {/* Sign In Link */}
            <MDBox mt={3} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Already have an account?{" "}
                <MDTypography
                  component={Link}
                  to="/auth/sign-in"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  textGradient
                >
                  Sign In
                </MDTypography>
              </MDTypography>
            </MDBox>
          </MDBox>
        </Card>
      </Box>
      <MDBox mb={8}></MDBox>
    </CoverLayout>
  );
}

export default SignUp;
