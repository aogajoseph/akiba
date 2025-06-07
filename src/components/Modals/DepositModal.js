import { useState } from "react";
import PropTypes from "prop-types";

// @mui material components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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

function DepositModal({ open, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = () => {
    // TODO: Implement deposit logic
    console.log("Deposit:", { paymentMethod, amount });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <MDTypography variant="h6" fontWeight="medium">
          Deposit Money
        </MDTypography>
      </DialogTitle>
      <DialogContent>
        <MDBox component="form" role="form" mt={2}>
          <MDBox mb={4}>
            <FormControl fullWidth size="large">
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-label"
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
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
                    M-Pesa
                  </MDBox>
                </MenuItem>
                <MenuItem value="card" sx={{ py: 1.5 }}>
                  <MDBox display="flex" alignItems="center">
                    <Icon sx={{ mr: 1 }}>credit_card</Icon>
                    Debit/Credit Card
                  </MDBox>
                </MenuItem>
                <MenuItem value="bank" sx={{ py: 1.5 }}>
                  <MDBox display="flex" alignItems="center">
                    <Icon sx={{ mr: 1 }}>account_balance</Icon>
                    Bank Transfer
                  </MDBox>
                </MenuItem>
              </Select>
            </FormControl>
          </MDBox>
          <MDBox mb={2}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: <Box component="span" mr={1}>KES</Box>,
              }}
            />
          </MDBox>
          {paymentMethod === "mpesa" && (
            <MDBox mb={2}>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="254700000000"
              />
            </MDBox>
          )}
          {paymentMethod === "card" && (
            <>
              <MDBox mb={2}>
                <TextField
                  fullWidth
                  label="Card Number"
                  placeholder="**** **** **** ****"
                />
              </MDBox>
              <MDBox mb={2} display="flex" gap={2}>
                <TextField
                  label="Expiry Date"
                  placeholder="MM/YY"
                />
                <TextField
                  label="CVV"
                  placeholder="***"
                />
              </MDBox>
            </>
          )}
          {paymentMethod === "bank" && (
            <MDBox mb={2}>
              <TextField
                fullWidth
                label="Account Number"
                placeholder="Enter your bank account number"
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
          Deposit
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

DepositModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DepositModal; 