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

interface PaymentConfirmedEmailProps {
  amount?: number
  currency?: string
  transactionId?: string
  planName?: string
  actionUrl?: string
}

export const PaymentConfirmedEmail = ({
  amount = 0,
  currency = 'XOF',
  transactionId,
  planName = 'Premium Plan',
  actionUrl = '/dashboard',
}: PaymentConfirmedEmailProps) => (
  <Html>
    <Head />
    <Preview>Payment confirmed - Thank you for your purchase!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Payment Confirmed</Heading>
        
        <Text style={text}>
          Great news! Your payment has been successfully processed.
        </Text>

        <Section style={successBox}>
          <Text style={{ ...text, margin: '0 0 12px', fontWeight: '600', fontSize: '18px' }}>
            {amount.toLocaleString()} {currency}
          </Text>
          <Text style={{ ...text, margin: '0', fontSize: '14px' }}>
            {planName}
          </Text>
        </Section>

        <Text style={text}>
          You now have full access to all premium features and content. Start exploring!
        </Text>

        <Link
          href={actionUrl}
          target="_blank"
          style={button}
        >
          Go to Dashboard
        </Link>

        {transactionId && (
          <>
            <Hr style={hr} />
            <Text style={{ ...text, fontSize: '12px', color: '#666' }}>
              <strong>Transaction ID:</strong> {transactionId}
            </Text>
          </>
        )}

        <Hr style={hr} />

        <Text style={footer}>
          Keep this email for your records. If you have any questions about your payment, please contact our support team.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PaymentConfirmedEmail

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

const successBox = {
  backgroundColor: '#d4edda',
  border: '1px solid #28a745',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
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
