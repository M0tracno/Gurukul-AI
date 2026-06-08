# Firebase Console Setup Guide

## Step 1: Create Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Click "Create a project"** or "Add project"
3. **Enter Project Details**:
   - Project name: `GDC-School-Management` (or your preferred name)
   - Enable Google Analytics (optional)
4. **Click "Continue"** and follow the setup wizard

## Step 2: Add Web App to Firebase Project

1. **In Firebase Console**, click the **Web icon** `</>`
2. **Register your app**:
   - App nickname: `GDC-Web-App`
   - Check "Also set up Firebase Hosting" (optional)
3. **Copy the Firebase configuration** - you'll get something like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

## Step 3: Enable Phone Authentication

1. **Go to Authentication** → **Sign-in method**
2. **Click "Phone"** in the Sign-in providers list
3. **Toggle "Enable"**
4. **Add your domain** to authorized domains:
   - `localhost` (for development)
   - `127.0.0.1` (for development)
   - Your production domain (when deploying)

## Step 4: Configure reCAPTCHA (Required for Phone Auth)

1. **In Phone Authentication settings**, you'll see reCAPTCHA configuration
2. **For development**: Firebase will use test reCAPTCHA
3. **For production**: You may need to configure custom reCAPTCHA

## Step 5: Set Up Test Phone Numbers (Optional for Development)

1. **In Authentication** → **Settings** → **Test phone numbers**
2. **Add test phone numbers** with verification codes:
   - Phone: `+91 9999999999`
   - Code: `123456`

## Step 6: Update Environment Variables

Replace the placeholder values in your `.env` file with actual Firebase config:

```env
# Firebase Configuration - Replace with your actual values
REACT_APP_FIREBASE_API_KEY=AIzaSyC...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Important Notes:

- **Never commit actual Firebase credentials to Git**
- **Use different Firebase projects for development/production**
- **Configure authorized domains properly for security**
- **Test with test phone numbers during development**

## Next Steps After Setup:

1. Restart your development server
2. Test Firebase phone authentication
3. Monitor usage in Firebase Console
4. Set up Firebase Security Rules if needed
