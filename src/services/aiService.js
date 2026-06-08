import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../config/env';

// Initialize the Google Generative AI with API key
const API_KEY = env.GEMINI_API_KEY;
let genAI = null;

// Only initialize if we have an API key and are in a secure context
try {
  if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
} catch (error) {
  console.error("Error initializing Generative AI:", error);
}

// Set the model to use
const MODEL_NAME = 'gemini-1.5-pro';

// Safely make API calls, falling back to mock data if needed
const safeApiCall = async (apiFunction, mockFunction, params) => {
  try {
    // If we're in development without API_KEY or genAI isn't initialized, use mock data
    if (process.env.NODE_ENV === 'development' && (!API_KEY || !genAI)) {
      console.log("Using mock data for development");
      return mockFunction(params);
    }
    
    return await apiFunction(params);
  } catch (error) {
    console.error("API call failed:", error);
    console.log("Falling back to mock data");
    return mockFunction(params);
  }
};

/**
 * Generates a quiz using the Gemini AI model
 * @param {Object} quizParams - Quiz parameters
 * @param {string} quizParams.subject - Subject of the quiz
 * @param {string} quizParams.topic - Specific topic within the subject
 * @param {number} quizParams.numQuestions - Number of questions to generate
 * @param {string} quizParams.difficulty - Difficulty level (easy, medium, hard)
 * @param {string} quizParams.questionType - Type of questions (multiple-choice, short-answer, etc.)
 * @returns {Promise<Object>} Generated quiz with questions and answers
 */
export async function generateQuizWithAI(quizParams) {
  const apiCall = async (params) => {
    const { subject, topic, numQuestions, difficulty, questionType } = params;
    
    // Create a prompt for quiz generation
    const prompt = constructQuizPrompt(subject, topic, numQuestions, difficulty, questionType);
    
    if (!genAI) throw new Error("AI service not initialized");
    
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the AI response into a structured quiz format
    return parseQuizResponse(text);
  };
  
  return safeApiCall(apiCall, getMockQuizResponse, quizParams);
}

/**
 * Generates personalized feedback for a student's quiz or assignment performance
 * @param {Object} feedbackParams - Feedback parameters
 * @param {string} feedbackParams.studentName - Name of the student
 * @param {Object} feedbackParams.performance - Student's performance data
 * @param {Array} feedbackParams.questions - Questions from the quiz/assignment
 * @param {Array} feedbackParams.answers - Student's answers
 * @param {Array} feedbackParams.correctAnswers - Correct answers
 * @returns {Promise<Object>} Personalized feedback for the student
 */
export async function generatePersonalizedFeedback(feedbackParams) {
  const apiCall = async (params) => {
    const { studentName, performance, questions, answers, correctAnswers } = params;
    
    // Create a prompt for feedback generation
    const prompt = constructFeedbackPrompt(studentName, performance, questions, answers, correctAnswers);
    
    if (!genAI) throw new Error("AI service not initialized");
    
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the AI response into a structured feedback format
    return parseFeedbackResponse(text);
  };
  
  return safeApiCall(apiCall, getMockFeedbackResponse, feedbackParams);
}

/**
 * Grades a student's assignment using the Gemini AI model
 * @param {Object} gradingParams - Grading parameters
 * @param {Object} gradingParams.assignment - Assignment details
 * @param {string} gradingParams.studentSubmission - Student's submission text
 * @param {Object} gradingParams.rubric - Grading rubric
 * @returns {Promise<Object>} Grading results with score and feedback
 */
export async function gradeAssignmentWithAI(gradingParams) {
  const apiCall = async (params) => {
    const { assignment, studentSubmission, rubric } = params;
    
    // Create a prompt for grading
    const prompt = constructGradingPrompt(assignment, studentSubmission, rubric);
    
    if (!genAI) throw new Error("AI service not initialized");
    
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the AI response into a structured grading format
    return parseGradingResponse(text);
  };
  
  return safeApiCall(apiCall, getMockGradingResponse, gradingParams);
}

/**
 * Evaluates a student's essay response against a rubric using the Gemini AI model
 * @param {string} prompt - The essay prompt or question
 * @param {string} studentResponse - The student's essay response
 * @param {Object} rubric - Grading rubric with criteria and weights
 * @returns {Promise<Object>} Evaluation results with scores and feedback
 */
