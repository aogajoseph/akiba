import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';

export const metadata = {
  title: 'Privacy Policy | Akiba',
  description: 'How Akiba and Globe Technologies Ltd handle personal information across the Akiba group finance coordination platform.',
};

const sections = [
  {
    title: '1. Who is responsible for your information?',
    paragraphs: [
      'Akiba is developed and operated by Globe Software, a software division of Globe Technologies Ltd (“Globe”, “we”, “us”, or “our”). Globe determines how personal data is processed to provide and operate Akiba and acts as the data controller where applicable under data protection law. Particular payment, identity, communications, or other providers may act as independent controllers for their own services or as processors on our instructions.',
      'This Privacy Policy applies to Akiba websites, applications, accounts, Groups, communications, and related services. It should be read alongside any short privacy notice shown when you use a particular feature or connect a third-party provider.',
    ],
  },
  {
    title: '2. Information we collect',
    paragraphs: [
      'Account and profile information. This may include your display name or username, email address, phone number if provided, profile details, account identifiers, authentication and verification status, and preferences.',
      'Group and collaboration information. We process Group names, purposes, membership, roles, invitations, contribution targets, member messages, updates, files or other content you submit, and records of actions taken by Admins, Sub-admins, and members.',
      'Transaction and subscription information. Depending on the features and providers used, this may include contribution and withdrawal amounts, currency, transaction references, timestamps, status, approvals, receipts, subscription plan, billing status, and provider responses. Payment credentials are generally handled by the relevant provider; do not share card details, passwords, or verification codes in Group messages or support requests.',
      'Technical and usage information. We may process device and browser details, IP address, log data, session and security events, feature interactions, error reports, and approximate information inferred from network or device settings. We do not need precise location data for ordinary Group coordination unless a feature clearly asks for it.',
      'Support and communications. We process information you provide when you contact support, submit feedback, report a problem, or respond to a service message.',
      'Information from others. We may receive information about you from people who invite you to a Group, Group members who record a shared transaction, payment providers, identity or fraud-prevention partners, and other sources where lawful. We take reasonable steps to use that information appropriately.',
    ],
  },
  {
    title: '3. How we use information',
    paragraphs: [
      'We use personal data to create and secure accounts; provide Groups and collaboration tools; display records and activity to authorized members; support contribution, withdrawal, and approval workflows; administer subscriptions and charges; send receipts and operational notifications; respond to requests; troubleshoot and improve the Services; detect fraud, abuse, and security incidents; enforce our Terms; and comply with legal obligations.',
      'We may use aggregated or de-identified information to understand service performance, improve reliability, plan features, and report broad product trends. We do not treat this as permission to disclose identifiable Group or transaction details publicly.',
    ],
  },
  {
    title: '4. Our legal grounds for processing',
    paragraphs: [
      'Depending on the purpose and applicable law, we process personal data because it is necessary to provide a service you request or perform a contract; because we must comply with a legal obligation; because we or another party have a legitimate interest such as securing the platform, preventing fraud, supporting users, and improving the Services, where those interests are not overridden by your rights; or because you have given consent where consent is required.',
      'Where we rely on consent, you may withdraw it for future processing. Withdrawal does not make earlier processing unlawful and may mean that a feature can no longer be provided. We will explain when information is required for a contract or legal obligation and the likely effect of not providing it.',
    ],
  },
  {
    title: '5. What other Group members can see',
    paragraphs: [
      'Akiba is built for collaboration and financial transparency. Depending on a Group’s settings, your role, and the feature used, members may see your display name, membership and role, messages, contribution activity, transaction-related records, approvals, and other information needed to coordinate the Group. Admins and Sub-admins may have additional visibility to manage Group activity and approvals.',
      'Before joining a Group or posting content, consider who can access it. Do not upload another person’s information unless you have a lawful basis and any necessary permission. Group Admins are responsible for using member information only for legitimate Group purposes and restricting access where the product allows.',
    ],
  },
  {
    title: '6. When we share information',
    paragraphs: [
      'Service providers. We may share information with vendors that host and secure the platform, provide authentication, send communications, monitor errors, support customers, or help operate subscriptions and payments. They may process information only as permitted by their contract and applicable law.',
      'Payment and financial partners. If you use a payment or financial feature, relevant information may be shared with the payment provider, financial institution, mobile-money operator, or other parties needed to initiate, authenticate, settle, reconcile, investigate, or reverse a transaction. Their own privacy notices may also apply.',
      'Other users. Information is shared with Group members as described in the Group visibility section above and through features you choose to use.',
      'Legal, safety, and corporate events. We may disclose information where reasonably necessary to comply with law or a valid legal process, protect people or rights, investigate suspected fraud or security incidents, enforce our Terms, or establish or defend legal claims. Information may also be transferred as part of a merger, financing, restructuring, or sale of relevant business assets, subject to appropriate safeguards and applicable law.',
      'We do not sell personal data to third parties. We do not disclose identifiable Group financial records to advertisers for their own advertising purposes.',
    ],
  },
  {
    title: '7. Cookies and similar technologies',
    paragraphs: [
      'Akiba and its service providers may use essential cookies, local storage, or similar technologies to keep you signed in, maintain security, remember preferences, and make the Services function. Where optional analytics or marketing technologies are used, we will provide choices or notices as required by law. You can manage cookies through your browser, but blocking essential technologies may affect sign-in or other features.',
    ],
  },
  {
    title: '8. Security',
    paragraphs: [
      'We use technical, organizational, and access-control measures designed to protect personal data against unauthorized access, loss, misuse, alteration, and disclosure. Measures may include restricted access, authentication controls, logging, secure transmission, backups, and service-provider safeguards appropriate to the data and risks.',
      'No internet service or storage system can be guaranteed completely secure. Keep your credentials private, use a secure device, and notify us promptly through the support options in Akiba if you suspect unauthorized account access or disclosure.',
      'If a personal data breach occurs, we will assess it and provide notifications to affected individuals and regulators when required by applicable law.',
    ],
  },
  {
    title: '9. International processing',
    paragraphs: [
      'Akiba may use infrastructure and service providers operating in Kenya or other countries. This can mean personal data is processed or stored outside the country where you live. Where applicable law restricts international transfers, we will use an appropriate lawful transfer mechanism and safeguards, and provide information about the transfer when required.',
    ],
  },
  {
    title: '10. How long we keep information',
    paragraphs: [
      'We retain personal data for as long as reasonably necessary for the purposes described in this Policy, including to provide the Services, maintain Group and transaction histories, meet accounting and legal obligations, resolve disputes, enforce agreements, and prevent fraud. Retention periods depend on the type of information, its sensitivity, the relationship with you, and applicable legal requirements.',
      'When information is no longer needed, we will delete it, anonymize it, or securely isolate it where appropriate. Some records may remain after account closure—for example, transaction and audit records, information needed by other Group members to understand prior activity, records subject to a legal hold, or data we must retain by law. Closing an account does not automatically remove content already shared with other users or records they are entitled to retain.',
    ],
  },
  {
    title: '11. Your privacy rights and choices',
    paragraphs: [
      'Subject to applicable law and relevant exceptions, you may have the right to be informed about processing, access your personal data, correct inaccurate information, request deletion, object to or request restriction of certain processing, withdraw consent, request a copy or transfer of data where applicable, and complain to the relevant data protection authority.',
      'You can update certain profile information and preferences in Akiba. To exercise another right or ask a privacy question, use the support or contact channel available through Akiba or the Globe Technologies Ltd website. We may need to verify your identity and clarify the request before acting. We will respond within the period required by applicable law. There is no charge for ordinary requests unless the law permits a reasonable fee for manifestly unfounded or excessive requests.',
      'If you are in Kenya, you may also raise a concern with the Office of the Data Protection Commissioner (ODPC). Exercising a privacy right will not result in unlawful discrimination or retaliation.',
    ],
  },
  {
    title: '12. Children and family information',
    paragraphs: [
      'Akiba is not designed for children to independently manage group financial activity. You must meet the age requirements displayed for the Services and have legal capacity to use the relevant features. Do not knowingly create an account for a child or submit a child’s personal data unless you are authorized and the processing is lawful. If you believe a child’s information has been provided unlawfully, contact us through the available support channel.',
    ],
  },
  {
    title: '13. Marketing and service messages',
    paragraphs: [
      'We may send essential messages relating to account access, security, Groups, transactions, receipts, support, and changes to the Services. These are operational communications. Where we send promotional communications, you can opt out using the unsubscribe or preference control provided. Even if you opt out of marketing, we may still send essential service messages.',
    ],
  },
  {
    title: '14. Changes to this Policy',
    paragraphs: [
      'We may update this Policy as Akiba evolves, our processing changes, or legal requirements develop. The latest version will be published here with an updated date. If a change materially affects how we process personal data, we will provide additional notice or obtain consent where required by law.',
    ],
  },
];

