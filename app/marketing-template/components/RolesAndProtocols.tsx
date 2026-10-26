import { Box, Container, Grid, Paper, Typography } from '@mui/material';

const roles = [
  {
    title: 'Group Admin',
    description: 'The primary administrator responsible for creating the group, setting its purpose and expectations, overseeing progress, initiating fund withdrawals or transfers, and appointing Sub-admins. The group creator automatically becomes its Admin.',
    permissions: 'Group Admins can contribute, chat, view group reports, and receive activity notifications.',
  },
  {
    title: 'Sub-admins',
    description: 'Each group has two Sub-admins. They review and accept or reject withdrawal or transfer requests initiated by the Group Admin.',
    permissions: 'Sub-admins can contribute, chat, view group reports, and receive activity notifications.',
  },
  {
    title: 'Members',
    description: 'Regular participants who contribute toward the group’s purpose.',
    permissions: 'Members can contribute, chat, view group reports, and receive activity notifications.',
  },
];

const protocols = [
  {
    title: 'Leaving a group',
    description: 'Group Admins cannot leave groups they created. Sub-admins must transfer their role to another member before leaving. Members can leave at any time. A member’s departure does not affect the group’s ongoing activities.',
  },
  {
    title: 'Outstanding contributions and funds',
    description: 'A group cannot be closed or deleted while its account contains funds or a transaction is pending. Once all transactions are complete and all funds have been withdrawn, the Group Admin may close or delete the group if it is no longer needed.',
  },
  {
    title: 'Funds withdrawal or transfer',
    description: 'Only the Group Admin can initiate a withdrawal or transfer, and both Sub-admins must be appointed first. Both Sub-admins must approve the request before funds are released. If either Sub-admin rejects it, the Group Admin must submit a new request.',
  },
];

export default function RolesAndProtocols() {
  return (
    <Box id="roles-and-protocols" sx={{ py: { xs: 9, md: 12 }, bgcolor: 'action.hover', scrollMarginTop: 100 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2">Roles and Group Protocols</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 5, maxWidth: 800 }}>
          Every Akiba group depends on clear responsibilities and responsible participation. Your role determines your permissions and obligations within the group.
        </Typography>
        <Grid container spacing={2}>
          {roles.map((role) => (
            <Grid key={role.title} size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" component="h3">{role.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{role.description}</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>{role.permissions}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" component="h3" sx={{ mt: 7, mb: 3 }}>Group membership and leaving protocols</Typography>
        <Grid container spacing={2}>
          {protocols.map((protocol) => (
            <Grid key={protocol.title} size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3, bgcolor: 'background.paper' }}>
                <Typography variant="h6" component="h4">{protocol.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{protocol.description}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, mt: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" component="h3">Disclaimer</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Before contributing, review the group’s purpose, leaders, and members carefully. Make sure your contribution is intentional. If you contribute by mistake, request a reversal as soon as possible or contact Akiba Support.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
