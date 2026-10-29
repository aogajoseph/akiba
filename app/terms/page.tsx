import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';

export const metadata = {
  title: 'Terms of Service | Akiba',
  description: 'The terms governing access to and use of Akiba, the group finance coordination platform by Globe Software.',
};

const sections = [
  {
    title: '1. Agreement and who we are',
    paragraphs: [
      'These Terms of Service (the “Terms”) govern your access to and use of Akiba, including its websites, applications, group tools, communications features, records, and related services (collectively, the “Services”). By creating an account, joining a Group, or using the Services, you agree to these Terms.',
      'Akiba is a product developed and operated by Globe Software, a software division of Globe Technologies Ltd (“Globe”, “we”, “us”, or “our”). Globe Technologies Ltd is a diversified innovation company that researches, develops and commercializes ideas into products, services and intellectual properties. “You” means the individual using the Services and, where applicable, an organization acting through an authorized representative.',
      'These Terms operate alongside any additional terms shown for a specific feature, payment provider, subscription, or service. If additional terms conflict with these Terms for that feature, the additional terms will apply to the extent of the conflict.',
    ],
  },
  {
    title: '2. What Akiba does—and does not do',
    paragraphs: [
      'Akiba helps people coordinate contributions, communicate, maintain shared records, and organize spending for group events and shared goals. Features and availability may vary by location, account, Group, plan, and connected provider.',
      'Unless we expressly identify a regulated service and the entity providing it in a separate agreement, Akiba is a coordination and software platform—not a bank, deposit-taking institution, lender, investment adviser, trustee, escrow agent, or guarantor of a Group’s funds. Payment services, where available, are provided by the relevant payment service provider or financial institution under its own terms and regulatory obligations.',
      'Akiba does not promise that a Group, its purpose, its members, or its administrators are trustworthy or that a shared goal will be achieved. You are responsible for deciding whether to join a Group, contribute money, or authorize a transaction.',
    ],
  },
  {
    title: '3. Eligibility and account security',
    paragraphs: [
      'You must have legal capacity to enter into these Terms and meet any age and eligibility requirements displayed for the Services. If you use Akiba on behalf of an organization, you represent that you are authorized to bind that organization.',
      'Provide accurate, current information and keep it updated. Protect your password, verification codes, devices, and other account credentials. You are responsible for activity performed through your account unless applicable law provides otherwise. Notify us promptly through the support options available in Akiba if you suspect unauthorized access.',
      'Do not create an account using another person’s identity, share credentials in a way that compromises security, evade account restrictions, or maintain multiple accounts to mislead users or circumvent limits.',
    ],
  },
  {
    title: '4. Groups, roles, and member responsibilities',
    paragraphs: [
      'A “Group” is a space in Akiba created to coordinate a shared event, purpose, or financial goal. The person who creates a Group or is assigned the administrator role is its “Admin”. A Group may appoint Sub-admins and assign other permissions made available in the product.',
      'Group roles determine what a person can view or do in the platform. Where the withdrawal approval workflow is enabled, an Admin initiates a withdrawal or transfer request and both appointed Sub-admins must approve it before the request can proceed. The actual execution remains subject to provider controls, available balances, transaction limits, and applicable law. A platform approval is not a guarantee that a provider will execute or reverse a transaction.',
      'Admins and Sub-admins must act honestly, follow the Group’s stated purpose, protect member information, explain material decisions, and use Group permissions only for legitimate purposes. Members should review a Group’s purpose, leadership, rules, and intended use of contributions before joining or paying in. Do not contribute money you cannot afford to lose or rely on a Group’s statements as a guarantee of repayment.',
      'Akiba may provide records and support tools to help members understand Group activity, but does not independently verify every statement, expense, identity, or claim made by a member. Group members remain responsible for resolving ordinary internal decisions and disagreements, subject to their legal rights.',
    ],
  },
  {
    title: '5. Contributions, withdrawals, and transaction risk',
    paragraphs: [
      'When you initiate or authorize a payment, contribution, withdrawal, or transfer, you authorize the relevant instructions needed to process it through the selected provider. You must have authority to use the payment method and provide accurate transaction details. Transactions may be delayed, declined, held, reversed, or limited by providers, network operators, fraud controls, technical issues, or legal requirements.',
      'Akiba does not itself hold or safeguard customer funds merely because a transaction or balance is displayed in the platform. The entity that receives, holds, moves, or settles funds depends on the payment flow and the provider used. Review provider terms and transaction confirmations carefully before proceeding.',
      'If you believe a transaction is incorrect, unauthorized, duplicated, or fraudulent, report it promptly using the support options in the Services and, where appropriate, contact your payment provider. We may help submit or track a reversal request, but reversals and refunds depend on transaction status, provider rules, evidence, recipient cooperation, and applicable law. We cannot guarantee recovery.',
      'Do not use Akiba to launder money, finance terrorism, evade sanctions, facilitate fraud, handle stolen funds, or conduct any unlawful transaction. We may request information reasonably necessary to investigate suspicious activity or meet legal obligations.',
    ],
  },
  {
    title: '6. Plans, subscriptions, and charges',
    paragraphs: [
      'Akiba may offer free and paid Personal plans and Group plans. Personal plans may determine the number of Groups an account can create or manage; Group plans may determine member capacity and the features available to a particular Group. The features, limits, billing period, and price applicable to you are those clearly displayed at the time you subscribe or purchase.',
      'Transaction, withdrawal, payment-provider, network, currency-conversion, or other service charges may apply in addition to a subscription. Applicable Akiba charges will be shown before you confirm the relevant transaction or purchase where required. Provider charges may be governed by the provider’s own disclosures and terms.',
      'Paid subscriptions renew only as described at checkout. You authorize the displayed payment method to be charged for recurring fees until cancellation or expiry. You may cancel future renewal using the account or billing controls provided, or by contacting support if those controls are unavailable. Unless required by law or expressly stated at purchase, cancellation stops future renewals and does not automatically refund charges already incurred.',
      'We may change prices or plan features prospectively. We will provide notice where required by law and, for material subscription price increases, before the new price applies. If you do not accept a change, you may cancel before it takes effect.',
    ],
  },
  {
    title: '7. Acceptable use and content',
    paragraphs: [
      'You may use Akiba only for lawful purposes and in accordance with these Terms. You must not: deceive or defraud users; impersonate another person; threaten, harass, or unlawfully discriminate; misuse personal or financial information; upload malicious code; interfere with platform security or availability; scrape or access data without authorization; infringe intellectual property; manipulate records; or use the Services to facilitate unlawful fundraising or financial activity.',
      'You retain rights in content you submit, subject to rights others may have. You grant Globe a limited, non-exclusive permission to host, store, reproduce, display, and process that content as reasonably necessary to operate, secure, support, and improve the Services and to comply with law. You represent that you have the rights and permissions needed to submit it.',
      'We may remove content, limit features, suspend transactions, or restrict an account or Group where reasonably necessary to investigate suspected misuse, protect users, maintain security, enforce these Terms, or comply with law. Where lawful and practical, we will provide an explanation and a way to seek review.',
    ],
  },
  {
    title: '8. Privacy and communications',
    paragraphs: [
      'Our Privacy Policy explains how Globe collects, uses, discloses, stores, and protects personal data in connection with Akiba. By using the Services, you acknowledge that your information will be handled as described there and under applicable data protection law.',
      'Akiba may send service messages about account security, Group activity, transactions, receipts, policy changes, and support. These operational messages are necessary to provide the Services. Marketing messages, where sent, will include an appropriate way to opt out. You are responsible for ensuring that contact details and notification settings are current.',
      'Information shared within a Group may be visible to other members according to the Group’s features and role permissions. Do not post information you are not entitled to share.',
    ],
  },
  {
    title: '9. Intellectual property and feedback',
    paragraphs: [
      'Akiba, its software, design, branding, logos, text, and other platform materials are owned by Globe or its licensors and are protected by intellectual property laws. These Terms give you a limited, personal, revocable, non-transferable right to use the Services for their intended purpose. They do not transfer ownership of any intellectual property to you.',
      'You may not copy, resell, reverse engineer, modify, or create derivative works from the Services except to the extent that applicable law does not permit that restriction or we have given written permission. “Akiba”, “Globe Software”, and “Globe Technologies Ltd” names and marks may not be used to imply endorsement or partnership without authorization.',
      'If you send suggestions or feedback, you allow Globe to use them without restriction or compensation, provided we do not thereby disclose your personal information contrary to our Privacy Policy.',
    ],
  },
  {
    title: '10. Third-party services and links',
    paragraphs: [
      'The Services may rely on or link to third-party payment providers, financial institutions, communications services, app stores, and websites. Those services are governed by their own terms and privacy notices. Globe is not responsible for independent third-party services, except to the extent liability cannot be excluded under applicable law.',
      'A provider’s appearance in Akiba does not by itself mean that it sponsors, endorses, or is affiliated with Globe. Availability of a provider or feature may change.',
    ],
  },
  {
    title: '11. Availability, suspension, and termination',
    paragraphs: [
      'We work to keep Akiba reliable and secure, but do not guarantee uninterrupted, error-free, or continuous availability. We may maintain, update, change, or discontinue features and may temporarily restrict access for security, operational, legal, or provider-related reasons.',
      'You may stop using Akiba and close your account through the controls provided or by contacting support. Account closure does not necessarily cancel a separate subscription or resolve pending payments, Group obligations, disputes, or records that must be retained by law. You should resolve or transfer Group responsibilities and save any records you are entitled to retain before closure.',
      'We may suspend or terminate access for a material breach of these Terms, legal requirements, security risks, suspected fraud, or activity that threatens users or the Services. Where appropriate and lawful, we will notify you and provide a route to challenge the decision.',
    ],
  },
  {
    title: '12. Disclaimers and limitation of liability',
    paragraphs: [
      'To the maximum extent permitted by law, the Services are provided on an “as available” basis. We do not warrant that the Services will meet every requirement, that records will be error-free at all times, that every payment will succeed, or that a Group will achieve its purpose. Nothing in these Terms excludes a consumer guarantee or other right that cannot lawfully be excluded.',
      'To the maximum extent permitted by law, Globe will not be liable for indirect, incidental, special, exemplary, or consequential loss, or loss of profits, opportunity, goodwill, or data arising from use of the Services. Nothing in these Terms limits liability for fraud, wilful misconduct, death or personal injury where such limitation is prohibited, or any other liability that cannot lawfully be limited.',
      'Subject to the preceding paragraph and applicable law, Globe’s total liability for claims arising from the Services will be limited to the amount you paid directly to Globe for the relevant Akiba Services in the twelve months before the event giving rise to the claim. This limit does not apply where prohibited by law.',
    ],
  },
  {
    title: '13. Indemnity',
    paragraphs: [
      'To the extent permitted by law, you are responsible for claims, losses, and reasonable costs arising from your unlawful use of the Services, your material breach of these Terms, or content you submit that infringes another person’s rights. This clause does not require you to indemnify Globe for loss caused by Globe’s own breach of law or obligations.',
    ],
  },
  {
    title: '14. Complaints and disputes',
    paragraphs: [
      'If you have a concern about Akiba, contact us through the support or contact channel made available on the platform or at globetechnologies.com. We will take reasonable steps to understand the issue and respond. For transaction disputes, provide the transaction reference and relevant details, but do not send passwords or verification codes.',
      'These Terms are governed by the laws of Kenya, except where mandatory consumer protection or other laws require otherwise. The parties will first try in good faith to resolve a dispute through support discussions. If it cannot be resolved, either party may refer it to a court of competent jurisdiction in Kenya, subject to any non-waivable rights you may have to bring proceedings elsewhere.',
    ],
  },
  {
    title: '15. Changes to these Terms',
    paragraphs: [
      'We may update these Terms to reflect changes to Akiba, our business, security practices, or legal requirements. We will publish the current version on this page and update the date below. Where a change materially affects your rights or obligations, we will provide additional notice where required by law. Continued use after the effective date means the updated Terms apply, subject to any consent requirements imposed by law.',
    ],
  },
  {
    title: '16. General',
    paragraphs: [
      'If any provision of these Terms is found unenforceable, the remaining provisions will continue to apply. A failure to enforce a provision is not a waiver. You may not transfer your rights or obligations under these Terms without our consent, except where law permits; Globe may transfer these Terms as part of a corporate reorganization, merger, or transfer of the relevant business, subject to applicable law. These Terms and any additional terms expressly incorporated into them form the agreement between you and Globe concerning Akiba.',
    ],
  },
];

