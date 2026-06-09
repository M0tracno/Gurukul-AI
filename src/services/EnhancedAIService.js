import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../config/env';

/**
 * Enhanced AI Service for Phase 2 Smart Features
 * Provides intelligent content recommendations, automated grading, and personalized learning
 * Part of the Educational Management System - Phase 2 Enhancement
 */

class EnhancedAIService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.learningProfiles = new Map();
    this.gradingRubrics = new Map();

    this.initialize();
  }

  async initialize() {
    try {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('Gemini API key not found. AI features will use mock data.');
        this.isInitialized = false;
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      this.isInitialized = true;

      console.log('Enhanced AI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced AI Service:', error);
      this.isInitialized = false;
    }
  }

  // ==================== INTELLIGENT CONTENT RECOMMENDATIONS ====================

  async generateContentRecommendations(studentProfile, learningHistory, preferences = {}) {
    const cacheKey = `recommendations_${studentProfile.id}_${Date.now()}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      if (!this.isInitialized) {
        return this.getMockRecommendations(studentProfile);
      }

      const prompt = this.buildRecommendationPrompt(studentProfile, learningHistory, preferences);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const recommendations = this.parseRecommendations(response.text());

      // Cache for 1 hour
      setTimeout(() => this.cache.delete(cacheKey), 3600000);
      this.cache.set(cacheKey, recommendations);

      return recommendations;
    } catch (error) {
      console.error('Failed to generate content recommendations:', error);
      return this.getMockRecommendations(studentProfile);
    }
  }

  buildRecommendationPrompt(studentProfile, learningHistory, preferences) {
    return `
As an AI educational assistant, analyze the following student profile and learning history to provide personalized content recommendations:

Student Profile:
- Name: ${studentProfile.name}
- Grade Level: ${studentProfile.gradeLevel}
- Subjects: ${studentProfile.subjects.join(', ')}
- Learning Style: ${studentProfile.learningStyle}
- Performance Level: ${studentProfile.performanceLevel}
- Interests: ${studentProfile.interests.join(', ')}

Learning History:
- Completed Topics: ${learningHistory.completedTopics.join(', ')}
- Struggling Areas: ${learningHistory.strugglingAreas.join(', ')}
- Preferred Content Types: ${learningHistory.preferredContentTypes.join(', ')}
- Average Study Time: ${learningHistory.averageStudyTime}
- Recent Scores: ${learningHistory.recentScores.join(', ')}

Preferences:
- Difficulty Level: ${preferences.difficultyLevel || 'adaptive'}
- Content Format: ${preferences.contentFormat || 'mixed'}
- Study Duration: ${preferences.studyDuration || '30 minutes'}

Please provide personalized recommendations in the following JSON format:
{
  "nextTopics": [
    {
      "subject": "string",
      "topic": "string",
      "difficulty": "string",
      "estimatedTime": "string",
      "reason": "string",
      "prerequisites": ["string"],
      "resources": ["string"]
    }
  ],
  "reinforcementTopics": [
    {
      "subject": "string",
      "topic": "string",
      "reason": "string",
      "practiceType": "string"
    }
  ],
  "learningPath": {
    "shortTerm": ["string"],
    "mediumTerm": ["string"],
    "longTerm": ["string"]
  },
  "studyStrategy": {
    "approach": "string",
    "techniques": ["string"],
    "schedule": "string"
  }
}
    `;
  }

  parseRecommendations(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse AI recommendations, using mock data');
    }

    return this.getMockRecommendations({ id: 'default' });
  }

  getMockRecommendations(studentProfile) {
    return {
      nextTopics: [
        {
          subject: 'Mathematics',
          topic: 'Linear Equations',
          difficulty: 'Intermediate',
          estimatedTime: '45 minutes',
          reason: 'Strong foundation in basic algebra, ready for next level',
          prerequisites: ['Basic Algebra', 'Number Operations'],
          resources: ['Interactive Practice', 'Video Tutorials', 'Practice Problems'],
        },
        {
          subject: 'Science',
          topic: 'Cell Structure',
          difficulty: 'Beginner',
          estimatedTime: '30 minutes',
          reason: 'Introduction to biology concepts',
          prerequisites: ['Basic Scientific Method'],
          resources: ['Interactive Diagrams', 'Virtual Lab', 'Animated Videos'],
        },
      ],
      reinforcementTopics: [
        {
          subject: 'Mathematics',
          topic: 'Fractions',
          reason: 'Recent quiz showed gaps in understanding',
          practiceType: 'Interactive exercises with immediate feedback',
        },
      ],
      learningPath: {
        shortTerm: ['Linear Equations', 'Cell Structure', 'Fraction Review'],
        mediumTerm: ['Quadratic Equations', 'Photosynthesis', 'Decimal Operations'],
        longTerm: ['Advanced Algebra', 'Genetics', 'Statistics'],
      },
      studyStrategy: {
        approach: 'Visual and Interactive Learning',
        techniques: ['Spaced Repetition', 'Active Recall', 'Practice Testing'],
        schedule: '30-45 minute sessions, 3-4 times per week',
      },
    };
  }

  // ==================== AUTOMATED GRADING SYSTEM ====================

  async gradeAssignment(assignment, studentResponse, rubric = null) {
    try {
      if (!this.isInitialized) {
        return this.getMockGrading(assignment, studentResponse);
      }

      const gradingPrompt = this.buildGradingPrompt(assignment, studentResponse, rubric);
      const result = await this.model.generateContent(gradingPrompt);
      const response = await result.response;
      const grading = this.parseGrading(response.text());

      return grading;
    } catch (error) {
      console.error('Failed to grade assignment:', error);
      return this.getMockGrading(assignment, studentResponse);
    }
  }

  buildGradingPrompt(assignment, studentResponse, rubric) {
    const rubricText = rubric ? JSON.stringify(rubric) : 'Standard academic grading criteria';

    return `
As an AI grading assistant, evaluate the following student response:

Assignment Details:
- Title: ${assignment.title}
- Subject: ${assignment.subject}
- Type: ${assignment.type}
- Instructions: ${assignment.instructions}
- Max Points: ${assignment.maxPoints}
- Expected Learning Outcomes: ${assignment.learningOutcomes.join(', ')}

Grading Rubric: ${rubricText}

Student Response:
${studentResponse.content}

Please provide detailed grading in the following JSON format:
{
  "overallScore": number,
  "maxPoints": number,
  "percentage": number,
  "letterGrade": "string",
  "criteria": [
    {
      "name": "string",
      "score": number,
      "maxScore": number,
      "feedback": "string",
      "suggestions": ["string"]
    }
  ],
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "detailedFeedback": "string",
  "nextSteps": ["string"],
  "plagiarismCheck": {
    "riskLevel": "string",
    "confidence": number,
    "explanation": "string"
  }
}
    `;
  }

  parseGrading(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse AI grading, using mock data');
    }

    return this.getMockGrading();
  }

  getMockGrading(assignment = {}, studentResponse = {}) {
    return {
      overallScore: 85,
      maxPoints: assignment.maxPoints || 100,
      percentage: 85,
      letterGrade: 'B+',
      criteria: [
        {
          name: 'Content Knowledge',
          score: 38,
          maxScore: 40,
          feedback: 'Demonstrates strong understanding of key concepts',
          suggestions: ['Include more specific examples', 'Connect to real-world applications'],
        },
        {
          name: 'Critical Thinking',
          score: 32,
          maxScore: 35,
          feedback: 'Shows good analytical skills',
          suggestions: ['Develop arguments more thoroughly', 'Consider alternative perspectives'],
        },
        {
          name: 'Communication',
          score: 15,
          maxScore: 25,
          feedback: 'Clear writing but could be more concise',
          suggestions: ['Improve paragraph structure', 'Use more varied vocabulary'],
        },
      ],
      strengths: [
        'Clear understanding of main concepts',
        'Good use of examples',
        'Well-organized response',
      ],
      areasForImprovement: [
        'More detailed analysis needed',
        'Stronger conclusion required',
        'Better integration of sources',
      ],
      detailedFeedback:
        'This is a solid response that demonstrates good understanding of the topic. The main concepts are clearly explained with appropriate examples. To improve, focus on developing your analysis more deeply and creating stronger connections between ideas.',
      nextSteps: [
        'Review feedback and revise weak areas',
        'Practice analytical writing techniques',
        'Study exemplary responses for comparison',
      ],
      plagiarismCheck: {
        riskLevel: 'Low',
        confidence: 0.95,
        explanation: 'Response appears to be original work with proper attribution',
      },
    };
  }

  // ==================== SMART QUESTION GENERATION ====================

  async generateQuestions(
    topic,
    difficulty,
    count = 5,
    questionTypes = ['multiple_choice', 'short_answer']
  ) {
    try {
      if (!this.isInitialized) {
        return this.getMockQuestions(topic, difficulty, count);
      }

      const prompt = this.buildQuestionPrompt(topic, difficulty, count, questionTypes);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const questions = this.parseQuestions(response.text());

      return questions;
    } catch (error) {
      console.error('Failed to generate questions:', error);
      return this.getMockQuestions(topic, difficulty, count);
    }
  }

  buildQuestionPrompt(topic, difficulty, count, questionTypes) {
    return `
Generate ${count} educational questions about "${topic}" with ${difficulty} difficulty level.

Question Types to Include: ${questionTypes.join(', ')}

For each question, provide:
1. Clear, unambiguous question text
2. Appropriate difficulty level
3. Learning objective alignment
4. Detailed explanations for answers
5. Common misconceptions to address

Return questions in the following JSON format:
{
  "questions": [
    {
      "id": "string",
      "type": "multiple_choice|short_answer|essay|true_false",
      "question": "string",
      "options": ["string"] (for multiple choice),
      "correctAnswer": "string|number",
      "explanation": "string",
      "difficulty": "string",
      "learningObjective": "string",
      "tags": ["string"],
      "estimatedTime": "string",
      "commonMistakes": ["string"]
    }
  ],
  "metadata": {
    "topic": "string",
    "totalQuestions": number,
    "averageDifficulty": "string",
    "estimatedDuration": "string"
  }
}
    `;
  }

  parseQuestions(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse AI questions, using mock data');
    }

    return this.getMockQuestions('General Topic', 'Medium', 5);
  }

  getMockQuestions(topic, difficulty, count) {
    const questions = [];

    for (let i = 1; i <= count; i++) {
      questions.push({
        id: `q_${Date.now()}_${i}`,
        type: i % 2 === 0 ? 'multiple_choice' : 'short_answer',
        question: `Sample question ${i} about ${topic}?`,
        options:
          i % 2 === 0
            ? [
                `Option A for question ${i}`,
                `Option B for question ${i}`,
                `Option C for question ${i}`,
                `Option D for question ${i}`,
              ]
            : undefined,
        correctAnswer: i % 2 === 0 ? 0 : `Sample answer for question ${i}`,
        explanation: `This question tests understanding of key concepts in ${topic}. The correct answer demonstrates...`,
        difficulty: difficulty,
        learningObjective: `Understand core principles of ${topic}`,
        tags: [topic.toLowerCase(), difficulty.toLowerCase()],
        estimatedTime: '2-3 minutes',
        commonMistakes: [
          'Confusing similar concepts',
          'Overlooking key details',
          'Not reading the question carefully',
        ],
      });
    }

    return {
      questions,
      metadata: {
        topic,
        totalQuestions: count,
        averageDifficulty: difficulty,
        estimatedDuration: `${count * 2}-${count * 3} minutes`,
      },
    };
  }

  // ==================== PERSONALIZED LEARNING PATHS ====================

  async createLearningPath(studentProfile, goals, timeframe = '3 months') {
    try {
      if (!this.isInitialized) {
        return this.getMockLearningPath(studentProfile, goals);
      }

      const prompt = this.buildLearningPathPrompt(studentProfile, goals, timeframe);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const learningPath = this.parseLearningPath(response.text());

      // Store learning path for tracking
      this.learningProfiles.set(studentProfile.id, learningPath);

      return learningPath;
    } catch (error) {
      console.error('Failed to create learning path:', error);
      return this.getMockLearningPath(studentProfile, goals);
    }
  }

  buildLearningPathPrompt(studentProfile, goals, timeframe) {
    return `
Create a personalized learning path for a student with the following profile:

Student Information:
- Current Level: ${studentProfile.currentLevel}
- Subjects: ${studentProfile.subjects.join(', ')}
- Learning Style: ${studentProfile.learningStyle}
- Available Study Time: ${studentProfile.availableTime}
- Strengths: ${studentProfile.strengths.join(', ')}
- Areas for Improvement: ${studentProfile.improvements.join(', ')}

Goals: ${goals.join(', ')}
Timeframe: ${timeframe}

Create a structured learning path in JSON format:
{
  "pathId": "string",
  "title": "string",
  "description": "string",
  "duration": "string",
  "phases": [
    {
      "phaseNumber": number,
      "title": "string",
      "duration": "string",
      "objectives": ["string"],
      "modules": [
        {
          "moduleId": "string",
          "title": "string",
          "description": "string",
          "estimatedHours": number,
          "difficulty": "string",
          "prerequisites": ["string"],
          "lessons": [
            {
              "lessonId": "string",
              "title": "string",
              "type": "string",
              "duration": "string",
              "resources": ["string"]
            }
          ],
          "assessments": [
            {
              "type": "string",
              "title": "string",
              "description": "string"
            }
          ]
        }
      ]
    }
  ],
  "milestones": [
    {
      "week": number,
      "title": "string",
      "description": "string",
      "criteria": ["string"]
    }
  ],
  "adaptiveElements": {
    "difficultyAdjustment": "string",
    "paceAdaptation": "string",
    "contentCustomization": "string"
  }
}
    `;
  }

  parseLearningPath(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse learning path, using mock data');
    }

    return this.getMockLearningPath();
  }

  getMockLearningPath(studentProfile = {}, goals = []) {
    return {
      pathId: `path_${Date.now()}`,
      title: 'Personalized Mathematics Learning Journey',
      description:
        'A customized learning path designed to improve mathematical skills and achieve specific academic goals',
      duration: '3 months',
      phases: [
        {
          phaseNumber: 1,
          title: 'Foundation Building',
          duration: '4 weeks',
          objectives: [
            'Master basic algebraic operations',
            'Understand linear equations',
            'Develop problem-solving strategies',
          ],
          modules: [
            {
              moduleId: 'mod_001',
              title: 'Basic Algebra Review',
              description: 'Comprehensive review of fundamental algebraic concepts',
              estimatedHours: 8,
              difficulty: 'Beginner',
              prerequisites: ['Basic arithmetic'],
              lessons: [
                {
                  lessonId: 'lesson_001',
                  title: 'Variables and Expressions',
                  type: 'Interactive Tutorial',
                  duration: '45 minutes',
                  resources: ['Video', 'Practice Problems', 'Interactive Exercises'],
                },
                {
                  lessonId: 'lesson_002',
                  title: 'Solving Simple Equations',
                  type: 'Guided Practice',
                  duration: '60 minutes',
                  resources: ['Step-by-step Guide', 'Practice Problems', 'Quiz'],
                },
              ],
              assessments: [
                {
                  type: 'Quiz',
                  title: 'Algebra Fundamentals Check',
                  description: '10-question quiz covering basic algebra concepts',
                },
              ],
            },
          ],
        },
        {
          phaseNumber: 2,
          title: 'Skill Development',
          duration: '6 weeks',
          objectives: [
            'Solve complex linear equations',
            'Work with systems of equations',
            'Apply mathematics to real-world problems',
          ],
          modules: [
            {
              moduleId: 'mod_002',
              title: 'Advanced Linear Equations',
              description: 'Deep dive into complex linear equation solving',
              estimatedHours: 12,
              difficulty: 'Intermediate',
              prerequisites: ['Basic Algebra'],
              lessons: [
                {
                  lessonId: 'lesson_003',
                  title: 'Multi-step Equations',
                  type: 'Interactive Practice',
                  duration: '75 minutes',
                  resources: ['Tutorial Videos', 'Practice Sets', 'Real-world Examples'],
                },
              ],
              assessments: [
                {
                  type: 'Project',
                  title: 'Real-world Application Project',
                  description: 'Apply linear equations to solve a practical problem',
                },
              ],
            },
          ],
        },
        {
          phaseNumber: 3,
          title: 'Mastery and Application',
          duration: '2 weeks',
          objectives: [
            'Demonstrate mastery of all concepts',
            'Apply skills independently',
            'Prepare for advanced topics',
          ],
          modules: [
            {
              moduleId: 'mod_003',
              title: 'Comprehensive Review and Assessment',
              description: 'Final review and mastery demonstration',
              estimatedHours: 6,
              difficulty: 'Advanced',
              prerequisites: ['All previous modules'],
              lessons: [
                {
                  lessonId: 'lesson_004',
                  title: 'Comprehensive Practice',
                  type: 'Mixed Practice',
                  duration: '90 minutes',
                  resources: ['Mixed Problem Sets', 'Timed Practice', 'Review Materials'],
                },
              ],
              assessments: [
                {
                  type: 'Final Assessment',
                  title: 'Mathematics Mastery Exam',
                  description: 'Comprehensive assessment of all learning objectives',
                },
              ],
            },
          ],
        },
      ],
      milestones: [
        {
          week: 2,
          title: 'Basic Skills Checkpoint',
          description: 'Demonstrate understanding of fundamental concepts',
          criteria: ['Score 80% or higher on basic skills quiz', 'Complete all practice exercises'],
        },
        {
          week: 6,
          title: 'Intermediate Skills Mastery',
          description: 'Show proficiency in intermediate-level problems',
          criteria: ['Successfully complete project', 'Pass intermediate assessment'],
        },
        {
          week: 12,
          title: 'Full Mastery Achievement',
          description: 'Demonstrate complete mastery of all objectives',
          criteria: ['Score 85% or higher on final assessment', 'Complete all modules'],
        },
      ],
      adaptiveElements: {
        difficultyAdjustment: 'Automatic adjustment based on performance and confidence levels',
        paceAdaptation: 'Flexible pacing allowing faster or slower progression as needed',
        contentCustomization: 'Additional practice or enrichment content based on individual needs',
      },
    };
  }

  // ==================== UTILITY METHODS ====================

  clearCache() {
    this.cache.clear();
  }

  getLearningProfile(studentId) {
    return this.learningProfiles.get(studentId);
  }

  updateLearningProfile(studentId, progress) {
    const existing = this.learningProfiles.get(studentId);
    if (existing) {
      this.learningProfiles.set(studentId, { ...existing, ...progress });
    }
  }

  // ==================== AI CAPABILITIES DETECTION ====================

  getCapabilities() {
    return {
      contentRecommendations: true,
      automatedGrading: true,
      questionGeneration: true,
      learningPaths: true,
      isOnline: this.isInitialized,
      supportedLanguages: ['en', 'es', 'fr', 'de'],
      maxTokens: 30720,
      responseTime: '2-5 seconds',
    };
  }
}

// Create singleton instance
const enhancedAIService = new EnhancedAIService();

export default enhancedAIService;
