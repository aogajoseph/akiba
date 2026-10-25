'use client';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import AppTheme from './shared-theme/AppTheme';
import AppAppBar from './components/AppAppBar';
import Hero from './components/Hero';
import LogoCollection from './components/LogoCollection';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import GettingStarted from './components/GettingStarted';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
export default function MarketingPage(props:{disableCustomTheme?:boolean}){return <AppTheme {...props}><CssBaseline enableColorScheme/><AppAppBar/><Hero/><LogoCollection/><Features/><Divider/><HowItWorks/><GettingStarted/><Divider/><Pricing/><Divider/><FAQ/><Divider/><Footer/></AppTheme>}