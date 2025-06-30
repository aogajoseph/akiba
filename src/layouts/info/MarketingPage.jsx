import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import MainAppBar from './components/AppBar';
import Hero from './components/Hero';
import GettingStarted from './components/GettingStarted';
import Pricing from './components/Pricing';
import Features from './components/Features';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import Footer from './components/Footer';

export default function MarketingPage(props) {
  return (
    <>
      <CssBaseline />

      <MainAppBar />
      <Hero />
      <div>
        {/* <LogoCollection /> */}
        <Divider />
        <GettingStarted />
        <Divider />
        <Features />
        <Divider />
        <Pricing />
        <Divider />
        <Testimonials />
        <Divider />
        <FAQ />
        <Divider />
        <Footer />
      </div>
    </>
  );
}
