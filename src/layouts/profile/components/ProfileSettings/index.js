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

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContactsIcon from "@mui/icons-material/Contacts";
import EmailIcon from "@mui/icons-material/Email";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { Box } from "@mui/material";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

const ProfileSettings = () => {
    const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
    const [enableNotifications, setEnableNotifications] = useState(true);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");

    const handleInviteMember = () => {
        if (newMemberEmail) {
            // Add API call to invite member
            setNewMemberEmail("");
            setInviteDialogOpen(false);
        }
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText("https://your-app.com/invite/xyz123");
        // Add toast notification here
    };

    const openWhatsAppInvite = () => {
        window.open("https://wa.me/?text=Join%20our%20team%20at%20https://your-app.com/invite/xyz123");
    };

    const openContacts = () => {
        // Implement contacts picker functionality
        console.log("Open contacts picker");
    };

    return (
        <MDBox p={3}>
            <MDBox mb={3}>
                <MDTypography variant="h5" fontWeight="medium">
                    Edit Profile
                </MDTypography>
            </MDBox>

            <Grid container spacing={3}>
                {/* Bio Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Update Bio
                            </MDTypography>
                            <MDInput
                                multiline
                                rows={4}
                                fullWidth
                                placeholder="Enter your bio here..."
                                variant="outlined"
                            />
                            <MDBox mt={2} display="flex" justifyContent="flex-end">
                                <MDButton variant="gradient" color="info">
                                    Save
                                </MDButton>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Contact Information */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                               Update Contact Info
                            </MDTypography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        type="email"
                                        label="Email"
                                        placeholder="Enter your new email..."
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        type="tel"
                                        label="Phone Number"
                                        placeholder="Enter your new phone number..."
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        label="Location"
                                        placeholder="Enter your location..."
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                            <MDBox mt={2} display="flex" justifyContent="flex-end">
                                <MDButton variant="gradient" color="info">
                                    Update
                                </MDButton>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Social Links */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Update Social Links
                            </MDTypography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        label="Facebook"
                                        placeholder="https://facebook.com/username"
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        label="Twitter"
                                        placeholder="https://twitter.com/username"
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        label="Instagram"
                                        placeholder="https://instagram.com/username"
                                        variant="outlined"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <MDInput
                                        fullWidth
                                        label="Youtube"
                                        placeholder="https://youtube.com/username"
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                            <MDBox mt={2} display="flex" justifyContent="flex-end">
                                <MDButton variant="gradient" color="info">
                                    Save Links
                                </MDButton>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Profile Photo */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Profile Photo
                            </MDTypography>
                            <MDBox display="flex" alignItems="center" mb={2}>
                                <Button
                                    variant="contained"
                                    component="label"
                                    color="primary"
                                    startIcon={<PhotoCamera sx={{ color: "#fff" }} />}
                                    sx={{ color: "#fff" }}
                                >
                                    Upload Photo
                                    <input hidden accept="image/*" type="file" />
                                </Button>
                                <MDTypography variant="caption" color="text" ml={2}>
                                    JPG, PNG or GIF. Max size of 800K
                                </MDTypography>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Invite Members */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Invite Members
                            </MDTypography>
                            <MDBox display="flex" flexDirection="column" gap={2}>
                                <MDTypography variant="caption" color="text">
                                    Invite new members to join your account using any of these methods:
                                </MDTypography>
                                <Box display="flex" gap={2} justifyContent="center">
                                    <IconButton 
                                        onClick={() => setInviteDialogOpen(true)} 
                                        color="primary"
                                        sx={{ 
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                                        }}
                                    >
                                        <EmailIcon />
                                    </IconButton>
                                    <IconButton 
                                        onClick={copyInviteLink} 
                                        color="primary"
                                        sx={{ 
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                    <IconButton 
                                        onClick={openWhatsAppInvite} 
                                        color="success"
                                        sx={{ 
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                                        }}
                                    >
                                        <WhatsAppIcon />
                                    </IconButton>
                                    <IconButton 
                                        onClick={openContacts} 
                                        color="info"
                                        sx={{ 
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                                        }}
                                    >
                                        <ContactsIcon />
                                    </IconButton>
                                </Box>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Invite Member Dialog */}
                <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ color: "text.primary" }}>Invite New Members</DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2 }}>
                            <MDInput
                                fullWidth
                                type="email"
                                label="Email"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                placeholder="Enter member's email..."
                                variant="outlined"
                                sx={{
                                    '& .MuiInputLabel-root': {
                                      color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                                    },
                                  }
                                }
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <MDButton onClick={() => setInviteDialogOpen(false)}>Cancel</MDButton>
                        <MDButton onClick={handleInviteMember} variant="gradient" color="info">
                            Send Invitation
                        </MDButton>
                    </DialogActions>
                </Dialog>

                {/* Account Management */}
                <Grid item xs={12}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Account Management
                            </MDTypography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <MDButton variant="outlined" color="info" fullWidth>
                                        Create New Account
                                    </MDButton>
                                </Grid>
                                <Grid item xs={12} md={4} display="flex" flexDirection="row">
                                    <MDButton variant="outlined" color="error" fullWidth>
                                        Leave This Account
                                    </MDButton>
                                </Grid>
                            </Grid>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Privacy Settings */}
                <Grid item xs={12}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Privacy Settings
                            </MDTypography>
                            <MDBox display="flex" alignItems="center" mb={2} ml={-1.5}>
                                <MDBox mt={0.5}>
                                    <Switch 
                                        checked={hideOnlineStatus} 
                                        onChange={() => setHideOnlineStatus(!hideOnlineStatus)} 
                                    />
                                </MDBox>
                                <MDBox width="80%" ml={0.5}>
                                    <MDTypography variant="button" fontWeight="regular" color="text">
                                        Hide Online/Offline Status
                                    </MDTypography>
                                </MDBox>
                            </MDBox>
                            <MDBox display="flex" alignItems="center" mb={2} ml={-1.5}>
                                <MDBox mt={0.5}>
                                    <Switch 
                                        checked={enableNotifications} 
                                        onChange={() => setEnableNotifications(!enableNotifications)} 
                                    />
                                </MDBox>
                                <MDBox width="80%" ml={0.5}>
                                    <MDTypography variant="button" fontWeight="regular" color="text">
                                        Enable Notifications
                                    </MDTypography>
                                </MDBox>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Feedback */}
                <Grid item xs={12}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h5" fontWeight="medium" mb={2}>
                                Send Feedback
                            </MDTypography>
                            <MDInput
                                multiline
                                rows={4}
                                fullWidth
                                placeholder="We value your thoughts..."
                                variant="outlined"
                            />
                            <MDBox mt={2} display="flex" justifyContent="flex-end">
                                <MDButton variant="gradient" color="info">
                                    Submit
                                </MDButton>
                            </MDBox>
                        </MDBox>
                    </Card>
                </Grid>
            </Grid>
        </MDBox>
    );
};

export default ProfileSettings;