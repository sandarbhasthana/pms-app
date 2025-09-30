# 🧪 Stripe Integration Testing Guide

## 🚀 **Quick Start**

### **1. Access the Test Suite**
Navigate to: **http://localhost:3000/test-stripe**

Or use the sidebar navigation: **🧪 Test Stripe** (development only)

### **2. Prerequisites**
- ✅ **Authenticated user** with `OWNER` or `ORG_ADMIN` role
- ✅ **Organization membership** in at least one organization
- ✅ **Stripe test keys** configured in environment variables

---

## 🎯 **Test Suite Features**

### **📋 Tab 1: Onboarding**
Test the complete Stripe Connect onboarding flow:

#### **Features:**
- ✅ **Organization selector** - Choose which org to test
- ✅ **Real-time status display** - See current Stripe account status
- ✅ **One-click onboarding** - Start Stripe Connect setup
- ✅ **Status refresh** - Check updated account status
- ✅ **Requirements tracking** - See what's needed to complete setup

#### **Test Scenarios:**
1. **New Organization** (No Stripe account)
   - Click "Start Onboarding"
   - Complete Stripe forms with test data
   - Return to see updated status

2. **Incomplete Setup** (Has account, needs completion)
   - Click "Complete Setup"
   - Finish remaining requirements
   - Verify status updates

3. **Complete Setup** (Fully onboarded)
   - See "Onboarding Complete" badge
   - View account details and business profile

### **📋 Tab 2: Webhooks**
Test individual webhook events with mock data:

#### **Available Webhook Tests:**
- ✅ **Account Updated** - Test organization status sync
- ✅ **Payment Succeeded** - Test successful payment processing
- ✅ **Payment Failed** - Test failed payment handling
- ✅ **Charge Succeeded** - Test charge completion
- ✅ **Charge Failed** - Test charge failure
- ✅ **Charge Refunded** - Test refund processing

#### **How It Works:**
1. **Select Organization** with Stripe account
2. **Click "Test"** on any webhook type
3. **Mock event generated** and sent to webhook handler
4. **Database updated** with test transaction data
5. **View results** in Event Log tab

### **📋 Tab 3: Event Log**
Monitor webhook processing in real-time:

#### **Features:**
- ✅ **Recent events** - Last 50 webhook events
- ✅ **Processing status** - Success/failure indicators
- ✅ **Event details** - Type, timestamp, and ID
- ✅ **Auto-refresh** - Updates when new events are processed

---

## 🔧 **API Endpoints Tested**

### **Onboarding APIs:**
```bash
# Create Stripe account and onboarding link
POST /api/organizations/stripe-onboarding
{
  "organizationId": "org_123",
  "refreshUrl": "http://localhost:3000/test-stripe?refresh=true",
  "returnUrl": "http://localhost:3000/test-stripe?success=true"
}

# Check account status
GET /api/organizations/stripe-onboarding?organizationId=org_123
```

### **Webhook APIs:**
```bash
# Process webhook events
POST /api/webhooks/stripe
# (Handles both real Stripe webhooks and test events)

# Test webhook events
POST /api/test/webhooks
{
  "eventType": "payment_intent.succeeded",
  "accountId": "acct_123",
  "organizationId": "org_123"
}

# Get recent webhook events
GET /api/webhooks/events
```

### **Organization APIs:**
```bash
# Get user's organizations
GET /api/organizations
```

---

## 🧪 **Testing Scenarios**

### **🎯 Scenario 1: Complete Onboarding Flow**
1. **Start**: Select organization without Stripe account
2. **Onboard**: Click "Start Onboarding" → Redirect to Stripe
3. **Complete**: Fill out Stripe forms (use test data)
4. **Return**: Come back to test page
5. **Verify**: Status shows "Active" with account details

### **🎯 Scenario 2: Webhook Processing**
1. **Setup**: Ensure organization has Stripe account
2. **Test**: Click "Test" on various webhook types
3. **Monitor**: Watch Event Log for processing results
4. **Verify**: Database updates correctly

### **🎯 Scenario 3: Error Handling**
1. **Wrong Role**: Try with non-admin user (should fail)
2. **Invalid Org**: Try with organization user doesn't belong to
3. **Network Issues**: Test with invalid Stripe keys

### **🎯 Scenario 4: Real Webhook Testing**
1. **Stripe CLI**: Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. **Trigger Events**: Use `stripe trigger account.updated`
3. **Monitor**: Watch events appear in test page
4. **Verify**: Database updates from real Stripe events

---

## 🔍 **Debugging & Monitoring**

### **Console Logs:**
- ✅ **Onboarding events** logged with organization details
- ✅ **Webhook processing** logged with event types
- ✅ **Test events** marked with 🧪 emoji
- ✅ **Error details** logged for troubleshooting

### **Database Inspection:**
```sql
-- Check webhook events
SELECT * FROM "WebhookEvent" ORDER BY "createdAt" DESC LIMIT 10;

-- Check organization Stripe status
SELECT id, name, "stripeAccountId", "stripeOnboardingComplete", "stripeChargesEnabled" 
FROM "Organization";

-- Check payment transactions
SELECT * FROM "PaymentTransaction" ORDER BY "createdAt" DESC LIMIT 10;
```

---

## ⚠️ **Important Notes**

### **Test Data:**
- ✅ **Use Stripe test mode** - All test keys start with `sk_test_` or `pk_test_`
- ✅ **Mock webhook events** - Generated locally, not from real Stripe
- ✅ **Test signatures** - Use `test_signature` to bypass verification

### **Environment:**
- ✅ **Development only** - Test page only shows in development mode
- ✅ **Remove in production** - Sidebar link automatically hidden
- ✅ **Secure testing** - All APIs require proper authentication

### **Limitations:**
- ❌ **Mock data only** - Webhook tests use generated data, not real transactions
- ❌ **No real payments** - Cannot test actual payment processing
- ❌ **Limited events** - Only tests 6 core webhook types

---

## 🎉 **Success Indicators**

### **✅ Onboarding Success:**
- Organization gets `stripeAccountId`
- Status shows "Active" with green badge
- Account details display correctly
- No requirements currently due

### **✅ Webhook Success:**
- Events appear in Event Log with "Processed" badge
- Database records created/updated
- No error messages in console
- Status updates reflect webhook changes

### **✅ Overall Integration:**
- All tabs load without errors
- Real-time status updates work
- Error handling displays user-friendly messages
- Navigation and UI responsive

---

## 🚀 **Next Steps After Testing**

1. **Production Deployment:**
   - Remove test page from production build
   - Configure real Stripe webhook endpoints
   - Set up proper webhook secret validation

2. **UI Integration:**
   - Add StripeOnboarding component to settings page
   - Create payment processing interfaces
   - Implement property-specific payment views

3. **Advanced Features:**
   - Implement remaining webhook types (Phase 2-6)
   - Add payment intent creation for reservations
   - Create financial reporting dashboards

The test suite provides comprehensive coverage of the core Stripe integration functionality! 🎯
