import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import CreateNewFolderRoundedIcon from '@mui/icons-material/CreateNewFolderRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

const steps = [
  { title: 'Join the platform', desc: 'Create your Akiba account using your email address or phone number.', Icon: PersonAddAlt1RoundedIcon },
  { title: 'Set up your profile', desc: 'Create your profile and choose a unique username so other Akiba users can recognize you.', Icon: AccountCircleRoundedIcon },
  { title: 'Create or join a group', desc: 'Create a group or accept an invitation to join one.', Icon: CreateNewFolderRoundedIcon },
  { title: 'Set up the group', desc: 'Describe your group, invite participants, and appoint two Sub-admins.', Icon: SettingsRoundedIcon },
  { title: 'Participate in group activities', desc: 'Contribute toward your group's purpose, join discussions, and review updates.', Icon: SavingsRoundedIcon },
  { title: 'Leave when appropriate', desc: 'Leave a group according to your role and Akiba’s group protocols.', Icon: LogoutRoundedIcon },
];

export default function GettingStarted() {
  return (
    <Container id="getting-started" maxWidth="lg" sx={{ py: { xs: 9, md: 12 }, scrollMarginTop: 100 }}>
      <Typography variant="h4" component="h2">Getting Started with Akiba</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 5, maxWidth: 800 }}>
        Are you organizing an upcoming event or working toward a shared financial goal? Get started with Akiba in six simple steps.
      </Typography>
      <Grid container spacing={2}>
        {steps.map(({ title, desc, Icon }, i) => (
          <Grid key={title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 44, width: 44, borderRadius: '50%', bgcolor: '#E91E781A', color: '#E91E78' }}>
                <Icon />
              </Box>
              <Typography variant="h6" component="h3" sx={{ mt: 2 }}>{i + 1}. {title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{desc}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
