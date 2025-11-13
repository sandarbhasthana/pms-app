# Ably Setup Guide

## Step 1: Sign Up for Ably

1. Go to [https://ably.com/signup](https://ably.com/signup)
2. Sign up with your email or GitHub account
3. Choose the **Free Plan** (6M messages/month, 200 concurrent connections)

## Step 2: Create an App

1. After signing up, you'll be taken to the dashboard
2. Click **"Create New App"** or use the default app created for you
3. Name it: **"PMS Chat System"** (or any name you prefer)

## Step 3: Get Your API Keys

1. In your app dashboard, click on **"API Keys"** tab
2. You'll see a **Root API Key** - this is what you need
3. The key format looks like: `xVLyHw.aBcDeFgHiJkLmNoPqRsTuVwXyZ:1234567890abcdefghijklmnopqrstuvwxyz`

### Understanding the API Key Format

The Ably API key has two parts separated by a colon (`:`):
- **App ID + Key Name**: `xVLyHw.aBcDeFgHiJkLmNoPqRsTuVwXyZ` (before the colon)
- **Secret**: `1234567890abcdefghijklmnopqrstuvwxyz` (after the colon)

## Step 4: Configure Your Environment Variables

### For Development (`.env.local`)

Create or update your `.env.local` file:

```bash
# Ably Configuration
ABLY_API_KEY="xVLyHw.aBcDeFgHiJkLmNoPqRsTuVwXyZ:1234567890abcdefghijklmnopqrstuvwxyz"
NEXT_PUBLIC_ABLY_PUBLIC_KEY="xVLyHw.aBcDeFgHiJkLmNoPqRsTuVwXyZ"
```

**Important:**
- `ABLY_API_KEY` = Full key (with secret) - **Server-side only**
- `NEXT_PUBLIC_ABLY_PUBLIC_KEY` = Key name only (without secret) - **Client-side safe**

### For Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add both variables:
   - `ABLY_API_KEY` = Your full API key (keep secret!)
   - `NEXT_PUBLIC_ABLY_PUBLIC_KEY` = Your key name (public part)

## Step 5: Configure Ably App Settings

### Enable Features

In your Ably app dashboard:

1. **Channels** tab:
   - ✅ Enable **Presence** (for online/offline status)
   - ✅ Enable **Message History** (for 90-day retention)
   - Set **Persist messages** to **90 days**

2. **Settings** tab:
   - ✅ Enable **Token Authentication** (we'll use this for security)
   - ✅ Enable **Push Notifications** (for future use)

3. **Integrations** tab (optional):
   - You can set up webhooks later for advanced features

## Step 6: Test Your Connection

Once you have your API keys, we'll test the connection in the next step of implementation.

## Pricing Information

### Free Tier (Perfect for Development & Small Teams)
- **6 million messages/month**
- **200 concurrent connections**
- **90-day message history**
- **All features included**

### When to Upgrade?

- **200+ concurrent users** → Growth Plan ($29/month)
- **500+ concurrent users** → Scale Plan ($99/month)

For a property management system with 50-100 staff members, the **free tier is more than enough**!

## Security Best Practices

1. **Never commit** `.env.local` to Git (it's in `.gitignore`)
2. **Never expose** `ABLY_API_KEY` in client-side code
3. **Always use** token authentication for client connections (we'll implement this)
4. **Rotate keys** if they're ever compromised

## Next Steps

After completing this setup:
1. ✅ You have your Ably account
2. ✅ You have your API keys
3. ✅ You've added them to `.env.local`
4. ✅ Ready to install dependencies and start coding!

---

**Need Help?**
- Ably Documentation: https://ably.com/docs
- Ably Support: https://ably.com/support
- Our Implementation Plan: `docs/CHAT_SYSTEM_IMPLEMENTATION_PLAN.md`

