/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Syncareer'
const SITE_URL = 'https://syncareer.me'
const PRIMARY = '#00CCCC'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — let's build your career story</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Welcome, ${name}.` : 'Welcome to Syncareer.'}
        </Heading>
        <Text style={text}>
          You've joined a platform built for African graduates who want a
          serious, evidence-based path into competitive careers.
        </Text>
        <Text style={text}>
          The fastest way to get value today: take the 15-minute career
          assessment. It maps your interests, strengths, and personality
          to careers that fit — using the same RIASEC model professional
          counsellors use.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={`${SITE_URL}/assessment`} style={button}>
            Take the assessment
          </Button>
        </Section>
        <Text style={text}>
          After that, you'll unlock your personalised dashboard, an
          ATS-ready CV builder, and AI interview practice with SynAssist.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Syncareer',
  displayName: 'Welcome email',
  previewData: { name: 'Ama' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 20px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.65', margin: '0 0 18px' }
const button = { backgroundColor: PRIMARY, color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#737373', margin: '36px 0 0' }
