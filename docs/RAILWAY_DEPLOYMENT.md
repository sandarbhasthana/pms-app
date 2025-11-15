# Railway Deployment Guide

## 🚂 Why Railway Build Failed (But Vercel Works)

### The Problem

**Error:**

```
Failed to load config file "/app" as a TypeScript/JavaScript module.
Error: Error: DATABASE_URL environment variable is not set
npm error command failed
npm error command sh -c prisma generate
```

### Root Cause

| Platform    | Build-Time Env Vars         | Runtime Env Vars |
| ----------- | --------------------------- | ---------------- |
| **Vercel**  | ✅ Available                | ✅ Available     |
| **Railway** | ❌ Not available by default | ✅ Available     |
| **Render**  | ❌ Not available by default | ✅ Available     |
| **Fly.io**  | ❌ Not available by default | ✅ Available     |

**The Issue:**

1. Your `package.json` has `"postinstall": "prisma generate"`
2. This runs during `npm ci` (before environment variables are injected)
3. Prisma needs `DATABASE_URL` to generate the client
4. Railway doesn't inject env vars until **after** the build completes
5. Build fails ❌

**Why Vercel Works:**

- Vercel has special Next.js + Prisma integration
- Automatically injects env vars during build time
- Handles Prisma generation seamlessly

---

## ✅ Solution Implemented

### Changes Made

#### 1. Updated `package.json`

**Before:**

```json
{
  "scripts": {
    "build": "next build",
    "postinstall": "prisma generate"
  }
}
```

**After:**

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "build:railway": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate || echo 'Prisma generate skipped (DATABASE_URL not available)'"
  }
}
```

**What Changed:**

- ✅ `build` script now includes `prisma generate` (runs when env vars are available)
- ✅ `build:railway` includes migrations + generation
- ✅ `postinstall` now fails gracefully if `DATABASE_URL` is missing

#### 2. Created `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build:railway"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**What This Does:**

- ✅ Tells Railway to use `npm run build:railway` instead of default `npm run build`
- ✅ Ensures Prisma generates client when env vars are available
- ✅ Runs migrations before building
- ✅ Configures restart policy for reliability

---

## 🚀 Deployment Steps

### Step 1: Set Up Railway Project

1. **Create Railway Account**

   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `pms-app` repository

### Step 2: Add PostgreSQL Database

1. **Add Database Service**

   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create a database

2. **Link Database to App**
   - Railway automatically creates `DATABASE_URL` variable
   - Format: `postgresql://user:password@host:port/database`

### Step 3: Configure Environment Variables

Add these environment variables in Railway dashboard:

````env
# Database (automatically created by Railway)
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-secret-here

# Ably (Real-time Chat)
NEXT_PUBLIC_ABLY_KEY=your-ably-key
ABLY_API_KEY=your-ably-api-key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# AWS S3 (File Uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_S3_BUCKET_NAME=your-bucket-name

# Stripe (Payments)
STRIPE_SECRET_KEY=your-stripe-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-public-key

# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Node Environment
NODE_ENV=production
```

### Step 4: Deploy

1. **Push Changes to GitHub**
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin master
   ```

2. **Railway Auto-Deploys**
   - Railway detects the push
   - Runs `npm run build:railway`
   - Deploys your app
   - Provides a public URL

### Step 5: Verify Deployment

1. **Check Build Logs**
   - Go to Railway dashboard
   - Click on your service
   - View "Deployments" tab
   - Check for errors

2. **Test Your App**
   - Visit the Railway-provided URL
   - Test login functionality
   - Test database connections
   - Test file uploads

---

## 🔧 Troubleshooting

### Issue 1: Build Still Fails with DATABASE_URL Error

**Solution:** Make sure `railway.json` is committed to your repo

```bash
git add railway.json
git commit -m "Add Railway config"
git push
```

### Issue 2: Migrations Not Running

**Solution:** Run migrations manually

```bash
# In Railway dashboard, go to your service
# Click "Settings" → "Deploy"
# Add this as a "Deploy Command":
npm run build:railway
```

### Issue 3: App Crashes After Deployment

**Check:**
1. All environment variables are set
2. `DATABASE_URL` is correct
3. Database is accessible from Railway
4. Check logs in Railway dashboard

**Solution:** Check Railway logs

