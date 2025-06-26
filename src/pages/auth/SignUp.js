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
import Box from "@mui/material/Box";
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
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import app from "../../firebase";

function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    repeatPassword: ''
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const validate = () => {
    if (!formData.email) {
      setError("Email is required.");
      return false;
    }
    if (!formData.password) {
      setError("Password is required.");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (formData.password !== formData.repeatPassword) {
      setError("Passwords do not match.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const actionCodeSettings = {
        // Redirect to Account Setup after email verification
        url: "https://truevoice.app/onboarding/account-setup",
        handleCodeInApp: false,
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CoverLayout image={bgImage}>
      <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mb: 6 }}>
        <Card sx={{ width: '100%', minHeight: { xs: 'auto', sm: '400px' }, display: 'flex', flexDirection: 'column', p: 3 }}>
          <MDBox textAlign="center" mb={2}>
            <MDTypography variant="h4" fontWeight="medium" color="info" mt={1}>
              Create Account
            </MDTypography>
            <MDTypography display="block" variant="button" color="text" my={1}>
              Sign up with your email address
            </MDTypography>
          </MDBox>
          {success ? (
            <MDBox mt={4} textAlign="center">
              <MDTypography variant="h6" color="success.main" mb={2}>
                Account created!
      </MDTypography>
              <MDTypography variant="body2" color="text.secondary" mb={2}>
                Please check your email to verify your account before logging in.
        </MDTypography>
              <MDButton variant="gradient" color="info" fullWidth component={Link} to="/auth/sign-in">
                Go to Login
              </MDButton>
            </MDBox>
          ) : (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <MDInput 
                    type="email" 
                    label="Email Address"
                    variant="standard"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    fullWidth 
                  />
                </Grid>
                <Grid item xs={12}>
                  <MDInput 
                    type="password" 
                    label="Password"
                    variant="standard"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    fullWidth 
                  />
                </Grid>
                <Grid item xs={12}>
                  <MDInput
                    type="password"
                    label="Repeat Password"
                    variant="standard"
                    value={formData.repeatPassword}
                    onChange={handleInputChange('repeatPassword')}
                    fullWidth
                  />
                </Grid>
                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error">{error}</Alert>
              </Grid>
                )}
                <Grid item xs={12}>
                <MDButton 
                  variant="gradient" 
                  color="info" 
                    type="submit"
                  fullWidth 
                    disabled={loading}
                >
                    {loading ? 'Signing Up...' : 'Sign Up'}
              </MDButton>
                </Grid>
                <Grid item xs={12}>
                  <MDTypography variant="button" color="text" textAlign="center">
                    Already have an account?{' '}
                <MDTypography
                  component={Link}
                    to="/auth/sign-in"
                  variant="button"
                  color="info"
                      fontWeight="bold"
                  textGradient
                >
                  Sign In
                </MDTypography>
              </MDTypography>
                </Grid>
              </Grid>
            </form>
            )}
      </Card>
      </Box>
    </CoverLayout>
  );
}

export default SignUp;
