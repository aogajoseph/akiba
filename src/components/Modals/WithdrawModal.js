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

function WithdrawModal({ open, onClose }) {
  const [withdrawalType, setWithdrawalType] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientDetails, setRecipientDetails] = useState({
    name: "",
    contact: "",
    accountNumber: "",
  });
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    // TODO: Implement withdrawal/transfer logic
    console.log("Withdrawal:", { withdrawalType, amount, recipientDetails, reason });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <MDTypography variant="h6" fontWeight="medium">
          Withdraw / Transfer Money
        </MDTypography>
      </DialogTitle>
      <DialogContent>
        <MDBox component="form" role="form" mt={2}>
          <MDBox mb={4}>
            <FormControl fullWidth size="large">
              <InputLabel id="withdrawal-type-label">Transfer Type</InputLabel>
              <Select
                labelId="withdrawal-type-label"
                value={withdrawalType}
                label="Transfer Type"
                onChange={(e) => setWithdrawalType(e.target.value)}
                sx={{
                  height: "45px",
                  "& .MuiSelect-select": {
                    paddingTop: "10px",
                    paddingBottom: "10px",
                  },
                }}
              >
                <MenuItem value="mpesa" sx={{ py: 1.5 }}>
                  <MDBox display="flex" alignItems="center">
                    <Icon sx={{ mr: 1 }}>phone_android</Icon>
                    M-Pesa Transfer
                  </MDBox>
                </MenuItem>
                <MenuItem value="bank" sx={{ py: 1.5 }}>
                  <MDBox display="flex" alignItems="center">
                    <Icon sx={{ mr: 1 }}>account_balance</Icon>
                    Bank Transfer
                  </MDBox>
                </MenuItem>
                <MenuItem value="akiba" sx={{ py: 1.5 }}>
                  <MDBox display="flex" alignItems="center">
                    <Icon sx={{ mr: 1 }}>swap_horiz</Icon>
                    Akiba Transfer
                  </MDBox>
                </MenuItem>
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
                startAdornment: <Box component="span" mr={1}>Kes</Box>,
              }}
            />
          </MDBox>

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
                onChange={(e) => setRecipientDetails({ ...recipientDetails, contact: e.target.value })}
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
                onChange={(e) => setRecipientDetails({ ...recipientDetails, accountNumber: e.target.value })}
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
                onChange={(e) => setRecipientDetails({ ...recipientDetails, accountNumber: e.target.value })}
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
      <DialogActions>
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

// Typechecking props for the WithdrawModal
WithdrawModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default WithdrawModal; 