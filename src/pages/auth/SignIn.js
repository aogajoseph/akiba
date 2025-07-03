/**
 * Material Dashboard 2 React - v2.2.0
 * Copyright 2023 Creative Tim (https://www.creative-tim.com)
 */

// React imports
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// MUI Core components
import {
  Card,
  Switch,
  IconButton,
  InputAdornment,
} from "@mui/material";

// MUI Icons
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";

// Custom components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import BasicLayout from "layouts/authentication/components/BasicLayout";
import PhoneCodeModal from "components/common/PhoneCodeModal";

// Assets
import bgImage from "assets/images/bg-Img.jpg";

// Firebase imports
import firebase from "../../firebase";
import "firebase/auth";

// MUI Alert component
import Alert from "@mui/material/Alert";

function SignIn() {
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSetRememberMe = () => setRememberMe(!rememberMe);
  const handleTogglePassword = () => setShowPassword(!showPassword);

  // Helper to check if input is email or phone
  const isEmail = (val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
  const isPhone = (val) => /^\+?[0-9]{7,15}$/.test(val);

  // Setup reCAPTCHA only once
  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        if (typeof window.recaptchaVerifier.clear === 'function') {
          window.recaptchaVerifier.clear();
        }
        if (typeof window.recaptchaVerifier.destroy === 'function') {
          window.recaptchaVerifier.destroy();
        }
      } catch (e) {}
      window.recaptchaVerifier = undefined;
    }
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (recaptchaContainer) recaptchaContainer.innerHTML = '';
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      'recaptcha-container',
      { size: 'invisible' }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCodeError("");
    if (isEmail(input)) {
      // Email login
      try {
        await firebase.auth().signInWithEmailAndPassword(input, password);
        navigate("/dashboard");
      } catch (err) {
        let msg = "An error occurred. Please try again.";
        if (err.code === "auth/user-not-found") {
          msg = "No user found with this email.";
        } else if (err.code === "auth/wrong-password") {
          msg = "Incorrect password.";
        } else if (err.code === "auth/network-request-failed") {
          msg = "No internet connection. Please check your network.";
        } else if (err.code === "auth/invalid-email") {
          msg = "Invalid email address.";
        } else if (err.code === "auth/too-many-requests") {
          msg = "Too many failed attempts. Please try again later.";
        } else if (err.message) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else if (isPhone(input)) {
      // Phone login (no password required)
      try {
        console.log('About to call setupRecaptcha');
        setTimeout(() => {
          setupRecaptcha();
          console.log('After setupRecaptcha');
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
              if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
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
        if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
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
      navigate("/dashboard");
    } catch (err) {
      setCodeError("Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <MDTypography variant="body2" color="white" mt={1}>
            Sign in with email or phone number.
          </MDTypography>
        </MDBox>

        {/* Login Form */}
        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={handleSubmit}>
            <MDBox mb={2}>
              <MDInput
                label="Email or Phone Number"
                placeholder="e.g. johndoe@email.com or +254712345678"
                value={input}
                onChange={e => setInput(e.target.value)}
                fullWidth
                required
              />
            </MDBox>

            {/* Password field only for email */}
            {isEmail(input) && (
              <MDBox mb={2}>
                <MDInput
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePassword}
                          edge="end"
                          size="small"
                          sx={{ color: "#757575" }}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </MDBox>
            )}

            {/* Error Message */}
            {error && (
              <MDBox mb={2}>
                <Alert severity="error">{error}</Alert>
              </MDBox>
            )}

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
              <MDButton variant="gradient" color="info" fullWidth type="submit" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
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

            {/* reCAPTCHA container for phone login (invisible) */}
            <div id="recaptcha-container" style={{ display: 'none' }} />
          </MDBox>
        </MDBox>
      </Card>

      {/* Phone code modal */}
      <PhoneCodeModal
        open={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onSubmit={handleCodeSubmit}
        loading={loading}
        error={codeError}
        phoneNumber={phoneNumber}
      />
    </BasicLayout>
  );
}

export default SignIn;
