/**
 * Mock Database Service
 *
 * This module provides mock implementations of database services for use during development.
 * It provides realistic data for the Gurukul AI platform's dashboards and features.
 */

// Mock courses data
export const mockCourses = [
  {
    id: 'course-001',
    title: 'Introduction to Sanskrit Grammar',
    description:
      'Learn the foundational aspects of Sanskrit grammar, including noun declensions and verb conjugations.',
    instructor: 'Dronacharya',
    enrollmentCount: 156,
    rating: 4.8,
    level: 'Beginner',
    durationHours: 48,
    imageUrl: '/assets/images/courses/sanskrit-grammar.jpg',
    topics: ['Noun Cases', 'Verb Forms', 'Sentence Structure'],
    progress: 35,
    category: 'Languages',
    featured: true,
  },
  {
    id: 'course-002',
    title: 'Vedic Mathematics',
    description:
      'Explore the ancient techniques of mathematical calculations as documented in the Vedic texts.',
    instructor: 'Aryabhata',
    enrollmentCount: 203,
    rating: 4.9,
    level: 'Intermediate',
    durationHours: 36,
    imageUrl: '/assets/images/courses/vedic-math.jpg',
    topics: ['Mental Calculation', 'Number Properties', 'Geometric Applications'],
    progress: 65,
    category: 'Mathematics',
    featured: true,
  },
  {
    id: 'course-003',
    title: 'Ayurvedic Science Fundamentals',
    description:
      'Understand the core principles of Ayurveda and its approach to holistic health and wellness.',
    instructor: 'Charaka',
    enrollmentCount: 189,
    rating: 4.7,
    level: 'Beginner',
    durationHours: 60,
    imageUrl: '/assets/images/courses/ayurveda.jpg',
    topics: ['Doshas', 'Herbs & Remedies', 'Lifestyle Practices'],
    progress: 22,
    category: 'Health Sciences',
    featured: true,
  },
  {
    id: 'course-004',
    title: 'Classical Indian Philosophy',
    description:
      'A comprehensive overview of the six classical schools of Indian philosophical thought.',
    instructor: 'Kanada',
    enrollmentCount: 124,
    rating: 4.6,
    level: 'Advanced',
    durationHours: 72,
    imageUrl: '/assets/images/courses/philosophy.jpg',
    topics: ['Nyaya', 'Vaisheshika', 'Samkhya', 'Yoga', 'Mimamsa', 'Vedanta'],
    progress: 45,
    category: 'Philosophy',
    featured: false,
  },
];

// Mock students data
export const mockStudents = [
  {
    id: 'student-001',
    name: 'Arjuna',
    email: 'arjuna@gurukul.ai',
    enrollmentDate: '2025-01-15',
    courses: ['course-001', 'course-002', 'course-003'],
    overallProgress: 42,
    achievements: [
      { id: 'ach-001', title: 'First Assignment', date: '2025-02-01' },
      { id: 'ach-002', title: 'Knowledge Seeker', date: '2025-03-10' },
    ],
    profileImage: '/assets/images/students/arjuna.jpg',
    attendance: 92,
  },
  {
    id: 'student-002',
    name: 'Bhima',
    email: 'bhima@gurukul.ai',
    enrollmentDate: '2025-01-20',
    courses: ['course-001', 'course-003'],
    overallProgress: 38,
    achievements: [{ id: 'ach-001', title: 'First Assignment', date: '2025-02-05' }],
    profileImage: '/assets/images/students/bhima.jpg',
    attendance: 87,
  },
  {
    id: 'student-003',
    name: 'Draupadi',
    email: 'draupadi@gurukul.ai',
    enrollmentDate: '2025-02-01',
    courses: ['course-002', 'course-004'],
    overallProgress: 65,
    achievements: [
      { id: 'ach-001', title: 'First Assignment', date: '2025-02-10' },
      { id: 'ach-003', title: 'Perfect Score', date: '2025-03-15' },
      { id: 'ach-004', title: 'Consistent Learner', date: '2025-04-01' },
    ],
    profileImage: '/assets/images/students/draupadi.jpg',
    attendance: 98,
  },
];

// Mock analytics data
export const mockAnalytics = {
  studentEngagement: [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 72 },
    { month: 'Mar', value: 68 },
    { month: 'Apr', value: 79 },
    { month: 'May', value: 85 },
    { month: 'Jun', value: 82 },
  ],
  courseCompletion: [
    { course: 'Sanskrit Grammar', completion: 62 },
    { course: 'Vedic Mathematics', completion: 75 },
    { course: 'Ayurvedic Science', completion: 48 },
    { course: 'Indian Philosophy', completion: 55 },
  ],
  assessmentScores: [
    { assessment: 'Quiz 1', averageScore: 78 },
    { assessment: 'Assignment 1', averageScore: 82 },
    { assessment: 'Midterm', averageScore: 75 },
    { assessment: 'Quiz 2', averageScore: 80 },
    { assessment: 'Assignment 2', averageScore: 85 },
    { assessment: 'Final Exam', averageScore: 79 },
  ],
  studentActivity: {
    totalActiveStudents: 487,
    averageSessionDuration: 45, // minutes
    completedAssignments: 1653,
    submissionsLastWeek: 312,
  },
};

