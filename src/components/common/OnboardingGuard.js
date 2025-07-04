import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import firebase from "../../firebase";
import "firebase/auth";
import "firebase/firestore";

const OnboardingGuard = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const user = firebase.auth().currentUser;
      if (!user) {
        setShouldRedirect("/auth/sign-in");
        setLoading(false);
        return;
      }
      await user.reload();
      if (!user.emailVerified) {
        setShouldRedirect("/auth/sign-in");
        setLoading(false);
        return;
      }
      const doc = await firebase.firestore().collection("accounts").doc(user.uid).get();
      if (!doc.exists || !doc.data()?.setupComplete) {
        setShouldRedirect("/onboarding/account-setup");
        setLoading(false);
        return;
      }
      setShouldRedirect(false);
      setLoading(false);
    };
    checkOnboarding();
  }, []);

  if (loading) return null;
  if (shouldRedirect) return <Navigate to={shouldRedirect} replace />;
  return children;
};

export default OnboardingGuard; 