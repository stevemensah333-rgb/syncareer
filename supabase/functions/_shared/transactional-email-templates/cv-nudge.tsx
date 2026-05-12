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

const CvNudgeEmail = ({ name }: NudgeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Build your ATS-ready CV in minutes</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Next step, ${name}: your CV.` : 'Next step: your CV.'}
        </Heading>
        <Text style={text}>
          Over 75% of medium and large employers in Africa use Applicant
          Tracking Systems to filter CVs before a recruiter ever sees them.
          A pretty CV that fails ATS is invisible.
        </Text>
        <Text style={text}>
          The Syncareer CV Builder generates a clean, ATS-optimised CV from
          your profile and gives you a Strength Score so you know where to
          improve before you apply.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={`${SITE_URL}/cv-builder`} style={button}>
            Build my CV
          </Button>
        </Section>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CvNudgeEmail,
  subject: 'Your ATS-ready CV is one step away',
  displayName: 'CV reminder',
  previewData: { name: 'Ama' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: '600', color: '#0a0a0a', margin: '0 0 20px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.65', margin: '0 0 18px' }
const button = { backgroundColor: PRIMARY, color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#737373', margin: '36px 0 0' }