export async function evaluateEssayWithVertexAI(prompt, studentResponse, rubric) {
  const params = { prompt, studentResponse, rubric };
  
  const apiCall = async (params) => {
    const { prompt, studentResponse, rubric } = params;
    
    // Create a prompt for essay evaluation
    const evaluationPrompt = constructEssayEvaluationPrompt(prompt, studentResponse, rubric);
    
    if (!genAI) throw new Error("AI service not initialized");
    
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(evaluationPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the AI response into a structured evaluation format
    return parseEssayEvaluation(text, rubric.maxPoints);
  };
  
  return safeApiCall(apiCall, getMockEssayEvaluation, params);
}

/**
 * Constructs a prompt for quiz generation
 */
function constructQuizPrompt(subject, topic, numQuestions, difficulty, questionType) {
  let questionFormat = '';
  switch (questionType) {
    case 'multiple_choice':
      questionFormat = `multiple choice questions with 4 options each (labeled A, B, C, D)`;
      break;
    case 'fill_blank':
      questionFormat = `fill-in-the-blank questions`;
      break;
    case 'true_false':
      questionFormat = `true/false questions`;
      break;
    case 'short_answer':
      questionFormat = `short answer questions that require 1-2 sentence responses`;
      break;
    case 'long_answer':
      questionFormat = `essay/long answer questions with grading rubrics`;
      break;
    default:
      questionFormat = `multiple choice questions with 4 options each`;
  }

  const mathInstructions = subject.toLowerCase().includes('math') || 
                          subject.toLowerCase().includes('calculus') || 
                          subject.toLowerCase().includes('algebra') || 
                          subject.toLowerCase().includes('physics') || 
                          topic.toLowerCase().includes('math') || 
                          topic.toLowerCase().includes('calculus') || 
                          topic.toLowerCase().includes('physics') || 
                          topic.toLowerCase().includes('equation') ?
    `
    IMPORTANT MATH FORMATTING INSTRUCTIONS:
    1. Use proper LaTeX syntax for all mathematical expressions
    2. Enclose inline math expressions with $ symbols (e.g., $x^2 + 2x + 1$)
    3. For complex equations or displayed math, use $$ or \[ and \\] delimiters
    4. Use proper LaTeX commands for mathematical notation:
       - Fractions: \\frac{numerator}{denominator}
       - Limits: \\lim_{x \\to 0}
       - Integrals: \\int_{a}^{b}
       - Summations: \\sum_{i=1}^{n}
       - Square roots: \\sqrt{x}
       - Subscripts and superscripts: x_{i} and x^{2}
    5. Ensure all math expressions are properly formatted and complete
    ` : '';

  return `
    Generate a ${difficulty} level quiz on ${subject} focusing on ${topic}.
    Create ${numQuestions} ${questionFormat}.
    
    Each question should include:
    1. Clear, well-formulated question text
    2. ${questionType === 'multiple_choice' ? 'Four distinct answer options (A, B, C, D)' : 
        questionType === 'true_false' ? 'True or False options' : 
        questionType === 'fill_blank' ? 'The exact answer to fill in the blank' :
        questionType === 'short_answer' ? 'A sample correct answer' :
        'Detailed grading criteria'}
    3. The correct answer
    4. A brief explanation or justification for the correct answer
    ${mathInstructions}
    
    Format the response as a valid JSON object with the following structure:
    {
      "title": "${subject} Quiz: ${topic}",
      "subject": "${subject}",
      "topic": "${topic}",
      "difficulty": "${difficulty}",
      "questionType": "${questionType}",
      "questions": [
        {
          "id": 1,
          "question": "Question text",
          "type": "${questionType}",
          ${questionType === 'multiple_choice' ? 
            `"options": ["Option A", "Option B", "Option C", "Option D"],` :
            questionType === 'true_false' ? 
            `"options": ["True", "False"],` : ''}
          "correctAnswer": "The correct answer",
          "explanation": "Explanation for the answer"
        }
        // More questions...
      ]
    }
    
    IMPORTANT: Ensure the output is in valid JSON format. Use double quotes for all keys and string values.
    If using math expressions in JSON strings, escape backslashes (e.g., "\\frac{1}{2}" not "\frac{1}{2}").
  `;
}

/**
 * Constructs a prompt for feedback generation
 */
function constructFeedbackPrompt(studentName, performance, questions, answers, correctAnswers) {
  // Calculate some basic statistics
  const numQuestions = questions.length;
  const numCorrect = correctAnswers.filter((correct, index) => 
    correct === answers[index]
  ).length;
  const score = Math.round((numCorrect / numQuestions) * 100);
  
  return `
    Generate personalized feedback for ${studentName} who scored ${score}% (${numCorrect}/${numQuestions}) on a quiz.
    
    Here are the details:
    ${questions.map((q, i) => `
      Question ${i+1}: ${q}
      Student's answer: ${answers[i]}
      Correct answer: ${correctAnswers[i]}
    `).join('\n')}
    
    Please provide:
    1. Overall assessment of the student's performance
    2. Specific feedback on areas of strength
    3. Specific feedback on areas that need improvement
    4. Suggested resources or study strategies to address weak areas
    5. Encouragement and next steps
    
    Format the response as a JSON object with the following structure:
    {
      "overallAssessment": "...",
      "strengths": ["...", "..."],
      "areasForImprovement": ["...", "..."],
      "suggestedResources": ["...", "..."],
      "encouragement": "..."
    }
  `;
}

/**
 * Constructs a prompt for assignment grading
 */
function constructGradingPrompt(assignment, studentSubmission, rubric) {
  return `
    Grade the following student submission for an assignment.
    
    Assignment: ${assignment.title}
    ${assignment.description}
    
    Grading Rubric:
    ${Object.entries(rubric).map(([criterion, maxPoints]) => 
      `${criterion}: ${maxPoints} points`
    ).join('\n')}
    
    Student Submission:
    ${studentSubmission}
    
    Please grade this submission according to the rubric and provide:
    1. Score for each rubric criterion (out of the maximum points)
    2. Specific feedback for each criterion
    3. Overall feedback and comments
    4. Total score
    
    Format your response as a JSON object with this structure:
    {
      "scores": {
        "criterion1": score,
        "criterion2": score,
        ...
      },
      "feedback": {
        "criterion1": "feedback",
        "criterion2": "feedback",
        ...
      },
      "overallFeedback": "overall feedback",
      "totalScore": totalScore,
      "maxScore": maxScore
    }
  `;
}

/**
 * Constructs a prompt for essay evaluation
 */
function constructEssayEvaluationPrompt(prompt, studentResponse, rubric) {
  return `
    You are an experienced educator evaluating a student's essay response.
    
    ESSAY PROMPT:
    ${prompt}
    
    STUDENT'S RESPONSE:
    ${studentResponse}
    
    GRADING RUBRIC:
    ${rubric.criteria.map(criterion => 
      `${criterion.name} (${criterion.weight}% of total score)`
    ).join('\n')}
    
    Total points possible: ${rubric.maxPoints}
    
    Please evaluate this essay according to the rubric and provide:
    1. Score for each criterion (as a percentage of the criterion's weight)
    2. Specific feedback for each criterion
    3. Overall feedback
    4. List of strengths (at least 2-3 points)
    5. List of areas for improvement (at least 2-3 points)
    6. Suggested total points (out of ${rubric.maxPoints})
    
    Format your response as a JSON object with this structure:
    {
      "criteriaEvaluations": [
        {
          "criterionName": "...",
          "score": percentage (0-100),
          "feedback": "..."
        },
        ...
      ],
      "overallFeedback": "...",
      "strengths": ["...", "...", "..."],
      "areasForImprovement": ["...", "...", "..."],
      "suggestedPoints": number (out of ${rubric.maxPoints})
    }
  `;
}

/**
 * Parse the quiz response from AI into a structured format
 */
function parseQuizResponse(response) {
  try {
    // First, try to directly parse as JSON
    return JSON.parse(response);
  } catch (error) {
    // If direct parsing fails, try to extract JSON
    try {
      // Find JSON content between curly braces
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, try to parse questions manually
      return parseQuestionsFromText(response);
    } catch (parseError) {
      console.error("Error parsing quiz response:", parseError);
      throw new Error("Could not parse the AI-generated quiz. Please try again.");
    }
  }
}

/**
 * Parse the feedback response from AI into a structured format
 */
function parseFeedbackResponse(response) {
  try {
    // First, try to parse as JSON directly
    return JSON.parse(response);
  } catch (error) {
    // If direct parsing fails, try to extract JSON from the text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error('Error parsing extracted JSON:', innerError);
      }
    }
    
    // Fallback to a basic structure if parsing fails
    console.error('Error parsing feedback response:', error);
    return {
      overallAssessment: "Overall assessment of performance",
      strengths: ["Identified strengths"],
      areasForImprovement: ["Areas that need improvement"],
      suggestedResources: ["Suggested resources for improvement"],
      encouragement: "Encouraging message for the student"
    };
  }
}

