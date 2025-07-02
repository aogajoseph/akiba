import React from "react";
import { Navigate } from "react-router-dom";
import firebase from "../../firebase";
import "firebase/auth";

const ProtectedRoute = ({ children, requireVerified = false }) => {
  const user = firebase.auth().currentUser;

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