export default function Terms() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Link href="/welcome" underline="hover" sx={{ fontWeight: 700, width: 'fit-content' }}>← Back to Akiba</Link>
          <Box>
            <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800, letterSpacing: 2 }}>AKIBA · GLOBE SOFTWARE</Typography>
            <Typography variant="h2" component="h1" sx={{ mt: 1, fontWeight: 800, letterSpacing: '-0.04em', fontSize: { xs: '2.25rem', md: '3.25rem' } }}>Terms of Service</Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>Effective date: 29 October 2026 · Last updated: 29 October 2026</Typography>
            <Typography sx={{ mt: 2, maxWidth: 760 }}>These Terms explain the rules for using Akiba and the responsibilities we share in making group financial coordination useful, transparent, and safe.</Typography>
          </Box>
          <Divider />
          <Box sx={{ p: { xs: 2.5, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
            <Typography fontWeight={800} gutterBottom>At a glance</Typography>
            <Typography color="text.secondary">Akiba helps groups coordinate shared finances; it is not itself a bank or a guarantee that contributions will be recovered. Review a Group before joining, check charges before confirming transactions, and use the support options promptly if something goes wrong.</Typography>
          </Box>
          {sections.map((section) => (
            <Box component="section" key={section.title}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 750, mb: 1.5 }}>{section.title}</Typography>
              {section.paragraphs.map((paragraph) => <Typography key={paragraph} paragraph sx={{ lineHeight: 1.8, color: 'text.secondary' }}>{paragraph}</Typography>)}
            </Box>
          ))}
          <Divider />
          <Box>
            <Typography variant="h6" fontWeight={800}>The Akiba relationship</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.8 }}>Akiba is a product of Globe Software, a division of Globe Technologies Ltd. These Terms are intended to be read together with the <Link href="/privacy" underline="hover">Privacy Policy</Link>.</Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>For assistance, use the contact or support options available in Akiba or visit <Link href="https://globetechnologies.com" target="_blank" rel="noreferrer" underline="hover">Globe Technologies Ltd</Link>.</Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
