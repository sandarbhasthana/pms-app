# SendGrid Integration Setup Guide

## Overview

This guide explains how to set up SendGrid for production email notifications in your Property Management System. SendGrid provides enterprise-grade email delivery with excellent deliverability, detailed analytics, and robust webhook support.

## Why SendGrid?

- **Enterprise-grade**: Trusted by companies like Uber, Spotify, and Airbnb
- **High deliverability**: 99%+ delivery rates with excellent reputation management
- **Comprehensive analytics**: Detailed tracking of opens, clicks, bounces, and more
- **Scalable**: Handle millions of emails with reliable infrastructure
- **Advanced features**: A/B testing, email templates, suppression management
- **Webhook support**: Real-time delivery tracking and event handling

## Setup Instructions

### 1. Create SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for an account
3. Choose the appropriate plan:
   - **Free**: 100 emails/day forever
   - **Essentials**: $19.95/month for 40K emails
   - **Pro**: $89.95/month for 100K emails with advanced features

### 2. Get API Key

1. Log into your SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Choose **Restricted Access** (recommended for security)
5. Set permissions:
   - **Mail Send**: Full Access
   - **Tracking**: Read Access
   - **Suppressions**: Read Access
6. Give it a descriptive name (e.g., "PMS Production API Key")
7. Copy the API key (starts with `SG.`)

### 3. Domain Authentication (Highly Recommended)

For production use, authenticate your domain for better deliverability:

1. In SendGrid dashboard, go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Choose your DNS provider
4. Enter your domain (e.g., `yourdomain.com`)
5. Follow the DNS configuration instructions
6. Add the provided DNS records to your domain
7. Click **Verify** once DNS records are propagated

**DNS Records Example:**
```
CNAME: em1234.yourdomain.com → u1234567.wl123.sendgrid.net
CNAME: s1._domainkey.yourdomain.com → s1.domainkey.u1234567.wl123.sendgrid.net
CNAME: s2._domainkey.yourdomain.com → s2.domainkey.u1234567.wl123.sendgrid.net
```

### 4. Environment Variables

Add the following to your `.env.local` file:

```bash

```

**Important Notes:**
- Replace `SG.your_actual_api_key_here` with your actual SendGrid API key
- Replace `yourdomain.com` with your authenticated domain
- For development, you can use `noreply@sendgrid.net` as the FROM address

### 5. Configure Webhooks (Optional but Recommended)

Webhooks provide real-time delivery tracking:

1. In SendGrid dashboard, go to **Settings** → **Webhooks**
2. Click **Create new webhook**
3. Set webhook URL: `https://yourdomain.com/api/webhooks/sendgrid`
4. Select events to track:
   - ✅ Delivered
   - ✅ Open
   - ✅ Click
   - ✅ Bounce
   - ✅ Dropped
   - ✅ Spam Report
   - ✅ Unsubscribe
5. Enable **Event Webhook**
6. Save the webhook

### 6. Test Configuration

Test your SendGrid setup:

```bash
# Test via API
curl "http://localhost:4001/api/notifications/test?action=email-config"

# Test email sending
curl "http://localhost:4001/api/notifications/test?action=test-email"
```

Or use the test page: `http://localhost:4001/test/notifications`

## Features Implemented

### ✅ Email Templates
- 15+ professional email templates for all notification types
- Responsive HTML design with fallback text versions
- Priority-based styling and headers
- Variable replacement system

### ✅ Delivery Tracking
- Real-time webhook processing
- Open and click tracking
- Bounce and spam report handling
- Delivery analytics and statistics

### ✅ Advanced Features
- Bulk email sending with batch support
- Priority headers for email clients
- Custom tracking parameters
- Retry logic for failed emails

### ✅ Security
- API key-based authentication
- Webhook signature verification (optional)
- Rate limiting protection
- Error handling and logging

## Email Templates Available

| Event Type | Template | Description |
|------------|----------|-------------|
| 🛎️ Room Service | Professional service request | Guest room service notifications |
| ⚠️ Payment Failure | Critical payment alert | Payment processing issues |
| ✅ Payment Received | Confirmation notification | Successful payment confirmations |
| ✅ Reservation Confirmed | Booking confirmation | Reservation confirmations |
| ❌ Reservation Cancelled | Cancellation notice | Booking cancellations |
| 🏨 Guest Check-in/out | Status updates | Guest arrival/departure |
| ❌ No-Show Alert | Critical guest alert | Guest no-show notifications |
| 🔧 Maintenance Request | Service request | Equipment and facility issues |
| ⚠️ Equipment Failure | Critical system alert | Equipment failure notifications |
| 📊 Daily Summaries | Performance reports | Revenue, booking, and analytics |

## Monitoring and Analytics

### SendGrid Dashboard
- Real-time delivery statistics
- Open and click rates
- Bounce and spam reports
- Suppression list management

### Application Analytics
Access via API: `/api/notifications/analytics`
- Delivery success rates
- Email performance metrics
- Failed email retry tracking
- User engagement statistics

## Troubleshooting

### Common Issues

#### 1. "API key not configured" error
- Verify `SENDGRID_API_KEY` is set in environment variables
- Ensure the API key starts with `SG.`
- Check API key permissions in SendGrid dashboard

#### 2. Emails going to spam
- Complete domain authentication
- Maintain good sender reputation
- Avoid spam trigger words in content
- Monitor bounce rates and suppression lists

#### 3. High bounce rates
- Validate email addresses before sending
- Clean your email lists regularly
- Monitor suppression lists
- Check domain reputation

#### 4. Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check webhook configuration in SendGrid
- Ensure HTTPS is used for production webhooks
- Monitor webhook logs for errors

### Support Resources

- **SendGrid Documentation**: [docs.sendgrid.com](https://docs.sendgrid.com)
- **API Reference**: [docs.sendgrid.com/api-reference](https://docs.sendgrid.com/api-reference)
- **Support**: Available through SendGrid dashboard
- **Status Page**: [status.sendgrid.com](https://status.sendgrid.com)

## Production Checklist

Before going live:

- [ ] Domain authentication completed
- [ ] API key with restricted permissions
- [ ] Webhook endpoint configured and tested
- [ ] Email templates reviewed and approved
- [ ] Suppression list management in place
- [ ] Monitoring and alerting configured
- [ ] Backup email provider configured (optional)

## Cost Optimization

### Tips to reduce costs:
1. **Clean email lists**: Remove bounced and invalid emails
2. **Segment audiences**: Send targeted emails to reduce volume
3. **Monitor engagement**: Remove inactive subscribers
4. **Use suppression lists**: Respect unsubscribe requests
5. **Optimize sending frequency**: Avoid over-emailing users

### Pricing Tiers:
- **Free**: 100 emails/day (good for testing)
- **Essentials**: $19.95/month for 40K emails
- **Pro**: $89.95/month for 100K emails + advanced features
- **Premier**: Custom pricing for high-volume senders

This setup provides enterprise-grade email delivery for your Property Management System with comprehensive tracking, analytics, and reliability.
