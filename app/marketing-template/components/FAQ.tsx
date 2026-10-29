import { Accordion, AccordionDetails, AccordionSummary, Container, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const questions = [
  [
    'How does Akiba keep group funds secure and ensure financial accountability?',
    'Group funds are held by authorized financial institutions, not Akiba. Akiba only serves as a coordination platform, providing transparent financial records and requiring approval from both appointed Sub-admins before releasing funds.',
  ],
  [
    'Who controls group funds, and what happens when members disagree?',
    "Group Admins initiate withdrawals or transfers, subject to approval by both Sub-admins. Members are responsible for carefully evaluating a group's purpose and leadership before joining or contributing. Akiba provides reversal requests and customer support and cooperates with law enforcement when disputes escalate to criminal investigations.",
  ],
  [
    'How does Akiba make money, and what fees do users and groups pay?',
    'Akiba earns revenue through Personal and Group subscriptions and transaction charges. Personal plans determine group creation limits, while Group plans determine membership capacity and group features. All applicable transaction charges are transparently displayed before withdrawals.',
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
