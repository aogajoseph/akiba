import React, { useState } from "react";
import { Card, CardContent, CardHeader, TextField, Button, Tooltip, IconButton, Box, Typography, Stepper, Step, StepLabel, Avatar, CircularProgress, InputAdornment } from "@mui/material";
import { PhotoCamera, Clear, InfoOutlined } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import firebase from "../../firebase";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";
import { useNavigate } from "react-router-dom";

const steps = ["Account Setup", "Profile Setup", "Finish"];

const ProfileSetup = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const navigate = useNavigate();
  const auth = firebase.auth();
  const db = firebase.firestore();
  const user = auth.currentUser;

  const formik = useFormik({
    initialValues: {
      username: "",
      phone: "",
      email: user?.email || "",
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .matches(/^[a-zA-Z0-9_]+$/, "No spaces or special characters allowed")
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username too long")
        .required("Username is required"),
      phone: Yup.string()
        .matches(/^$|^\+?[0-9]{7,15}$/, "Invalid phone number"),
    }),
    onSubmit: async (values) => {
      setUploading(true);
      let profileUrl = null;
      try {
        if (profileImage) {
          const profileRef = firebase.storage().ref(`users/${user.uid}/profile.jpg`);
          await profileRef.put(profileImage);
          profileUrl = await profileRef.getDownloadURL();
        }
        // Save profile data
        await db.collection("users").doc(user.uid).set({
          username: values.username,
          phone: values.phone,
          profileUrl,
          email: values.email,
          updatedAt: new Date(),
        });
        navigate("/onboarding/success");
      } catch (e) {
        alert("Error saving profile: " + e.message);
      } finally {
        setUploading(false);
      }
    },
  });

  // Real-time username uniqueness check
  const checkUsername = async (username) => {
    if (!username || !/^[a-zA-Z0-9_]+$/.test(username)) return;
    const snapshot = await db.collection("users").where("username", "==", username).get();
    if (!snapshot.empty) {
      setUsernameError("Username is already taken");
    } else {
      setUsernameError("");
    }
  };

  const handleUsernameBlur = (e) => {
    formik.handleBlur(e);
    checkUsername(formik.values.username);
  };

  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };
  const handleClearProfile = () => {
    setProfileImage(null);
    setProfilePreview(null);
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Card sx={{ width: 370, p: 2 }}>
        <CardHeader
          title={<Stepper activeStep={1} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>}
        />
        <CardContent>
          <form onSubmit={formik.handleSubmit} autoComplete="off">
            <Box mb={2}>
              <Tooltip title="Choose a unique username. No spaces allowed." arrow>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  onBlur={handleUsernameBlur}
                  error={(formik.touched.username && Boolean(formik.errors.username)) || Boolean(usernameError)}
                  helperText={usernameError || (formik.touched.username && formik.errors.username)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <InfoOutlined color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Tooltip>
            </Box>
            <Box mb={2}>
              <TextField
                fullWidth
                label="Phone Number (optional)"
                name="phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
              />
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>Profile Picture (optional)</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <label htmlFor="profile-upload">
                  <input
                    accept="image/*"
                    id="profile-upload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleProfileChange}
                  />
                  <IconButton color="primary" component="span">
                    <PhotoCamera />
                  </IconButton>
                </label>
                {profilePreview && (
                  <Box position="relative">
                    <Avatar src={profilePreview} sx={{ width: 56, height: 56 }} />
                    <IconButton size="small" onClick={handleClearProfile} sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
            <Box mb={2}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formik.values.email}
                InputProps={{ readOnly: true }}
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!formik.isValid || uploading || Boolean(usernameError)}
              sx={{ mt: 2 }}
              endIcon={uploading ? <CircularProgress size={18} /> : null}
            >
              Finish
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileSetup; 