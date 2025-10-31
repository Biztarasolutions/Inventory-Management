# SMS Provider Setup for Phone Authentication

## 🚨 Error: "Unsupported phone provider"

This error occurs because Supabase requires you to configure an SMS provider before you can use phone authentication. Here's how to fix it:

## 🔧 Quick Setup Guide

### Step 1: Go to Supabase Dashboard
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find and click on **Phone**

### Step 2: Enable Phone Authentication
1. Toggle **Enable phone signup** to ON
2. You'll see SMS provider configuration options

### Step 3: Choose and Configure SMS Provider

## 📱 Recommended SMS Providers

### Option 1: Twilio (Recommended - Most Reliable)

**Why Twilio?**
- Most popular and reliable
- Great documentation
- Works in most countries
- Good pricing for small volumes

**Setup Steps:**
1. Go to [Twilio Console](https://console.twilio.com)
2. Create account (free trial gives $15 credit)
3. Get your credentials:
   - Account SID
   - Auth Token
   - Phone Number (you'll get a free one)

**In Supabase Dashboard:**
```
Provider: Twilio
Account SID: [Your Account SID]
Auth Token: [Your Auth Token]
Phone Number: [Your Twilio phone number]
```

### Option 2: MessageBird (Good Alternative)

**Setup Steps:**
1. Go to [MessageBird Dashboard](https://dashboard.messagebird.com)
2. Create account
3. Get API Key from dashboard

**In Supabase Dashboard:**
```
Provider: MessageBird
Access Key: [Your MessageBird API Key]
```

### Option 3: Vonage (Formerly Nexmo)

**Setup Steps:**
1. Go to [Vonage Dashboard](https://dashboard.nexmo.com)
2. Create account
3. Get credentials from API Settings

**In Supabase Dashboard:**
```
Provider: Vonage
API Key: [Your Vonage API Key]
API Secret: [Your Vonage API Secret]
```

## 🎯 Easiest Setup (Twilio Free Trial)

For testing purposes, here's the quickest way to get started:

### 1. Create Twilio Account
```bash
# Go to https://www.twilio.com/try-twilio
# Sign up with your email
# Verify your phone number
# You'll get $15 free credit
```

### 2. Get Credentials
After signup, you'll see:
- **Account SID**: Starts with "AC..."
- **Auth Token**: Click to reveal
- **Phone Number**: Go to Phone Numbers → Manage → Active numbers

### 3. Configure in Supabase
In your Supabase project:
1. Authentication → Providers → Phone
2. Enable phone signup
3. Select "Twilio" as provider
4. Enter your credentials:
   - Account SID
   - Auth Token  
   - Phone Number (with + and country code)

### 4. Test Configuration
```javascript
// Test SMS sending
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890' // Use your real phone number for testing
});
```

## 📋 Configuration Checklist

- [ ] SMS Provider account created
- [ ] Provider credentials obtained
- [ ] Phone authentication enabled in Supabase
- [ ] SMS provider configured in Supabase dashboard
- [ ] Test phone number verified
- [ ] SMS sending tested successfully

## 🔍 Troubleshooting

### Common Issues:

1. **"Invalid phone number format"**
   - Use E.164 format: +[country code][phone number]
   - Example: +1234567890 (not 1234567890)

2. **"SMS not received"**
   - Check if phone number is correct
   - Verify SMS provider has credit/balance
   - Check spam/blocked messages

3. **"Rate limit exceeded"**
   - Supabase limits OTP requests (1 per 60 seconds)
   - Wait before sending another OTP

4. **"Provider authentication failed"**
   - Double-check your SMS provider credentials
   - Ensure API keys are active and not expired

## 💰 Pricing (Approximate)

| Provider | Cost per SMS | Free Credit |
|----------|--------------|-------------|
| Twilio | ~$0.0075 | $15 |
| MessageBird | ~$0.05 | €20 |
| Vonage | ~$0.0072 | €2 |

## 🌍 Country Support

Most providers support SMS in:
- ✅ USA, Canada
- ✅ India
- ✅ UK, Europe
- ✅ Australia
- ⚠️ Some restrictions in China, certain Middle East countries

## 🚀 After Setup

Once configured, your AdminPanel phone invitations will work:
1. Users enter phone number
2. SMS with 6-digit code sent
3. User verifies code
4. Account created with assigned role

## 🔗 Useful Links

- [Twilio Console](https://console.twilio.com)
- [MessageBird Dashboard](https://dashboard.messagebird.com)
- [Vonage Dashboard](https://dashboard.nexmo.com)
- [Supabase Phone Auth Docs](https://supabase.com/docs/guides/auth/phone-login)