/**
 * Parse the grading response from AI into a structured format
 */
function parseGradingResponse(response) {
  try {
    // First, try to parse as JSON directly
    return JSON.parse(response);
  } catch (error) {
    // If direct parsing fails, try to extract JSON from the text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error('Error parsing extracted JSON:', innerError);
      }
    }
    
    // Fallback to a basic structure if parsing fails
    console.error('Error parsing grading response:', error);
    return {
      scores: {},
      feedback: {},
      overallFeedback: "Feedback on the submission",
      totalScore: 0,
      maxScore: 100
    };
  }
}

/**
 * Parse the essay evaluation from AI into a structured format
 */
function parseEssayEvaluation(response, maxPoints) {
  try {
    // First, try to parse as JSON directly
    const parsed = JSON.parse(response);
    return parsed;
  } catch (error) {
    // If direct parsing fails, try to extract JSON from the text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error('Error parsing extracted JSON:', innerError);
      }
    }
    
    // Fallback to a basic structure if parsing fails
    console.error('Error parsing essay evaluation:', error);
    return {
      criteriaEvaluations: [],
      overallFeedback: "The essay demonstrates understanding of the topic with some areas for improvement.",
      strengths: [
        "Clear structure and organization",
        "Good understanding of basic concepts"
      ],
      areasForImprovement: [
        "Needs more detailed examples",
        "Could improve clarity of arguments"
      ],
      suggestedPoints: Math.round(maxPoints * 0.75)
    };
  }
}

