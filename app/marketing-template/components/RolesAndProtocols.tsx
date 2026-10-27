import { Box, Container, Divider, Paper, Typography } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';

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
    points: [
      'Regular participants who contribute toward the group’s purpose.',
    ],
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
        <Typography variant="h4" component="h2">Akiba Group Roles and Protocols</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 5, maxWidth: 800 }}>
          Your role within an Akiba group determines your permissions and responsibilities.
        </Typography>

        <Paper variant="outlined" sx={{ px: { xs: 3, md: 4 }, py: { xs: 1, md: 2 }, borderRadius: 3, bgcolor: 'background.paper' }}>
          {roles.map((role, index) => (
            <Box key={role.title}>
              {index > 0 && <Divider />}
              <Box sx={{ py: 3 }}>
                <Typography variant="h6" component="h3">{role.title}</Typography>
                <Box component="ul" sx={{ pl: 3, mt: 1.5, mb: 0, color: 'text.secondary' }}>
                  {role.points.map((point) => (
                    <Typography key={point} component="li" variant="body2" sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                      {point}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Box>
          ))}
          <Divider />
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: '#E91E781A', color: '#E91E78', flexShrink: 0 }}>
                <GroupsRoundedIcon fontSize="small" />
              </Box>
              <Typography variant="h6" component="h3">Shared Group Activities</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Group Admins, Sub-admins, and Members can contribute money, chat, review group reports, and receive real-time updates on group activities.
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" component="h3" sx={{ mt: 7, mb: 3 }}>Group membership and leaving protocols</Typography>
        <Paper variant="outlined" sx={{ px: { xs: 3, md: 4 }, py: { xs: 1, md: 2 }, borderRadius: 3, bgcolor: 'background.paper' }}>
          {protocols.map((protocol, index) => (
            <Box key={protocol.title}>
              {index > 0 && <Divider />}
              <Box sx={{ py: 3 }}>
                <Typography variant="h6" component="h4">{protocol.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{protocol.description}</Typography>
              </Box>
            </Box>
          ))}
        </Paper>

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
