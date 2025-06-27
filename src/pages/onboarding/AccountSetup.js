import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, TextField, Button, Tooltip, IconButton, Box, Typography, Stepper, Step, StepLabel, Avatar, CircularProgress, InputAdornment } from "@mui/material";
import { PhotoCamera, Clear, InfoOutlined, ContentCopy, WhatsApp, Email, GroupAdd } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getAuth, applyActionCode } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const steps = ["Account Setup", "Profile Setup", "Finish"];

const AccountSetup = () => {
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inviteLink] = useState(window.location.origin + "/invite/" + Math.random().toString(36).substring(2, 10));
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const location = useLocation();
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");
    if (mode === "verifyEmail" && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setVerificationMessage("Your account was created successfully, You can now setup your account.");
        })
        .catch(() => {
          setVerificationError("There was a problem verifying your email. Please try again or contact support.");
        });
    }
  }, [location, auth]);

  const formik = useFormik({
    initialValues: {
      accountName: "",
    },
    validationSchema: Yup.object({
      accountName: Yup.string()
        .min(3, "Account name must be at least 3 characters")
        .max(50, "Account name too long")
        .required("Account name is required"),
    }),
    onSubmit: async (values) => {
      setUploading(true);
      let coverUrl = null;
      try {
        const user = auth.currentUser;
        const accountId = user.uid; // Use UID as account ID for now
        if (coverImage) {
          const coverRef = ref(storage, `accounts/${accountId}/cover.jpg`);
          await uploadBytes(coverRef, coverImage);
          coverUrl = await getDownloadURL(coverRef);
        }
        await setDoc(doc(db, "accounts", accountId), {
          accountName: values.accountName,
          coverUrl,
          owner: user.uid,
          invited: [],
          createdAt: new Date(),
        });
        navigate("/onboarding/profile-setup");
      } catch (e) {
        alert("Error saving account: " + e.message);
      } finally {
        setUploading(false);
      }
    },
  });

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };
  const handleClearCover = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Card sx={{ width: 370, p: 2 }}>
        {verificationMessage && (
          <Box mb={2}>
            <Typography variant="h6" color="success.main" align="center">
              {verificationMessage}
            </Typography>
          </Box>
        )}
        {verificationError && (
          <Box mb={2}>
            <Typography variant="h6" color="error" align="center">
              {verificationError}
            </Typography>
          </Box>
        )}
        <CardHeader
          title={<Stepper activeStep={0} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>}
        />
        <CardContent>
          <form onSubmit={formik.handleSubmit} autoComplete="off">
            <Box mb={2}>
              <Tooltip title="Choose a name that best describes your group e.g. John Doe's Family, Nairobi Grace Church" arrow>
                <TextField
                  fullWidth
                  label="Account Name"
                  name="accountName"
                  value={formik.values.accountName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.accountName && Boolean(formik.errors.accountName)}
                  helperText={formik.touched.accountName && formik.errors.accountName}
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
              <Typography variant="subtitle2" mb={1}>Cover Image (optional)</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <label htmlFor="cover-upload">
                  <input
                    accept="image/*"
                    id="cover-upload"
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleCoverChange}
                  />
                  <IconButton color="primary" component="span">
                    <PhotoCamera />
                  </IconButton>
                </label>
                {coverPreview && (
                  <Box position="relative">
                    <Avatar src={coverPreview} variant="rounded" sx={{ width: 56, height: 56 }} />
                    <IconButton size="small" onClick={handleClearCover} sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>Invite People (optional)</Typography>
              <Box display="flex" gap={1}>
                <Tooltip title="Import Contacts"><IconButton><GroupAdd /></IconButton></Tooltip>
                <Tooltip title="Invite via WhatsApp"><IconButton><WhatsApp /></IconButton></Tooltip>
                <Tooltip title="Invite via Email"><IconButton><Email /></IconButton></Tooltip>
                <Tooltip title="Copy Invite Link"><IconButton onClick={handleCopyLink}><ContentCopy /></IconButton></Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary">You can invite people later from your dashboard.</Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!formik.isValid || uploading}
              sx={{ mt: 2 }}
              endIcon={uploading ? <CircularProgress size={18} /> : null}
            >
              Next
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountSetup; 