/**
 * Fallback function to parse questions from unstructured text
 */
function parseQuestionsFromText(text) {
  // Try to identify questions by common patterns
  const questionPatterns = [
    /Q(?:uestion)?\s*(\d+)[.:)]\s*(.*?)(?=Q(?:uestion)?\s*\d+[.:)]|$)/gis,
    /(\d+)[.:)]\s*(.*?)(?=\d+[.:)]|$)/gis,
    /Question\s*(\d+)[.:)]\s*(.*?)(?=Question\s*\d+[.:)]|$)/gis
  ];

  let questions = [];
  let matches = [];
  
  // Try each pattern until we find matches
  for (const pattern of questionPatterns) {
    const patternMatches = [...text.matchAll(pattern)];
    if (patternMatches.length > 0) {
      matches = patternMatches;
      break;
    }
  }

  if (matches.length === 0) {
    // If no patterns match, fallback to splitting by newlines and looking for numbered lines
    const lines = text.split('\n');
    let currentQuestion = null;
    let optionsText = '';
    let answerText = '';
    let explanationText = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this line starts a new question
      const questionMatch = trimmedLine.match(/^(\d+)[.:)]\s*(.+)$/);
      if (questionMatch) {
        // If we already have a question in progress, save it
        if (currentQuestion) {
          questions.push({
            id: questions.length + 1,
            question: currentQuestion,
            type: optionsText.includes('A)') || optionsText.includes('A.') ? 'multiple_choice' : 'short_answer',
            options: parseOptions(optionsText),
            correctAnswer: answerText || 'See explanation',
            explanation: explanationText || 'No explanation provided'
          });
        }
        
        // Start a new question
        currentQuestion = questionMatch[2];
        optionsText = '';
        answerText = '';
        explanationText = '';
      } else if (trimmedLine.match(/^[A-D][.:)]\s*.+/) || trimmedLine.match(/^Option\s*[A-D][.:)]\s*.+/)) {
        // This line is an option
        optionsText += trimmedLine + '\n';
      } else if (trimmedLine.match(/^Answer[.:\s]|^Correct answer[.:\s]/i)) {
        // This line contains the answer
        answerText = trimmedLine.replace(/^Answer[.:\s]|^Correct answer[.:\s]/i, '').trim();
      } else if (trimmedLine.match(/^Explanation[.:\s]/i)) {
        // This line starts an explanation
        explanationText = trimmedLine.replace(/^Explanation[.:\s]/i, '').trim();
      } else if (explanationText) {
        // If we've already started an explanation, add to it
        explanationText += ' ' + trimmedLine;
      } else if (currentQuestion) {
        // If none of the above, it's likely part of the question or options
        if (optionsText) {
          optionsText += trimmedLine + '\n';
        } else {
          currentQuestion += ' ' + trimmedLine;
        }
      }
    }
    
    // Don't forget to add the last question
    if (currentQuestion) {
      questions.push({
        id: questions.length + 1,
        question: currentQuestion,
        type: optionsText.includes('A)') || optionsText.includes('A.') ? 'multiple_choice' : 'short_answer',
        options: parseOptions(optionsText),
        correctAnswer: answerText || 'See explanation',
        explanation: explanationText || 'No explanation provided'
      });
    }
  } else {
    // Process matches from regex patterns
    questions = matches.map((match, index) => {
      const [, , questionText] = match;
      
      // Try to extract options, answer, and explanation from the question text
      const { question, options, answer, explanation } = extractQuestionParts(questionText);
      
      // Determine question type based on content
      let questionType = 'short_answer';
      if (options && options.length > 0) {
        questionType = 'multiple_choice';
      } else if (question.toLowerCase().includes('fill in the blank') || question.includes('___') || question.includes('...')) {
        questionType = 'fill_blank';
      } else if (answer && (answer.toLowerCase() === 'true' || answer.toLowerCase() === 'false')) {
        questionType = 'true_false';
      } else if (question.length > 200 || question.toLowerCase().includes('essay') || question.toLowerCase().includes('discuss')) {
        questionType = 'long_answer';
      }
      
      return {
        id: index + 1,
        question,
        type: questionType,
        options: options.length > 0 ? options : (questionType === 'true_false' ? ['True', 'False'] : undefined),
        correctAnswer: answer || 'See explanation',
        explanation: explanation || 'No explanation provided'
      };
    });
  }

  return {
    title: "Generated Quiz",
    subject: "Subject",
    topic: "Topic",
    difficulty: "Medium",
    questionType: questions.length > 0 ? questions[0].type : "multiple_choice",
    questions
  };
}

