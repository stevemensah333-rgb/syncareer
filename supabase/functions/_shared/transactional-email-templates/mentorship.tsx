/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://syncareer.me'

type Props = {
  heading?: string
  preview?: string
  intro?: string
  detail?: string
  contactLabel?: string
  contactEmail?: string
  requestId?: string
  actionLabel?: string
}

const MentorshipEmail = ({ heading, preview, intro, detail, contactLabel, contactEmail, requestId, actionLabel }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview ?? heading ?? 'Syncareer mentorship update'}</Preview>
    <Body style={{ backgroundColor: '#f7f8fa', fontFamily: 'Inter, Arial, sans-serif' }}>
      <Container style={{ backgroundColor: '#fff', margin: '28px auto', padding: '32px 28px', maxWidth: '580px', borderRadius: '12px' }}>
        <Heading style={{ color: '#111827', fontSize: '24px', margin: '0 0 20px' }}>{heading}</Heading>
        <Text style={text}>{intro}</Text>
        {detail && <Section style={{ backgroundColor: '#f3f6fb', borderRadius: '8px', padding: '14px 16px', margin: '20px 0' }}><Text style={{ ...text, margin: 0 }}>{detail}</Text></Section>}
        {contactEmail && <Text style={text}><strong>{contactLabel}:</strong> {contactEmail}</Text>}
        {requestId && <Section style={{ textAlign: 'center', margin: '28px 0' }}><Button href={`${SITE_URL}/mentorship/requests?request=${requestId}`} style={{ backgroundColor: '#1d4ed8', color: '#fff', padding: '12px 22px', borderRadius: '8px', textDecoration: 'none' }}>{actionLabel ?? 'View request'}</Button></Section>}
        <Text style={{ ...text, color: '#6b7280', fontSize: '13px' }}>Syncareer handles the introduction and request record. After acceptance, arrange timing and continue the conversation through normal email.</Text>
      </Container>
    </Body>
  </Html>
)

const text = { color: '#374151', fontSize: '15px', lineHeight: '1.65', margin: '0 0 16px' }
const entry = (subject: string | ((data: Record<string, any>) => string), previewData: Props): TemplateEntry => ({ component: MentorshipEmail, subject, displayName: 'Mentorship lifecycle email', previewData })

export const mentorshipTemplates: Record<string, TemplateEntry> = {
  'mentor-request-new': entry('New mentorship request on Syncareer', { heading: 'You have a new mentorship request', intro: 'Review the request and decide whether you can help.', requestId: 'preview', actionLabel: 'Review request' }),
  'mentor-request-accepted-mentor': entry('Mentorship introduction: request accepted', { heading: 'Introduction ready', intro: 'You accepted this request. You can now contact the mentee directly.', contactLabel: 'Mentee email', contactEmail: 'student@example.com', requestId: 'preview' }),
  'mentor-request-accepted-mentee': entry('Your mentorship request was accepted', { heading: 'Your mentor accepted', intro: 'Your mentor has accepted your request. Contact them to arrange a suitable time.', contactLabel: 'Mentor email', contactEmail: 'mentor@company.com', requestId: 'preview' }),
  'mentor-request-declined': entry('Update on your mentorship request', { heading: 'Your request was declined', intro: 'This mentor cannot take the request right now. You can find another verified mentor.', requestId: 'preview', actionLabel: 'Find another mentor' }),
  'mentor-verification-approved': entry('Your Syncareer mentor profile is verified', { heading: 'Your mentor profile is verified', intro: 'Your company email has been verified and your profile can now appear in the mentor directory.' }),
  'mentor-verification-not-approved': entry('Update on your Syncareer mentor verification', { heading: 'Mentor verification update', intro: 'Your mentor profile is not currently visible. Sign in to review the verification status and next steps.' }),
}
