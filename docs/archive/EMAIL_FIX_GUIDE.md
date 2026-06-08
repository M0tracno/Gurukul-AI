# 📧 Email Functionality Fix Guide

## 🔍 Issue Identified
The email functionality is not working because Gmail is rejecting the authentication credentials. Gmail no longer accepts regular passwords for third-party applications.

## ✅ Solution: Set Up Gmail App Password

### Step 1: Enable Two-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to "Security" section
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the prompts to enable 2FA if not already enabled

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other (Custom name)" as the device
4. Enter "GDC Academic System" as the name
5. Click "Generate"
6. Copy the 16-character app password (it will look like: xxxx xxxx xxxx xxxx)

### Step 3: Update Environment Variables
Replace the current EMAIL_PASSWORD in your .env file:

```
# Replace this line in backend/.env:
EMAIL_PASSWORD=Karan@197019802004
```

## 🔧 Alternative Solutions

### Option 1: Use Ethereal Email (Development Only)
For testing purposes, you can use Ethereal Email which doesn't require real credentials:

```env
EMAIL_USER=ethereal.user@ethereal.email
EMAIL_PASSWORD=ethereal.pass
```

### Option 2: Use SendGrid (Production Recommended)
For production, consider using SendGrid:
1. Sign up for SendGrid
2. Get API key
3. Update email service configuration

### Option 3: Use Outlook/Hotmail
If you have a Microsoft account:
- Use outlook.office365.com as SMTP server
- Port 587 with STARTTLS

## 🧪 Testing Steps

After updating the email configuration:

1. Run the email test script:
```bash
cd backend
node test-email.js
```

2. Check your email inbox (and spam folder)

3. Test user creation from the admin panel

## 🔒 Security Notes

- Never commit real email passwords to version control
- Use environment variables for all sensitive data
- App passwords are more secure than regular passwords
- Consider using email services designed for applications (SendGrid, Mailgun, etc.)

## 📋 Troubleshooting

If emails still don't work after setting up App Password:

1. **Check spam folder** - Gmail might mark automated emails as spam
2. **Verify App Password** - Make sure you copied it correctly (no spaces)
3. **Check Gmail quota** - Gmail has sending limits
4. **Try different email service** - Consider using SendGrid or similar

## 🎯 Quick Fix for Testing

If you just want to test the functionality quickly, you can:

1. Use a temporary email service like Mailtrap or Ethereal
2. Or temporarily log the email content to console instead of sending

Would you like me to implement any of these solutions?