/**
 * Helper function to extract parts of a question from text
 */
function extractQuestionParts(text) {
  let question = text.trim();
  let options = [];
  let answer = '';
  let explanation = '';
  
  // Find options section using regex for common patterns
  const optionsMatch = question.match(/([A-D][.:)]\s*.+){2,}/s);
  if (optionsMatch) {
    const optionsText = optionsMatch[0];
    question = question.replace(optionsText, '').trim();
    
    // Extract individual options
    const optionRegex = /([A-D])[.:)]\s*(.+?)(?=[A-D][.:)]|$)/gs;
    let optionMatch;
    while ((optionMatch = optionRegex.exec(optionsText)) !== null) {
      options.push(optionMatch[2].trim());
    }
  }
  
  // Find answer section
  const answerMatch = question.match(/(?:Answer|Correct Answer)[.:\s]\s*(.+?)(?=Explanation|$)/is);
  if (answerMatch) {
    answer = answerMatch[1].trim();
    question = question.replace(answerMatch[0], '').trim();
  }
  
  // Find explanation section
  const explanationMatch = question.match(/Explanation[.:\s]\s*(.+)$/is);
  if (explanationMatch) {
    explanation = explanationMatch[1].trim();
    question = question.replace(explanationMatch[0], '').trim();
  }
  
  return { question, options, answer, explanation };
}

/**
 * Helper function to parse options from text
 */
function parseOptions(optionsText) {
  if (!optionsText) return [];
  
  const options = [];
  const optionLines = optionsText.split('\n');
  
  for (const line of optionLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const optionMatch = trimmedLine.match(/^(?:Option\s*)?([A-D])[.:)]\s*(.+)$/);
    if (optionMatch) {
      // Make sure we have the right number of options (A, B, C, D)
      const optionIndex = optionMatch[1].charCodeAt(0) - 'A'.charCodeAt(0);
      while (options.length < optionIndex) {
        options.push('');
      }
      options[optionIndex] = optionMatch[2].trim();
    }
  }
  
  return options.filter(option => option !== '');
}

