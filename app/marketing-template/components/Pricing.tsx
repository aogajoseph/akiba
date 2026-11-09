'use client';

import { useState } from 'react';
import { Box, Chip, Container, Grid, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type Scope = 'personal' | 'group';
type Plan = { name: string; price: string; capacity: string; description: string; features: string[]; status?: string };

const plans: Record<Scope, Plan[]> = {
  personal: [
    { name: 'Free', price: '0', capacity: '5 groups', description: 'For organizers of small groups', features: ['Create and manage up to 5 groups', 'Access basic group activities', 'Free forever'] },
    { name: 'Plus', price: '499', capacity: '10 groups', description: 'For basic community organizers', features: ['Create and manage up to 10 groups', 'Up to 5 additional groups compared with Free', 'All basic group activities'], status: 'Coming Soon' },
    { name: 'Premium', price: '999', capacity: '25 groups', description: 'For active community organizers', features: ['Create and manage up to 25 groups', '15 additional groups compared with Plus', 'Highest group allowance'], status: 'Coming Soon' },
  ],
  group: [
    { name: 'Free', price: '0', capacity: '20 members', description: 'For small, close-knit groups', features: ['Up to 20 members', 'Group chat and contributions', 'Basic financial reports'] },
    { name: 'Plus', price: '999', capacity: '200 members', description: 'For growing communities', features: ['Up to 200 members', 'Downloadable financial reports', 'Automatic reminders'] },
    { name: 'Premium', price: '2,499', capacity: '2,000 members', description: 'For large communities', features: ['Up to 2,000 members', 'Everything in Plus', 'Advanced tools and priority support'] },
  ],
};

const guidance = [
  'Personal plans determine how many groups you can create and manage.',
  'Group plans determine group membership capacity and available group features.',
  'Withdrawal charges apply to all plans.',
];

export default function Pricing() {
  const [scope, setScope] = useState<Scope>('personal');
  return (
    <Box id="pricing" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 100 }}>
      <Container maxWidth="lg">
        <Stack alignItems="flex-start" textAlign="left" spacing={1.5} sx={{ mb: 4 }}>
          <Typography variant="h4" component="h2" fontWeight={750}>Akiba Pricing</Typography>
          <Typography variant="body1" color="text.secondary">Start for free. Upgrade as your groups and communities grow.</Typography>
          <Stack alignItems="center" textAlign="center" spacing={1.5} sx={{ width: '100%', mt: 2 }}>
            <ToggleButtonGroup
              exclusive value={scope}
              onChange={(_, next: Scope | null) => { if (next) setScope(next); }}
              aria-label="Subscription type"
              sx={{ p: 0.5, border: 1, borderColor: 'divider', borderRadius: 10, gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '999px !important', px: { xs: 2, sm: 3 }, py: 1.2, textTransform: 'none', fontWeight: 650 }, '& .Mui-selected': { bgcolor: '#087AF5 !important', color: '#fff !important', '&:hover': { bgcolor: '#0066d6 !important' } } }}
            >
              <ToggleButton value="personal" aria-label="Personal plans"><PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1 }} />Personal plans</ToggleButton>
              <ToggleButton value="group" aria-label="Group plans"><GroupsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />Group plans</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {scope === 'personal' ? 'Choose how many groups you can create and manage.' : 'Choose how many people your group can bring together.'}
            </Typography>
          </Stack>
        </Stack>

        <Grid container spacing={2.5} alignItems="stretch">
          {plans[scope].map((plan) => {
            const recommended = plan.name === 'Plus' && scope === 'group';
            return (
              <Grid key={plan.name} size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ position: 'relative', height: '100%', p: { xs: 3, sm: 3.5 }, borderRadius: 3, border: recommended ? '2px solid #E91E78' : undefined, boxShadow: recommended ? '0 12px 36px rgba(233,30,120,0.09)' : 'none', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: recommended ? 'rgba(233,30,120,0.10)' : 'action.hover', color: recommended ? '#E91E78' : 'primary.main' }}>
                        {plan.name === 'Premium' ? <WorkspacePremiumOutlinedIcon /> : scope === 'group' ? <GroupsOutlinedIcon /> : <PersonOutlineRoundedIcon />}
                      </Box>
                      <Typography variant="h6" component="h3" fontWeight={700}>{plan.name}</Typography>
                    </Stack>
                    {plan.status && <Chip color="default" label={plan.status} />}
                    {recommended && <Chip color="secondary" label="Recommended" />}
                  </Stack>
                  <Typography variant="h4" fontWeight={750} sx={{ whiteSpace: 'nowrap' }}>KSh {plan.price}</Typography>
                  <Typography variant="body2" color="text.secondary">{plan.name === 'Free' ? 'Free forever' : 'per month'}</Typography>
                  <Box sx={{ borderTop: 1, borderColor: 'divider', my: 2.5 }} />
                  <Typography variant="h6" fontWeight={700}>{plan.capacity}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5, minHeight: { md: 42 } }}>{plan.description}</Typography>
                  <Stack spacing={1.6} sx={{ mt: 'auto' }}>
                    {plan.features.map((feature) => (
                      <Stack direction="row" spacing={1.2} alignItems="flex-start" key={feature}>
                        <CheckCircleRoundedIcon sx={{ color: '#15956F', fontSize: 19, mt: 0.15, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{feature}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <Paper variant="outlined" sx={{ mt: 4, p: { xs: 2.5, md: 3.5 }, borderRadius: 3, bgcolor: 'action.hover' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 0 }} alignItems="stretch">
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ minWidth: { sm: 210 }, pr: { sm: 3 }, pb: { xs: 2, sm: 0 }, borderRight: { sm: 1 }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider' }}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight={700} whiteSpace="nowrap">Good to know</Typography>
            </Stack>
            <Box component="ul" sx={{ m: 0, pl: 4, color: 'text.secondary', flex: 1, '& li::marker': { color: 'primary.main' } }}>
              {guidance.map((item) => (
                <Typography component="li" variant="body2" key={item} sx={{ display: 'list-item', listStyleType: 'disc', pl: 0.5, mb: 1, lineHeight: 1.7, '&:last-child': { mb: 0 } }}>{item}</Typography>
              ))}
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
