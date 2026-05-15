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

const getUrgencyStyles = (days: number) => {
  if (days <= 1) {
    return {
      urgencyColor: '#dc2626', // red
      urgencyBg: '#fef2f2',
      urgencyBorder: '#fecaca',
      buttonBg: '#dc2626',
    }
  } else if (days <= 3) {
    return {
      urgencyColor: '#ea580c', // orange
      urgencyBg: '#fff7ed',
      urgencyBorder: '#fed7aa',
      buttonBg: '#ea580c',
    }
  } else {
    return {
      urgencyColor: '#d97706', // amber
      urgencyBg: '#fffbeb',
      urgencyBorder: '#fde68a',
      buttonBg: '#3b82f6',
    }
  }
}

const getMessage = (days: number, planName: string) => {
  if (days <= 1) {
    return {
      preview: `Your ${planName} subscription expires today!`,
      headline: '⚠️ Last Day to Renew',
      subheading: `Your ${planName} subscription expires TODAY`,
      mainText: `This is your final reminder. Your access to all premium exams, corrections, and evaluations will end today if you don't renew.`,
      urgentNote: `Don't lose your progress - renew immediately to maintain uninterrupted access!`,
    }
  } else if (days <= 3) {
    return {
      preview: `Only ${days} days left on your ${planName} subscription`,
      headline: `⏰ Final Reminder: ${days} Days Left`,
      subheading: `Your ${planName} subscription expires in ${days} days`,
      mainText: `Time is running out! Your premium access will end soon. Renew now to avoid losing access to 500+ exams and all premium features.`,
      urgentNote: `Act now - your learning progress depends on it!`,
    }
  } else if (days <= 5) {
    return {
      preview: `${days} days remaining on your ${planName} subscription`,
      headline: `📅 ${days} Days of Premium Left`,
      subheading: `Your ${planName} subscription is expiring soon`,
      mainText: `Your premium subscription will expire in ${days} days. Don't lose access to your favorite exams, detailed corrections, and evaluation features.`,
      urgentNote: null,
    }
  } else {
    return {
      preview: `Your ${planName} subscription expires in ${days} days`,
      headline: '🔔 Subscription Expiring Soon',
      subheading: `Your ${planName} subscription expires in ${days} days`,
      mainText: `This is a friendly reminder that your subscription will expire soon. Renew now to continue enjoying unlimited access to exams, study materials, and all premium features.`,
      urgentNote: null,
    }
  }
}

export const SubscriptionExpiryEmail = ({
  planName = 'Premium',
  daysRemaining = 7,
  expiresAt,
  actionUrl = '/subscriptions',
}: SubscriptionExpiryEmailProps) => {
  const styles = getUrgencyStyles(daysRemaining)
  const content = getMessage(daysRemaining, planName)
  
  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{content.headline}</Heading>
          
          <Text style={{ ...text, fontSize: '18px', fontWeight: '600', color: styles.urgencyColor }}>
            {content.subheading}
          </Text>

          <Text style={text}>
            {content.mainText}
          </Text>

          <Section style={{ ...warningBox, backgroundColor: styles.urgencyBg, borderColor: styles.urgencyBorder }}>
            <Text style={{ ...text, margin: '0', fontSize: '14px' }}>
              <strong>With your premium subscription, you get:</strong>
            </Text>
            <ul style={{ margin: '12px 0 0 0', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '4px' }}>Unlimited access to 500+ exams</li>
              <li style={{ marginBottom: '4px' }}>Complete corrections and solutions</li>
              <li style={{ marginBottom: '4px' }}>Evaluation mode with scoring</li>
              <li style={{ marginBottom: '4px' }}>Progress tracking and analytics</li>
            </ul>
          </Section>

          {content.urgentNote && (
            <Text style={{ ...text, fontWeight: '600', color: styles.urgencyColor }}>
              {content.urgentNote}
            </Text>
          )}

          <Link
            href={actionUrl}
            target="_blank"
            style={{ ...button, backgroundColor: styles.buttonBg }}
          >
            {daysRemaining <= 1 ? 'Renew Immediately' : 'Renew Subscription'}
          </Link>

          {expiresAt && (
            <Text style={{ ...text, fontSize: '12px', color: '#666' }}>
              Expiration date: {new Date(expiresAt).toLocaleDateString()}
            </Text>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Need help? Contact our support team or visit your account dashboard.
            <br />
            <Link href="https://yimaprof.com/contact" style={{ color: '#3b82f6' }}>
              Contact Support
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

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
