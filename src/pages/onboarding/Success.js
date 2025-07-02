import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuccessCard from "components/onboarding/SuccessCard";
import { CircularProgress, Box, Typography } from "@mui/material";
import firebase from "../../firebase";
import "firebase/auth";
import "firebase/firestore";

const Success = () => {
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = firebase.auth();
  const db = firebase.firestore();

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not found");
        const docRef = db.collection("accounts").doc(user.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          setAccountName(docSnap.data().accountName);
          setAccountId(user.uid);
        } else {
          setError("Account not found");
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAccount();
  }, [auth, db]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
  }
  if (error) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><Typography color="error">{error}</Typography></Box>;
  }

  return <SuccessCard accountName={accountName} accountId={accountId} onProceed={() => navigate("/dashboard")} />;
};

export default Success; 