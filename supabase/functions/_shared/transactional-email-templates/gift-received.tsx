/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Html, Preview, Text, Img, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const MEDALLION_JPG = "https://zwivxqoxbsacyvccrmel.supabase.co/storage/v1/object/public/button/medallion.jpg"

interface GiftReceivedProps {
  purchaserName?: string
  recipientName?: string
  note?: string
  claimUrl?: string
}

const GiftReceivedEmail = ({ purchaserName, recipientName, note, claimUrl }: GiftReceivedProps) => {
  const from = purchaserName || 'A friend'
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@400;700&display=swap');
        `}</style>
      </Head>
      <Preview>{`${from} gave you a year of Encouraging Words`}</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Container style={postcard}>
            <Section style={topBand}>
              <Row>
                <Column style={{ padding: '28px 36px 20px', textAlign: 'center' as const }}>
                  <Img
                    src={MEDALLION_JPG}
                    alt="Encouraging Words"
                    width="120"
                    height="120"
                    style={{ display: 'block', margin: '0 auto 12px', width: '120px', height: '120px', borderRadius: '50%' }}
                  />
                  <Text style={appName}>Encouraging Words</Text>
                </Column>
              </Row>
            </Section>

            <Section style={{ padding: '28px 36px 8px' }}>
              {recipientName && <Text style={greeting}>Dear {recipientName},</Text>}
              <Text style={heading}>A year of encouraging words, from {from}</Text>
              {note && <Text style={quote}>{note}</Text>}
              <Text style={bodyText}>
                Encouraging Words lets you send a few kind words to the people in your life, by email or text. {from} gave you a full year of it.
              </Text>
            </Section>

            <Section style={{ padding: '8px 36px 8px', textAlign: 'center' as const }}>
              <Button href={claimUrl} style={button}>Claim your gift</Button>
            </Section>

            <Section style={{ padding: '0 36px 28px' }}>
              <Hr style={thinDivider} />
              <Text style={smallPrint}>No card needed. Your year starts when you claim it.</Text>
            </Section>
          </Container>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GiftReceivedEmail,
  subject: (data: Record<string, any>) =>
    `${data.purchaserName || 'A friend'} gave you a year of Encouraging Words`,
  displayName: 'Gift received',
  previewData: {
    purchaserName: 'Sarah',
    recipientName: 'Jane',
    note: 'Because you always lift everyone else up.',
    claimUrl: 'https://sendencouragingwords.com/gift/example',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#0d0d0d',
  fontFamily: "'Lato', Helvetica, Arial, sans-serif",
  padding: '40px 0',
}
const wrapper = { maxWidth: '520px', margin: '0 auto', padding: '0 16px' }
const postcard = {
  maxWidth: '520px',
  margin: '0 auto',
  backgroundColor: '#0f0f0f',
  borderRadius: '12px',
  border: '2px solid #c9a84c',
  overflow: 'hidden' as const,
}
const topBand = { backgroundColor: '#140f00', borderBottom: '1px solid #c9a84c55' }
const appName = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '26px',
  fontWeight: '700' as const,
  color: '#c9a84c',
  textAlign: 'center' as const,
  margin: '0',
  letterSpacing: '0.04em',
}
const greeting = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '19px',
  fontStyle: 'italic' as const,
  color: '#c9a84c',
  margin: '0 0 12px',
}
const heading = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '28px',
  fontWeight: '600' as const,
  lineHeight: '1.3',
  color: '#f0ead8',
  margin: '0 0 20px',
}
const quote = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '22px',
  fontStyle: 'italic' as const,
  lineHeight: '1.6',
  color: '#f0ead8',
  borderLeft: '2px solid #c9a84c',
  padding: '0 0 0 16px',
  margin: '0 0 20px',
  whiteSpace: 'pre-wrap' as const,
}
const bodyText = {
  fontFamily: "'Lato', Helvetica, Arial, sans-serif",
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#d8d0bc',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#c9a84c',
  color: '#0a0a0a',
  fontFamily: "'Lato', Helvetica, Arial, sans-serif",
  fontSize: '16px',
  fontWeight: '700' as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const thinDivider = { borderTop: '1px solid #c9a84c22', margin: '24px 0 12px' }
const smallPrint = {
  fontFamily: "'Lato', Helvetica, Arial, sans-serif",
  fontSize: '12px',
  color: '#8a8070',
  textAlign: 'center' as const,
  margin: '0',
}
