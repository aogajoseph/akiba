import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

function Logout() {
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut(auth);
        navigate("/auth/sign-in");
      } catch (error) {
        console.error("Error logging out:", error);
      }
    };

    handleLogout();
  }, [auth, navigate]);

  return null;
}

export default Logout;