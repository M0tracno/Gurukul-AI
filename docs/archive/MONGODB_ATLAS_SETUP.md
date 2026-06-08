# MongoDB Atlas Setup Guide

This guide provides detailed instructions for setting up MongoDB Atlas for production use with the AI Teacher Assistant application.

## Setting Up MongoDB Atlas

### 1. Create a MongoDB Atlas Account

- Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for an account
- Choose the free tier option for small deployments

### 2. Create a New Cluster

- Click "Build a Cluster"
- Select "Shared Clusters" for the free tier
- Choose your preferred cloud provider (AWS, Google Cloud, or Azure)
- Select a region closest to your users
- Click "Create Cluster" (creation may take 1-5 minutes)

### 3. Configure Network Access

- In the left sidebar, click "Network Access"
- Click "Add IP Address"
- For development, you can allow access from anywhere by entering `0.0.0.0/0` 
  (Note: For production, you should limit this to specific IP addresses)
- Click "Confirm"

### 4. Create a Database User

- In the left sidebar, click "Database Access"
- Click "Add New Database User"
- Create a username and a secure password (store these safely)
- Under "Database User Privileges", select "Atlas admin" for full access
- Click "Add User"

### 5. Get Connection String

- Return to your cluster view and click "Connect"
- Choose "Connect your application"
- Select "Node.js" as the driver and the appropriate version
- Copy the connection string
- Replace `<password>` in the connection string with your database user password

## Configuring the Application

### 1. Set Environment Variables

Add the following to your `.env` file or deployment environment variables:

```
DB_TYPE=mongodb
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database-name>?retryWrites=true&w=majority
```

Replace `<username>`, `<password>`, `<cluster>`, and `<database-name>` with your specific values.

### 2. Test the Connection

Run the MongoDB test connection script:

```bash
npm run test:mongodb
```

### 3. Migrate Data (If Needed)

If you have existing data in SQLite that you want to transfer to MongoDB:

```bash
npm run migrate:to-mongodb
```

## MongoDB Atlas Best Practices

1. **Regular Backups**: Enable automated backups in MongoDB Atlas
2. **Monitoring**: Set up alerts for unusual usage patterns
3. **Indexing**: Create appropriate indexes for frequently queried fields
4. **Connection Pooling**: Already configured in the application
5. **Security**: Regularly rotate database user passwords

## Scaling with MongoDB Atlas

As your application grows, you can easily scale with MongoDB Atlas:

1. **Upgrade Tier**: Move from shared clusters to dedicated clusters
2. **Increase Storage**: Adjust storage capacity in the Atlas dashboard
3. **Horizontal Scaling**: Add more shards for distributing data across multiple servers
4. **Global Distribution**: Set up global clusters for worldwide performance
