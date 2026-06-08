# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. Enter project name: `gdc-school-management` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Phone Authentication

1. In your Firebase project console, go to "Authentication"
2. Click "Get started" if it's your first time
3. Go to "Sign-in method" tab
4. Click on "Phone" provider
5. Toggle "Enable" and click "Save"

## Step 3: Get Firebase Configuration

1. In Firebase console, click on the gear icon (Project settings)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "GDC Web App")
5. Copy the Firebase config object

## Step 4: Update Environment Variables

Update your `.env` file with the Firebase configuration values:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Step 5: Configure Authorized Domains

1. In Firebase console, go to Authentication > Settings
2. Click on "Authorized domains" tab
3. Add your domains:
   - `localhost` (for development)
   - Your production domain (if deployed)

## Step 6: Test the Implementation

1. Start your development server: `npm start`
2. Navigate to http://localhost:3000
3. Click on "Parent (Firebase)" login
4. Test the phone authentication flow

## Features Implemented

✅ Firebase Phone Authentication  
✅ reCAPTCHA integration  
✅ OTP verification  
✅ Parent-Student relationship validation  
✅ JWT token generation  
✅ Automatic login after verification  
✅ Modern UI with security badges  
✅ Error handling and validation  

## Usage

- Parents can now login using either:
  1. **MSG91 OTP** (existing system)
  2. **Firebase Phone Auth** (new secure system)

- Both systems will create/update parent records and maintain student relationships
- Firebase system stores Firebase UID for future reference
- All authentication flows redirect to parent dashboard upon success
