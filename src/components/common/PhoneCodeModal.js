import React, { useState } from "react";
import { Modal, Box, Typography, TextField, Button, CircularProgress, Alert } from "@mui/material";

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 350,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

function PhoneCodeModal({ open, onClose, onSubmit, loading, error, phoneNumber }) {
  const [code, setCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(code);
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="phone-code-modal-title">
      <Box sx={style}>
        <Typography id="phone-code-modal-title" variant="h6" mb={2}>
          Enter Verification Code
        </Typography>
        <Typography variant="body2" mb={2}>
          A code was sent to <b>{phoneNumber}</b>
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Verification Code"
            value={code}
            onChange={e => setCode(e.target.value)}
            fullWidth
            margin="normal"
            autoFocus
            required
          />
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button onClick={onClose} disabled={loading} sx={{ mr: 1 }}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Verify"}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
}

export default PhoneCodeModal; 