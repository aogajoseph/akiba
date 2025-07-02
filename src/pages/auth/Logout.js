import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import firebase from "../../firebase";
import "firebase/auth";

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await firebase.auth().signOut();
        navigate("/auth/sign-in");
      } catch (error) {
        console.error("Error logging out:", error);
      }
    };

    handleLogout();
  }, [navigate]);

  return null;
}

export default Logout;