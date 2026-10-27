import { Box, Container, Divider, Paper, Typography } from '@mui/material';

const roles = [
  {
    title: 'Group Admin',
    points: [
      'The group creator automatically becomes the Group Admin.',
      'Responsible for setting up the group, appointing two Sub-admins, managing group settings, initiating fund withdrawal or transfer requests, and closing the group when its purpose has been fulfilled and closure requirements are met.',
    ],
  },
  {
    title: 'Sub-admins',
    points: [
      'Each Akiba group requires two Sub-admins.',
      'Both Sub-admins review and approve or reject fund withdrawal or transfer requests initiated by the Group Admin.',
    ],
  },
  {
    title: 'Members',
    points: ['Regular participants who contribute toward the group’s purpose.'],
  },
];

const protocols = [
  {
    title: 'Leaving a group',
    points: [
      'Group Admins cannot leave groups they created.',
      'Sub-admins must transfer their role to another member before leaving.',
      'Members can leave at any time.',
      'A member’s departure does not affect the group’s ongoing activities.',
    ],
  },
  {
    title: 'Outstanding contributions and funds',
    points: [
      'A group cannot be closed or deleted while its account contains funds or a transaction is pending.',
      'Once all transactions are complete and all funds have been withdrawn, the Group Admin may close or delete the group if it is no longer needed.',
    ],
  },
  {
    title: 'Funds withdrawal or transfer',
    points: [
      'Only the Group Admin can initiate a withdrawal or funds transfer.',
      'The group must have two appointed Sub-admins before the Group Admin can initiate a withdrawal or transfer.',
      'Both Sub-admins must approve the request before funds are released.',
      'If either Sub-admin rejects the request, the Group Admin must submit a new request.',
    ],
  },
];

function BulletList({ points }: { points: string[] }) {
  return (
    <Box
      component="ul"
      sx={{
        pl: 3,
        mt: 1.5,
        mb: 0,
        color: 'text.secondary',
        listStyleType: 'disc',
        listStylePosition: 'outside',
      }}
    >
      {points.map((point) => (
        <Typography
          key={point}
          component="li"
          variant="body2"
          sx={{ display: 'list-item', listStyleType: 'disc', mb: 1, '&:last-child': { mb: 0 } }}
        >
          {point}
        </Typography>
      ))}
    </Box>
  );
}

export default function RolesAndProtocols() {
  return (
    <Box id="roles-and-protocols" sx={{ py: { xs: 9, md: 12 }, bgcolor: 'action.hover', scrollMarginTop: 100 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2">Akiba Group Roles</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 5, maxWidth: 800 }}>
          Your role within an Akiba group determines your permissions and responsibilities.
        </Typography>

        <Paper variant="outlined" sx={{ px: { xs: 3, md: 4 }, py: { xs: 1, md: 2 }, borderRadius: 3, bgcolor: 'background.paper' }}>
          {roles.map((role, index) => (
            <Box key={role.title}>
              {index > 0 && <Divider />}
              <Box sx={{ py: 3 }}>
                <Typography variant="h6" component="h3">{role.title}</Typography>
                <BulletList points={role.points} />
              </Box>
            </Box>
          ))}
          <Divider />
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" component="h3">Shared Group Activities</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Group Admins, Sub-admins, and Members can contribute money, chat, review group reports, and receive real-time updates on group activities.
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h4" component="h2" sx={{ mt: 7, mb: 3 }}>Akiba Group Protocols</Typography>
        <Paper variant="outlined" sx={{ px: { xs: 3, md: 4 }, py: { xs: 1, md: 2 }, borderRadius: 3, bgcolor: 'background.paper' }}>
          {protocols.map((protocol, index) => (
            <Box key={protocol.title}>
              {index > 0 && <Divider />}
              <Box sx={{ py: 3 }}>
                <Typography variant="h6" component="h3">{protocol.title}</Typography>
                <BulletList points={protocol.points} />
              </Box>
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, mt: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" component="h3">Disclaimer</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Before participating in a group or contributing money, carefully review the group’s purpose, leaders, and members. If you contribute money by mistake, request a reversal immediately or contact Akiba Support for assistance.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
