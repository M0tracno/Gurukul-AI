# Google Cloud Platform - Required Configuration Details

## 🎯 What You Need to Do to Make Google Cloud Integration Work

This document outlines exactly what you need to configure in your Google Cloud Platform project to make the educational management system's Google Cloud integration functional.

## 📋 Prerequisites

1. **Google Cloud Platform Account**
   - Create a GCP account at: https://cloud.google.com/
   - You'll get $300 in free credits for new accounts

2. **Billing Account**
   - Set up billing (required for most GCP services)
   - Educational use typically stays within free tier limits

## 🚀 Step-by-Step Setup Guide

### Step 1: Create a New GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project details:
   - **Project Name**: `educational-management-system`
   - **Project ID**: `edu-mgmt-system-[random-id]` (must be globally unique)
   - **Organization**: Select your organization or leave blank
4. Click "Create"

### Step 2: Enable Required APIs

Navigate to **APIs & Services** → **Library** and enable these APIs:

#### Core APIs (Required)
- ✅ **Cloud Storage API** - For file storage and management
- ✅ **Cloud Translation API** - For content translation
- ✅ **Cloud Text-to-Speech API** - For audio content generation
- ✅ **Cloud Speech-to-API** - For voice recognition
- ✅ **Cloud Vision API** - For image analysis and OCR
- ✅ **Cloud Natural Language API** - For text analysis
- ✅ **Cloud Pub/Sub API** - For messaging and notifications
- ✅ **Cloud Functions API** - For serverless functions
- ✅ **Cloud SQL API** - For managed databases
- ✅ **Cloud Monitoring API** - For system monitoring
- ✅ **Cloud Logging API** - For centralized logging

#### AI/ML APIs (Optional but Recommended)
- ✅ **Vertex AI API** - For advanced ML capabilities
- ✅ **Document AI API** - For document processing
- ✅ **Video Intelligence API** - For video analysis
- ✅ **AutoML API** - For custom ML models

### Step 3: Create Service Account and Keys

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Enter details:
   - **Service account name**: `educational-management-service`
   - **Service account ID**: `edu-mgmt-service`
   - **Description**: `Service account for educational management system`
4. Click **"Create and Continue"**
5. Assign roles:
   - **Storage Admin** (for Cloud Storage)
   - **Cloud SQL Admin** (for database management)
   - **Pub/Sub Admin** (for messaging)
   - **Cloud Functions Admin** (for serverless functions)
   - **AI Platform Admin** (for AI services)
   - **Monitoring Admin** (for system monitoring)
   - **Logging Admin** (for centralized logging)
6. Click **"Continue"** → **"Done"**
7. Click on the created service account
8. Go to **"Keys"** tab → **"Add Key"** → **"Create New Key"**
9. Select **JSON** format
10. Click **"Create"** - This downloads your service account key file

### Step 4: Set Up Cloud Storage Buckets

1. Go to **Cloud Storage** → **Buckets**
2. Click **"Create Bucket"**
3. Create these buckets:

#### Main Storage Bucket
- **Name**: `edu-system-storage-[project-id]`
- **Location**: Choose region closest to your users
- **Storage Class**: Standard
- **Access Control**: Uniform

#### Document Processing Bucket
- **Name**: `edu-system-documents-[project-id]`
- **Location**: Same as main bucket
- **Storage Class**: Standard

#### Media Bucket
- **Name**: `edu-system-media-[project-id]`
- **Location**: Same as main bucket
- **Storage Class**: Standard

### Step 5: Configure Pub/Sub Topics

1. Go to **Pub/Sub** → **Topics**
2. Create these topics:
   - **Topic Name**: `assignment-submissions`
   - **Topic Name**: `grade-updates`
   - **Topic Name**: `notification-queue`
   - **Topic Name**: `email-queue`

### Step 6: Set Up Cloud SQL (Optional)

If you want to use Google Cloud SQL instead of MongoDB:

1. Go to **SQL** → **Create Instance**
2. Choose **PostgreSQL**
3. Configure:
   - **Instance ID**: `edu-system-db`
   - **Password**: Set a strong password
   - **Region**: Same as your storage buckets
   - **Machine Type**: db-f1-micro (for development)
4. Create the instance

### Step 7: Deploy Cloud Functions

1. Go to **Cloud Functions**
2. Enable the Cloud Functions API if not already enabled
3. The functions will be deployed automatically when you run the deployment script

## 🔐 Environment Variables Setup

Create a `.env` file in your project root with these variables:

