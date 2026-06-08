# Course Allocation System - Testing Guide

## System Status ✅
- Backend server: Running on http://localhost:5000
- Frontend server: Running on http://localhost:3000
- MongoDB: Connected with sample data
- API endpoints: Configured and ready

## Sample Data Created ✅
- **Faculty**: 4 members (including admin)
  - John Smith (CS) - john.smith@gdc.edu
  - Sarah Johnson (CS) - sarah.johnson@gdc.edu  
  - Michael Brown (Math) - michael.brown@gdc.edu
  - Admin User - admin@gdc.edu

- **Students**: 5 students
  - Alice Wilson, Bob Davis, Carol Miller, David Garcia, Emma Martinez

- **Courses**: 5 courses with faculty assignments
  - Data Structures and Algorithms (CS301) → John Smith
  - Database Management Systems (CS302) → John Smith
  - Web Development (CS303) → Sarah Johnson
  - Software Engineering (CS304) → Sarah Johnson
  - Mathematics for Computer Science (MA301) → Michael Brown

## Manual Testing Steps

### 1. Admin Login
- Navigate to: http://localhost:3000/admin/login
- Credentials: 
  - Email: admin@gdc.edu
  - Password: admin123
  - Role: Admin (if required)

### 2. Access Course Allocation Dashboard
- After login, navigate to: http://localhost:3000/admin/course-allocation
- Or use the "Course Allocation" menu item in the admin dashboard

### 3. Test Dashboard Features
- **Overview Tab**: View allocation statistics
- **Course List Tab**: Browse all courses with faculty assignments
- **Faculty Workload Tab**: See faculty course load distribution
- **Statistics Tab**: View detailed allocation metrics

### 4. Test Bulk Operations
- **Bulk Faculty Assignment**: 
  - Click "Bulk Assign Faculty" button
  - Follow 3-step wizard to assign multiple faculty to courses
  - Test schedule conflict detection

- **Bulk Student Enrollment**:
  - Click "Bulk Enroll Students" button  
  - Follow stepper to enroll multiple students
  - Test capacity limit checks

### 5. API Endpoints (Direct Testing)
Once rate limiting expires, test these endpoints with admin token:

- GET /api/course-allocation/courses
- GET /api/course-allocation/stats
- POST /api/course-allocation/assign-faculty
- POST /api/course-allocation/bulk-assign-faculty
- POST /api/course-allocation/bulk-enroll-students

## Features Implemented ✅

### Backend
- Course allocation controller with MongoDB support
- Schedule conflict detection
- Bulk operations with transaction support
- Comprehensive error handling
- Pagination and filtering
- Statistics generation

### Frontend  
- Course Allocation Dashboard with tabs
- Bulk Assignment Dialog (3-step wizard)
- Bulk Student Enrollment Dialog (stepper)
- Real-time statistics display
- Faculty workload visualization
- Course filtering and search

### Integration
- Admin dashboard navigation
- Role-based access control
- API service layer
- Error handling and user feedback

## Next Steps
1. **Manual Testing**: Use the browser to test all functionality
2. **UI/UX Polish**: Clean up any styling issues
3. **Error Handling**: Test edge cases and error scenarios  
4. **Performance**: Test with larger datasets
5. **Validation**: Verify all business rules work correctly

## Troubleshooting
- If login fails: Wait for rate limiting to expire (few minutes)
- If data missing: Run `node create-sample-data.js` again
- If admin issues: Run `node reset-admin-password.js`

The course allocation system is fully implemented and ready for comprehensive testing!