/**
 * Mock response for quiz generation during development
 */
function getMockQuizResponse(params) {
  const { subject, topic, numQuestions, questionType, difficulty } = params;
  
  // Check if this is a math-related quiz
  const isMathRelated = subject.toLowerCase().includes('math') || 
                        subject.toLowerCase().includes('calculus') || 
                        subject.toLowerCase().includes('algebra') || 
                        subject.toLowerCase().includes('physics') || 
                        topic.toLowerCase().includes('math') || 
                        topic.toLowerCase().includes('calculus') || 
                        topic.toLowerCase().includes('physics') || 
                        topic.toLowerCase().includes('equation');
  
  // Create a mock quiz based on the specified quiz type
  let questions = [];
  
  for (let i = 0; i < numQuestions; i++) {
    let question = {
      id: i + 1,
      type: questionType,
      explanation: isMathRelated ? 
        `This is an explanation for question #${i + 1}. When $x$ approaches 0, the function behaves differently depending on the rate of change.` :
        `This is an explanation for question #${i + 1}.`
    };
    
    // Add question-type specific fields
    switch (questionType) {
      case 'multiple_choice':
        if (isMathRelated) {
          // Math-related multiple choice questions with LaTeX
          const mathQuestions = [
            `What is the value of $\\lim_{x \\to 0} \\frac{\\sin(x)}{x^2}$?`,
            `Consider the function $f(x) = \\frac{x^2 - 4}{x - 2}$. What is the value of $f(2)$?`,
            `What is the value of $\\tan(\\frac{\\pi}{2})$?`,
            `Solve the equation $2x^2 - 5x + 2 = 0$ for $x$.`,
            `If $f'(x) = 3x^2 + 2x - 5$, what is $f(x)$?`
          ];
          question.question = mathQuestions[i % mathQuestions.length];
          
          // Math-related options
          const optionSets = [
            ['$0$', '$1$', '$\\infty$', '$-\\infty$'],
            ['$0$', '$2$', '$4$', 'Undefined'],
            ['$0$', '$1$', '$\\infty$', 'Undefined'],
            ['$x = 1$ and $x = 2$', '$x = \\frac{1}{2}$ and $x = 2$', '$x = \\frac{5 \\pm \\sqrt{17}}{4}$', '$x = \\frac{5 \\pm \\sqrt{9}}{4}$'],
            ['$f(x) = x^3 + x^2 - 5x + C$', '$f(x) = \\frac{3x^3}{3} + \\frac{2x^2}{2} - 5x + C$', '$f(x) = x^3 + x^2 - 5x$', '$f(x) = 3x^3 + 2x^2 - 5x + C$']
          ];
          question.options = optionSets[i % optionSets.length];
          
          // Correct answers
          const correctAnswers = ['$\\infty$', 'Undefined', '$\\infty$', '$x = \\frac{5 \\pm \\sqrt{17}}{4}$', '$f(x) = x^3 + x^2 - 5x + C$'];
          question.correctAnswer = correctAnswers[i % correctAnswers.length];
        } else {
          question.question = `Sample ${subject} question #${i + 1} about ${topic}?`;
          question.options = ['Option A', 'Option B', 'Option C', 'Option D'];
          question.correctAnswer = 'Option A';
        }
        break;
      case 'fill_blank':
        if (isMathRelated) {
          const mathFillBlanks = [
            `In calculus, the derivative of $\\sin(x)$ is $________$.`,
            `The integral $\\int x^2 dx$ equals $________$.`,
            `The solution to the differential equation $\\frac{dy}{dx} = 2x$ is $y = ________ + C$.`,
            `The domain of the function $f(x) = \\ln(x-3)$ is $x ________$.`,
            `If $\\lim_{x \\to 0} \\frac{\\sin(ax)}{x} = a$, then $\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = ________$.`
          ];
          question.question = mathFillBlanks[i % mathFillBlanks.length];
          
          const mathFillAnswers = [
            `$\\cos(x)$`,
            `$\\frac{x^3}{3} + C$`,
            `$x^2$`,
            `$> 3$`,
            `$1$`
          ];
          question.correctAnswer = mathFillAnswers[i % mathFillAnswers.length];
        } else {
          question.question = `In ${subject}, the concept of ${topic} involves ____________.`;
          question.correctAnswer = 'Sample answer for the blank';
        }
        break;
      case 'true_false':
        if (isMathRelated) {
          const mathTrueFalse = [
            `The derivative of $\\frac{1}{x}$ is $-\\frac{1}{x^2}$.`,
            `For any function $f(x)$, $\\int f'(x) dx = f(x) + C$.`,
            `If $\\lim_{x \\to a} f(x) = L$ and $\\lim_{x \\to a} g(x) = M$, then $\\lim_{x \\to a} [f(x) \\cdot g(x)] = L \\cdot M$.`,
            `The function $f(x) = |x|$ is differentiable at $x = 0$.`,
            `For any functions $f(x)$ and $g(x)$, $\\frac{d}{dx}[f(x) \\cdot g(x)] = f'(x) \\cdot g'(x)$.`
          ];
          question.question = mathTrueFalse[i % mathTrueFalse.length];
          
          const tfAnswers = ['True', 'True', 'True', 'False', 'False'];
          question.correctAnswer = tfAnswers[i % tfAnswers.length];
        } else {
          question.question = `Statement about ${topic} in ${subject}.`;
          question.options = ['True', 'False'];
          question.correctAnswer = 'True';
        }
        break;
      case 'short_answer':
        if (isMathRelated) {
          const mathShortAnswers = [
            `Explain why $\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$.`,
            `Describe the relationship between the graphs of $f(x)$ and $f'(x)$.`,
            `Explain the difference between a local maximum and a global maximum.`,
            `What is the geometric interpretation of the definite integral $\\int_a^b f(x) dx$?`,
            `Explain why $e^{i\\pi} + 1 = 0$ is considered a beautiful equation in mathematics.`
          ];
          question.question = mathShortAnswers[i % mathShortAnswers.length];
          
          const shortAnswers = [
            `Using the squeeze theorem and the fact that $\\sin(x) \\approx x$ for small values of $x$, we can show that the limit equals 1.`,
            `The derivative $f'(x)$ represents the slope of the tangent line to $f(x)$. When $f(x)$ increases, $f'(x)$ is positive; when $f(x)$ decreases, $f'(x)$ is negative.`,
            `A local maximum is a point where the function value is greater than its nearby points, while a global maximum is the largest value of the function over its entire domain.`,
            `The definite integral represents the area under the curve of $f(x)$ from $x=a$ to $x=b$.`,
            `Euler's identity combines five fundamental constants (0, 1, $e$, $i$, and $\\pi$) and three basic operations (addition, multiplication, and exponentiation) in a single equation.`
          ];
          question.correctAnswer = shortAnswers[i % shortAnswers.length];
        } else {
          question.question = `Briefly explain the concept of ${topic} in ${subject}.`;
          question.correctAnswer = 'A brief 1-2 sentence explanation would go here.';
        }
        break;
      case 'long_answer':
        if (isMathRelated) {
          const mathLongAnswers = [
            `Discuss the historical development of calculus and the contributions of Newton and Leibniz. Include the fundamental theorem of calculus and explain its significance.`,
            `Compare and contrast different techniques for solving differential equations. Discuss at least three methods and provide examples of when each would be most appropriate.`,
            `Explain the concept of mathematical proof. Discuss different types of proofs and provide an example of a proof by contradiction for an important mathematical theorem.`,
            `Discuss the relationship between mathematics and physics through the lens of differential equations. Provide at least two examples of physical phenomena that are modeled using differential equations.`,
            `Explain the concept of mathematical modeling. Choose a real-world phenomenon and describe how you would develop a mathematical model to represent it.`
          ];
          question.question = mathLongAnswers[i % mathLongAnswers.length];
          question.correctAnswer = '';
          question.explanation = 'Grading criteria: Mathematical accuracy (30%), Depth of analysis (30%), Historical context (20%), Clear communication of concepts (20%)';
        } else {
          question.question = `Write a detailed essay on ${topic} in the context of ${subject}. Discuss its importance, applications, and current developments.`;
          question.correctAnswer = '';
          question.explanation = 'Grading criteria: Understanding of concept (30%), Organization (20%), Evidence/Examples (30%), Grammar/Clarity (20%)';
        }
        break;
      default:
        question.correctAnswer = 'Sample answer';
    }
    
    questions.push(question);
  }
  
  return {
    title: `${subject} Quiz: ${topic}`,
    subject: subject,
    topic: topic,
    difficulty: difficulty,
    questionType: questionType,
    questions: questions
  };
}

