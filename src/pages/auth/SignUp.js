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

// Material Dashboard 2 React context
import { useMaterialUIController } from "context";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgImage from "assets/images/banner.jpg";

const steps = ['Setup', 'Verification', 'Profile', 'Invitations'];

function SignUp() {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
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
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
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

  const handleHelpClick = (message) => {
    setHelpMessage(message);
    setShowHelpDialog(true);
  };

  const handleCloseHelp = () => {
    setShowHelpDialog(false);
    setHelpMessage('');
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
        <MDTypography variant="caption" color="text" mb={2}>
          Enter the code we sent to your email {formData.email}
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
              {renderHelperIcon("Enter the 6-digit code we sent to your email address")}
            </MDBox>
            {verificationError && (
              <MDTypography variant="caption" color="error" mt={1}>
                {verificationError}
              </MDTypography>
            )}
          </Grid>
          <Grid item xs={12}>
            <MDBox display="flex" justifyContent="flex-start" alignItems="center">
              <MDButton
                variant="text"
                color="info"
                onClick={() => {
                  setIsVerifying(true);
                  // Simulate resend code
                  setTimeout(() => setIsVerifying(false), 2000);
                }}
                disabled={isVerifying}
                sx={{ pl: 0 }}
              >
                {isVerifying ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Resend Code"
                )}
              </MDButton>
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
          <MDTypography variant="caption" color="text" textAlign="center" mb={2}>
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
                  // Mobile responsive layout
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: { xs: 1, sm: 0 },
                },
                '& .MuiAvatar-root': {
                  width: 36,
                  height: 36,
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                },
                '& .MuiListItemText-root': {
                  flex: { xs: '1 1 auto', sm: '1 1 auto' },
                  minWidth: 0,
                  width: { xs: '100%', sm: 'auto' },
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 0 },
                },
                '& .MuiListItemText-secondary': {
                  fontSize: '0.75rem',
                  mb: { xs: 1, sm: 0 },
                },
                '& .MuiButton-root': {
                  minWidth: { xs: '100%', sm: 100 },
                  alignSelf: { xs: 'flex-start', sm: 'center' },
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
                      <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <MDTypography variant="button" fontWeight="medium" color="text.primary">
                          Copy Invitation Link
                        </MDTypography>
                        <Fade in={showCopyNotification} timeout={300}>
                          <MDTypography variant="caption" color="info" fontStyle="italic">
                            Link copied!
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
              flexDirection={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              gap={{ xs: 2, sm: 0 }}
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
          <MDTypography variant="h4" fontWeight="medium" color="text.primary" mb={2}>
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
                  <MDTypography variant="button" color="text">Account ID:</MDTypography>
                  <MDTypography variant="button" fontWeight="medium">{accountDetails.accountNumber}</MDTypography>
                </MDBox>
              </Grid>
            </Grid>
          </MDBox>

          <MDTypography variant="body2" color="text" mb={3}>
            We've sent your account details to {formData.email} and {formData.phone} for your records.
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

  const renderHelpDialog = () => (
    <Dialog
      open={showHelpDialog}
      onClose={handleCloseHelp}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <MDBox display="flex" alignItems="center" justifyContent="space-between">
          <MDTypography variant="h6">Help</MDTypography>
          <IconButton onClick={handleCloseHelp} size="small">
            <CloseIcon />
          </IconButton>
        </MDBox>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <MDBox py={2}>
          <MDTypography variant="body1" color="text">
            {helpMessage}
          </MDTypography>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton variant="gradient" color="info" onClick={handleCloseHelp}>
          ok!
        </MDButton>
      </DialogActions>
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
                Account Details
              </MDTypography>
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <MDBox display="flex" alignItems="center">
                    <MDInput
                      type="text"
                      label="Account Name"
                      variant="standard"
                      value={formData.accountName}
                      onChange={handleInputChange('accountName')}
                      fullWidth
                    />
                    {renderHelperIcon("Use a name that best describes your group (e.g. John Smith's Family, Grace Church, etc.)")}
                  </MDBox>
                </Grid>
              </Grid>
            </MDBox>

            {/* Main Admin Details Section */}
            <MDBox mb={4}>
              <MDTypography variant="h6" fontWeight="medium" mb={3}>
              Your Details
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
                  <MDInput 
                    type="email" 
                    label="Email Address"
                    variant="standard"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    fullWidth 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MDInput 
                    type="tel" 
                    label="Phone Number"
                    variant="standard"
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    fullWidth 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <MDInput 
                    type="password" 
                    label="Create Password"
                    variant="standard"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    fullWidth 
                  />
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
                  component="a"
                  href="#"
                  variant="button"
                  fontWeight="bold"
                  color="info"
                  textGradient
                >
                  Terms & Conditions
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
    <>
      <Tooltip 
        title={tooltip} 
        placement="top"
        PopperProps={{
          sx: {
            '& .MuiTooltip-tooltip': {
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.87)',
              color: darkMode ? 'rgba(0, 0, 0, 0.87)' : 'white',
              fontSize: '0.75rem',
              padding: '8px 12px',
              borderRadius: '4px',
              maxWidth: '200px',
              textAlign: 'center',
              boxShadow: darkMode 
                ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                : '0 4px 12px rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      >
        <IconButton 
          size="small" 
          sx={{ 
            ml: 1, 
            p: 0.5,
            color: darkMode ? 'info.light' : 'info.main',
            '&:hover': {
              backgroundColor: darkMode 
                ? 'rgba(144, 202, 249, 0.08)' 
                : 'rgba(25, 118, 210, 0.08)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
          onClick={() => handleHelpClick(tooltip)}
        >
          <HelpOutlineIcon 
            fontSize="small" 
            sx={{
              filter: darkMode 
                ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' 
                : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
            }}
          />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <CoverLayout image={bgImage}>
      <Box sx={{ 
        width: { xs: '100%', md: '200%', lg: '250%' }, 
        maxWidth: '1000px',
        position: 'relative',
        left: { xs: '0%', md: '50%' },
        transform: { xs: 'none', md: 'translateX(-50%)' }
      }}>
        <Card sx={{ 
          width: '100%', 
          minHeight: { xs: 'auto', sm: '600px' },
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
          <MDBox px={{ xs: 2, sm: 4 }} pt={3} pb={1}>
            <Stepper 
              activeStep={activeStep} 
              alternativeLabel
              sx={{
                '& .MuiStepLabel-root': {
                  '& .MuiStepLabel-label': {
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    fontWeight: 500,
                  },
                  '& .MuiStepLabel-iconContainer': {
                    '& .MuiStepIcon-root': {
                      fontSize: { xs: '1.5rem', sm: '1.75rem' },
                    },
                  },
                },
                '& .MuiStepConnector-line': {
                  minHeight: { xs: '2px', sm: '3px' },
                },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </MDBox>

          <MDBox pt={3} pb={3} px={{ xs: 3, sm: 5 }} flex={1}>
            <MDBox component="form" role="form" height="100%">
              {renderStepContent()}

              {/* Action Buttons */}
              <MDBox mt={4} mb={1} display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
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
      {renderHelpDialog()}
    </CoverLayout>
  );
}

export default SignUp;
