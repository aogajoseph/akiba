'use client';
import { Box, Container, IconButton, Link, Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import Sitemark from './SitemarkIcon';
const product=[['About','#hero'],['Features','#features'],['How it works','#how-it-works'],['Getting Started','#getting-started'],['Pricing','#pricing'],['FAQs','#faq']];
const company=[['About Us','https://globe-rosy-two.vercel.app/'],['Divisions','https://globe-rosy-two.vercel.app/divisions'],['IPs','https://globe-rosy-two.vercel.app/ips'],['Blog','https://globe-rosy-two.vercel.app/blog']];
const legal=[['Terms','/terms'],['Privacy','/privacy']];
function LinkColumn({title,items}:{title:string,items:string[][]}){return <Stack spacing={1.4}><Typography variant="body2" sx={{fontWeight:'medium'}}>{title}</Typography>{items.map(([label,href])=><Link key={label} href={href} underline="hover" color="text.secondary" variant="body2">{label}</Link>)}</Stack>}
export default function Footer(){const share=()=>{const url=window.location.origin+'/welcome';if(navigator.share){void navigator.share({title:'Akiba — Do more together',url}).catch(()=>{});}else if(navigator.clipboard){void navigator.clipboard.writeText(url);}};
return <Box component="footer" id="footer" sx={{borderTop:1,borderColor:'divider',py:8}}><Container maxWidth="lg"><Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr 1fr',md:'2fr 1fr 1fr 1fr'},gap:5}}>
 <Box sx={{gridColumn:{xs:'1 / -1',md:'auto'}}}><Sitemark/><Typography variant="body2" sx={{mt:2,maxWidth:320}}>Finance coordination platform for events and shared goals.</Typography><Stack direction="row" alignItems="center" spacing={0.5} sx={{mt:2}}><Typography variant="caption" color="text.secondary">Share the joy of doing more together.</Typography><IconButton size="small" aria-label="Share Akiba" onClick={share}><ShareIcon fontSize="small"/></IconButton></Stack></Box>
 <LinkColumn title="Akiba" items={product}/><LinkColumn title="Company" items={company}/><LinkColumn title="Legal" items={legal}/></Box>
 <Box sx={{borderTop:1,borderColor:'divider',mt:7,pt:3,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:2,alignItems:'center'}}><Box><Stack direction="row" spacing={2}><Link href="/terms" variant="body2">Terms of Service</Link><Link href="/privacy" variant="body2">Privacy Policy</Link></Stack><Typography variant="caption" color="text.secondary" sx={{display:'block',mt:1}}>Copyright © 2026 Globe Technologies Ltd · Globe Software Division</Typography></Box><Stack direction="row" spacing={0.5}>
 {[[<YouTubeIcon key="yt"/>,'YouTube'],[<FacebookIcon key="fb"/>,'Facebook'],[<LinkedInIcon key="li"/>,'LinkedIn'],[<GitHubIcon key="gh"/>,'GitHub'],[<XIcon key="x"/>,'X']].map(([icon,name])=><IconButton key={String(name)} aria-label={String(name)} title={String(name)} disabled sx={{color:'text.secondary'}}>{icon}</IconButton>)}
 </Stack></Box><Typography variant="caption" color="text.secondary">Social profiles will be linked when official Akiba accounts are available.</Typography></Container></Box>}