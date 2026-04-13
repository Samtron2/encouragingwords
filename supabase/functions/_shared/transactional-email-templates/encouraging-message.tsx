/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Img, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const MEDALLION_URL = "https://sxchcugllltcpxmahvkn.supabase.co/storage/v1/object/public/button/ew.vector.svg"
const SITE_NAME = 'Encouraging Words'

interface EncouragingMessageProps {
  recipientName?: string
  senderName?: string
  message?: string
  visualImageUrl?: string
  visualEmoji?: string
  messageUrl?: string
}

const EncouragingMessageEmail = ({
  recipientName,
  senderName,
  messageUrl,
}: EncouragingMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have received an Encouraging Word{senderName ? ` from ${senderName}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={MEDALLION_URL}
          alt="Encouraging Words"
          width="80"
          height="80"
          style={medallionStyle}
        />
        <Text style={heading}>
          You've received{"\n"}an Encouraging Word
        </Text>
        {recipientName && (
          <Text style={subheading}>For {recipientName}</Text>
        )}
        <Text style={bodyText}>
          {senderName ? `${senderName} has` : 'Someone has'} sent you something thoughtful. Open your letter to read it.
        </Text>
        {messageUrl && (
          <Button href={messageUrl} style={buttonStyle}>
            Open your letter
          </Button>
        )}
        <Hr style={divider} />
        <Text style={footer}>
          Sent with {SITE_NAME} · This letter was sent just for you.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EncouragingMessageEmail,
  subject: (data: Record<string, any>) =>
    data.senderName
      ? `${data.senderName} sent you an Encouraging Word`
      : 'You have received an Encouraging Word',
  displayName: 'Encouraging message',
  previewData: {
    recipientName: 'Jane',
    senderName: 'Sarah',
    messageUrl: 'https://sendencouragingwords.com/m/preview',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: "'Georgia', serif",
}
const container = {
  padding: '40px 32px',
  maxWidth: '480px',
  margin: '0 auto',
  backgroundColor: '#111111',
  borderRadius: '16px',
  border: '1px solid #c9a84c44',
  textAlign: 'center' as const,
}
const medallionStyle = {
  display: 'block',
  margin: '0 auto 24px',
  width: '80px',
  height: '80px',
  objectFit: 'contain' as const,
}
const heading = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#c9a84c',
  fontFamily: "'Georgia', serif",
  lineHeight: '1.3',
  margin: '0 0 8px',
  whiteSpace: 'pre-line' as const,
}
const subheading = {
  fontSize: '16px',
  color: '#888888',
  margin: '0 0 20px',
}
const bodyText = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#f5f0e8',
  margin: '0 0 28px',
}
const buttonStyle = {
  display: 'inline-block',
  background: '#c9a84c',
  color: '#0a0a0a',
  borderRadius: '999px',
  padding: '14px 36px',
  fontSize: '17px',
  fontWeight: 'bold',
  textDecoration: 'none',
  marginBottom: '32px',
}
const divider = {
  borderColor: '#c9a84c33',
  margin: '0 0 20px',
}
const footer = {
  fontSize: '12px',
  color: '#555555',
  margin: '0',
}
