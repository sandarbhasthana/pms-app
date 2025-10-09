# Twilio SMS Integration Setup Guide

This guide will help you set up Twilio SMS integration for the PMS notification system.

## 📋 Prerequisites

- Twilio account (free trial available)
- Verified phone number for testing
- Node.js environment with the PMS application

## 🚀 Step 1: Create Twilio Account

1. **Sign up for Twilio**: Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. **Verify your phone number**: Twilio requires phone verification
3. **Complete account setup**: Follow the onboarding process

## 🔑 Step 2: Get Twilio Credentials

1. **Navigate to Console**: Go to [Twilio Console](https://console.twilio.com/)
2. **Find Account Info**: On the dashboard, locate:
   - **Account SID**: Your unique account identifier
   - **Auth Token**: Your authentication token (click "Show" to reveal)

## 📱 Step 3: Get a Twilio Phone Number

### For Development (Free Trial):
1. **Go to Phone Numbers**: Navigate to Phone Numbers > Manage > Buy a number
2. **Choose a number**: Select a number from your country
3. **Configure capabilities**: Ensure SMS is enabled

### For Production:
1. **Upgrade account**: Add payment method to remove trial limitations
2. **Buy a dedicated number**: Purchase a number for production use
3. **Consider toll-free**: For better deliverability and professional appearance

## ⚙️ Step 4: Configure Environment Variables

Add the following variables to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="your_account_sid_here"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"  # Your Twilio phone number with country code
```

### Example:
```bash
TWILIO_ACCOUNT_SID="AC1234567890abcdef1234567890abcdef"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_PHONE_NUMBER="+15551234567"
```

## 🔧 Step 5: Configure Webhooks (Optional but Recommended)

Webhooks allow you to track SMS delivery status:

1. **Set Webhook URL**: In your Twilio phone number configuration, set:
   ```
   https://yourdomain.com/api/webhooks/twilio
   ```

2. **For Development**: Use ngrok or similar tool:
   ```bash
   ngrok http 3000
   # Then use: https://your-ngrok-url.ngrok.io/api/webhooks/twilio
   ```

3. **Configure Events**: Enable these webhook events:
   - Message Status
   - Delivery Receipt
   - Error Notifications

## 🧪 Step 6: Test the Integration

### Using the Test API:

1. **Check Configuration**:
   ```bash
   curl "http://localhost:3000/api/notifications/test?action=sms-config-check"
   ```

2. **Send Test SMS**:
   ```bash
   curl "http://localhost:3000/api/notifications/test?action=test-sms"
   ```

### Using the Test Page:

1. Navigate to: `http://localhost:3000/test/notifications`
2. Click "Send Twilio SMS" button
3. Check the response and your phone for the test message

## 📊 Step 7: Monitor Usage and Costs

### Twilio Console Monitoring:
1. **Usage Dashboard**: Monitor SMS volume and costs
2. **Logs**: Check message delivery status
3. **Alerts**: Set up usage alerts to avoid unexpected charges

### Application Monitoring:
- Check notification logs in your database
- Monitor delivery rates and failure reasons
- Use the SMS analytics endpoints for insights

## 💰 Pricing Information

### Trial Account:
- **Free credit**: $15.50 trial credit
- **SMS cost**: ~$0.0075 per SMS segment
- **Limitations**: Can only send to verified numbers

### Production Account:
- **SMS cost**: Varies by country (~$0.0075 - $0.05 per segment)
- **Phone number**: ~$1/month for local numbers
- **No sending restrictions**: Can send to any valid number

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit credentials to version control
2. **Webhook Security**: Validate webhook signatures (implemented in webhook handler)
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Phone Validation**: Validate phone numbers before sending
5. **Opt-out Handling**: Implement SMS opt-out mechanisms for compliance

## 🌍 International Considerations

### Phone Number Format:
- Always use E.164 format: `+[country code][number]`
- Example: `+1234567890` (US), `+919876543210` (India)

### Country-Specific Rules:
- **India**: Requires DLT registration for commercial SMS
- **US/Canada**: TCPA compliance required
- **EU**: GDPR compliance required
- **Check Twilio docs**: For country-specific requirements

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid phone number"**:
   - Ensure E.164 format with country code
   - Verify the number is valid and can receive SMS

2. **"Authentication failed"**:
   - Check Account SID and Auth Token
   - Ensure no extra spaces in environment variables

3. **"Insufficient funds"**:
   - Add credit to your Twilio account
   - Check current balance in console

4. **"Message not delivered"**:
   - Check recipient phone number
   - Verify network connectivity
   - Check Twilio logs for delivery status

### Debug Steps:

1. **Check Configuration**:
   ```bash
   curl "http://localhost:3000/api/notifications/test?action=sms-config-check"
   ```

2. **Test with Known Number**:
   - Use your own verified phone number first
   - Check Twilio console logs

3. **Check Application Logs**:
   - Look for SMS service errors
   - Check webhook delivery status

## 📚 Additional Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [SMS Best Practices](https://www.twilio.com/docs/sms/best-practices)
- [Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)

## 🎯 Next Steps

After successful setup:

1. **Configure User Phone Numbers**: Add phone numbers to user profiles
2. **Set SMS Preferences**: Allow users to opt-in/out of SMS notifications
3. **Monitor Delivery**: Set up alerts for failed deliveries
4. **Scale Considerations**: Plan for high-volume sending if needed
5. **Compliance**: Ensure compliance with local SMS regulations

## 📞 Support

If you encounter issues:

1. **Check Twilio Status**: [https://status.twilio.com/](https://status.twilio.com/)
2. **Twilio Support**: Available through console for paid accounts
3. **Application Logs**: Check server logs for detailed error messages
4. **Test API**: Use the built-in test endpoints for debugging

---

**✅ Setup Complete!** Your PMS application now supports SMS notifications through Twilio.
