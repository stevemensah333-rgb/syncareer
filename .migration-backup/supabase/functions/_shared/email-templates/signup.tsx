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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fsorkxlcasekndigezlx.supabase.co/storage/v1/object/public/email-assets/syncareer-logo.png"
          alt="Syncareer"
          height="32"
          style={logo}
        />
        <Heading style={h1}>Confirm your email address</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . To get started, please verify your email address.
        </Text>
        <Text style={text}>
          We'll confirm{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>{' '}
          as your email once you click below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm My Email
        </Button>
        <Text style={footer}>
          If you didn't create a Syncareer account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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

