# AI Teacher Assistant - Codebase Organization

This document explains how the codebase is organized and how to maintain it properly.

## Project Structure

The project consists of two main parts:

1. **Frontend**: React application in the root directory
2. **Backend**: Express.js API server in the `backend` directory

## Frontend (React)

- `/src`: Main source code for the React application
  - `/auth`: Authentication context and utilities
  - `/components`: Reusable UI components
  - `/pages`: Page components for each route
  - `/services`: API client services
  - `/theme`: Theme configuration
  - `/constants`: Application constants
  - `/hooks`: Custom React hooks

## Backend (Express.js)

- `/backend`: Main backend directory
  - `/config`: Configuration files
  - `/controllers`: Controller logic
  - `/middleware`: Express middleware
  - `/models`: Data models
  - `/routes`: API routes
    - `/consolidated`: New unified routes that work with both database types
    - Legacy route files are kept for backward compatibility
  - `/scripts`: Utility scripts
  - `/utils`: Utility functions

## Database Support

The application supports two database types:
- MongoDB (preferred for production)
- SQLite (useful for development and testing)

The database type can be configured in the `.env` file with the `DB_TYPE` setting.

## Environment Files

- `.env`: Main environment file for the frontend
- `backend/.env`: Environment file for the backend API

## Cleaned-up Files

Several redundant files have been removed from the codebase:
- Duplicate test files
- Simple server implementations
- Unnecessary migration scripts

## Consolidated Routes

To simplify the codebase, we've begun consolidating the MongoDB and SQLite routes into unified handlers in the `/backend/routes/consolidated` directory. These provide a single API interface regardless of which database is being used.

## Development Workflow

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. In a separate terminal, start the frontend:
   ```
   npm start
   ```

## Adding New Features

When adding new features:
1. Use the consolidated route pattern for any new API endpoints
2. Ensure compatibility with both database types
3. Add appropriate tests in the `/backend/tests` directory

## Testing

Run the backend tests:
```
cd backend
npm test
```
