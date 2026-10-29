'use client';
import { Box, Container, IconButton, Link, Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import Sitemark from './SitemarkIcon';
const product=[['About','#hero'],['Features','#features'],['How It Works','#how-it-works'],['Getting Started','#getting-started'],['Pricing','#pricing'],['FAQs','#faq']];
const company=[['About Us','https://globe-rosy-two.vercel.app/about'],['Divisions','https://globe-rosy-two.vercel.app/divisions'],['IPs','https://globe-rosy-two.vercel.app/ips'],['Blog','https://globe-rosy-two.vercel.app/blog']];
const legal=[['Terms','/terms'],['Privacy','/privacy']];
function LinkColumn({title,items}:{title:string,items:string[][]}){return <Stack spacing={1.4}><Typography variant="body2" sx={{fontWeight:'medium'}}>{title}</Typography>{items.map(([label,href])=><Link key={label} href={href} underline="hover" color="text.secondary" variant="body2">{label}</Link>)}</Stack>}
export default function Footer(){const share=()=>{const url=window.location.origin+'/welcome';if(navigator.share){void navigator.share({title:'Akiba — Do more together',url}).catch(()=>{});}else if(navigator.clipboard){void navigator.clipboard.writeText(url);}};
return <Box component="footer" id="footer" sx={{borderTop:1,borderColor:'divider',py:8}}><Container maxWidth="lg"><Box sx={{display:'flex',flexDirection:{xs:'column',md:'row'},justifyContent:'space-between',alignItems:'flex-start',gap:{xs:4,md:5}}}>
 <Box sx={{flex:{md:"1 1 auto"},minWidth:0}}><Sitemark size="footer"/><Typography variant="body2" sx={{mt:2,maxWidth:320}}>Collaborative financial platform that helps groups to coordinate, communicate and transparently manage shared finances.</Typography><Stack direction="row" alignItems="center" spacing={0.5} sx={{mt:2}}><Typography variant="caption" color="text.secondary">Make others feel the joy of achieving more, together.</Typography><IconButton size="small" aria-label="Share Akiba" onClick={share} sx={{ bgcolor: "transparent", "&:hover": { bgcolor: "transparent" } }}><ShareIcon fontSize="small"/></IconButton></Stack></Box>
 <Stack direction="row" spacing={{xs:3,sm:4}} sx={{ml:{md:"auto"},flexShrink:0}}><LinkColumn title="Product" items={product}/><LinkColumn title="Company" items={company}/><LinkColumn title="Legal" items={legal}/></Stack></Box>
 <Box sx={{borderTop:1,borderColor:'divider',mt:7,pt:3,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:2,alignItems:'center'}}><Box><Typography variant="caption" color="text.secondary" sx={{display:'block'}}>Copyright © 2026 Globe Technologies Ltd · Globe Software Division</Typography></Box><Stack direction="row" spacing={0.5}>
 {[[<YouTubeIcon key="yt"/>,'YouTube'],[<FacebookIcon key="fb"/>,'Facebook'],[<LinkedInIcon key="li"/>,'LinkedIn'],[<GitHubIcon key="gh"/>,'GitHub'],[<XIcon key="x"/>,'X']].map(([icon,name])=><IconButton key={String(name)} aria-label={String(name)} title={String(name)} onClick={() => {}} sx={{color:'text.secondary', "&:hover": { color: "text.primary" }}}>{icon}</IconButton>)}
 </Stack></Box></Container></Box>}