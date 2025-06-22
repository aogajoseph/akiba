import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Icon,
} from "@mui/material";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React context
import { useMaterialUIController } from "context";

function WithdrawModal({ open, onClose }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const [withdrawalType, setWithdrawalType] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientDetails, setRecipientDetails] = useState({
    name: "",
    contact: "",
    accountNumber: "",
  });
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    console.log("Withdrawal:", { withdrawalType, amount, recipientDetails, reason });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ backgroundColor: darkMode ? "#1a1a1a" : "#fff" }}>
        <MDTypography variant="h6" fontWeight="medium" color={darkMode ? "white" : "dark"}>
          Withdraw / Transfer Money
        </MDTypography>
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: darkMode ? "#1a1a1a" : "#fff" }}>
        <MDBox component="form" role="form" mt={2}>
          <MDBox mb={4}>
            <FormControl fullWidth size="large">
              <InputLabel
                id="withdrawal-type-label"
                sx={{ color: darkMode ? "#ccc" : undefined }}
              >
                Transfer Type
              </InputLabel>
              <Select
                labelId="withdrawal-type-label"
                value={withdrawalType}
                label="Transfer Type"
                onChange={(e) => setWithdrawalType(e.target.value)}
                sx={{
                  height: "45px",
                  backgroundColor: darkMode ? "#2a2a2a" : "#fafafa",
                  color: darkMode ? "#fff" : "#000",
                  "& .MuiSelect-icon": {
                    color: darkMode ? "#fff" : "#000",
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: darkMode ? "#2a2a2a" : "#fff",
                      color: darkMode ? "#fff" : "#000",
                    },
                  },
                }}
              >
                {[
                  { value: "mpesa", icon: "phone_android", label: "M-Pesa Transfer" },
                  { value: "bank", icon: "account_balance", label: "Bank Transfer" },
                  { value: "akiba", icon: "swap_horiz", label: "Akiba Transfer" },
                ].map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{
                      color: darkMode ? "#fff" : "#000",
                      "&:hover": {
                        backgroundColor: darkMode ? "#333" : "#f5f5f5",
                      },
                      "&.Mui-selected": {
                        backgroundColor: darkMode ? "#1976d2" : "#e3f2fd",
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: darkMode ? "#1565c0" : "#bbdefb",
                        },
                      },
                    }}
                  >
                    <MDBox display="flex" alignItems="center" sx={{ color: "inherit" }}>
                      <Icon sx={{ mr: 1, color: "inherit" }}>{option.icon}</Icon>
                      {option.label}
                    </MDBox>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MDBox>

          <MDBox mb={3}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Box
                    component="span"
                    mr={1}
                    sx={{ color: darkMode ? "#fff" : "#000", fontWeight: 500 }}
                  >
                    Kes
                  </Box>
                ),
              }}
            />
          </MDBox>

          {/* Conditional Fields */}
          {withdrawalType === "mpesa" && (
            <MDBox mb={3}>
              <TextField
                fullWidth
                label="Recipient Name"
                value={recipientDetails.name}
                onChange={(e) => setRecipientDetails({ ...recipientDetails, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="M-Pesa Number"
                placeholder="254700000000"
                value={recipientDetails.contact}
                onChange={(e) =>
                  setRecipientDetails({ ...recipientDetails, contact: e.target.value })
                }
              />
            </MDBox>
          )}

          {withdrawalType === "bank" && (
            <MDBox mb={3}>
              <TextField
                fullWidth
                label="Bank Account Name"
                value={recipientDetails.name}
                onChange={(e) => setRecipientDetails({ ...recipientDetails, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Bank Account Number"
                value={recipientDetails.accountNumber}
                onChange={(e) =>
                  setRecipientDetails({ ...recipientDetails, accountNumber: e.target.value })
                }
              />
            </MDBox>
          )}

          {withdrawalType === "akiba" && (
            <MDBox mb={3}>
              <TextField
                fullWidth
                label="Akiba Account Name"
                value={recipientDetails.name}
                onChange={(e) => setRecipientDetails({ ...recipientDetails, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Akiba Account Number"
                value={recipientDetails.accountNumber}
                onChange={(e) =>
                  setRecipientDetails({ ...recipientDetails, accountNumber: e.target.value })
                }
              />
            </MDBox>
          )}

          {withdrawalType && (
            <MDBox mb={3}>
              <TextField
                fullWidth
                label="Reason for Transfer"
                placeholder="e.g. Rent Payment, School Fees, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                multiline
                rows={2}
              />
            </MDBox>
          )}
        </MDBox>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: darkMode ? "#1a1a1a" : "#fff" }}>
        <MDButton onClick={onClose} color="secondary">
          Cancel
        </MDButton>
        <MDButton onClick={handleSubmit} color="info" variant="gradient">
          Submit for Approval
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

WithdrawModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default WithdrawModal;
