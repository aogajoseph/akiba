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

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import RemoveModeratorIcon from "@mui/icons-material/RemoveModerator";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContactsIcon from "@mui/icons-material/Contacts";
import EmailIcon from "@mui/icons-material/Email";
import AddIcon from "@mui/icons-material/Add";
import { Box, Divider, TextField, LinearProgress } from "@mui/material";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";

import { useState } from "react";

const AccountSettings = () => {
    // State for dialogs
    const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
    const [addSubAdminOpen, setAddSubAdminOpen] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [inviteMethod, setInviteMethod] = useState("email"); // email, whatsapp, contacts, link

    // Mock data - Replace with actual data from your backend
    const [members, setMembers] = useState([
        { id: 1, name: "John Doe", email: "member1@example.com", avatar: "https://i.pravatar.cc/150?img=1" },
        { id: 2, name: "Jane Smith", email: "member2@example.com", avatar: "https://i.pravatar.cc/150?img=2" },
        { id: 3, name: "Mike Johnson", email: "member3@example.com", avatar: "https://i.pravatar.cc/150?img=3" },
        { id: 4, name: "Sarah Wilson", email: "member4@example.com", avatar: "https://i.pravatar.cc/150?img=4" },
        { id: 5, name: "Tom Brown", email: "member5@example.com", avatar: "https://i.pravatar.cc/150?img=5" },
        { id: 6, name: "Lisa Davis", email: "member6@example.com", avatar: "https://i.pravatar.cc/150?img=6" },
    ]);

    const [subAdmins, setSubAdmins] = useState([
        { id: 1, name: "Admin One", email: "admin1@example.com", avatar: "https://i.pravatar.cc/150?img=7" },
        { id: 2, name: "Admin Two", email: "admin2@example.com", avatar: "https://i.pravatar.cc/150?img=8" },
    ]);

    const handleInviteMember = () => {
        if (newMemberEmail) {
            setMembers([...members, { 
                id: Date.now(), 
                name: newMemberEmail.split('@')[0], 
                email: newMemberEmail, 
                avatar: `https://i.pravatar.cc/150?img=${Date.now()}` 
            }]);
            setNewMemberEmail("");
            setInviteMemberOpen(false);
        }
    };

    const handleRemoveMember = (memberId) => {
        if (members.length > 1) {
            setMembers(members.filter(member => member.id !== memberId));
        }
    };

    const handleAddSubAdmin = (member) => {
        if (!subAdmins.find(admin => admin.id === member.id)) {
            setSubAdmins([...subAdmins, { ...member, role: "sub-admin" }]);
            setAddSubAdminOpen(false);
        }
    };

    const handleRevokeAdmin = (adminId) => {
        if (subAdmins.length > 1) {
            setSubAdmins(subAdmins.filter(admin => admin.id !== adminId));
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
                    Account Settings
                </MDTypography>
            </MDBox>

            <Grid container spacing={3}>
                {/* About Section */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Update About
                            </MDTypography>
                            <MDInput
                                multiline
                                rows={4}
                                fullWidth
                                placeholder="Enter about account here..."
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

                {/* Members Management */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <MDTypography variant="h6" fontWeight="medium">
                                    Manage Members
                                </MDTypography>
                                <MDButton
                                    variant="gradient"
                                    color="info"
                                    startIcon={<PersonAddIcon />}
                                    onClick={() => setInviteMemberOpen(true)}
                                >
                                    Invite Member
                                </MDButton>
                            </MDBox>
                            <TableContainer 
                                sx={{ 
                                    maxHeight: 180, // Height for 3 rows (40px per row + padding)
                                    overflow: 'auto',
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#888',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            background: '#555',
                                        },
                                    },
                                }}
                            >
                                <Table>
                                    <TableBody>
                                        {members.map((member) => (
                                            <TableRow key={member.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ py: 1 }}>
                                                    <Box display="flex" alignItems="center">
                                                        <Avatar 
                                                            src={member.avatar} 
                                                            alt={member.name}
                                                            sx={{ width: 40, height: 40, mr: 2 }}
                                                        />
                                                        <MDTypography variant="button" fontWeight="medium">
                                                            {member.name}
                                                        </MDTypography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        disabled={members.length <= 1}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Sub-Admins Management */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <MDTypography variant="h6" fontWeight="medium">
                                    Manage Sub-Admins
                                </MDTypography>
                                <MDButton
                                    variant="gradient"
                                    color="info"
                                    startIcon={<AdminPanelSettingsIcon />}
                                    onClick={() => setAddSubAdminOpen(true)}
                                >
                                    Add Sub-Admin
                                </MDButton>
                            </MDBox>
                            <TableContainer 
                                sx={{ 
                                    maxHeight: 180, // Height for 3 rows (40px per row + padding)
                                    overflow: 'auto',
                                    '&::-webkit-scrollbar': {
                                        width: '8px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                        borderRadius: '4px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#888',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            background: '#555',
                                        },
                                    },
                                }}
                            >
                                <Table>
                                    <TableBody>
                                        {subAdmins.map((admin) => (
                                            <TableRow key={admin.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell sx={{ py: 1 }}>
                                                    <Box display="flex" alignItems="center">
                                                        <Avatar 
                                                            src={admin.avatar} 
                                                            alt={admin.name}
                                                            sx={{ width: 40, height: 40, mr: 2 }}
                                                        />
                                                        <MDTypography variant="button" fontWeight="medium">
                                                            {admin.name}
                                                        </MDTypography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleRevokeAdmin(admin.id)}
                                                        disabled={subAdmins.length <= 1}
                                                    >
                                                        <RemoveModeratorIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </MDBox>
                    </Card>
                </Grid>

                {/* Cover Photo */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <MDBox p={3}>
                            <MDTypography variant="h6" fontWeight="medium" mb={2}>
                                Cover Photo
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
                                        Create New Akiba Account
                                    </MDButton>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <MDButton variant="outlined" color="error" fullWidth>
                                        Delete This Account
                                    </MDButton>
                                </Grid>
                            </Grid>
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

                {/* Invite Member Dialog */}
                <Dialog open={inviteMemberOpen} onClose={() => setInviteMemberOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Invite New Member</DialogTitle>
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
                            />
                        </Box>
                        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <IconButton onClick={copyInviteLink} color="primary">
                                <ContentCopyIcon />
                            </IconButton>
                            <IconButton onClick={openWhatsAppInvite} color="success">
                                <WhatsAppIcon />
                            </IconButton>
                            <IconButton onClick={openContacts} color="info">
                                <ContactsIcon />
                            </IconButton>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <MDButton onClick={() => setInviteMemberOpen(false)}>Cancel</MDButton>
                        <MDButton onClick={handleInviteMember} variant="gradient" color="info">
                            Invite
                        </MDButton>
                    </DialogActions>
                </Dialog>

                {/* Add Sub-Admin Dialog */}
                <Dialog open={addSubAdminOpen} onClose={() => setAddSubAdminOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Select Member to Promote</DialogTitle>
                    <DialogContent>
                        <List sx={{ width: '100%', maxHeight: 400, overflow: 'auto' }}>
                            {members.map((member) => (
                                <ListItem key={member.id} disablePadding>
                                    <ListItemButton onClick={() => handleAddSubAdmin(member)}>
                                        <ListItemAvatar>
                                            <Avatar src={member.avatar} alt={member.name} />
                                        </ListItemAvatar>
                                        <ListItemText primary={member.name} secondary={member.email} />
                                        <IconButton color="primary">
                                            <PersonAddIcon />
                                        </IconButton>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <MDButton onClick={() => setAddSubAdminOpen(false)}>Cancel</MDButton>
                    </DialogActions>
                </Dialog>
            </Grid>
        </MDBox>
    );
};

export default AccountSettings;