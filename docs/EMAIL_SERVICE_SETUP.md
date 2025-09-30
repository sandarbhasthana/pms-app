# Email Service Setup Guide

## Overview

This guide explains how to set up the email service for the user management system using Resend. The email service is used to send invitation emails to new staff members with magic links for account activation.

## Why Resend?

We chose Resend for the following reasons:
- **Developer-friendly**: Simple API and excellent documentation
- **Affordable**: 3,000 emails/month free, then $20/month for 50k emails
- **High deliverability**: Built by former Vercel team with excellent reputation
- **React email templates**: Perfect integration with Next.js stack
- **Reliable**: Less likely to end up in spam folders

## Setup Instructions

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key

1. Log into your Resend dashboard
2. Go to "API Keys" section
3. Click "Create API Key"
4. Give it a name (e.g., "PMS Production" or "PMS Development")
5. Copy the API key (starts with `re_`)

### 3. Configure Domain (Production)

For production use, you'll want to configure your own domain:

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the DNS configuration instructions
5. Wait for domain verification (usually takes a few minutes)

**Note**: For development, you can use the default Resend domain, but emails will have a "via resend.dev" notice.

### 4. Environment Variables

Add the following to your `.env.local` file:

```bash
# Email Service Configuration
RESEND_API_KEY="re_BPsLRkyu_2hHbVfEVZLq7yzkXodAFgifN"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_REPLY_TO="support@yourdomain.com"
```

**Important**: 
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- Replace `yourdomain.com` with your actual domain
- For development, you can use `noreply@resend.dev` as the FROM address

### 5. Test Email Configuration

You can test the email configuration by running the test function:

```typescript
import { testEmailConfiguration } from '@/lib/email';

// Test the configuration
const result = await testEmailConfiguration();
console.log(result);
```

## Email Templates

The system includes professionally designed email templates with:

### HTML Template Features
- **Responsive design** that works on all devices
- **Professional branding** with your organization colors
- **Clear call-to-action** button for invitation acceptance
- **Detailed invitation information** including roles and assignments
- **Security warnings** about invitation expiry
- **Personal message support** for custom notes from inviters

### Text Template (Fallback)
- Plain text version for email clients that don't support HTML
- All the same information as HTML version
- Accessible and screen-reader friendly

## Email Content

Each invitation email includes:

### Header Information
- Organization name and branding
- Welcome message

### Invitation Details
- Invitee's assigned role in the organization
- Property assignment (if applicable)
- Property-specific role (if applicable)
- Shift assignment (if applicable)
- Inviter's name and contact information

### Call to Action
- Prominent "Accept Invitation" button
- Magic link for secure account activation
- Clear expiration date and time

### Security Information
- Invitation expiry warning
- Instructions for what happens after acceptance
- Contact information for questions

### Footer
- Professional footer with system branding
- Privacy and security notices

## Security Features

### Token Security
- **Cryptographically secure tokens** using `crypto.randomUUID()`
- **Time-limited invitations** (7 days expiry by default)
- **Single-use tokens** that are marked as used after acceptance
- **Secure URLs** with HTTPS enforcement

### Email Security
- **Domain verification** for production use
- **SPF/DKIM records** automatically configured by Resend
- **Bounce and complaint handling** built into Resend
- **Rate limiting** to prevent spam

### Privacy Protection
- **No tracking pixels** in emails
- **Minimal data collection** - only what's necessary
- **Secure data transmission** with TLS encryption
- **GDPR compliant** email handling

## Monitoring and Analytics

### Email Delivery Tracking
Resend provides built-in analytics for:
- **Delivery rates** - emails successfully delivered
- **Bounce rates** - emails that couldn't be delivered
- **Open rates** - emails that were opened (if tracking enabled)
- **Click rates** - invitation links that were clicked

### Error Handling
The system includes comprehensive error handling:
- **API errors** are logged and handled gracefully
- **Network failures** don't break the invitation process
- **Invalid email addresses** are caught and reported
- **Rate limiting** is handled with appropriate retries

## Troubleshooting

### Common Issues

#### 1. "Email service not configured" error
- Check that `RESEND_API_KEY` is set in your environment variables
- Verify the API key is correct and starts with `re_`
- Ensure the API key has the correct permissions

#### 2. Emails going to spam
- Configure your own domain instead of using resend.dev
- Set up proper SPF and DKIM records (Resend handles this automatically)
- Avoid spam trigger words in email content
- Maintain good sender reputation

#### 3. Domain verification issues
- Check DNS records are properly configured
- Wait for DNS propagation (can take up to 24 hours)
- Verify domain ownership in Resend dashboard

#### 4. High bounce rates
- Validate email addresses before sending
- Clean your email list regularly
- Use double opt-in for user registrations

### Testing in Development

For development testing:
1. Use your own email address as the recipient
2. Check both inbox and spam folders
3. Test with different email providers (Gmail, Outlook, etc.)
4. Verify magic links work correctly
5. Test invitation expiry functionality

### Production Checklist

Before going live:
- [ ] Domain configured and verified in Resend
- [ ] DNS records properly set up
- [ ] Environment variables configured
- [ ] Email templates tested with real data
- [ ] Magic links tested end-to-end
- [ ] Error handling tested
- [ ] Monitoring and alerts set up

## Cost Estimation

### Resend Pricing (as of 2024)
- **Free tier**: 3,000 emails/month
- **Pro tier**: $20/month for 50,000 emails
- **Business tier**: $85/month for 200,000 emails

### Usage Estimation for PMS
For a typical property management company:
- **Small (1-5 properties)**: ~50-100 invitations/month → Free tier
- **Medium (6-20 properties)**: ~200-500 invitations/month → Free tier
- **Large (20+ properties)**: ~1000+ invitations/month → Pro tier

## Support and Documentation

### Resend Resources
- [Resend Documentation](https://resend.com/docs)
- [API Reference](https://resend.com/docs/api-reference)
- [React Email Templates](https://react.email)
- [Support](https://resend.com/support)

### Internal Resources
- Email service code: `src/lib/email.ts`
- API integration: `src/app/api/admin/users/invite/route.ts`
- Environment configuration: `.env.example`

This setup provides a robust, scalable, and professional email service for your property management system's user invitation workflow.
