/**
 * Material Dashboard 2 React - v2.2.0
 * Copyright 2023 Creative Tim (https://www.creative-tim.com)
 */

// React imports
import { useState } from "react";
import { Link } from "react-router-dom";

// MUI Core components
import {
  Card,
  Switch,
  Grid,
  Link as MuiLink,
  IconButton,
  InputAdornment,
} from "@mui/material";

// MUI Icons
import {
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  Google as GoogleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";

// Custom components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import BasicLayout from "layouts/authentication/components/BasicLayout";

// Assets
import bgImage from "assets/images/bg-Img.jpg";

function SignIn() {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const handleSetRememberMe = () => setRememberMe(!rememberMe);
  const handleTogglePassword = () => setShowPassword(!showPassword);

  return (
    <BasicLayout image={bgImage}>
      <Card>
        {/* Header */}
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
            Sign In
          </MDTypography>

          {/* Social Login Buttons */}
          <Grid container spacing={3} justifyContent="center" sx={{ mt: 1, mb: 2 }}>
            {[
              { icon: FacebookIcon, link: "#" },
              { icon: LinkedInIcon, link: "#" },
              { icon: GoogleIcon, link: "#" },
            ].map((social, index) => (
              <Grid item xs={2} key={index}>
                <MDTypography component={MuiLink} href={social.link} variant="body1" color="white">
                  <social.icon color="inherit" />
                </MDTypography>
              </Grid>
            ))}
          </Grid>
        </MDBox>

        {/* Login Form */}
        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form">
            <MDBox mb={2}>
              <MDInput type="text" label="Email/Phone/Account ID" fullWidth />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type={showPassword ? "text" : "password"}
                label="Password"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePassword}
                        edge="end"
                        size="small"
                        sx={{ color:"#757575" }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </MDBox>

            {/* Stay Logged In Switch */}
            <MDBox display="flex" alignItems="center" ml={-1}>
              <Switch checked={rememberMe} onChange={handleSetRememberMe} />
              <MDTypography
                variant="button"
                fontWeight="regular"
                color="text"
                onClick={handleSetRememberMe}
                sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
              >
                &nbsp;&nbsp;Stay Logged In
              </MDTypography>
            </MDBox>

            {/* Submit Button */}
            <MDBox mt={4} mb={1}>
              <MDButton variant="gradient" color="info" fullWidth>
                sign in
              </MDButton>
            </MDBox>

            {/* Sign Up Link */}
            <MDBox mt={1} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Don&apos;t have an account?{" "}
                <MDTypography
                  component={Link}
                  to="/auth/sign-up"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  textGradient
                >
                  Sign Up
                </MDTypography>
              </MDTypography>
            </MDBox>

            {/* Forgot Password Link */}
            <MDBox mt={1} mb={1} textAlign="left">
              <MDTypography
                component={Link}
                to="/auth/reset-password"
                variant="button"
                color="info"
                fontWeight="regular"
                textGradient
              >
                Forgot Password?
              </MDTypography>
            </MDBox>

          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default SignIn;
