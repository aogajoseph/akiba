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

import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import logoSlack from "assets/images/small-logos/logo-slack.svg";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import DataTable from "examples/Tables/DataTable";

// Data
import savingGoalsData from "layouts/account/components/SavingGoals/data";

function SavingGoalsTable({ data = {} }) {
  const navigate = useNavigate();
  const [currentBalance, setCurrentBalance] = useState(50000);
  const [goals, setGoals] = useState(data.goals || savingGoalsData().rows.map((row, idx) => ({
    id: (idx + 1).toString(),
    name: row.savingGoal.props.description,
    image: row.savingGoal.props.image,
    budget: parseInt(row.budget.props.children.replace(/[^0-9]/g, "")),
    raised: parseInt(row.raised.props.children.replace(/[^0-9]/g, "")),
    status: row.status.props.children,
    completion: row.completion.props.value || 0,
    deadline: new Date(),
  })));
  const { columns: pColumns } = savingGoalsData({ goals });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    budget: "",
    deadline: "",
    image: "",
  });
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [allocationAmount, setAllocationAmount] = useState("");

  const handleGoalClick = (goalId) => {
    navigate(`/goals/${goalId}`);
  };

  const handleCreateOpen = () => setCreateDialogOpen(true);
  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    setForm({ name: "", budget: "", deadline: "", image: "" });
  };

  const handleManageOpen = () => setManageDialogOpen(true);
  const handleManageClose = () => {
    setManageDialogOpen(false);
    setSelectedGoal(null);
    setAllocationAmount("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (!form.name || !form.budget || !form.deadline) return;
    const newGoal = {
      id: (goals.length + 1).toString(),
      name: form.name,
      image: form.image || logoSlack,
      budget: parseInt(form.budget),
      raised: 0,
      status: "open",
      completion: 0,
      deadline: new Date(form.deadline),
    };
    setGoals([newGoal, ...goals]);
    handleCreateClose();
  };

  const handleAllocate = () => {
    if (!selectedGoal || !allocationAmount) return;
    const amount = parseInt(allocationAmount);
    
    if (amount <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }
    
    if (amount > currentBalance) {
      alert(`Insufficient balance. Current balance: $${currentBalance.toLocaleString()}`);
      return;
    }

    setGoals(goals.map(goal => {
      if (goal.id === selectedGoal) {
        const newRaised = goal.raised + amount;
        const completion = Math.min(100, (newRaised / goal.budget) * 100);
        return {
          ...goal,
          raised: newRaised,
          completion,
          status: completion >= 100 ? "closed" : "open"
        };
      }
      return goal;
    }));
    
    setCurrentBalance(currentBalance - amount);
    setAllocationAmount("");
  };

  const handleCloseGoal = (goalId) => {
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        return { ...goal, status: "closed" };
      }
      return goal;
    }));
  };

  return (
    <MDBox pt={6} pb={3}>
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
              justifyContent={{ xs: 'center', md: 'space-between' }}
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Box textAlign={{ xs: 'center', md: 'left' }}>
                <MDTypography variant="h6" color="white">
                  Saving Goals
                </MDTypography>
                <MDTypography variant="caption" color="white" sx={{ opacity: 0.8 }}>
                  Available Balance: ${currentBalance.toLocaleString()}
                </MDTypography>
              </Box>
              <Box>
                <Tooltip title="Create New Goal">
                  <IconButton color="inherit" onClick={handleCreateOpen}>
                    <AddIcon sx={{ color: "#fff" }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Manage Goals">
                  <IconButton color="inherit" onClick={handleManageOpen} sx={{ mr: 1 }}>
                    <SettingsIcon sx={{ color: "#fff" }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </MDBox>
            <MDBox pt={3}>
              <DataTable
                table={{ columns: pColumns, rows: savingGoalsData({ goals }).rows }}
                isSorted={false}
                entriesPerPage={false}
                showTotalEntries={false}
                noEndBorder
                onRowClick={handleGoalClick}
              />
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      {/* Create Goal Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCreateClose}>
        <DialogTitle>Create New Goal</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            name="name"
            fullWidth
            value={form.name}
            onChange={handleChange}
            sx={{
              '& .MuiInputLabel-root': { color: 'text.primary' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputBase-input': { color: 'text.primary' },
            }}            
          />
          <TextField
            margin="dense"
            label="Budget"
            name="budget"
            type="number"
            fullWidth
            value={form.budget}
            onChange={handleChange}
            sx={{
              '& .MuiInputLabel-root': { color: 'text.primary' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputBase-input': { color: 'text.primary' },
            }}            
          />
          <TextField
            margin="dense"
            label="Deadline"
            name="deadline"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.deadline}
            onChange={handleChange}
            sx={{
              '& .MuiInputLabel-root': { color: 'text.primary' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputBase-input': { color: 'text.primary' },
            }}
          />
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCamera />}
              fullWidth
              sx={{ mb: 2, color: "#9e9e9e" }}
            >
              Upload Photo (Optional)
              <input hidden accept="image/*" type="file" onChange={handleImageUpload} />
            </Button>
            {form.image && (
              <Avatar
                src={form.image}
                alt="Goal preview"
                sx={{ 
                  width: 120, 
                  height: 120,
                  border: '2px solid #e0e0e0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>Cancel</Button>
          <Button 
            onClick={handleCreate} 
            variant="contained" 
            sx={{ 
              bgcolor: 'primary.main',
              color: '#fff',
              '&:hover': {
                bgcolor: 'primary.dark',
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Goals Dialog */}
      <Dialog open={manageDialogOpen} onClose={handleManageClose} maxWidth="md" fullWidth>
        <DialogTitle>Manage Goals</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? theme.palette.grey[900]
                    : theme.palette.grey[100],
                borderRadius: 1,
              }}
            >
              <Typography variant="h5" gutterBottom color="text.primary" fontWeight="bold">
                Available Balance: ${currentBalance.toLocaleString()}
              </Typography>
            </Box>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel sx={{ color: 'text.primary' }}>Select Goal</InputLabel>
              <Select
                value={selectedGoal || ""}
                onChange={(e) => setSelectedGoal(e.target.value)}
                label="Select Goal"
                sx={{
                  height: 42, 
                  bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                }}
              >
                {goals.map((goal) => (
                  <MenuItem key={goal.id} value={goal.id}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        width: '100%',
                        py: 1,
                        px: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                      }}>
                      <Avatar 
                        src={goal.image} 
                        alt={goal.name}
                        sx={{ width: 22, height: 22, mr: 1 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontSize: 16, color: 'text.primary' }}>{goal.name}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedGoal && (
              <Box sx={{ 
                p: 2, 
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                borderRadius: 1,
                mb: 2
              }}>
                <TextField
                  margin="dense"
                  label="Allocation Amount"
                  type="number"
                  fullWidth
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(e.target.value)}
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': { color: 'text.primary' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(27, 25, 25, 0.21)' },
                      '&:hover fieldset': { borderColor: 'rgba(26, 24, 24, 0.75)' },
                      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                    },
                    '& .MuiInputBase-input': { color: 'text.primary' },
                  }}
                  error={parseInt(allocationAmount) > currentBalance}
                  helperText={parseInt(allocationAmount) > currentBalance ? "Amount exceeds available balance" : ""}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAllocate}
                    fullWidth
                    sx={{ color: "#fff" }}
                    disabled={!allocationAmount || parseInt(allocationAmount) > currentBalance}
                  >
                    Allocate Funds
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleCloseGoal(selectedGoal)}
                    fullWidth
                    sx={{ 
                      color: "error.main",
                      borderColor: "error.main"
                    }}
                  >
                    Close Goal
                  </Button>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'text.primary' }}>
                Goals Overview
              </Typography>
              {goals.map((goal) => (
                <Box 
                  key={goal.id} 
                  sx={{ 
                    mb: 3,
                    p: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                    borderRadius: 1,
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      src={goal.image} 
                      alt={goal.name}
                      sx={{ width: 30, height: 30, mr: 2 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="medium" color="text.primary">
                        {goal.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {goal.status.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: '100%', mr: 1, position: 'relative' }}>
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(172, 20, 20, 0.06)',
                          position: 'absolute',
                          width: '100%'
                        }}
                      />
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          position: 'relative',
                          zIndex: 1,
                          width: `${goal.completion}%`,
                          backgroundColor: 
                            goal.completion <= 30 ? 'error.main' :
                            goal.completion <= 70 ? 'info.main' :
                            'success.main'
                        }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 45 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="medium">
                        {`${Math.round(goal.completion)}%`}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Raised: ${goal.raised.toLocaleString()} / ${goal.budget.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleManageClose}
            variant="contained"
            color="primary"
            fullWidth
            sx={{ color: "#fff" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </MDBox>
  );
}

// Typechecking props for the SavingGoalsTable
SavingGoalsTable.propTypes = {
  data: PropTypes.shape({
    goals: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        image: PropTypes.string,
        budget: PropTypes.number.isRequired,
        raised: PropTypes.number.isRequired,
        status: PropTypes.oneOf(['open', 'closed']).isRequired,
        completion: PropTypes.number.isRequired,
      })
    ),
  }),
};

export default SavingGoalsTable;
