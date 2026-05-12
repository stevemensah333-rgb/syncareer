/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Syncareer'
const SITE_URL = 'https://syncareer.me'
const PRIMARY = '#00CCCC'

interface NudgeProps {
  name?: string
}

const AssessmentNudgeEmail = ({ name }: NudgeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your career assessment is waiting — 15 minutes to clarity</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `${name}, your assessment is waiting.` : 'Your assessment is waiting.'}
        </Heading>
        <Text style={text}>
          Most students who finish the assessment say it gave them the first
          honest answer to "what should I actually do with my degree?"
        </Text>
        <Text style={text}>
          It takes about 15 minutes. You'll get your top three career matches,
          your RIASEC profile, and a personalised skill-gap report.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={`${SITE_URL}/assessment`} style={button}>
            Start the assessment
          </Button>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AssessmentNudgeEmail,
  subject: 'Your career assessment is waiting',
  displayName: 'Assessment reminder',
  previewData: { name: 'Ama' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 20px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.65', margin: '0 0 18px' }
const button = { backgroundColor: PRIMARY, color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#737373', margin: '36px 0 0' }
