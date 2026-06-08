# MongoDB Migration Guide

## Overview

This project has been migrated from SQLite to MongoDB for better scalability and production readiness. The application now supports both database types to ensure a smooth transition.

## Configuration

The database type is controlled by the `DB_TYPE` environment variable in your `.env` file. Valid values are:

- `mongodb` (recommended for production)
- `sqlite` (legacy, maintained for backward compatibility)

## Helper Scripts

### Switch Database Type

To easily switch between database types during development, use the provided batch script:

```bash
# Switch to MongoDB
set-db-type.bat mongodb

# Switch to SQLite
set-db-type.bat sqlite
```

### Test MongoDB Connection

To verify your MongoDB connection is working:

```bash
npm run test:mongodb
```

### Migrate Data from SQLite to MongoDB

To migrate existing data from SQLite to MongoDB:

```bash
npm run migrate:to-mongodb
```

## MongoDB Models

MongoDB models are located in the `models/mongo` directory and are indexed in `models/mongodb-models.js`. The models follow Mongoose schema conventions.

## Controllers

The application uses a base controller approach that supports common CRUD operations. Controllers are located in the `controllers` directory.

## Routes

MongoDB-specific routes are separated into their own files with the `mongodb-` prefix. These are used when `DB_TYPE` is set to `mongodb`.

## Environment Variables

Make sure to set the following environment variables in your `.env` file:

```
DB_TYPE=mongodb
MONGODB_URI=your_mongodb_connection_string
```

## Production Deployment

For production deployment, we recommend using MongoDB Atlas for a managed database solution. Update your `MONGODB_URI` accordingly and ensure your application has network access to the MongoDB instance.

## Troubleshooting

- If you encounter connection issues, verify your MongoDB URI and credentials
- Check that MongoDB is running if using a local instance
- Run the `test:mongodb` script to isolate database connectivity problems
