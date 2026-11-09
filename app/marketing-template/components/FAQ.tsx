import { Accordion, AccordionDetails, AccordionSummary, Container, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const questions = [
  [
    'How are group funds protected?',
    "All withdrawal requests must be approved by the group's appointed Admins. Members can flag suspicious withdrawals, triggering a protective hold for review.",
  ],
  [
    'What happens when a withdrawal is rejected or disputed?',
    'If any Group Admin rejects a withdrawal request, the Group Creator must submit a new request. Members can also flag suspicious withdrawals, even after Admin approval.',
  ],
  [
    'What does it cost to use Akiba?',
    'Akiba offers Personal and Group subscription plans with different group limits and features. Any applicable transaction charges are disclosed before a transaction is confirmed.',
  ],
];

export default function FAQ() {
  return (
    <Container id="faq" sx={{ py: { xs: 9, md: 14 }, scrollMarginTop: 100 }}>
      <Typography variant="h4" sx={{ mb: 5 }}>Frequently asked questions</Typography>
      {questions.map(([question, answer]) => (
        <Accordion key={question} disableGutters sx={{ py: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="span" variant="subtitle2">{question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 850 }}>
              {answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
}