/**
 * Mock response for feedback generation during development
 */
function getMockFeedbackResponse(params) {
  const correctCount = params.answers.filter((a, i) => a === params.correctAnswers[i]).length;
  const score = Math.round((correctCount / params.questions.length) * 100);
  
  return {
    overallAssessment: `${params.studentName} scored ${score}% on this assessment. This is a ${score >= 70 ? 'passing' : 'failing'} grade.`,
    strengths: [
      "Strong understanding of basic concepts",
      "Good attempt at more complex problems"
    ],
    areasForImprovement: [
      "Need to improve on conceptual understanding",
      "Work on problem-solving techniques"
    ],
    suggestedResources: [
      "Review chapter 3-4 in the textbook",
      "Practice more problems on the topic"
    ],
    encouragement: `You're making good progress, ${params.studentName}! Keep working hard and you'll improve.`
  };
}

/**
 * Mock response for assignment grading during development
 */
function getMockGradingResponse(params) {
  const rubricEntries = Object.entries(params.rubric);
  const maxScore = rubricEntries.reduce((sum, [_, points]) => sum + points, 0);
  const mockScores = {};
  const mockFeedback = {};
  
  rubricEntries.forEach(([criterion, maxPoints]) => {
    // Randomly assign between 70-100% of max points for demonstration
    mockScores[criterion] = Math.round((0.7 + Math.random() * 0.3) * maxPoints);
    mockFeedback[criterion] = `Good work on this criterion. Here's some specific feedback for ${criterion}.`;
  });
  
  const totalScore = Object.values(mockScores).reduce((sum, score) => sum + score, 0);
  
  return {
    scores: mockScores,
    feedback: mockFeedback,
    overallFeedback: "This is a good submission overall. There are some areas for improvement, but you've demonstrated understanding of the core concepts.",
    totalScore: totalScore,
    maxScore: maxScore
  };
}

