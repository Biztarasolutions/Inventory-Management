# Twilio Setup Verification Script

## Quick Test Commands

### 1. Test Twilio Credentials Directly
```bash
# Install Twilio CLI (optional)
npm install -g twilio-cli

# Test with your credentials
twilio api:core:messages:create \
  --from="+1YOUR_TWILIO_NUMBER" \
  --to="+1YOUR_PHONE_NUMBER" \
  --body="Test SMS from Fashion Boutique!" \
  --account-sid="ACYOUR_ACCOUNT_SID" \
  --auth-token="YOUR_AUTH_TOKEN"
```

### 2. Test via Supabase
Use the `test-sms.html` file:
1. Replace `YOUR_SUPABASE_URL` with your project URL
2. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key
3. Open the HTML file in browser
4. Enter your phone number and test

## 🔍 Common Issues & Solutions

### ❌ "The phone number is not verified"
**Solution**: In Twilio trial mode, you can only send SMS to verified numbers.
- Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- Add your phone number to verified list

### ❌ "Insufficient funds"
**Solution**: Check your Twilio balance
- Trial account gets $15 free credit
- SMS costs ~$0.0075 per message

### ❌ "Invalid phone number"
**Solution**: Use E.164 format
- ✅ Correct: `+1234567890`
- ❌ Wrong: `1234567890` or `(123) 456-7890`

### ❌ "Authentication failed"
**Solution**: Double-check credentials
- Account SID starts with "AC"
- Auth Token is case-sensitive
- Phone number includes country code

## 📞 Your Twilio Dashboard Links

Quick access links (replace YOUR_ACCOUNT_SID):
- **Console**: https://console.twilio.com
- **Phone Numbers**: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming  
- **SMS Logs**: https://console.twilio.com/us1/monitor/logs/sms
- **Usage**: https://console.twilio.com/us1/usage

## ✅ Success Indicators

You'll know it's working when:
1. ✅ SMS sent successfully from test
2. ✅ You receive the verification code
3. ✅ AdminPanel phone invitations work
4. ✅ No "Unsupported phone provider" error

## 🚀 Next Steps After Setup

1. Test phone invitations in AdminPanel
2. Invite a user via phone number
3. Verify they receive SMS with code
4. Confirm they can complete registration

Need help with any step? Let me know! 📱✨