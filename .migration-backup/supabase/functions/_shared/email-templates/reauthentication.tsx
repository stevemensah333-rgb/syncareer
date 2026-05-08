/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Syncareer verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fsorkxlcasekndigezlx.supabase.co/storage/v1/object/public/email-assets/syncareer-logo.png"
          alt="Syncareer"
          height="32"
          style={logo}
        />
        <Heading style={h1}>Verify your identity</Heading>
        <Text style={text}>Use the code below to confirm your identity. It will expire shortly.</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(181, 100%, 40%)',
  margin: '0 0 24px',
  letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: 'hsl(220, 8%, 60%)', margin: '32px 0 0', lineHeight: '1.5' }

