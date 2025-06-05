import React from 'react';
import PropTypes from 'prop-types';
import { Button, CircularProgress } from '@mui/material';
import MDBox from 'components/MDBox';

function LoadingButton({ loading, children, ...props }) {
  return (
    <Button
      disabled={loading}
      {...props}
    >
      {loading ? (
        <MDBox display="flex" alignItems="center">
          <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
          Loading...
        </MDBox>
      ) : children}
    </Button>
  );
}

LoadingButton.propTypes = {
  loading: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

LoadingButton.defaultProps = {
  loading: false,
};

export default LoadingButton; 