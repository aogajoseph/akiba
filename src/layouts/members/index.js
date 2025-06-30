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
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import MDAvatar from "components/MDAvatar";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Data
import membersTableData from "layouts/members/data/membersTableData";

import { useState, useMemo } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";

function Members() {
  const { columns } = membersTableData();

  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    dateJoined: "",
    status: "",
  });

  // Filtering logic
  const processedRows = useMemo(() => {
    const rawRows = [
      { name: "John Michael", role: "Main Admin", email: "johnmichael@gmail.com", phone: "+254 721 465 221", status: "online", dateJoined: "Apr 23, 2018" },
      { name: "Alexa Liras", role: "Member", email: "alexaliras@gmail.com", phone: "+263 726 857 5124", status: "offline", dateJoined: "Jan 11, 2019" },
      { name: "Laurent Perrier", role: "Member", email: "laurentperrier@gmail.com", phone: "+1 258 456 8745", status: "online", dateJoined: "Sep 19, 2019" },
      { name: "Michael Levi", role: "Sub-Admin", email: "michaellevi@gmail.com", phone: "+254 711 248 476", status: "online", dateJoined: "Dec 24, 2008" },
      { name: "Richard Gran", role: "Member", email: "richardgran@gmail.com", phone: "+254 112 875 631", status: "offline", dateJoined: "Apr 10, 2010" },
      { name: "Miriam Eric", role: "Sub-Admin", email: "miriameric@gmail.com", phone: "+254 715 417 485", status: "offline", dateJoined: "Sep 14, 2020" },
    ];
    return rawRows.filter(row => {
      return (
        (!filters.name || row.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.role || row.role === filters.role) &&
        (!filters.email || row.email.toLowerCase().includes(filters.email.toLowerCase())) &&
        (!filters.phone || row.phone.includes(filters.phone)) &&
        (!filters.dateJoined || row.dateJoined.includes(filters.dateJoined)) &&
        (!filters.status || row.status === filters.status)
      );
    });
  }, [filters]);

  // Map filteredRows to the table's row format
  const getTableRows = () => {
    // Use the same Member and Contacts components as in membersTableData
    const Member = ({ image, name, role }) => (
      <MDBox display="flex" alignItems="center" lineHeight={1}>
        <MDAvatar src={image} name={name} size="sm" />
        <MDBox ml={2} lineHeight={1}>
          <MDTypography display="block" variant="button" fontWeight="medium">
            {name}
          </MDTypography>
          <MDTypography variant="caption">{role}</MDTypography>
        </MDBox>
      </MDBox>
    );
    const Contacts = ({ phoneNumber, email }) => (
      <MDBox lineHeight={1} textAlign="left">
        <MDTypography display="block" variant="caption" color="text" fontWeight="medium">
          {phoneNumber}
        </MDTypography>
        <MDTypography variant="caption">{email}</MDTypography>
      </MDBox>
    );
    // Use static images for demo
    const images = [
      require("assets/images/team-2.jpg"),
      require("assets/images/team-3.jpg"),
      require("assets/images/team-4.jpg"),
      require("assets/images/team-3.jpg"),
      require("assets/images/team-3.jpg"),
      require("assets/images/team-4.jpg"),
    ];
    return processedRows.map((row, i) => ({
      member: <Member image={images[i % images.length]} name={row.name} role={row.role} />,
      contacts: <Contacts phoneNumber={row.phone} email={row.email} />,
      status: (
        <MDBox ml={-1}>
          <MDBadge badgeContent={row.status} color={row.status === "online" ? "success" : "dark"} variant="gradient" size="sm" />
        </MDBox>
      ),
      dateJoined: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {row.dateJoined}
        </MDTypography>
      ),
      action: (
        <MDTypography component="a" href="#" variant="caption" color="text" fontWeight="medium">
          Chat
        </MDTypography>
      ),
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const handleApply = () => setFilterOpen(false);
  const handleCancel = () => {
    setFilters({ name: "", role: "", email: "", phone: "", dateJoined: "", status: "" });
    setFilterOpen(false);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        {/* Filter Modal */}
        <Modal
          open={filterOpen}
          onClose={handleCancel}
          aria-labelledby="filter-modal-title"
          aria-describedby="filter-modal-desc"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: { xs: 320, sm: 400 },
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 24,
              p: 3,
              outline: "none",
            }}
          >
            <MDTypography id="filter-modal-title" variant="h6" color="text.primary" mb={2}>
              Filter Members
            </MDTypography>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Name"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                sx={{ 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  '& .MuiInputLabel-root': {
                    color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                  }
                }}
              />
              <FormControl size="small" fullWidth sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                <InputLabel
                  sx={{
                    color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                  }}
                >
                  Role
                </InputLabel>
                <Select
                  label="Role"
                  name="role"
                  value={filters.role}
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="Main Admin">Main Admin</MenuItem>
                  <MenuItem value="Sub-Admin">Sub-Admin</MenuItem>
                  <MenuItem value="Member">Member</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Email"
                name="email"
                value={filters.email}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                sx={{ 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  '& .MuiInputLabel-root': {
                    color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                  }
                }}
              />
              <TextField
                label="Phone"
                name="phone"
                value={filters.phone}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                sx={{ 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  '& .MuiInputLabel-root': {
                    color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                  }
                }}
              />
              <TextField
                label="Date Joined"
                name="dateJoined"
                value={filters.dateJoined}
                onChange={handleFilterChange}
                size="small"
                fullWidth
                placeholder="e.g. 2019"
                sx={{ 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  '& .MuiInputLabel-root': {
                    color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                  }
                }}
              />
              <FormControl size="small" fullWidth sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                <InputLabel
                  sx={{
                    color: (theme) => theme.palette.mode === 'dark' ? '#cccccc' : 'grey',
                  }}
                >
                  Status
                </InputLabel>
                <Select
                  label="Status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={2} mt={2} justifyContent="flex-end">
              <Button onClick={handleCancel} color="secondary" variant="outlined" sx={{ fontWeight: 600, bgcolor: 'white', color: 'secondary.main', borderColor: 'secondary.main', '&:hover': { bgcolor: 'secondary.main', color: '#fff' } }}>Cancel</Button>
              <Button onClick={handleApply} color="info" variant="contained" sx={{ fontWeight: 600, bgcolor: 'info.main', color: '#fff', '&:hover': { bgcolor: 'info.dark' } }}>Apply</Button>
            </Stack>
          </Box>
        </Modal>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <MDTypography variant="h6" color="white">
                  Members
                </MDTypography>
                <Tooltip title="Filter">
                  <Button
                    variant="contained"
                    startIcon={<FilterListIcon />}
                    onClick={() => setFilterOpen(true)}
                    sx={{
                      bgcolor: 'info',
                      color: '#fff',
                      fontWeight: 600,
                      boxShadow: 2,
                      textTransform: 'none',
                      '&:hover': { bgcolor: 'info.main', color: 'white' },
                      minWidth: 0,
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                    }}
                  >
                    Filter
                  </Button>
                </Tooltip>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns, rows: getTableRows() }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Members;