export default function Privacy() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Link href="/welcome" underline="hover" sx={{ fontWeight: 700, width: 'fit-content' }}>← Back to Akiba</Link>
          <Box>
            <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800, letterSpacing: 2 }}>AKIBA · GLOBE SOFTWARE</Typography>
            <Typography variant="h2" component="h1" sx={{ mt: 1, fontWeight: 800, letterSpacing: '-0.04em', fontSize: { xs: '2.25rem', md: '3.25rem' } }}>Privacy Policy</Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>Effective date: 29 October 2026 · Last updated: 29 October 2026</Typography>
            <Typography sx={{ mt: 2, maxWidth: 760 }}>Your trust matters. This Policy explains what information Akiba uses, why it is needed, when it may be shared, and the choices and rights available to you.</Typography>
          </Box>
          <Divider />
          <Box sx={{ p: { xs: 2.5, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography fontWeight={800} gutterBottom>In brief</Typography>
            <Typography color="text.secondary">We use information to run Akiba, coordinate Groups, maintain financial records, protect accounts, and meet legal obligations. Group activity may be visible to other members according to roles and features. We do not sell personal data to third parties.</Typography>
          </Box>
          {sections.map((section) => (
            <Box component="section" key={section.title}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 750, mb: 1.5 }}>{section.title}</Typography>
              {section.paragraphs.map((paragraph) => <Typography key={paragraph} paragraph sx={{ lineHeight: 1.8, color: 'text.secondary' }}>{paragraph}</Typography>)}
            </Box>
          ))}
          <Divider />
          <Box>
            <Typography variant="h6" fontWeight={800}>Who we are</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.8 }}>Akiba is a product of Globe Software, a division of Globe Technologies Ltd. For privacy requests, use the contact or support options available in Akiba or visit <Link href="https://globetechnologies.com" target="_blank" rel="noreferrer" underline="hover">Globe Technologies Ltd</Link>.</Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>You can also read our <Link href="/terms" underline="hover">Terms of Service</Link>.</Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
