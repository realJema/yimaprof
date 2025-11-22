import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface SubscriptionExpiryEmailProps {
  planName?: string
  daysRemaining?: number
  expiresAt?: string
  actionUrl?: string
}

export const SubscriptionExpiryEmail = ({
  planName = 'Premium',
  daysRemaining = 7,
  expiresAt,
  actionUrl = '/subscriptions',
}: SubscriptionExpiryEmailProps) => (
  <Html>
    <Head />
    <Preview>Your subscription expires in {daysRemaining} days</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⏰ Subscription Expiring Soon</Heading>
        
        <Text style={text}>
          Your <strong>{planName}</strong> subscription will expire in{' '}
          <strong style={{ color: '#e74c3c' }}>{daysRemaining} days</strong>.
        </Text>

        <Section style={warningBox}>
          <Text style={{ ...text, margin: '0', fontSize: '14px' }}>
            Don't lose access to your premium content and features!
          </Text>
        </Section>

        <Text style={text}>
          Renew now to continue enjoying unlimited access to exams, study materials, and all premium features.
        </Text>

        <Link
          href={actionUrl}
          target="_blank"
          style={button}
        >
          Renew Subscription
        </Link>

        {expiresAt && (
          <Text style={{ ...text, fontSize: '12px', color: '#666' }}>
            Expiration date: {new Date(expiresAt).toLocaleDateString()}
          </Text>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          Need help? Contact our support team or visit your account dashboard.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SubscriptionExpiryEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 30px',
  lineHeight: '1.3',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
}

const warningBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '0',
}
