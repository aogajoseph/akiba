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
import { Link, useNavigate } from "react-router-dom";
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
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContactsIcon from "@mui/icons-material/Contacts";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import Fade from "@mui/material/Fade";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

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
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [accountType, setAccountType] = useState('family');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [openModal, setOpenModal] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [formData, setFormData] = useState({
    accountName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    agreeToTerms: false
  });
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [accountDetails] = useState({
    accountNumber: "AK-2024-001",
    createdAt: new Date().toLocaleDateString(),
  });

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleCheckboxChange = (event) => {
    setFormData({
      ...formData,
      agreeToTerms: event.target.checked
    });
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) {
      return;
    }
    if (activeStep === steps.length - 1) {
      setShowSuccessCard(true);
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSkip = () => {
    if (activeStep === steps.length - 1) {
      setShowSuccessCard(true);
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  const validateStep1 = () => {
    // Add validation logic here
    return true;
  };

  const renderVerificationStep = () => (
    <MDBox>
      <MDTypography variant="h6" fontWeight="medium" mb={3}>
        Verify Your Account
      </MDTypography>
      <MDBox mb={4}>
        <MDTypography variant="body2" color="text" mb={2}>
          We've sent a verification code to your email address {formData.email}
        </MDTypography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <MDBox display="flex" alignItems="center">
              <MDInput
                type="text"
                label="Verification Code"
                variant="standard"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                error={!!verificationError}
                fullWidth
              />
              {renderHelperIcon("Enter the 6-digit code sent to your email")}
            </MDBox>
            {verificationError && (
              <MDTypography variant="caption" color="error" mt={1}>
                {verificationError}
              </MDTypography>
            )}
          </Grid>
          <Grid item xs={12}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center">
              <MDButton
                variant="text"
                color="info"
                onClick={() => {
                  setIsVerifying(true);
                  // Simulate resend code
                  setTimeout(() => setIsVerifying(false), 2000);
                }}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Resend Code"
                )}
              </MDButton>
              <MDTypography variant="caption" color="text">
                For demo purposes, click Next to continue
              </MDTypography>
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
    </MDBox>
  );

  const renderProfileStep = () => (
    <MDBox>
      <MDTypography variant="h6" fontWeight="medium" mb={3}>
        Personalize Your Profiles
      </MDTypography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <MDBox 
            border="2px dashed"
            borderColor="info.main"
            borderRadius="lg"
            p={4}
            textAlign="center"
            sx={{
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { opacity: 0.7 }
            }}
          >
            <CloudUploadIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
            <MDTypography variant="h6" color="info" mb={1}>
              Upload Profile Picture
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Drag and drop your photo here, or click to select
            </MDTypography>
            <MDTypography variant="caption" color="text" mt={1} display="block">
              Recommended: Square image, at least 400x400 pixels
            </MDTypography>
          </MDBox>
        </Grid>
        <Grid item xs={12}>
        <MDBox
            border="2px dashed"
            borderColor="info.main"
          borderRadius="lg"
            p={4}
          textAlign="center"
            sx={{
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { opacity: 0.7 }
            }}
          >
            <CloudUploadIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
            <MDTypography variant="h6" color="info" mb={1}>
              Upload Account Cover Photo
            </MDTypography>
            <MDTypography variant="body2" color="text">
              Add a family photo or group picture
            </MDTypography>
            <MDTypography variant="caption" color="text" mt={1} display="block">
              Recommended: 1200x400 pixels
            </MDTypography>
          </MDBox>
        </Grid>
      </Grid>
    </MDBox>
  );

  const handleOpenModal = (modalType) => {
    setOpenModal(modalType);
  };

  const handleCloseModal = () => {
    setOpenModal('');
  };

  const renderContactsModal = () => (
    <Dialog 
      open={openModal === 'contacts'} 
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <MDBox display="flex" alignItems="center" justifyContent="space-between">
          <MDTypography variant="h6">Import Contacts</MDTypography>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </MDBox>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <MDBox py={2}>
          <MDTypography variant="body2" color="text" textAlign="center" mb={2}>
            Select contacts from your device to invite to Akiba
          </MDTypography>
          {/* Placeholder for contacts list */}
          <MDBox bgcolor="grey.100" borderRadius="lg" p={2}>
            <MDTypography variant="body2" color="text" textAlign="center">
              Contact list will appear here
            </MDTypography>
          </MDBox>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton variant="text" color="dark" onClick={handleCloseModal}>
          Cancel
        </MDButton>
        <MDButton variant="gradient" color="info" onClick={handleCloseModal}>
          Import Selected
        </MDButton>
      </DialogActions>
    </Dialog>
  );

  const renderEmailModal = () => (
    <Dialog 
      open={openModal === 'email'} 
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <MDBox display="flex" alignItems="center" justifyContent="space-between">
          <MDTypography variant="h6">Email Invitations</MDTypography>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </MDBox>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <MDBox py={2}>
          <MDInput
            multiline
            rows={4}
            fullWidth
            label="Enter email addresses"
            placeholder="Enter multiple email addresses separated by commas"
          />
          <MDTypography variant="caption" color="text" mt={1} display="block">
            Example: john@example.com, jane@example.com
          </MDTypography>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton variant="text" color="dark" onClick={handleCloseModal}>
          Cancel
        </MDButton>
        <MDButton variant="gradient" color="info" onClick={handleCloseModal}>
          Send Invitations
        </MDButton>
      </DialogActions>
    </Dialog>
  );

  const renderWhatsAppModal = () => (
    <Dialog 
      open={openModal === 'whatsapp'} 
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <MDBox display="flex" alignItems="center" justifyContent="space-between">
          <MDTypography variant="h6">Share via WhatsApp</MDTypography>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </MDBox>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <MDBox py={2} textAlign="center">
          <MDTypography variant="body2" color="text" mb={3}>
            Share your Akiba group invitation link via WhatsApp
          </MDTypography>
          <MDBox 
            bgcolor="grey.100" 
            p={2} 
            borderRadius="lg"
            mb={2}
          >
            <MDTypography variant="body2" color="text">
              https://akiba.app/invite/your-unique-code
            </MDTypography>
          </MDBox>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton variant="text" color="dark" onClick={handleCloseModal}>
          Cancel
        </MDButton>
        <MDButton 
          variant="gradient" 
          color="info" 
          onClick={handleCloseModal}
          startIcon={<WhatsAppIcon />}
        >
          Share on WhatsApp
        </MDButton>
      </DialogActions>
    </Dialog>
  );

  const renderInvitationsStep = () => (
    <MDBox>
      <MDTypography variant="h6" fontWeight="medium" mb={3}>
        Invite Members
      </MDTypography>
      <MDBox mb={4}>
        <MDTypography variant="body2" color="text" mb={3}>
          Invite family members or group participants to join your Akiba account. You can always add more people later.
        </MDTypography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <MDBox 
              sx={{
                '& .MuiListItem-root': {
                  px: 2,
                  py: 1.5,
                  mb: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                },
                '& .MuiAvatar-root': {
                  width: 36,
                  height: 36,
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
                '& .MuiListItemText-secondary': {
                  fontSize: '0.75rem',
                },
                '& .MuiButton-root': {
                  minWidth: 100,
                },
              }}
            >
              <List disablePadding>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <ContactsIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Import Contacts" 
                    secondary="Select contacts from your phone or device"
                  />
                  <MDButton 
                    variant="contained" 
                    color="info" 
                    size="small"
                    onClick={() => handleOpenModal('contacts')}
                  >
                    Import
                  </MDButton>
                </ListItem>

                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <EmailIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Email Invitation" 
                    secondary="Send invitations to multiple email addresses"
                  />
                  <MDButton 
                    variant="outlined" 
                    color="info" 
                    size="small"
                    onClick={() => handleOpenModal('email')}
                  >
                    Invite
                  </MDButton>
                </ListItem>

                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <WhatsAppIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="WhatsApp Invitation" 
                    secondary="Share invitation link via WhatsApp"
                  />
                  <MDButton 
                    variant="outlined" 
                    color="info" 
                    size="small"
                    onClick={() => handleOpenModal('whatsapp')}
                  >
                    Share
                  </MDButton>
                </ListItem>

                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <PersonAddIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <MDBox display="flex" alignItems="center" gap={1}>
                        <MDTypography variant="button" fontWeight="medium">
                          Copy Invitation Link
                        </MDTypography>
                        <Fade in={showCopyNotification} timeout={300}>
                          <MDTypography variant="caption" color="info" fontStyle="italic">
                            Link copied to clipboard!
                          </MDTypography>
                        </Fade>
                      </MDBox>
                    }
                    secondary="Share your link anywhere"
                  />
                  <MDButton 
                    variant="outlined" 
                    color="info" 
                    size="small"
                    onClick={() => {
                      handleCopyLink();
                    }}
                    startIcon={<ContentCopyIcon />}
                  >
                    Copy
                  </MDButton>
                </ListItem>
              </List>
            </MDBox>
          </Grid>

          <Grid item xs={12}>
            <MDBox 
              mt={2} 
              p={3} 
              borderRadius="lg" 
              bgcolor="grey.100"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <MDBox>
                <MDTypography variant="h6" mb={0.5}>
                  Selected Contacts
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  No contacts selected yet
                </MDTypography>
              </MDBox>
              <MDButton variant="gradient" color="info" size="small" disabled>
                Send Invites (0)
              </MDButton>
            </MDBox>
          </Grid>

          <Grid item xs={12}>
            <MDBox textAlign="center" mt={2}>
              <MDTypography variant="button" color="text">
                You can skip this step and invite members later
              </MDTypography>
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>

      {/* Render Modals */}
      {renderContactsModal()}
      {renderEmailModal()}
      {renderWhatsAppModal()}
    </MDBox>
  );

  const renderSuccessCard = () => (
    <Dialog
      open={showSuccessCard}
      maxWidth="sm"
      fullWidth
    >
      <DialogContent>
        <MDBox textAlign="center" py={3}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <MDTypography variant="h4" fontWeight="medium" mb={2}>
            Your account was created successfully!
          </MDTypography>
          
          <MDBox bgcolor="grey.100" borderRadius="lg" p={3} mb={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <MDBox display="flex" justifyContent="space-between" mb={1}>
                  <MDTypography variant="button" color="text">Account Name:</MDTypography>
                  <MDTypography variant="button" fontWeight="medium">{formData.accountName}</MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12}>
                <MDBox display="flex" justifyContent="space-between" mb={1}>
                  <MDTypography variant="button" color="text">Account Number:</MDTypography>
                  <MDTypography variant="button" fontWeight="medium">{accountDetails.accountNumber}</MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12}>
                <MDBox display="flex" justifyContent="space-between" mb={1}>
                  <MDTypography variant="button" color="text">Account Type:</MDTypography>
                  <MDTypography variant="button" fontWeight="medium" textTransform="capitalize">{accountType}</MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12}>
                <MDBox display="flex" justifyContent="space-between">
                  <MDTypography variant="button" color="text">Created On:</MDTypography>
                  <MDTypography variant="button" fontWeight="medium">{accountDetails.createdAt}</MDTypography>
                </MDBox>
              </Grid>
            </Grid>
          </MDBox>

          <MDTypography variant="body2" color="text" mb={3}>
            We've sent these details to your email ({formData.email}) and phone ({formData.phone}) for your records.
          </MDTypography>

          <MDButton
            variant="gradient"
            color="info"
            onClick={handleFinish}
            fullWidth
          >
            Proceed to Dashboard
          </MDButton>
        </MDBox>
      </DialogContent>
    </Dialog>
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://akiba.app/invite/your-unique-code');
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 3000);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
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
                      value={formData.accountName}
                      onChange={handleInputChange('accountName')}
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
              Account Creator (Main Admin) Details
              </MDTypography>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <MDInput 
                    type="text" 
                    label="Full Name" 
                    variant="standard"
                    value={formData.fullName}
                    onChange={handleInputChange('fullName')}
                    fullWidth 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MDBox display="flex" alignItems="center">
                    <MDInput 
                      type="email" 
                      label="Email Address"
                      variant="standard"
                      value={formData.email}
                      onChange={handleInputChange('email')}
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
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
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
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      fullWidth 
                    />
                    {renderHelperIcon("Minimum 8 characters required")}
                  </MDBox>
                </Grid>
              </Grid>
            </MDBox>

            {/* Terms and Conditions */}
            <MDBox mt="auto">
              <MDBox display="flex" alignItems="center" ml={-1} mt={2}>
                <Checkbox 
                  checked={formData.agreeToTerms}
                  onChange={handleCheckboxChange}
                />
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
            </MDBox>
          </>
        );
      case 1:
        return renderVerificationStep();
      case 2:
        return renderProfileStep();
      case 3:
        return renderInvitationsStep();
      default:
        return null;
    }
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
          flexDirection: 'column'
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
          >
            <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
              Create Account
            </MDTypography>
            <MDTypography display="block" variant="button" color="white" my={1}>
              Step {activeStep + 1}: {steps[activeStep]}
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
              {renderStepContent()}

              {/* Action Buttons */}
              <MDBox mt={4} mb={1} display="flex" gap={2}>
                {activeStep > 0 && (
                  <MDButton variant="outlined" color="info" onClick={handleBack}>
                    Back
                  </MDButton>
                )}
                {(activeStep === 2 || activeStep === 3) && (
                  <MDButton variant="text" color="info" onClick={handleSkip}>
                    Skip
                  </MDButton>
                )}
                <MDButton 
                  variant="gradient" 
                  color="info" 
                  fullWidth 
                  onClick={handleNext}
                >
                  {activeStep === steps.length - 1 ? "Finish" : "Next"}
              </MDButton>
              </MDBox>

              {/* Render Success Card */}
              {renderSuccessCard()}
            </MDBox>

            {/* Sign In Link */}
            {activeStep === 0 && (
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
            )}
        </MDBox>
      </Card>
      </Box>
      <MDBox mb={8}></MDBox>
    </CoverLayout>
  );
}

export default SignUp;
