import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import CreateNewFolderRoundedIcon from '@mui/icons-material/CreateNewFolderRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

const steps = [
  { title: 'Join the platform', desc: 'Create an Akiba account using your email or phone number. Keep your sign-in details secure and never share them with anyone, including Akiba staff.', Icon: PersonAddAlt1RoundedIcon },
  { title: 'Set up your profile', desc: 'Add a profile picture and choose a unique username so other Akiba users can recognize you.', Icon: AccountCircleRoundedIcon },
  { title: 'Create or join a group', desc: 'Create a group or accept an invitation to join one. Understand its purpose, expectations, leadership, and members before participating.', Icon: CreateNewFolderRoundedIcon },
  { title: 'Set up the group', desc: 'If you create a group, provide its details, invite participants, and appoint the required administrative roles. Agree on the group’s purpose and expectations.', Icon: SettingsRoundedIcon },
  { title: 'Participate in group activities', desc: 'Join discussions, contribute according to agreed arrangements, and review financial updates and activity records. Receive real-time notifications as group activities occur.', Icon: SavingsRoundedIcon },
  { title: 'Leave when appropriate', desc: 'You can leave a group according to your role and Akiba’s group protocols. Group Admins cannot leave groups they created, while Sub-admins must transfer their role before leaving.', Icon: LogoutRoundedIcon },
];

export default function GettingStarted() {
  return (
    <Container id="getting-started" maxWidth="lg" sx={{ py: { xs: 9, md: 12 }, scrollMarginTop: 100 }}>
      <Typography variant="h4" component="h2">Getting Started with Akiba</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 5, maxWidth: 800 }}>
        Organizing an event or shared financial goal, or joining a group? Get started in six simple steps.
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
