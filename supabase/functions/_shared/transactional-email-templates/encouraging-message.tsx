/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text, Img, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const MEDALLION_JPG = "https://sxchcugllltcpxmahvkn.supabase.co/storage/v1/object/public/button/medallion.jpg"
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
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
      `}</style>
    </Head>
    <Preview>{message ? `"${message}"` : 'Someone is thinking of you today.'}</Preview>
    <Body style={main}>
      <Container style={wrapper}>

        {/* Postcard outer border — gold frame */}
        <Container style={postcard}>

          {/* TOP BAND */}
          <Section style={topBand}>
            <Row>
              <Column style={{ padding: '28px 36px 20px', textAlign: 'center' as const }}>
                {/* Inline SVG medallion as fallback since img may not load */}
                <Text style={medallionEmoji}>🏅</Text>
                <Text style={appName}>Encouraging Words</Text>
                <Text style={tagline}>✦ Unum Accipere ✦</Text>
              </Column>
            </Row>
          </Section>

          {/* Gold rule */}
          <Section style={goldRuleSection}>
            <Hr style={goldRule} />
          </Section>

          {/* VISUAL */}
          {(visualEmoji || visualImageUrl) && (
            <Section style={visualSection}>
              <Row>
                <Column style={{ textAlign: 'center' as const }}>
                  {visualEmoji ? (
                    <Text style={emojiBlock}>{visualEmoji}</Text>
                  ) : visualImageUrl ? (
                    <Img src={visualImageUrl} alt="" width="300" style={imageStyle} />
                  ) : null}
                </Column>
              </Row>
            </Section>
          )}

          {/* MESSAGE BODY */}
          <Section style={bodySection}>
            <Row>
              <Column style={{ padding: '0 36px' }}>
                {recipientName && (
                  <Text style={greeting}>Dear {recipientName},</Text>
                )}
                <Text style={messageText}>{message || ''}</Text>
              </Column>
            </Row>
          </Section>

          {/* Decorative divider */}
          <Section style={{ padding: '0 36px' }}>
            <Hr style={thinDivider} />
          </Section>

          {/* SIGNATURE */}
          <Section style={signatureSection}>
            <Row>
              <Column style={{ padding: '0 36px 28px' }}>
                <Text style={withEncouragement}>With encouragement,</Text>
                <Text style={senderName_style}>{senderName || 'A friend'}</Text>
              </Column>
            </Row>
          </Section>

          {/* FOOTER BAND */}
          <Section style={footerBand}>
            <Row>
              <Column style={{ padding: '14px 36px' }}>
                <Text style={footerText}>
                  Sent with {SITE_NAME} · sendencouragingwords.com
                </Text>
              </Column>
            </Row>
          </Section>

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
  backgroundColor: '#0d0d0d',
  fontFamily: "'Cormorant Garamond', 'Georgia', 'Times New Roman', serif",
  padding: '40px 0',
}
const wrapper = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '0 16px',
}
const postcard = {
  maxWidth: '520px',
  margin: '0 auto',
  backgroundColor: '#0f0f0f',
  borderRadius: '12px',
  border: '2px solid #c9a84c',
  overflow: 'hidden' as const,
  boxShadow: '0 0 40px rgba(201,168,76,0.15), 0 0 80px rgba(201,168,76,0.05)',
}
const topBand = {
  backgroundColor: '#140f00',
  borderBottom: '1px solid #c9a84c55',
}
const medallionEmoji = {
  fontSize: '48px',
  lineHeight: '1',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}
const appName = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '26px',
  fontWeight: '700' as const,
  color: '#c9a84c',
  textAlign: 'center' as const,
  margin: '0 0 4px',
  letterSpacing: '0.04em',
}
const tagline = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '12px',
  color: '#9a7a32',
  textAlign: 'center' as const,
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  margin: '0',
  fontStyle: 'italic' as const,
}
const goldRuleSection = {
  padding: '0',
}
const goldRule = {
  borderTop: '1px solid #c9a84c33',
  margin: '0',
}
const visualSection = {
  padding: '32px 36px 8px',
}
const emojiBlock = {
  fontSize: '96px',
  lineHeight: '1',
  textAlign: 'center' as const,
  margin: '0',
}
const imageStyle = {
  display: 'block',
  margin: '0 auto',
  borderRadius: '10px',
  maxWidth: '300px',
  width: '100%',
}
const bodySection = {
  padding: '28px 0 8px',
}
const greeting = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '19px',
  fontStyle: 'italic' as const,
  color: '#c9a84c',
  margin: '0 0 12px',
  lineHeight: '1.4',
}
const messageText = {
  fontFamily: "'Cormorant Garamond', 'Georgia', serif",
  fontSize: '24px',
  fontWeight: '400' as const,
  lineHeight: '1.75',
  color: '#f0ead8',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}
const thinDivider = {
  borderTop: '1px solid #c9a84c22',
  margin: '24px 0 0',
}
const signatureSection = {
  padding: '20px 0 0',
}
const withEncouragement = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '13px',
  color: '#666',
  margin: '0 0 4px',
  fontStyle: 'italic' as const,
}
const senderName_style = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#c9a84c',
  fontStyle: 'italic' as const,
  margin: '0',
}
const footerBand = {
  backgroundColor: '#0a0a0a',
  borderTop: '1px solid #c9a84c22',
  marginTop: '0',
}
const footerText = {
  fontFamily: 'Georgia, serif',
  fontSize: '11px',
  color: '#444',
  margin: '0',
  textAlign: 'center' as const,
}
const footerLink = {
  color: '#7a6030',
  textDecoration: 'none',
}
