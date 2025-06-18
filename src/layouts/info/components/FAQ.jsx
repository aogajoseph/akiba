import * as React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMaterialUIController } from 'context';

export default function FAQ() {
  const [expanded, setExpanded] = React.useState([]);
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(
      isExpanded
        ? [...expanded, panel]
        : expanded.filter((item) => item !== panel)
    );
  };

  return (
    <Container
      id="faq"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 6 },
      }}
    >
      <Typography
        component="h2"
        variant="h4"
        sx={{
          color: darkMode ? '#ffffff' : 'text.primary',
          width: { sm: '100%', md: '60%' },
          textAlign: { sm: 'left', md: 'center' },
          fontWeight: 700,
        }}
      >
        Frequently asked questions
      </Typography>
      <Box sx={{ width: '100%' }}>
        <Accordion
          expanded={expanded.includes('panel1')}
          onChange={handleChange('panel1')}
          sx={{
            bgcolor: darkMode ? 'grey.800' : 'background.paper',
            '& .MuiAccordionSummary-root': {
              color: darkMode ? '#ffffff' : 'text.primary',
            },
            '& .MuiAccordionDetails-root': {
              color: darkMode ? 'grey.300' : 'text.secondary',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#ffffff' : 'text.primary' }} />}
            aria-controls="panel1d-content"
            id="panel1d-header"
          >
            <Typography component="span" variant="subtitle2">
            What is Akiba, and how does it work?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body2"
              gutterBottom
              sx={{ maxWidth: { sm: '100%', md: '70%' } }}
            >
              Akiba is a group savings platform that helps people save together toward shared goals. One person (the main admin) creates a savings account, sets up a goal, invites members and manages contributions with the help of Sub-Admins. Members can track progress, engage in group discussions and view reports — all in one place!
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded.includes('panel2')}
          onChange={handleChange('panel2')}
          sx={{
            bgcolor: darkMode ? 'grey.800' : 'background.paper',
            '& .MuiAccordionSummary-root': {
              color: darkMode ? '#ffffff' : 'text.primary',
            },
            '& .MuiAccordionDetails-root': {
              color: darkMode ? 'grey.300' : 'text.secondary',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#ffffff' : 'text.primary' }} />}
            aria-controls="panel2d-content"
            id="panel2d-header"
          >
            <Typography component="span" variant="subtitle2">
            Who can create a savings goal, and how do contributors join?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body2"
              gutterBottom
              sx={{ maxWidth: { sm: '100%', md: '70%' } }}
            >
              Only the account creator (main admin) can create a savings goal that everyone contributes toward, as long as it is acceptable to the group. Once a goal is set, members can be invited by anyone in the group, but the main admin must approve the invitations. This keeps the group safe and organized.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded.includes('panel3')}
          onChange={handleChange('panel3')}
          sx={{
            bgcolor: darkMode ? 'grey.800' : 'background.paper',
            '& .MuiAccordionSummary-root': {
              color: darkMode ? '#ffffff' : 'text.primary',
            },
            '& .MuiAccordionDetails-root': {
              color: darkMode ? 'grey.300' : 'text.secondary',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#ffffff' : 'text.primary' }} />}
            aria-controls="panel3d-content"
            id="panel3d-header"
          >
            <Typography component="span" variant="subtitle2">
            How do members communicate and stay updated?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body2"
              gutterBottom
              sx={{ maxWidth: { sm: '100%', md: '70%' } }}
            >
              Akiba includes a forum and private chat features. Members can post messages in the group forum visible to all, or send private chats to one another. Everyone can read notifications, view activity logs, stay engaged, ask questions and share updates — keeping teamwork strong.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded.includes('panel4')}
          onChange={handleChange('panel4')}
          sx={{
            bgcolor: darkMode ? 'grey.800' : 'background.paper',
            '& .MuiAccordionSummary-root': {
              color: darkMode ? '#ffffff' : 'text.primary',
            },
            '& .MuiAccordionDetails-root': {
              color: darkMode ? 'grey.300' : 'text.secondary',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#ffffff' : 'text.primary' }} />}
            aria-controls="panel4d-content"
            id="panel4d-header"
          >
            <Typography component="span" variant="subtitle2">
            Can I track contributions and download reports?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body2"
              gutterBottom
              sx={{ maxWidth: { sm: '100%', md: '70%' } }}
            >
              Yes! Akiba provides a clear dashboard overview and detailed reports. Any member can view, download or share statements showing contributions, withdrawals and goal progress. Transparency and accountability are at the heart of Akiba’s design, so everyone stays informed.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded.includes('panel5')}
          onChange={handleChange('panel5')}
          sx={{
            bgcolor: darkMode ? 'grey.800' : 'background.paper',
            '& .MuiAccordionSummary-root': {
              color: darkMode ? '#ffffff' : 'text.primary',
            },
            '& .MuiAccordionDetails-root': {
              color: darkMode ? 'grey.300' : 'text.secondary',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#ffffff' : 'text.primary' }} />}
            aria-controls="panel5d-content"
            id="panel5d-header"
          >
            <Typography component="span" variant="subtitle2">
              How do I create an account or leave a group?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body2"
              gutterBottom
              sx={{ maxWidth: { sm: '100%', md: '70%' } }}
            >
              Account creation happens in 4 quick steps using email and phone number. If you wish to leave a savings group, you can do so from Profile Settings and you will be guided based on your role in the group. The group members will be notified of your departure and the group's activities wont be affected.
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded.includes('panel6')}
          onChange={handleChange('panel6')}
          sx={{
            bgcolor: darkMode ? 'grey.800' : 'background.paper',
            '& .MuiAccordionSummary-root': {
              color: darkMode ? '#ffffff' : 'text.primary',
            },
            '& .MuiAccordionDetails-root': {
              color: darkMode ? 'grey.300' : 'text.secondary',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: darkMode ? '#ffffff' : 'text.primary' }} />}
            aria-controls="panel6d-content"
            id="panel6d-header"
          >
            <Typography component="span" variant="subtitle2">
              How do I delete my Akiba account?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="body2"
              gutterBottom
              sx={{ maxWidth: { sm: '100%', md: '70%' } }}
            >
              If you choose to delete your Akiba account, you can do so from Account Settings. Only the account creator (main admin) can delete the account and this must be done in line with the account deletion protocols.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
}
