import React from "react";
import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const ProtectedRoute = ({ children, requireVerified = false }) => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    // Not logged in
    return <Navigate to="/auth/sign-in" replace />;
  }
  if (requireVerified && !user.emailVerified) {
    // Not verified
    return <Navigate to="/auth/sign-in" replace state={{ verify: true }} />;
  }
  return children;
};

export default ProtectedRoute; 