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

interface AdminMessageEmailProps {
  title?: string
  message?: string
  actionUrl?: string
  priority?: string
}

export const AdminMessageEmail = ({
  title = 'Important Message',
  message = 'You have received a message from the administrator.',
  actionUrl,
  priority = 'normal',
}: AdminMessageEmailProps) => {
  const isHighPriority = priority === 'high' || priority === 'urgent'
  
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          {isHighPriority && (
            <Section style={priorityBadge}>
              <Text style={{ margin: '0', fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>
                ⚠️ HIGH PRIORITY
              </Text>
            </Section>
          )}
          
          <Heading style={h1}>📢 {title}</Heading>
          
          <Section style={messageBox}>
            <Text style={{ ...text, whiteSpace: 'pre-wrap' as const }}>
              {message}
            </Text>
          </Section>

          {actionUrl && (
            <Link
              href={actionUrl}
              target="_blank"
              style={button}
            >
              View Details
            </Link>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            This is an official message from the administration team. If you have questions, please contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AdminMessageEmail

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

const priorityBadge = {
  backgroundColor: '#fee2e2',
  border: '1px solid #dc2626',
  borderRadius: '6px',
  padding: '8px 12px',
  textAlign: 'center' as const,
  marginBottom: '20px',
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

const messageBox = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '4px',
  padding: '20px',
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
