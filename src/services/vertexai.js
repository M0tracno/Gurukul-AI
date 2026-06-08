import axios from '../../utils/mockApiService';
import env from '../config/env';

// Vertex AI API configuration
const API_KEY = env.VERTEX_API_KEY || 'YOUR_API_KEY';
const PROJECT_ID = env.GCP_PROJECT_ID || 'YOUR_PROJECT_ID';
const LOCATION = 'us-central1';
const MODEL_ID = 'gemini-pro';

// Base URL for Vertex AI API
const VERTEX_API_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`;

/**
 * Uses Vertex AI to evaluate an essay response against a rubric
 * @param {Object} params - Parameters for essay evaluation
 * @returns {Promise<Object>} Evaluation results
 */
export const evaluateEssayWithVertexAI = async (params) => {
  const { prompt, studentResponse, rubric } = params;
  
  if (process.env.NODE_ENV !== 'production') {
    // Return mock response for development
    return getMockEssayEvaluation(prompt, studentResponse, rubric);
  }
  
  try {
    const response = await axios.post(
      VERTEX_API_URL,
      {
        instances: [
          {
            content: constructEssayEvaluationPrompt(prompt, studentResponse, rubric)
          }
        ],
        parameters: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    // Parse the response from Vertex AI
    return parseEssayEvaluation(response.data);
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
    throw error;
  }
};

/**
 * Uses Vertex AI to grade multiple-choice or short answer questions
 * @param {Object} params - Parameters for question grading
 * @returns {Promise<Object>} Grading results
 */
export const gradeQuestionsWithVertexAI = async (params) => {
  const { questions, answers, answerKey } = params;
  
  if (process.env.NODE_ENV !== 'production') {
    // Return mock response for development
    return getMockQuestionGrading(questions, answers, answerKey);
  }
  
  try {
    const response = await axios.post(
      VERTEX_API_URL,
      {
        instances: [
          {
            content: constructQuestionGradingPrompt(questions, answers, answerKey)
          }
        ],
        parameters: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    // Parse the response from Vertex AI
    return parseQuestionGrading(response.data);
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
    throw error;
  }
};

/**
 * Uses Vertex AI to analyze student performance trends
 * @param {Object} params - Parameters for performance analysis
 * @returns {Promise<Object>} Analysis results
 */
export const analyzePerformanceWithVertexAI = async (params) => {
  const { studentId, assessmentHistory, subjectArea } = params;
  
  if (process.env.NODE_ENV !== 'production') {
    // Return mock response for development
    return getMockPerformanceAnalysis(studentId, assessmentHistory, subjectArea);
  }
  
  try {
    const response = await axios.post(
      VERTEX_API_URL,
      {
        instances: [
          {
            content: constructPerformanceAnalysisPrompt(studentId, assessmentHistory, subjectArea)
          }
        ],
        parameters: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    // Parse the response from Vertex AI
    return parsePerformanceAnalysis(response.data);
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
    throw error;
  }
};

// Prompt construction utilities
const constructEssayEvaluationPrompt = (prompt, studentResponse, rubric) => {
  return `
    You are an experienced educator tasked with evaluating a student's essay.

    ASSIGNMENT PROMPT:
    ${prompt}

    GRADING RUBRIC:
    ${JSON.stringify(rubric)}

    STUDENT RESPONSE:
    ${studentResponse}

    Please evaluate the student's essay according to the rubric criteria. For each criterion, provide:
    1. A score within the specified range
    2. Brief comments explaining the score
    3. Specific examples from the student's work
    4. Suggestions for improvement

    Format your response as a JSON object with the following structure:
    {
      "overallScore": (number),
      "maxPossibleScore": (number),
      "criteriaScores": [
        {
          "criterionName": (string),
          "score": (number),
          "maxScore": (number),
          "comments": (string),
          "examples": (string),
          "suggestions": (string)
        },
        ...
      ],
      "overallFeedback": (string),
      "strengths": [(string), (string), ...],
      "areasForImprovement": [(string), (string), ...]
    }
  `;
};

const constructQuestionGradingPrompt = (questions, answers, answerKey) => {
  return `
    You are an experienced educator tasked with grading a student's quiz.

    QUESTIONS:
    ${JSON.stringify(questions)}

    STUDENT ANSWERS:
    ${JSON.stringify(answers)}

    ANSWER KEY:
    ${JSON.stringify(answerKey)}

    Please grade each question, assigning points based on correctness. For multiple-choice questions, answers must match exactly. For short answer questions, evaluate the response for accuracy and completeness compared to the answer key.

    Format your response as a JSON object with the following structure:
    {
      "totalScore": (number),
      "maxPossibleScore": (number),
      "percentageScore": (number),
      "questionScores": [
        {
          "questionId": (string),
          "score": (number),
          "maxScore": (number),
          "feedback": (string)
        },
        ...
      ],
      "overallFeedback": (string)
    }
  `;
};

const constructPerformanceAnalysisPrompt = (studentId, assessmentHistory, subjectArea) => {
  return `
    You are an educational analytics expert tasked with analyzing a student's performance over time.

    STUDENT ID: ${studentId}
    SUBJECT AREA: ${subjectArea}

    ASSESSMENT HISTORY:
    ${JSON.stringify(assessmentHistory)}

    Please analyze the student's performance trends and provide actionable insights. Consider:
    1. Overall performance trajectory (improving, declining, stable)
    2. Areas of strength and weakness
    3. Patterns in types of questions or topics where the student excels or struggles
    4. Specific recommendations for improvement

    Format your response as a JSON object with the following structure:
    {
      "performanceTrend": (string),
      "averageScore": (number),
      "strengths": [(string), (string), ...],
      "weaknesses": [(string), (string), ...],
      "patterns": [(string), (string), ...],
      "recommendations": [(string), (string), ...],
      "suggestedResources": [(string), (string), ...],
      "analysis": (string)
    }
  `;
};

// Response parsing utilities
const parseEssayEvaluation = (response) => {
  try {
    // Extract text from Vertex AI response
    const text = response.predictions[0].content;
    
    // Parse JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse JSON from response');
  } catch (error) {
    console.error('Error parsing essay evaluation:', error);
    
    // Return a default structure in case of parsing error
    return {
      overallScore: 0,
      maxPossibleScore: 100,
      criteriaScores: [],
      overallFeedback: 'Error processing evaluation.',
      strengths: [],
      areasForImprovement: []
    };
  }
};

const parseQuestionGrading = (response) => {
  try {
    // Extract text from Vertex AI response
    const text = response.predictions[0].content;
    
    // Parse JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse JSON from response');
  } catch (error) {
    console.error('Error parsing question grading:', error);
    
    // Return a default structure in case of parsing error
    return {
      totalScore: 0,
      maxPossibleScore: 0,
      percentageScore: 0,
      questionScores: [],
      overallFeedback: 'Error processing grading.'
    };
  }
};

const parsePerformanceAnalysis = (response) => {
  try {
    // Extract text from Vertex AI response
    const text = response.predictions[0].content;
    
    // Parse JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse JSON from response');
  } catch (error) {
    console.error('Error parsing performance analysis:', error);
    
    // Return a default structure in case of parsing error
    return {
      performanceTrend: 'Unknown',
      averageScore: 0,
      strengths: [],
      weaknesses: [],
      patterns: [],
      recommendations: [],
      suggestedResources: [],
      analysis: 'Error processing analysis.'
    };
  }
};

// Mock responses for development
const getMockEssayEvaluation = (prompt, studentResponse, rubric) => {
  return {
    overallScore: 85,
    maxPossibleScore: 100,
    criteriaScores: [
      {
        criterionName: 'Content & Analysis',
        score: 18,
        maxScore: 20,
        comments: 'Strong argument with good supporting evidence, but could dig deeper in some areas.',
        examples: 'Effectively discusses the main theme, but misses some nuances in the author\'s intention.',
        suggestions: 'Consider exploring the historical context more thoroughly to strengthen your analysis.'
      },
      {
        criterionName: 'Organization & Structure',
        score: 17,
        maxScore: 20,
        comments: 'Well-organized with clear transitions between ideas.',
        examples: 'Strong introduction that sets up the thesis, logical progression of ideas in body paragraphs.',
        suggestions: 'The conclusion could more effectively synthesize the key points from the essay.'
      },
      {
        criterionName: 'Language & Style',
        score: 16,
        maxScore: 20,
        comments: 'Clear and academic language with some minor stylistic issues.',
        examples: 'Good use of domain-specific vocabulary, occasional wordiness in paragraphs 2 and 4.',
        suggestions: 'Work on varying sentence structure for more engaging prose.'
      },
      {
        criterionName: 'Evidence & Citations',
        score: 19,
        maxScore: 20,
        comments: 'Excellent use of textual evidence with proper citations.',
        examples: 'Effectively integrates quotations to support claims, correctly formatted citations.',
        suggestions: 'Consider incorporating a wider range of sources to strengthen your argument.'
      },
      {
        criterionName: 'Grammar & Mechanics',
        score: 15,
        maxScore: 20,
        comments: 'Generally correct grammar with a few minor errors.',
        examples: 'Some comma splices and subject-verb agreement issues in paragraphs 3 and 5.',
        suggestions: 'Review punctuation rules, especially comma usage and semicolons.'
      }
    ],
    overallFeedback: 'This is a well-written essay that demonstrates a strong understanding of the subject matter. Your analysis is thoughtful and supported by relevant evidence from the text. To improve, focus on deepening your analysis in certain areas, polishing your grammar, and strengthening your conclusion.',
    strengths: [
      'Clear and compelling thesis statement',
      'Effective use of textual evidence',
      'Logical organization of ideas',
      'Strong understanding of the main themes'
    ],
    areasForImprovement: [
      'Grammar and punctuation errors',
      'Deeper analysis of historical context',
      'More varied sentence structure',
      'Stronger conclusion that synthesizes key points'
    ]
  };
};

const getMockQuestionGrading = (questions, answers, answerKey) => {
  return {
    totalScore: 18,
    maxPossibleScore: 20,
    percentageScore: 90,
    questionScores: [
      {
        questionId: 'q1',
        score: 5,
        maxScore: 5,
        feedback: 'Correct! Your answer matches the expected definition perfectly.'
      },
      {
        questionId: 'q2',
        score: 4,
        maxScore: 5,
        feedback: 'Mostly correct, but you missed one key difference between merge sort and quick sort regarding space complexity.'
      },
      {
        questionId: 'q3',
        score: 5,
        maxScore: 5,
        feedback: 'Perfect implementation of BFS algorithm with correct handling of visited nodes.'
      },
      {
        questionId: 'q4',
        score: 4,
        maxScore: 5,
        feedback: 'Your answer is mostly correct, but you could have elaborated more on how dynamic programming optimizes the solution.'
      }
    ],
    overallFeedback: 'Excellent work! You've demonstrated a strong understanding of algorithms and data structures. Your explanations are clear and your implementations are correct. To further improve, focus on including all key aspects in your comparative answers and elaborating more on optimization techniques.'
  };
};

const getMockPerformanceAnalysis = (studentId, assessmentHistory, subjectArea) => {
  return {
    performanceTrend: 'Improving',
    averageScore: 82.5,
    strengths: [
      'Data structures implementation',
      'Algorithm complexity analysis',
      'Problem-solving approach'
    ],
    weaknesses: [
      'Dynamic programming concepts',
      'Advanced graph algorithms',
      'Mathematical proofs'
    ],
    patterns: [
      'Strong performance on coding implementation questions',
      'Weaker performance on theoretical questions',
      'Improvement in test scores over the last three assessments'
    ],
    recommendations: [
      'Focus on strengthening theoretical understanding of algorithms',
      'Practice more dynamic programming problems',
      'Review mathematical proof techniques',
      'Continue building on strengths in implementation'
    ],
    suggestedResources: [
      'Introduction to Algorithms (CLRS) - Chapter 15 on Dynamic Programming',
      'LeetCode problems tagged with "dynamic programming" (start with Easy, then Medium)',
      'Khan Academy courses on mathematical proofs',
      'MIT OpenCourseWare 6.006 - Advanced Data Structures'
    ],
    analysis: 'The student shows consistent improvement over time, with scores increasing from the 70s to the high 80s. Their practical implementation skills are excellent, but theoretical understanding, especially in dynamic programming and advanced graph algorithms, remains an area for growth. The student should focus on bridging the gap between practical coding skills and theoretical concepts to continue their positive trajectory.'
  };
}; 


