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

function DepositModal({ open, onClose }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = () => {
    console.log("Deposit:", { paymentMethod, amount });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
          color: darkMode ? "#ffffff" : "#000000",
          border: `1px solid ${darkMode ? "#333333" : "#e0e0e0"}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
          borderBottom: `1px solid ${darkMode ? "#333333" : "#e0e0e0"}`,
        }}
      >
        <MDTypography variant="h6" fontWeight="medium" color={darkMode ? "white" : "dark"}>
          Deposit Money
        </MDTypography>
      </DialogTitle>

      <DialogContent
        sx={{
          backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
          "& .MuiInputBase-root": {
            backgroundColor: darkMode ? "#2a2a2a" : "#fafafa",
            color: darkMode ? "#ffffff" : "#000000",
            border: `1px solid ${darkMode ? "#444444" : "#e0e0e0"}`,
            "&:hover": {
              borderColor: darkMode ? "#666666" : "#999999",
            },
          },
          "& .MuiInputLabel-root": {
            color: darkMode ? "#cccccc" : "#666666",
          },
          "& .MuiSelect-select": {
            color: darkMode ? "#ffffff" : "#000000",
          },
        }}
      >
        <MDBox component="form" role="form" mt={2}>
          <MDBox mb={4}>
            <FormControl fullWidth size="large">
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-label"
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
                      color: darkMode ? "#ffffff" : "#000000",
                      "& .MuiMenuItem-root": {
                        color: darkMode ? "#ffffff" : "#000000",
                        "&:hover": {
                          backgroundColor: darkMode ? "#333333" : "#f5f5f5",
                        },
                        "&.Mui-selected": {
                          backgroundColor: darkMode ? "#1976d2" : "#e3f2fd",
                          color: "#ffffff",
                          "&:hover": {
                            backgroundColor: darkMode ? "#1565c0" : "#bbdefb",
                          },
                        },
                      },
                    },
                  },
                }}
                sx={{
                  height: "45px",
                  "& .MuiSelect-select": {
                    paddingTop: "10px",
                    paddingBottom: "10px",
                  },
                }}
              >
                <MenuItem
                  value="mpesa"
                  sx={{
                    py: 1.5,
                    color: darkMode ? "#ffffff" : "#000000",
                    "&:hover": {
                      backgroundColor: darkMode ? "#333333" : "#f5f5f5",
                    },
                    "&.Mui-selected": {
                      backgroundColor: darkMode ? "#1976d2" : "#e3f2fd",
                      color: "#ffffff",
                      "&:hover": {
                        backgroundColor: darkMode ? "#1565c0" : "#bbdefb",
                      },
                    },
                  }}
                >
                  <MDBox display="flex" alignItems="center" sx={{ color: "inherit" }}>
                    <Icon sx={{ mr: 1, color: "inherit" }}>phone_android</Icon>
                    M-Pesa
                  </MDBox>
                </MenuItem>

                <MenuItem
                  value="card"
                  sx={{
                    py: 1.5,
                    color: darkMode ? "#ffffff" : "#000000",
                    "&:hover": {
                      backgroundColor: darkMode ? "#333333" : "#f5f5f5",
                    },
                    "&.Mui-selected": {
                      backgroundColor: darkMode ? "#1976d2" : "#e3f2fd",
                      color: "#ffffff",
                      "&:hover": {
                        backgroundColor: darkMode ? "#1565c0" : "#bbdefb",
                      },
                    },
                  }}
                >
                  <MDBox display="flex" alignItems="center" sx={{ color: "inherit" }}>
                    <Icon sx={{ mr: 1, color: "inherit" }}>credit_card</Icon>
                    Debit/Credit Card
                  </MDBox>
                </MenuItem>

                <MenuItem
                  value="bank"
                  sx={{
                    py: 1.5,
                    color: darkMode ? "#ffffff" : "#000000",
                    "&:hover": {
                      backgroundColor: darkMode ? "#333333" : "#f5f5f5",
                    },
                    "&.Mui-selected": {
                      backgroundColor: darkMode ? "#1976d2" : "#e3f2fd",
                      color: "#ffffff",
                      "&:hover": {
                        backgroundColor: darkMode ? "#1565c0" : "#bbdefb",
                      },
                    },
                  }}
                >
                  <MDBox display="flex" alignItems="center" sx={{ color: "inherit" }}>
                    <Icon sx={{ mr: 1, color: "inherit" }}>account_balance</Icon>
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
                startAdornment: (
                  <Box
                    component="span"
                    mr={1}
                    sx={{
                      color: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                      fontWeight: 500,
                    }}
                  >
                    Kes
                  </Box>
                ),
              }}
            />
          </MDBox>

          {paymentMethod === "mpesa" && (
            <MDBox mb={2}>
              <TextField fullWidth label="Phone Number" placeholder="254700000000" />
            </MDBox>
          )}

          {paymentMethod === "card" && (
            <>
              <MDBox mb={2}>
                <TextField fullWidth label="Card Number" placeholder="**** **** **** ****" />
              </MDBox>
              <MDBox mb={2} display="flex" gap={2}>
                <TextField label="Expiry Date" placeholder="MM/YY" />
                <TextField label="CVV" placeholder="***" />
              </MDBox>
            </>
          )}

          {paymentMethod === "bank" && (
            <MDBox mb={2}>
              <TextField fullWidth label="Account Number" placeholder="Enter your bank account number" />
            </MDBox>
          )}
        </MDBox>
      </DialogContent>

      <DialogActions
        sx={{
          backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
          borderTop: `1px solid ${darkMode ? "#333333" : "#e0e0e0"}`,
        }}
      >
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