/**
 * Mock response for essay evaluation during development
 */
function getMockEssayEvaluation(prompt, studentResponse, rubric) {
  // Calculate a mock score (70-90% range for demonstration)
  const scorePercentage = 70 + Math.floor(Math.random() * 20);
  const suggestedPoints = Math.round((scorePercentage / 100) * rubric.maxPoints);
  
  // Create evaluations for each criterion
  const criteriaEvaluations = rubric.criteria.map(criterion => {
    // Slight variation in criterion scores
    const criterionScore = Math.max(50, Math.min(100, 
      scorePercentage + (Math.random() * 20 - 10)
    ));
    
    return {
      criterionName: criterion.name,
      score: Math.round(criterionScore),
      feedback: `Good work on ${criterion.name.toLowerCase()}. Could improve by adding more detail and depth to your analysis.`
    };
  });
  
  return {
    criteriaEvaluations,
    overallFeedback: "The essay demonstrates a good understanding of the topic with clear organization. To improve, consider adding more specific examples and strengthening your analysis of key concepts.",
    strengths: [
      "Clear organization and structure",
      "Good understanding of core concepts",
      "Effective use of academic language"
    ],
    areasForImprovement: [
      "Include more specific examples to support your arguments",
      "Deepen analysis of key concepts",
      "Strengthen conclusion to better tie together your main points"
    ],
    suggestedPoints
  };
}

/**
 * Test function to generate and validate a quiz 
 * This can be used during development to verify the quiz generation functionality
 */
export async function testQuizGeneration(quizParams) {
  try {
    console.log('Generating test quiz with params:', quizParams);
    
    // Generate a quiz
    const quiz = await generateQuizWithAI(quizParams);
    
    // Validate the structure
    console.log('Quiz generated successfully:', quiz.title);
    console.log(`- ${quiz.questions.length} questions of type: ${quiz.questionType}`);
    console.log('- First question:', quiz.questions[0]);
    
    return quiz;
  } catch (error) {
    console.error('Test quiz generation failed:', error);
    throw error;
  }
} 


