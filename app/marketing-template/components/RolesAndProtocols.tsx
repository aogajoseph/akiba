import { Box, Container, Paper, Typography } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const roles = [
  {
    title: 'Group Admin',
    Icon: ShieldOutlinedIcon,
    points: [
      'The group creator automatically becomes the Group Admin.',
      'Responsible for setting up the group, appointing two Sub-admins, managing group settings, initiating fund withdrawal or transfer requests, and closing the group when its purpose has been fulfilled and closure requirements are met.',
    ],
  },
  {
    title: 'Sub-admins',
    Icon: FactCheckOutlinedIcon,
    points: [
      'Each Akiba group requires two Sub-admins.',
      'Both Sub-admins review and approve or reject fund withdrawal or transfer requests initiated by the Group Admin.',
    ],
  },
  {
    title: 'Members',
    Icon: GroupsOutlinedIcon,
    points: ['Regular participants who contribute toward the group’s purpose.'],
  },
];

const protocols = [
  {
    title: 'Leaving a group',
    Icon: LogoutOutlinedIcon,
    points: [
      'Group Admins cannot leave groups they created.',
      'Sub-admins must transfer their role to another member before leaving.',
      'Members can leave at any time.',
      'A member’s departure does not affect the group’s ongoing activities.',
    ],
  },
  {
    title: 'Outstanding contributions and funds',
    Icon: AccountBalanceWalletOutlinedIcon,
    points: [
      'A group cannot be closed or deleted while its account contains funds or a transaction is pending.',
      'Once all transactions are complete and all funds have been withdrawn, the Group Admin may close or delete the group if it is no longer needed.',
    ],
  },
  {
    title: 'Funds withdrawal or transfer',
    Icon: VerifiedUserOutlinedIcon,
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
    <Box component="ul" sx={{ pl: 2.75, mt: 1.5, mb: 0, color: 'text.secondary', listStyleType: 'disc' }}>
      {points.map((point) => (
        <Typography
          key={point}
          component="li"
          variant="body2"
          sx={{ display: 'list-item', listStyleType: 'disc', pl: 0.5, mb: 1, lineHeight: 1.85, '&:last-child': { mb: 0 }, '&::marker': { color: 'primary.main' } }}
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

        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4, md: 5 }, borderRadius: 4, bgcolor: 'background.paper', boxShadow: '0 12px 40px rgba(0,0,0,0.035)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {roles.map(({ title, Icon, points }, index) => (
              <Box
                key={title}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: { xs: 2, sm: 3 },
                  py: 3,
                  borderBottom: index < roles.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                  '&:first-of-type': { pt: 0 },
                }}
              >
                <Box sx={{ width: { xs: 44, sm: 52 }, height: { xs: 44, sm: 52 }, borderRadius: 2.5, bgcolor: 'action.hover', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" component="h3">{title}</Typography>
                  <BulletList points={points} />
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 2, p: { xs: 2.5, sm: 3 }, borderRadius: 3, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ForumOutlinedIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" component="h3">Shared Group Activities</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.85 }}>
              Group Admins, Sub-admins, and Members can contribute money, chat, review group reports, and receive real-time updates on group activities.
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h4" component="h2" sx={{ mt: { xs: 9, md: 12 }, mb: 4 }}>Akiba Group Protocols</Typography>
        <Box sx={{ maxWidth: 1000 }}>
          {protocols.map(({ title, Icon, points }, index) => (
            <Box key={title} sx={{ display: 'flex', alignItems: 'stretch', gap: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', flexShrink: 0, width: { xs: 44, sm: 56 } }}>
                <Box sx={{ width: { xs: 44, sm: 56 }, height: { xs: 44, sm: 56 }, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon />
                </Box>
                {index < protocols.length - 1 && <Box sx={{ width: 2, bgcolor: 'divider', flex: 1, my: 1, minHeight: 32 }} />}
              </Box>
              <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: { xs: 2.5, sm: 3.5 }, borderRadius: 3, bgcolor: 'background.paper', mb: index < protocols.length - 1 ? 3 : 0, transition: 'border-color 180ms ease, box-shadow 180ms ease', '&:hover': { borderColor: 'primary.main', boxShadow: '0 8px 28px rgba(0,0,0,0.04)' } }}>
                <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: 1.2 }}>Protocol {String(index + 1).padStart(2, '0')}</Typography>
                <Typography variant="h6" component="h3" sx={{ mt: 0.5 }}>{title}</Typography>
                <BulletList points={points} />
              </Paper>
            </Box>
          ))}
        </Box>

        <Paper variant="outlined" sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: { xs: 2.5, sm: 3.5 }, mt: 5, borderRadius: 3, bgcolor: 'background.paper', borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
          <InfoOutlinedIcon sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
          <Box>
            <Typography variant="h6" component="h3">Disclaimer</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.85 }}>
              Before participating in a group or contributing money, carefully review the group’s purpose, leaders, and members. If you contribute money by mistake, request a reversal immediately or contact Akiba Support for assistance.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
