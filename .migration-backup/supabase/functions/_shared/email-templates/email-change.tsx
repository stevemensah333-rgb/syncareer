/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fsorkxlcasekndigezlx.supabase.co/storage/v1/object/public/email-assets/syncareer-logo.png"
          alt="Syncareer"
          height="32"
          style={logo}
        />
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to update your {siteName} email address from{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          . Click below to confirm this change.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={footer}>
          If you didn't request this change, please secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const logo = { marginBottom: '28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 14%, 10%)',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 8%, 46%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: 'hsl(181, 100%, 40%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(181, 100%, 40%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: 'hsl(220, 8%, 60%)', margin: '32px 0 0', lineHeight: '1.5' }

