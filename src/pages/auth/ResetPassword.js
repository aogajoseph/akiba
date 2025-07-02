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

// React imports
import { useState } from "react";
import { Link } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Alert from "@mui/material/Alert";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgImage from "assets/images/banner.jpg";

// Firebase imports
import firebase from "../../firebase";
import "firebase/auth";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (err) {
      let msg = "An error occurred. Please try again.";
      if (err.code === "auth/user-not-found") {
        msg = "No user found with this email.";
      } else if (err.code === "auth/network-request-failed") {
        msg = "No internet connection. Please check your network.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Invalid email address.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CoverLayout coverHeight="50vh" image={bgImage}>
      <Card sx={{ mb: 4 }}>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="success"
          mx={2}
          mt={-3}
          py={2}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            Reset Password
          </MDTypography>
          <MDTypography display="block" variant="subtitle2" color="white" my={1} px={2}>
            You'll receive a link within 60 seconds
          </MDTypography>
        </MDBox>
        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={handleSubmit}>
            <MDBox mb={4}>
              <MDInput
                type="email"
                label="Email"
                variant="standard"
                value={email}
                onChange={e => setEmail(e.target.value)}
                fullWidth
                required
              />
            </MDBox>
            {error && (
              <MDBox mb={2}>
                <Alert severity="error">{error}</Alert>
              </MDBox>
            )}
            {success && (
              <MDBox mb={2}>
                <Alert severity="success">{success}</Alert>
              </MDBox>
            )}
            <MDBox mt={6} mb={1}>
              <MDButton variant="gradient" color="info" fullWidth type="submit" disabled={loading}>
                {loading ? "Sending..." : "Request Link"}
              </MDButton>
            </MDBox>
            {/* Sign Up Link */}
            <MDBox mt={1} mb={1} textAlign="center">
              <MDTypography
                component={Link}
                to="/auth/sign-in"
                variant="button"
                color="info"
                fontWeight="medium"
                textGradient
              >
                Back to Sign In
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </CoverLayout>
  );
}

export default ResetPassword;