// Mock assessment data
export const mockAssessments = [
  {
    id: 'assessment-001',
    title: 'Sanskrit Grammar Quiz 1',
    courseId: 'course-001',
    dueDate: '2025-06-15T23:59:59',
    totalPoints: 25,
    averageScore: 21.4,
    submissionRate: 92,
    status: 'open',
    type: 'quiz',
  },
  {
    id: 'assessment-002',
    title: 'Vedic Mathematics Assignment',
    courseId: 'course-002',
    dueDate: '2025-06-18T23:59:59',
    totalPoints: 50,
    averageScore: 42.8,
    submissionRate: 78,
    status: 'open',
    type: 'assignment',
  },
  {
    id: 'assessment-003',
    title: 'Ayurveda Midterm Exam',
    courseId: 'course-003',
    dueDate: '2025-06-20T23:59:59',
    totalPoints: 100,
    averageScore: 0,
    submissionRate: 0,
    status: 'upcoming',
    type: 'exam',
  },
  {
    id: 'assessment-004',
    title: 'Philosophy Concept Discussion',
    courseId: 'course-004',
    dueDate: '2025-06-10T23:59:59',
    totalPoints: 30,
    averageScore: 25.6,
    submissionRate: 95,
    status: 'closed',
    type: 'discussion',
  },
];

// Mock notifications data
export const mockNotifications = [
  {
    id: 'notif-001',
    title: 'New assignment posted',
    message: 'A new assignment has been posted in Sanskrit Grammar.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    type: 'assignment',
    courseId: 'course-001',
  },
  {
    id: 'notif-002',
    title: 'Your assignment was graded',
    message: 'Your Vedic Mathematics assignment has been graded. You received 46/50.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
    type: 'grade',
    courseId: 'course-002',
  },
  {
    id: 'notif-003',
    title: 'Upcoming exam reminder',
    message: 'Reminder: The Ayurveda Midterm Exam is scheduled for June 20th.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    read: false,
    type: 'reminder',
    courseId: 'course-003',
  },
];

/**
 * Get mock data based on type
 * @param {string} dataType - Type of data to retrieve
 * @returns {Array|Object} Mock data
 */
export const getMockData = dataType => {
  switch (dataType) {
    case 'courses':
      return mockCourses;
    case 'students':
      return mockStudents;
    case 'analytics':
      return mockAnalytics;
    case 'assessments':
      return mockAssessments;
    case 'notifications':
      return mockNotifications;
    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }
};

/**
 * Mock database service
 */
class MockDatabaseService {
  constructor() {
    console.log('Mock Database Service initialized');
    this.data = {
      courses: mockCourses,
      students: mockStudents,
      analytics: mockAnalytics,
      assessments: mockAssessments,
      notifications: mockNotifications,
    };
  }

  /**
   * Get data by type
   * @param {string} dataType - Type of data to retrieve
   * @returns {Promise<Array|Object>} - Retrieved data
   */
  async getData(dataType) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!this.data[dataType]) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    return this.data[dataType];
  }

  /**
   * Get a specific item by ID
   * @param {string} dataType - Type of data to retrieve from
   * @param {string} id - ID of the item to retrieve
   * @returns {Promise<Object>} - Retrieved item
   */
  async getItemById(dataType, id) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!this.data[dataType]) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const item = this.data[dataType].find(item => item.id === id);
    if (!item) {
      throw new Error(`Item with ID ${id} not found in ${dataType}`);
    }

    return item;
  }

  /**
   * Add a new item
   * @param {string} dataType - Type of data to add to
   * @param {Object} item - Item to add
   * @returns {Promise<Object>} - Added item
   */
  async addItem(dataType, item) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!this.data[dataType]) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    // Generate a new ID if not provided
    const newItem = {
      ...item,
      id: item.id || `${dataType}-${Date.now()}`,
    };

    this.data[dataType].push(newItem);
    return newItem;
  }

  /**
   * Update an existing item
   * @param {string} dataType - Type of data to update in
   * @param {string} id - ID of the item to update
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated item
   */
  async updateItem(dataType, id, updates) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    if (!this.data[dataType]) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const index = this.data[dataType].findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`Item with ID ${id} not found in ${dataType}`);
    }

    const updatedItem = {
      ...this.data[dataType][index],
      ...updates,
    };

    this.data[dataType][index] = updatedItem;
    return updatedItem;
  }

  /**
   * Delete an item
   * @param {string} dataType - Type of data to delete from
   * @param {string} id - ID of the item to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteItem(dataType, id) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));

    if (!this.data[dataType]) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const index = this.data[dataType].findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`Item with ID ${id} not found in ${dataType}`);
    }

    this.data[dataType].splice(index, 1);
    return true;
  }
}

export default MockDatabaseService;
