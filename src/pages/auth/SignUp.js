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
import firebase, { firebaseConfig } from "../../firebase";
import "firebase/auth";
import PhoneCodeModal from "components/common/PhoneCodeModal";

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

function SignUp() {
  const [input, setInput] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Helper to check if input is email or phone
  const isEmail = (val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
  const isPhone = (val) => /^\+?[0-9]{7,15}$/.test(val);
  const isPhoneMissingCountryCode = (val) => /^[0-9]{7,15}$/.test(val);

  // Setup reCAPTCHA only once
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      const recaptchaContainer = document.getElementById('recaptcha-container-signup');
      if (recaptchaContainer) recaptchaContainer.innerHTML = '';
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
        'recaptcha-container-signup',
        { size: 'invisible' }
      );
    }
  };

  const validate = () => {
    if (!input) {
      setError("Email or phone number is required.");
      return false;
    }
    if (isPhoneMissingCountryCode(input)) {
      setError("Please enter your phone number with the country code (e.g., +254...)");
      return false;
    }
    if (isEmail(input)) {
      if (!password) {
        setError("Password is required.");
        return false;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return false;
      }
      if (password !== repeatPassword) {
        setError("Passwords do not match.");
        return false;
      }
    }
    if (!acceptTerms) {
      setError("You must accept the terms and conditions.");
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
    if (isEmail(input)) {
      // Email registration
      try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(input, password);
        const user = userCredential.user;
        if (user) {
          await user.sendEmailVerification();
        }
        setSuccess(true);
      } catch (err) {
        let msg = "An error occurred. Please try again.";
        if (err.code === "auth/email-already-in-use") {
          msg = "Email already in use.";
        } else if (err.code === "auth/invalid-email") {
          msg = "Invalid email address.";
        } else if (err.message) {
          msg = err.message;
        }
        if (err.code === 'auth/missing-email') {
          msg = 'Missing email address.';
        }
        if (err.code === 'auth/too-many-requests') {
          msg = 'Too many requests. Please try again later.';
        }
        if (err.code === 'auth/user-not-found') {
          msg = 'No user found with this email.';
        }
        if (err.code === 'auth/invalid-action-code') {
          msg = 'Invalid verification link.';
        }
        if (err.code === 'auth/user-disabled') {
          msg = 'This user account has been disabled.';
        }
        if (err.code === 'auth/email-not-verified') {
          msg = 'Please verify your email before logging in.';
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else if (isPhone(input)) {
      // Phone registration (no password required)
      try {
        setTimeout(() => {
          setupRecaptcha();
          firebase.auth().signInWithPhoneNumber(input, window.recaptchaVerifier)
            .then(confirmation => {
              setConfirmationResult(confirmation);
              setPhoneNumber(input);
              setShowCodeModal(true);
            })
            .catch(err => {
              let msg = "Failed to send verification code.";
              if (err.code === "auth/invalid-phone-number") {
                msg = "Invalid phone number.";
              } else if (err.message) {
                msg = err.message;
              }
              setError(msg);
            })
            .finally(() => setLoading(false));
        }, 0);
        return;
      } catch (err) {
        let msg = "Failed to send verification code.";
        if (err.code === "auth/invalid-phone-number") {
          msg = "Invalid phone number.";
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      setError("Please enter a valid email or phone number.");
      setLoading(false);
    }
  };

  // Handle code verification from modal
  const handleCodeSubmit = async (code) => {
    setCodeError("");
    setLoading(true);
    try {
      await confirmationResult.confirm(code);
      setShowCodeModal(false);
      setSuccess(true);
    } catch (err) {
      setCodeError("Invalid or expired code. Please try again.");
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
              Sign up with email or phone number.
            </MDTypography>
          </MDBox>
          {success ? (
            <MDBox mt={4} textAlign="center">
              <MDTypography variant="h6" color="success.main" mb={2}>
                Account created!
              </MDTypography>
              <MDTypography variant="body2" color="text.secondary" mb={2}>
                Please verify your email to proceed with account setup.
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
                    label="Email/Phone Number"
                    placeholder="Enter email or phone number"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                {/* Password and repeat password fields only for email */}
                {isEmail(input) && (
                  <>
                    <Grid item xs={12}>
                      <MDInput
                        type="password"
                        label="Password"
                        placeholder="Enter password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <MDInput
                        type="password"
                        label="Repeat Password"
                        placeholder="Repeat password"
                        value={repeatPassword}
                        onChange={e => setRepeatPassword(e.target.value)}
                        fullWidth
                        required
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Checkbox
                    checked={acceptTerms}
                    onChange={e => setAcceptTerms(e.target.checked)}
                    color="primary"
                  />
                  <MDTypography variant="button" color="info" fontWeight="bold">
                    Terms & Conditions
                  </MDTypography>
                </Grid>
                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error">{error}</Alert>
                  </Grid>
                )}
                {/* reCAPTCHA container for phone registration (invisible) */}
                <div id="recaptcha-container-signup" style={{ display: 'none' }} />
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
                <Grid item xs={12} textAlign="center">
                  <MDTypography variant="button" color="text">
                    Already have an account?{' '}
                    <Link to="/auth/sign-in" style={{ color: '#1A73E8', fontWeight: 600, textDecoration: 'none' }}>
                      Sign In
                    </Link>
                  </MDTypography>
                </Grid>
              </Grid>
            </form>
          )}
          {/* Phone code modal */}
          <PhoneCodeModal
            open={showCodeModal}
            onClose={() => setShowCodeModal(false)}
            onSubmit={handleCodeSubmit}
            loading={loading}
            error={codeError}
            phoneNumber={phoneNumber}
          />
        </Card>
      </Box>
    </CoverLayout>
  );
}

export default SignUp;
