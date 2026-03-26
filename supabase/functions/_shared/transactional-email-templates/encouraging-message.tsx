/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Encouraging Words'

interface EncouragingMessageProps {
  recipientName?: string
  message?: string
  visualImageUrl?: string
  visualEmoji?: string
}

const EncouragingMessageEmail = ({
  recipientName,
  message,
  visualImageUrl,
  visualEmoji,
}: EncouragingMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{message || 'Someone is thinking of you'}</Preview>
    <Body style={main}>
      <Container style={container}>
        {visualEmoji && (
          <Text style={emojiBlock}>{visualEmoji}</Text>
        )}
        {visualImageUrl && !visualEmoji && (
          <Img
            src={visualImageUrl}
            alt="Visual"
            width="400"
            style={imageStyle}
          />
        )}
        {recipientName ? (
          <Heading style={h1}>Dear {recipientName},</Heading>
        ) : null}
        <Text style={messageText}>{message || ''}</Text>
        <Text style={footer}>Sent with {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EncouragingMessageEmail,
  subject: 'Someone is thinking of you',
  displayName: 'Encouraging message',
  previewData: {
    recipientName: 'Jane',
    message: 'You are enough. Keep shining ✨',
    visualEmoji: '🌸',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Lato', 'Georgia', Arial, sans-serif",
}
const container = {
  padding: '32px 24px',
  maxWidth: '480px',
  margin: '0 auto',
  backgroundColor: '#fffaf5',
  borderRadius: '16px',
}
const emojiBlock = {
  fontSize: '96px',
  lineHeight: '1',
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const imageStyle = {
  width: '100%',
  maxWidth: '400px',
  borderRadius: '12px',
  marginBottom: '24px',
  display: 'block' as const,
  marginLeft: 'auto',
  marginRight: 'auto',
}
const h1 = {
  fontSize: '18px',
  fontWeight: '500' as const,
  color: '#1c1c1c',
  margin: '0 0 8px',
  fontFamily: "'Cormorant Garamond', Georgia, serif",
}
const messageText = {
  fontSize: '18px',
  lineHeight: '1.6',
  color: '#333333',
  whiteSpace: 'pre-wrap' as const,
  margin: '0 0 32px',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '0',
  borderTop: '1px solid #eeeeee',
  paddingTop: '16px',
}
