# 🚀 Google Cloud Services Setup Guide
*Step-by-step guide to set up Google Cloud Platform integration*

## Prerequisites
- Google Cloud Platform account
- Billing account enabled
- Node.js 16+ installed
- Your educational management system project

## 📋 Step 1: Google Cloud Project Setup

### 1.1 Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `educational-platform-[your-name]`
4. Select your organization (if applicable)
5. Click "Create"

### 1.2 Enable Billing
1. Go to "Billing" in the left sidebar
2. Link a billing account or create a new one
3. Verify billing is enabled for your project

### 1.3 Note Your Project Details
Save these for later configuration:
- **Project ID**: `your-project-id`
- **Project Number**: Found in project settings
- **Project Name**: What you named your project

## 🔑 Step 2: Service Account Setup

### 2.1 Create Service Account
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Enter details:
   - **Name**: `educational-platform-service`
   - **Description**: `Service account for educational platform integration`
4. Click "Create and Continue"

### 2.2 Assign Roles
Add these roles to your service account:
- **Storage Admin**: For Cloud Storage operations
- **Pub/Sub Admin**: For messaging services
- **AI Platform Admin**: For AI/ML services
- **Monitoring Admin**: For logging and monitoring
- **Cloud Functions Admin**: For serverless operations
- **Service Account User**: For impersonation

### 2.3 Create Service Account Key
1. Click on your created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Download the key file
6. **IMPORTANT**: Store this file securely and never commit to version control

## 🔌 Step 3: Enable Required APIs

Go to "APIs & Services" → "Library" and enable these APIs:

### Core Services
- ✅ Cloud Storage API
- ✅ Cloud Functions API
- ✅ Cloud Pub/Sub API
- ✅ Cloud SQL Admin API
- ✅ Cloud Monitoring API
- ✅ Cloud Logging API

### AI/ML Services
- ✅ Cloud Natural Language API
- ✅ Cloud Translation API
- ✅ Cloud Text-to-Speech API
- ✅ Cloud Speech-to-Text API
- ✅ Cloud Vision API
- ✅ AutoML API

### Security & Management
- ✅ Cloud Identity and Access Management (IAM) API
- ✅ Cloud Key Management Service (KMS) API
- ✅ Cloud Security Command Center API
- ✅ Cloud Asset API

### Additional Services
- ✅ Cloud Endpoints API
- ✅ Cloud Build API
- ✅ Cloud Run API
- ✅ Firebase APIs (if integrating with existing Firebase)

## 🗄️ Step 4: Cloud Storage Setup

### 4.1 Create Storage Buckets
Create these buckets in Cloud Storage:

```bash
# Main application files
gsutil mb gs://your-project-main-storage

# Media files (images, videos, audio)
gsutil mb gs://your-project-media-storage

# Document storage
gsutil mb gs://your-project-documents

# Backup storage
gsutil mb gs://your-project-backups

# Temporary files
gsutil mb gs://your-project-temp-files
```

### 4.2 Configure Bucket Permissions
For each bucket, set appropriate permissions:
1. Go to Cloud Storage → Browser
2. Click on bucket name
3. Go to "Permissions" tab
4. Add your service account with "Storage Object Admin" role

### 4.3 Set CORS Configuration (for web uploads)
Create a `cors.json` file:
```json
[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "header": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:
```bash
gsutil cors set cors.json gs://your-project-main-storage
```

## 📨 Step 5: Pub/Sub Setup

### 5.1 Create Topics
```bash
# User notifications
gcloud pubsub topics create user-notifications

# Analytics events
gcloud pubsub topics create analytics-events

# System events
gcloud pubsub topics create system-events

# Email notifications
gcloud pubsub topics create email-notifications

# SMS notifications
gcloud pubsub topics create sms-notifications
```

### 5.2 Create Subscriptions
```bash
# Main subscription for processing
gcloud pubsub subscriptions create main-subscription --topic=user-notifications

# Analytics processing
gcloud pubsub subscriptions create analytics-subscription --topic=analytics-events

# System monitoring
gcloud pubsub subscriptions create system-subscription --topic=system-events
```

## 🗃️ Step 6: Cloud SQL Setup (Optional)

### 6.1 Create Cloud SQL Instance
```bash
gcloud sql instances create educational-db-instance \
    --database-version=POSTGRES_13 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB
```

### 6.2 Create Database
```bash
gcloud sql databases create educational_management_db \
    --instance=educational-db-instance
```

### 6.3 Create Database User
```bash
gcloud sql users create db_admin \
    --instance=educational-db-instance \
    --password=your-secure-password
```

## 🛡️ Step 7: Security Setup

### 7.1 Create KMS Key Ring
```bash
gcloud kms keyrings create educational-platform-keys \
    --location=global
```

### 7.2 Create Encryption Key
```bash
gcloud kms keys create main-encryption-key \
    --location=global \
    --keyring=educational-platform-keys \
    --purpose=encryption
```

## ⚙️ Step 8: Environment Configuration

### 8.1 Copy Environment Template
```bash
cp .env.google-cloud-template .env.local
```

### 8.2 Update Environment Variables
Edit `.env.local` with your specific values:

```env
# Replace with your actual values
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
GOOGLE_CLOUD_PROJECT_NUMBER=123456789012
GOOGLE_APPLICATION_CREDENTIALS=./config/your-service-account-key.json