```env
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/service-account-key.json

# Cloud Storage
GOOGLE_CLOUD_STORAGE_BUCKET=edu-system-storage-your-project-id
GOOGLE_CLOUD_DOCUMENTS_BUCKET=edu-system-documents-your-project-id
GOOGLE_CLOUD_MEDIA_BUCKET=edu-system-media-your-project-id

# Pub/Sub Topics
GOOGLE_CLOUD_PUBSUB_ASSIGNMENT_TOPIC=assignment-submissions
GOOGLE_CLOUD_PUBSUB_GRADE_TOPIC=grade-updates
GOOGLE_CLOUD_PUBSUB_NOTIFICATION_TOPIC=notification-queue
GOOGLE_CLOUD_PUBSUB_EMAIL_TOPIC=email-queue

# AI Services
GOOGLE_CLOUD_TRANSLATE_ENABLED=true
GOOGLE_CLOUD_SPEECH_ENABLED=true
GOOGLE_CLOUD_VISION_ENABLED=true
GOOGLE_CLOUD_NATURAL_LANGUAGE_ENABLED=true

# Cloud SQL (if using)
GOOGLE_CLOUD_SQL_CONNECTION_NAME=your-project-id:region:instance-name
GOOGLE_CLOUD_SQL_DATABASE=educational_system
GOOGLE_CLOUD_SQL_USER=postgres
GOOGLE_CLOUD_SQL_PASSWORD=your-database-password

# Monitoring and Logging
GOOGLE_CLOUD_MONITORING_ENABLED=true
GOOGLE_CLOUD_LOGGING_ENABLED=true
```

## 💰 Cost Estimation

For a typical educational institution with ~1000 users:

### Monthly Costs (Estimated)
- **Cloud Storage**: $2-5 (for 10-50GB)
- **Cloud Functions**: $1-3 (based on usage)
- **AI APIs**: $5-15 (translation, speech, vision)
- **Pub/Sub**: $1-2
- **Cloud SQL**: $7-25 (if used)
- **Monitoring/Logging**: $1-3

**Total Estimated Monthly Cost**: $15-50

### Free Tier Benefits
- Cloud Storage: 5GB free
- Cloud Functions: 2M invocations free
- Translation: 500K characters free per month
- Speech-to-Text: 60 minutes free per month
- Vision API: 1000 units free per month

## 🔒 Security Configuration

### IAM Roles (Minimum Required)
```
Cloud Storage: roles/storage.admin
Cloud SQL: roles/cloudsql.admin
Pub/Sub: roles/pubsub.admin
Cloud Functions: roles/cloudfunctions.admin
AI Platform: roles/aiplatform.admin
```

### API Restrictions
Set up API key restrictions in **APIs & Services** → **Credentials**:
- Restrict to your application's IP addresses
- Limit to specific APIs only
- Set usage quotas

## 🚀 Deployment Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   - Copy `.env.google-cloud-template` to `.env`
   - Fill in your actual values

3. **Deploy Cloud Functions**:
   ```bash
   ./deploy-cloud-functions.ps1
   ```

4. **Start the Application**:
   ```bash
   npm start
   ```

## ✅ Testing Your Setup

1. **Test Storage**: Upload a file through the admin dashboard
2. **Test Translation**: Try translating content in different languages
3. **Test AI Services**: Upload an image for analysis
4. **Test Notifications**: Send a test notification
5. **Test Analytics**: Check the monitoring dashboard

## 🆘 Troubleshooting

### Common Issues:

#### 1. "Project not found" error
- Verify your `GOOGLE_CLOUD_PROJECT_ID` in `.env`
- Ensure the project exists in your GCP console

#### 2. "Permission denied" error
- Check your service account has the required roles
- Verify the JSON key file path is correct

#### 3. "API not enabled" error
- Enable the required APIs in GCP Console
- Wait a few minutes for activation

#### 4. "Quota exceeded" error
- Check your API quotas in GCP Console
- Request quota increases if needed

#### 5. "Authentication failed" error
- Verify your service account JSON key
- Check if the service account has proper permissions

## 📞 Support

If you encounter issues:

1. **Check the Logs**: Go to GCP Console → Logging
2. **Verify Permissions**: IAM & Admin → IAM
3. **Check Quotas**: APIs & Services → Quotas
4. **Review Billing**: Billing → Overview

## 🎓 Educational Pricing

Google Cloud offers educational discounts:
- **Google for Education**: Special pricing for qualified institutions
- **Educational Grants**: Up to $1000 in credits for qualifying projects
- **Research Credits**: Additional credits for research projects

Apply at: https://cloud.google.com/edu/

## 🔄 Next Steps

After completing this setup:

1. ✅ Test all integrations using the admin dashboard
2. ✅ Configure monitoring alerts
3. ✅ Set up automated backups
4. ✅ Train your team on the new features
5. ✅ Monitor usage and costs

## 📊 Monitoring Your Integration

Use the **Google Cloud Dashboard** in your admin panel to:
- Monitor storage usage
- Track API calls
- View system performance
- Manage costs
- Configure alerts

---

**🎉 Congratulations!** Your Google Cloud Platform integration is now ready to enhance your educational management system with powerful cloud services, AI capabilities, and scalable infrastructure.