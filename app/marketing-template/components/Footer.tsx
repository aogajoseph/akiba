'use client';
import { useState } from 'react';
import { Box, Button, Container, Dialog, DialogContent, DialogTitle, IconButton, Link, Snackbar, Stack, Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Sitemark from './SitemarkIcon';
const product=[['About','#hero'],['Features','#features'],['How It Works','#how-it-works'],['Getting Started','#getting-started'],['Pricing','#pricing'],['FAQs','#faq']];
const company=[['About Us','https://globe-rosy-two.vercel.app/about'],['Divisions','https://globe-rosy-two.vercel.app/divisions'],['IPs','https://globe-rosy-two.vercel.app/ips'],['Blog','https://globe-rosy-two.vercel.app/blog']];
const legal=[['Terms','/terms'],['Privacy','/privacy']];
function LinkColumn({title,items}:{title:string,items:string[][]}){return <Stack spacing={1.4}><Typography variant="body2" sx={{fontWeight:'medium'}}>{title}</Typography>{items.map(([label,href])=><Link key={label} href={href} underline="hover" color="text.secondary" variant="body2">{label}</Link>)}</Stack>}
export default function Footer(){
 const [shareOpen,setShareOpen]=useState(false);
 const [shareMessage,setShareMessage]=useState('');
 const getShareUrl=()=>window.location.origin+window.location.pathname;
 const getShareText=()=> 'Share the joy of doing more, together. Check out Akiba: '+getShareUrl();
 const openShareLink=(url:string)=>{window.open(url,'_blank','noopener,noreferrer');setShareOpen(false);};
 const shareToWhatsApp=()=>openShareLink('https://wa.me/?text='+encodeURIComponent(getShareText()));
 const shareToFacebook=()=>openShareLink('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(getShareUrl()));
 const shareToX=()=>openShareLink('https://twitter.com/intent/tweet?text='+encodeURIComponent('Share the joy of doing more, together. Check out Akiba')+'&url='+encodeURIComponent(getShareUrl()));
 const shareToLinkedIn=()=>openShareLink('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(getShareUrl()));
 const copyLink=async()=>{const url=getShareUrl();try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);}else{const input=document.createElement('textarea');input.value=url;input.setAttribute('readonly','');input.style.position='absolute';input.style.left='-9999px';document.body.appendChild(input);input.select();const copied=document.execCommand('copy');document.body.removeChild(input);if(!copied)throw new Error('Copy failed');}setShareOpen(false);setShareMessage('Page link copied.');}catch{setShareMessage('Unable to copy the link. Please copy the page URL from your browser.');}};
 return <Box component="footer" id="footer" sx={{borderTop:1,borderColor:'divider',py:8}}><Container maxWidth="lg"><Box sx={{display:'flex',flexDirection:{xs:'column',md:'row'},justifyContent:'space-between',alignItems:'flex-start',gap:{xs:4,md:5}}}>
 <Box sx={{flex:{md:"1 1 auto"},minWidth:0}}><Sitemark size="footer"/><Typography variant="body2" sx={{mt:2,maxWidth:320}}>Group finance coordination platform, helping people plan events and achieve shared goals transparently.</Typography><Stack direction="row" alignItems="center" spacing={0.5} sx={{mt:2}}><Typography variant="caption" color="text.secondary">Share the joy of doing more, together.</Typography><IconButton size="small" aria-label="Share Akiba" onClick={()=>setShareOpen(true)} sx={{ bgcolor: "transparent", "&:hover": { bgcolor: "transparent" } }}><ShareIcon fontSize="small"/></IconButton></Stack></Box>
 <Stack direction="row" spacing={{xs:3,sm:4}} sx={{ml:{md:"auto"},flexShrink:0}}><LinkColumn title="Product" items={product}/><LinkColumn title="Company" items={company}/><LinkColumn title="Legal" items={legal}/></Stack></Box>
 <Box sx={{borderTop:1,borderColor:'divider',mt:7,pt:3,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:2,alignItems:'center'}}><Box><Typography variant="caption" color="text.secondary" sx={{display:'block'}}>Copyright © 2026 Globe Technologies Ltd · Globe Software Division</Typography></Box><Stack direction="row" spacing={0.5}>
 {[[<YouTubeIcon key="yt"/>,'YouTube'],[<FacebookIcon key="fb"/>,'Facebook'],[<LinkedInIcon key="li"/>,'LinkedIn'],[<GitHubIcon key="gh"/>,'GitHub'],[<XIcon key="x"/>,'X']].map(([icon,name])=><IconButton key={String(name)} aria-label={String(name)} title={String(name)} onClick={() => {}} sx={{color:'text.secondary', "&:hover": { color: "text.primary" }}}>{icon}</IconButton>)}
 </Stack></Box></Container>
 <Dialog open={shareOpen} onClose={()=>setShareOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Share Akiba</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{mb:2}}>Share the joy of doing more, together.</Typography><Stack spacing={1}><Button fullWidth variant="outlined" startIcon={<WhatsAppIcon/>} onClick={shareToWhatsApp}>WhatsApp</Button><Button fullWidth variant="outlined" startIcon={<FacebookIcon/>} onClick={shareToFacebook}>Facebook</Button><Button fullWidth variant="outlined" startIcon={<XIcon/>} onClick={shareToX}>X</Button><Button fullWidth variant="outlined" startIcon={<LinkedInIcon/>} onClick={shareToLinkedIn}>LinkedIn</Button><Button fullWidth variant="outlined" startIcon={<ContentCopyIcon/>} onClick={copyLink}>Copy link</Button></Stack></DialogContent></Dialog>
 <Snackbar open={Boolean(shareMessage)} autoHideDuration={3500} onClose={()=>setShareMessage('')} message={shareMessage}/>
 </Box>
}
