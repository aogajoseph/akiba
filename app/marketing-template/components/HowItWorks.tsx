import { Box, Container, Grid, Paper, Typography } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';

const stages = [
  { num: '01', title: 'Group Creation', desc: 'The Admin creates a group for an event or shared goal.', Icon: GroupsRoundedIcon },
  { num: '02', title: 'Participants', desc: "The Admin invites people to join and participate in the group's purpose.", Icon: PersonAddAlt1RoundedIcon },
  { num: '03', title: 'Governance', desc: "The Admin appoints two Sub-admins from among the group's members.", Icon: AccountBalanceWalletRoundedIcon },
  { num: '04', title: 'Group Activity', desc: 'Group members contribute toward the shared purpose and communicate through the group chat.', Icon: ChatRoundedIcon },
  { num: '05', title: 'Progress Tracking', desc: 'Everyone reviews financial updates, group activities, and shared records in one place.', Icon: HistoryRoundedIcon },
  { num: '06', title: 'Closure', desc: 'Once the group has fulfilled its purpose, the Admin can close it or retain it for future use.', Icon: FactCheckRoundedIcon },
];

export default function HowItWorks() {
  return (
    <Box id="how-it-works" sx={{ py: { xs: 9, md: 12 }, bgcolor: 'action.hover', scrollMarginTop: 100 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2">How Akiba Works</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 5, maxWidth: 800 }}>
          Akiba brings group activities together, helping everyone stay informed and work toward a common purpose.
        </Typography>
        <Grid container spacing={2}>
          {stages.map(({ num, title, desc, Icon }) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={num}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, bgcolor: '#087AF51A', color: '#087AF5' }}>
                  <Icon />
                </Box>
                <Typography variant="h6" component="h3" sx={{ mt: 2 }}>{num.replace(/^0/, '')}. {title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