```bash
# In Railway dashboard:
# 1. Click on your service
# 2. Go to "Deployments"
# 3. Click on the latest deployment
# 4. View logs for errors
````

Common issues:

- Missing environment variables
- Database connection timeout
- Port binding issues (Railway uses `PORT` env var)

### Issue 4: Prisma Client Not Generated

**Solution:** Clear Railway cache and redeploy

```bash
# In Railway dashboard:
# 1. Go to "Settings"
# 2. Scroll to "Danger Zone"
# 3. Click "Clear Build Cache"
# 4. Redeploy
```

---

## 🆚 Railway vs Vercel Comparison

| Feature               | Vercel                    | Railway                |
| --------------------- | ------------------------- | ---------------------- |
| **Build Time**        | 2-5 minutes               | 3-7 minutes            |
| **Cold Start**        | ~100ms                    | ~500ms                 |
| **Free Tier**         | 100GB bandwidth           | $5 credit/month        |
| **Database**          | External (Neon, Supabase) | Built-in PostgreSQL ✅ |
| **Env Vars at Build** | ✅ Yes                    | ❌ No (needs config)   |
| **Prisma Support**    | ✅ Native                 | ⚠️ Needs setup         |
| **Custom Domains**    | ✅ Free                   | ✅ Free                |
| **Auto-Deploy**       | ✅ Yes                    | ✅ Yes                 |
| **Logs**              | ✅ Real-time              | ✅ Real-time           |
| **Pricing**           | $20/month (Pro)           | $5/month (Hobby)       |

### When to Use Railway

✅ **Use Railway if:**

- You want built-in PostgreSQL database
- You need persistent storage
- You want lower costs ($5/month vs $20/month)
- You need more control over deployment

❌ **Stick with Vercel if:**

- You need fastest cold starts
- You're already using external database (Neon, Supabase)
- You want zero-config Prisma support
- You need edge functions

---

## 🎯 Best Practices

### 1. Use Railway for Full-Stack Apps

Railway is better suited for full-stack apps with databases because:

- Built-in PostgreSQL (no external service needed)
- Persistent storage
- Better for long-running processes

### 2. Use Vercel for Frontend-Heavy Apps

Vercel is better for:

- Static sites
- Apps with external APIs
- Edge-first applications
- Maximum performance

### 3. Hybrid Approach (Recommended for PMS App)

**Option A: Vercel + Railway Database**

```
Frontend (Vercel) → Database (Railway PostgreSQL)
```

**Option B: Railway for Everything**

```
Full App (Railway) → Built-in PostgreSQL
```

**Option C: Vercel + Neon/Supabase**

```
Frontend (Vercel) → Database (Neon/Supabase)
```

---

## 📊 Cost Comparison

### Scenario 1: Small Property (1-10 rooms)

| Setup                   | Monthly Cost         |
| ----------------------- | -------------------- |
| **Vercel + Neon**       | $0 (free tiers)      |
| **Railway**             | $5 (includes DB)     |
| **Vercel + Railway DB** | $5 (Railway DB only) |

### Scenario 2: Medium Property (10-50 rooms)

| Setup                       | Monthly Cost      |
| --------------------------- | ----------------- |
| **Vercel Pro + Neon**       | $20 + $19 = $39   |
| **Railway**                 | $20 (includes DB) |
| **Vercel Pro + Railway DB** | $20 + $5 = $25    |

### Scenario 3: Large Property (50+ rooms)

| Setup                       | Monthly Cost      |
| --------------------------- | ----------------- |
| **Vercel Pro + Neon Pro**   | $20 + $69 = $89   |
| **Railway Pro**             | $20 (includes DB) |
| **Vercel Pro + Railway DB** | $20 + $20 = $40   |

**Recommendation:** Railway is more cost-effective for apps with databases! 💰

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Set strong `NEXTAUTH_SECRET` (use `openssl rand -base64 32`)
- [ ] Enable SSL for database connections
- [ ] Set up CORS properly
- [ ] Configure rate limiting
- [ ] Enable Railway's built-in DDoS protection
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy for database
- [ ] Use environment-specific variables (staging vs production)
- [ ] Enable Railway's private networking for database
- [ ] Set up custom domain with SSL

---

## 🚨 Common Errors and Fixes

### Error: "Cannot find module '@prisma/client'"

**Cause:** Prisma client not generated

**Fix:**

```bash
# Make sure build:railway script includes prisma generate
npm run build:railway
```

### Error: "P1001: Can't reach database server"

**Cause:** Database connection string is wrong or database is not accessible

**Fix:**

1. Check `DATABASE_URL` in Railway dashboard
2. Make sure database service is running
3. Verify database is in the same Railway project

### Error: "EADDRINUSE: address already in use"

**Cause:** Port conflict

**Fix:** Railway automatically sets `PORT` env var. Make sure your app uses it:

```typescript
// server.ts or next.config.js
const port = process.env.PORT || 3000;
```

### Error: "Module not found: Can't resolve 'fs'"

**Cause:** Trying to use Node.js modules in client-side code

**Fix:** Use dynamic imports or move code to API routes

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Prisma Railway Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway)
- [Next.js Railway Template](https://railway.app/template/next-prisma-postgres)

---

## 🎉 Success Checklist

After successful deployment:

- [ ] App is accessible via Railway URL
- [ ] Database migrations ran successfully
- [ ] Login/authentication works
- [ ] File uploads work (S3 configured)
- [ ] Real-time chat works (Ably configured)
- [ ] Email notifications work (SMTP configured)
- [ ] Payments work (Stripe configured)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

**Document Version:** 1.0
**Last Updated:** 2025-11-15
**Author:** Development Team
**Status:** Ready for Deployment

SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Node Environment

NODE_ENV=production

````

### Step 4: Deploy

1. **Push Changes to GitHub**
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin master
````

2. **Railway Auto-Deploys**
   - Railway detects the push
   - Runs `npm run build:railway`
   - Deploys your app
   - Provides a public URL

### Step 5: Verify Deployment

1. **Check Build Logs**

   - Go to Railway dashboard
   - Click on your service
   - View "Deployments" tab
   - Check for errors

2. **Test Your App**
   - Visit the Railway-provided URL
   - Test login functionality
   - Test database connections
   - Test file uploads

---

## 🔧 Troubleshooting

### Issue 1: Build Still Fails with DATABASE_URL Error

**Solution:** Make sure `railway.json` is committed to your repo

```bash
git add railway.json
git commit -m "Add Railway config"
git push
```

### Issue 2: Migrations Not Running

**Solution:** Run migrations manually

```bash
# In Railway dashboard, go to your service
# Click "Settings" → "Deploy"
# Add this as a "Deploy Command":
npm run build:railway
```

### Issue 3: App Crashes After Deployment

**Check:**

1. All environment variables are set
2. `DATABASE_URL` is correct
3. Database is accessible from Railway
4. Check logs in Railway dashboard
