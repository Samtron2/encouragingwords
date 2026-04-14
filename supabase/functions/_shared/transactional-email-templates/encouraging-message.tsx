/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Img, Hr,
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
}

const EncouragingMessageEmail = ({
  recipientName,
  senderName,
  message,
  visualImageUrl,
  visualEmoji,
}: EncouragingMessageProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{message || 'Someone is thinking of you today.'}</Preview>
    <Body style={main}>
      {/* Outer wrapper — dark page background */}
      <Container style={outer}>
        {/* Postcard */}
        <Container style={postcard}>
          {/* Top band — medallion + tagline */}
          <Container style={topBand}>
            <Img src={MEDALLION_URL} alt="Encouraging Words" width="56" height="56" style={medallionStyle} />
            <Text style={tagline}>Unum Accipere</Text>
          </Container>

          {/* Gold divider */}
          <Hr style={dividerTop} />

          {/* Visual — emoji or image */}
          {visualEmoji && (
            <Text style={emojiBlock}>{visualEmoji}</Text>
          )}
          {visualImageUrl && !visualEmoji && (
            <Img src={visualImageUrl} alt="" width="320" style={imageStyle} />
          )}

          {/* Greeting */}
          {recipientName && (
            <Text style={greeting}>Dear {recipientName},</Text>
          )}

          {/* Message */}
          <Text style={messageText}>{message || ''}</Text>

          {/* Gold divider */}
          <Hr style={dividerBottom} />

          {/* Signature */}
          <Text style={withEncouragement}>With encouragement,</Text>
          <Text style={senderStyle}>{senderName || 'A friend'}</Text>

          {/* Footer */}
          <Text style={footer}>
            Sent with {SITE_NAME} · sendencouragingwords.com
          </Text>
        </Container>
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
    message: 'You are enough. Keep shining.',
    visualEmoji: '🌸',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: "'Georgia', 'Times New Roman', serif",
  padding: '32px 0',
}
const outer = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '0 16px',
}
const postcard = {
  backgroundColor: '#111111',
  border: '1.5px solid #c9a84c',
  borderRadius: '16px',
  overflow: 'hidden' as const,
  padding: '0',
  maxWidth: '520px',
  margin: '0 auto',
}
const topBand = {
  backgroundColor: '#1a1400',
  padding: '24px 32px 16px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #c9a84c44',
}
const medallionStyle = {
  display: 'block',
  margin: '0 auto 8px',
}
const tagline = {
  fontFamily: "'Georgia', serif",
  fontSize: '13px',
  letterSpacing: '0.18em',
  color: '#c9a84c',
  textTransform: 'uppercase' as const,
  margin: '0',
  fontStyle: 'italic' as const,
}
const dividerTop = {
  borderColor: '#c9a84c33',
  margin: '0',
}
const dividerBottom = {
  borderColor: '#c9a84c33',
  margin: '0 32px 20px',
}
const emojiBlock = {
  fontSize: '80px',
  lineHeight: '1',
  textAlign: 'center' as const,
  margin: '28px 0 8px',
}
const imageStyle = {
  display: 'block',
  margin: '28px auto 8px',
  borderRadius: '10px',
  maxWidth: '320px',
  width: '100%',
}
const greeting = {
  fontFamily: "'Georgia', serif",
  fontSize: '18px',
  color: '#c9a84c',
  margin: '20px 32px 8px',
  fontStyle: 'italic' as const,
}
const messageText = {
  fontFamily: "'Georgia', 'Times New Roman', serif",
  fontSize: '22px',
  lineHeight: '1.7',
  color: '#f5f0e8',
  margin: '0 32px 28px',
  whiteSpace: 'pre-wrap' as const,
}
const withEncouragement = {
  fontFamily: "'Georgia', serif",
  fontSize: '13px',
  color: '#888888',
  margin: '0 32px 2px',
}
const senderStyle = {
  fontFamily: "'Georgia', serif",
  fontSize: '18px',
  color: '#c9a84c',
  fontStyle: 'italic' as const,
  margin: '0 32px 24px',
}
const footer = {
  fontFamily: "'Georgia', serif",
  fontSize: '11px',
  color: '#444444',
  textAlign: 'center' as const,
  margin: '0',
  padding: '12px 32px 20px',
  borderTop: '1px solid #c9a84c22',
}
