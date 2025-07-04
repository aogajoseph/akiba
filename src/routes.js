/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

/** 
  All of the routes for the Material Dashboard 2 React are added here,
  You can add a new route, customize the routes and delete the routes here.

  Once you add a new route on this file it will be visible automatically on
  the Sidenav.

  For adding a new route you can follow the existing routes in the routes array.
  1. The `type` key with the `collapse` value is used for a route.
  2. The `type` key with the `title` value is used for a title inside the Sidenav. 
  3. The `type` key with the `divider` value is used for a divider between Sidenav items.
  4. The `name` key is used for the name of the route on the Sidenav.
  5. The `key` key is used for the key of the route (It will help you with the key prop inside a loop).
  6. The `icon` key is used for the icon of the route on the Sidenav, you have to add a node.
  7. The `collapse` key is used for making a collapsible item on the Sidenav that has other routes
  inside (nested routes), you need to pass the nested routes inside an array as a value for the `collapse` key.
  8. The `route` key is used to store the route location which is used for the react router.
  9. The `href` key is used to store the external links location.
  10. The `title` key is only for the item with the type of `title` and its used for the title text on the Sidenav.
  10. The `component` key is used to store the component of its route.
*/

// Material Dashboard 2 React layouts
import Home from "pages/dashboard/Home";
import Profile from "layouts/profile";
import Chat from "layouts/chat";
import Forum from "layouts/forum";
import Account from "layouts/account";
import Statements from "layouts/statements";
import Members from "layouts/members";
import SignIn from "pages/auth/SignIn";
import SignUp from "pages/auth/SignUp";
import Logout from "pages/auth/Logout";
import ResetPassword from "pages/auth/ResetPassword";
import InfoPage from "layouts/info";
import AccountSetup from "pages/onboarding/AccountSetup";
import ProfileSetup from "pages/onboarding/ProfileSetup";
import Success from "pages/onboarding/Success";
import ProtectedRoute from "components/common/ProtectedRoute";
import OnboardingGuard from "components/common/OnboardingGuard";

// @mui icons
import Icon from "@mui/material/Icon";

const routes = [
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <OnboardingGuard><Home /></OnboardingGuard>,
  },
  {
    type: "collapse",
    name: "Account",
    key: "account",
    icon: <Icon fontSize="small">work</Icon>,
    route: "/account",
    component: <OnboardingGuard><Account /></OnboardingGuard>,
  },
  {
    type: "collapse",
    name: "Profile",
    key: "profile",
    icon: <Icon fontSize="small">person</Icon>,
    route: "/profile",
    component: <OnboardingGuard><Profile /></OnboardingGuard>,
  },
  {
    type: "collapse",
    name: "Members",
    key: "members",
    icon: <Icon fontSize="small">people</Icon>,
    route: "/members",
    component: <OnboardingGuard><Members /></OnboardingGuard>,
    noDisplay: true,
  },
  {
    type: "collapse",
    name: "Chat",
    key: "chat",
    icon: <Icon fontSize="small">chat</Icon>,
    route: "/chat",
    component: <OnboardingGuard><Chat /></OnboardingGuard>,
  },
  {
    type: "collapse",
    name: "Forum",
    key: "forum",
    icon: <Icon fontSize="small">forum</Icon>,
    route: "/forum",
    component: <OnboardingGuard><Forum /></OnboardingGuard>,
  },
  {
    type: "collapse",
    name: "Reports",
    key: "statements",
    icon: <Icon fontSize="small">receipt_long</Icon>,
    route: "/statements",
    component: <OnboardingGuard><Statements /></OnboardingGuard>,
  },
  {
    type: "auth",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/auth/sign-in",
    component: <SignIn />,
    noDisplay: true,
  },
  {
    type: "auth",
    name: "Sign Up",
    key: "sign-up",
    icon: <Icon fontSize="small">person_add</Icon>,
    route: "/auth/sign-up",
    component: <SignUp />,
    noDisplay: true,
  },
  {
    type: "auth",
    name: "Reset Password",
    key: "reset-password",
    icon: <Icon fontSize="small">lock_reset</Icon>,
    route: "/auth/reset-password",
    component: <ResetPassword />,
    noDisplay: true,
  },
  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    icon: <Icon fontSize="small">logout</Icon>,
    route: "/auth/sign-in",
    component: <Logout />,
  },
  {
    type: "info",
    name: "Info",
    key: "info",
    route: "/info",
    component: <InfoPage />,
    noDisplay: true,
  },
  {
    type: "onboarding",
    name: "Account Setup",
    key: "account-setup",
    route: "/onboarding/account-setup",
    component: <ProtectedRoute requireVerified={true}><AccountSetup /></ProtectedRoute>,
    noDisplay: true,
  },
  {
    type: "onboarding",
    name: "Profile Setup",
    key: "profile-setup",
    route: "/onboarding/profile-setup",
    component: <ProtectedRoute requireVerified={true}><ProfileSetup /></ProtectedRoute>,
    noDisplay: true,
  },
  {
    type: "onboarding",
    name: "Success",
    key: "onboarding-success",
    route: "/onboarding/success",
    component: <ProtectedRoute requireVerified={true}><Success /></ProtectedRoute>,
    noDisplay: true,
  },
];

export default routes;
