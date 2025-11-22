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

interface AccountActivityEmailProps {
  title?: string
  message?: string
  actionUrl?: string
  activityType?: string
}

export const AccountActivityEmail = ({
  title = 'Account Activity',
  message = 'There has been activity on your account.',
  actionUrl = '/dashboard',
  activityType = 'general',
}: AccountActivityEmailProps) => {
  const getIcon = () => {
    switch (activityType) {
      case 'security': return '🔒'
      case 'profile': return '👤'
      case 'subscription': return '💳'
      default: return '📊'
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{getIcon()} {title}</Heading>
          
          <Text style={text}>
            {message}
          </Text>

          <Section style={infoBox}>
            <Text style={{ ...text, margin: '0', fontSize: '14px' }}>
              If this wasn't you, please secure your account immediately and contact our support team.
            </Text>
          </Section>

          <Link
            href={actionUrl}
            target="_blank"
            style={button}
          >
            View Account Activity
          </Link>

          <Hr style={hr} />

          <Text style={footer}>
            This notification was sent to keep you informed about important changes to your account. If you have concerns, please contact our support team.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AccountActivityEmail

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

const infoBox = {
  backgroundColor: '#e3f2fd',
  border: '1px solid #2196f3',
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