# Update bucket names
GOOGLE_CLOUD_STORAGE_BUCKET_MAIN=your-project-main-storage
GOOGLE_CLOUD_STORAGE_BUCKET_MEDIA=your-project-media-storage

# Add your actual service account details
GOOGLE_SERVICE_ACCOUNT_EMAIL=educational-platform-service@your-project.iam.gserviceaccount.com
```

### 8.3 Secure Your Service Account Key
1. Create a `config` directory in your project root
2. Move your service account JSON key to `config/google-cloud-service-account.json`
3. Add `config/` to your `.gitignore` file

## 📦 Step 9: Install Dependencies

Run the installation command:
```bash
npm install
```

This will install all the required Google Cloud SDK packages:
- @google-cloud/storage
- @google-cloud/pubsub
- @google-cloud/translate
- @google-cloud/text-to-speech
- @google-cloud/speech
- @google-cloud/vision
- @google-cloud/language
- @google-cloud/monitoring
- @google-cloud/logging
- And more...

## 🧪 Step 10: Test Your Setup

### 10.1 Basic Connection Test
Create a test file `test-google-cloud.js`:

```javascript
const googleCloudService = require('./src/services/googleCloudService');

async function testGoogleCloud() {
  try {
    console.log('Testing Google Cloud connection...');
    
    // Initialize service
    await googleCloudService.initialize();
    console.log('✅ Initialization successful');
    
    // Test health check
    const health = await googleCloudService.healthCheck();
    console.log('✅ Health check:', health);
    
    // Test service info
    const info = await googleCloudService.getServiceInfo();
    console.log('✅ Service info:', info);
    
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGoogleCloud();
```

Run the test:
```bash
node test-google-cloud.js
```

### 10.2 Web Interface Test
Start your development server:
```bash
npm start
```

Navigate to the Google Cloud Dashboard in your application to test the web interface.

## 🚀 Step 11: Deploy Cloud Functions (Optional)

### 11.1 Install Functions Framework
```bash
npm install -g @google-cloud/functions-framework
```

### 11.2 Create Sample Function
Create `functions/email-processor/index.js`:

```javascript
const functions = require('@google-cloud/functions-framework');

functions.http('emailProcessor', (req, res) => {
  const { to, subject, body } = req.body;
  
  // Process email logic here
  console.log(`Processing email to: ${to}`);
  
  res.json({ 
    success: true, 
    message: 'Email processed successfully',
    timestamp: new Date().toISOString()
  });
});
```

### 11.3 Deploy Function
```bash
gcloud functions deploy email-processor \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --source functions/email-processor
```

## 📊 Step 12: Set Up Monitoring

### 12.1 Create Custom Dashboard
1. Go to "Monitoring" in Google Cloud Console
2. Click "Dashboards" → "Create Dashboard"
3. Add charts for:
   - API requests per minute
   - Storage usage
   - Function execution count
   - Error rates

### 12.2 Set Up Alerts
1. Go to "Monitoring" → "Alerting"
2. Create alert policies for:
   - High error rates
   - Unusual API usage
   - Storage quota approaching limit
   - Function failures

## ✅ Verification Checklist

Before proceeding, verify:

- [ ] Google Cloud project created and billing enabled
- [ ] Service account created with proper roles
- [ ] All required APIs enabled
- [ ] Storage buckets created and configured
- [ ] Pub/Sub topics and subscriptions created
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Basic connection test passed
- [ ] Web interface accessible
- [ ] Monitoring and alerting configured

## 🔒 Security Best Practices

1. **Never commit service account keys to version control**
2. **Use least privilege principle for IAM roles**
3. **Enable audit logging for all services**
4. **Regularly rotate service account keys**
5. **Monitor for unusual activity**
6. **Use VPC and firewall rules appropriately**
7. **Enable multi-factor authentication**
8. **Regularly review and update permissions**

## 🎯 Next Steps

After completing the setup:

1. **Integrate with your existing features**: Start with file uploads and AI services
2. **Implement monitoring**: Set up comprehensive logging and metrics
3. **Optimize costs**: Review usage and optimize resource allocation
4. **Scale gradually**: Start with basic features and expand
5. **Train your team**: Ensure team members understand the new capabilities

## 📞 Support

If you encounter issues:

1. **Check Google Cloud Status**: [status.cloud.google.com](https://status.cloud.google.com)
2. **Review error logs**: Check Cloud Logging for detailed error messages
3. **Consult documentation**: [cloud.google.com/docs](https://cloud.google.com/docs)
4. **Contact support**: Use Google Cloud Support if you have a support plan

## 💰 Cost Management

Monitor your costs:
1. Set up billing alerts
2. Use the pricing calculator for estimates
3. Review usage reports regularly
4. Optimize storage classes and regions
5. Use preemptible instances where appropriate

---

**🎉 Congratulations!** Your Google Cloud Platform integration is now ready. You can now enhance your educational management system with enterprise-grade cloud services, AI capabilities, and global scalability!
