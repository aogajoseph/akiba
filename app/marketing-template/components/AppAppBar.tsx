import * as React from 'react';
import { AppBar, Box, Button, Container, Drawer, IconButton, MenuItem, Toolbar } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ColorModeIconDropdown from '../shared-theme/ColorModeIconDropdown';
import Sitemark from './SitemarkIcon';
const links = [["About","#hero"],["Features","#features"],["How it works","#how-it-works"],["Getting Started","#getting-started"],["Pricing","#pricing"],["FAQs","#faq"]];
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 flexShrink: 0,
 borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
 backdropFilter: 'blur(24px)',
 border: '1px solid',
 borderColor: (theme.vars || theme).palette.divider,
 backgroundColor: theme.vars
   ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.4)`
   : alpha(theme.palette.background.default, 0.4),
 boxShadow: (theme.vars || theme).shadows[1],
 padding: '8px 12px',
}));
export default function AppAppBar() {
 const [open,setOpen]=React.useState(false);
 const [activeSection,setActiveSection]=React.useState('hero');
 React.useEffect(()=>{
  const ids=links.map(([,href])=>href.slice(1));
  const sections=ids.map(id=>document.getElementById(id)).filter(Boolean) as HTMLElement[];
  if(!sections.length)return;
  const observer=new IntersectionObserver(entries=>{
   const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
   if(visible[0])setActiveSection(visible[0].target.id);
  },{rootMargin:'-20% 0px -65% 0px',threshold:[0,0.1,0.25,0.5]});
  sections.forEach(section=>observer.observe(section));
  return()=>observer.disconnect();
 },[]);
 return <AppBar position="fixed" enableColorOnDark sx={{boxShadow:0,bgcolor:'transparent',backgroundImage:'none',mt:'calc(var(--template-frame-height, 0px) + 28px)'}}>
 <Container maxWidth="lg"><StyledToolbar variant="dense" disableGutters sx={{gap:1,minHeight:48,'&.MuiToolbar-root':{minHeight:48}}}>
 <Box sx={{flex:1,display:'flex',alignItems:'center',minWidth:0}}><Sitemark/></Box>
 <Box component="nav" sx={{display:{xs:'none',lg:'flex'},justifyContent:'center',gap:0,flex:3}}>
 {links.map(([label,href])=><Button key={href} href={href} color="inherit" size="small" sx={{textTransform:'none',whiteSpace:'nowrap',px:1,minWidth:0,position:'relative',borderRadius:0,'&::after':{content:'\"\"',position:'absolute',left:0,bottom:0,height:'2px',width:activeSection===href.slice(1)?'100%':'0%',bgcolor:'#E91E78',transition:'width 240ms ease'},'&:hover::after':{width:'100%'}}}>{label}</Button>)}
 </Box>
 <Box sx={{flex:1,display:{xs:'none',lg:'flex'},justifyContent:'flex-end',alignItems:'center',gap:1}}>
 <Button href="/login" size="small" sx={{whiteSpace:'nowrap',minWidth:'max-content'}}>Sign In</Button><Button href="/signup" variant="contained" size="small" sx={{whiteSpace:'nowrap',minWidth:'max-content'}}>Sign Up</Button><ColorModeIconDropdown/>
 </Box>
 <Box sx={{display:{xs:'flex',lg:'none'},alignItems:'center',gap:1}}><ColorModeIconDropdown/><IconButton aria-label="Open navigation" onClick={()=>setOpen(true)}><MenuIcon/></IconButton></Box>
 </StyledToolbar></Container>
 <Drawer anchor="top" open={open} onClose={()=>setOpen(false)}><Box sx={{p:3,pt:5}}><IconButton aria-label="Close navigation" onClick={()=>setOpen(false)}><CloseIcon/></IconButton>{links.map(([label,href])=><MenuItem key={href} component="a" href={href} onClick={()=>setOpen(false)}>{label}</MenuItem>)}<Button fullWidth href="/login" sx={{whiteSpace:'nowrap'}}>Sign In</Button><Button fullWidth href="/signup" variant="contained" sx={{whiteSpace:'nowrap'}}>Sign Up</Button></Box></Drawer>
 </AppBar>;
}