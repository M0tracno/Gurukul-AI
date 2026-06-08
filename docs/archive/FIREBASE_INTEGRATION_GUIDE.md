# Firebase Integration Guide

This guide provides instructions on integrating Firebase Authentication with the GDC application.

## Setup Options

You have two options for Firebase Authentication:

1. **Live Firebase Integration**: Configure with your Firebase project credentials
2. **Demo Mode**: Use the built-in mock implementation for development/testing

## Option 1: Live Firebase Integration

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. Enter project name: `gdc-school-management` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication Methods

1. In your Firebase project console, go to "Authentication"
2. Click "Get started" if it's your first time
3. Enable authentication methods:
   - **Email/Password**: For faculty, student, and admin logins
   - **Phone**: For parent logins

### Step 3: Get Firebase Configuration

1. In Firebase console, click on the gear icon (Project settings)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "GDC Web App")
5. Copy the Firebase config object

### Step 4: Update Environment Variables

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

### Step 5: Configure Authorized Domains

1. In Firebase console, go to Authentication > Settings
2. Click on "Authorized domains" tab
3. Add your domains:
   - `localhost` (for development)
   - Your production domain (if deployed)

### Step 6: Test Phone Authentication

1. Go to Authentication > Phone
2. Add test phone numbers (optional)
   - Phone: `+919999999999`
   - Code: `123456`

## Option 2: Demo Mode

If you prefer not to set up Firebase immediately, the application includes a mock Firebase service:

### Method 1: Enable Demo Mode via Environment Variable

Add the following to your `.env` file:

```env
REACT_APP_FORCE_DEMO_MODE=true
```

### Method 2: Leave Firebase Configuration Blank

Simply leave the Firebase configuration variables blank or with their placeholder values, and the application will automatically detect this and use the mock service.

## Using Demo Mode

When running in demo mode:
- A "Firebase Demo Mode" indicator appears in the bottom-right corner
- Mock users are available for testing:
  - Email Authentication:
    - Student: student@test.com / password123
    - Faculty: faculty@test.com / password123
    - Admin: admin@test.com / password123
    - Parent: parent@test.com / password123
  - Phone Authentication:
    - Phone: +919999999999
    - OTP: Any 6-digit number (e.g., 123456)

## How It Works

The application uses a Factory Pattern to determine whether to use real Firebase services or mock implementations:

1. When the application starts, it checks if Firebase is properly configured
2. If Firebase is configured and demo mode is not forced, it uses real Firebase services
3. Otherwise, it uses mock implementations that mimic Firebase behavior

## Switching Between Modes

You can switch between live Firebase and demo mode by:

1. Updating the `REACT_APP_FORCE_DEMO_MODE` environment variable
2. Adding or removing Firebase configuration values

Remember to restart your development server after making these changes for them to take effect.

## Troubleshooting

1. **Firebase not loading**: Ensure you've added all required environment variables
2. **Phone auth not working**: Make sure Phone authentication is enabled in Firebase console
3. **reCAPTCHA errors**: Add your domain to the authorized domains list in Firebase console
4. **Backend integration failures**: Verify that your backend is properly configured to validate Firebase tokens
