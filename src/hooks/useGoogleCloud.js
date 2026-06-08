import env from '../config/env';
import { useState, useEffect, useCallback, useRef } from 'react';
import googleCloudService from '../../services/googleCloudService';

// Hook for Google Cloud Storage operations
export const useCloudStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadFile = useCallback(async (file, bucketName, options = {}) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const fileName = `${Date.now()}-${file.name}`;
      const result = await googleCloudService.uploadFile(
        bucketName,
        fileName,
        buffer,
        {
          originalName: file.name,
          ...options
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, []);

  const downloadFile = useCallback(async (bucketName, fileName) => {
    setLoading(true);
    setError(null);

    try {
      const result = await googleCloudService.downloadFile(bucketName, fileName);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (bucketName, fileName) => {
    setLoading(true);
    setError(null);

    try {
      const result = await googleCloudService.deleteFile(bucketName, fileName);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listFiles = useCallback(async (bucketName, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const fileList = await googleCloudService.listFiles(bucketName, options);
      setFiles(fileList);
      return fileList;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    uploading,
    uploadProgress,
    files,
    loading,
    error,
    uploadFile,
    downloadFile,
    deleteFile,
    listFiles
  };
};

// Hook for Google Cloud AI services
export const useCloudAI = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});

  const translateText = useCallback(async (text, targetLanguage, sourceLanguage = null) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await googleCloudService.translateText(text, targetLanguage, sourceLanguage);
      setResults(prev => ({ ...prev, translation: result }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const synthesizeSpeech = useCallback(async (text, languageCode = 'en-US', voiceName = null) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await googleCloudService.synthesizeSpeech(text, languageCode, voiceName);
      setResults(prev => ({ ...prev, speech: result }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBuffer, languageCode = 'en-US') => {
    setProcessing(true);
    setError(null);

    try {
      const result = await googleCloudService.transcribeAudio(audioBuffer, languageCode);
      setResults(prev => ({ ...prev, transcription: result }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const analyzeImage = useCallback(async (imageBuffer) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await googleCloudService.analyzeImage(imageBuffer);
      setResults(prev => ({ ...prev, imageAnalysis: result }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const analyzeText = useCallback(async (text) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await googleCloudService.analyzeText(text);
      setResults(prev => ({ ...prev, textAnalysis: result }));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    error,
    results,
    translateText,
    synthesizeSpeech,
    transcribeAudio,
    analyzeImage,
    analyzeText
  };
};

// Hook for Google Cloud Pub/Sub messaging
export const useCloudMessaging = () => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const subscriptionRef = useRef(null);

  const publishMessage = useCallback(async (topicName, message, attributes = {}) => {
    setPublishing(true);
    setError(null);

    try {
      const result = await googleCloudService.publishMessage(topicName, message, attributes);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setPublishing(false);
    }
  }, []);

  const subscribeToTopic = useCallback(async (topicName, subscriptionName, messageHandler) => {
    setError(null);

    try {
      const subscription = await googleCloudService.createSubscription(topicName, subscriptionName);
      subscriptionRef.current = subscription;

      subscription.on('message', (message) => {
        const messageData = {
          id: message.id,
          data: JSON.parse(message.data.toString()),
          attributes: message.attributes,
          publishTime: message.publishTime,
          received: new Date()
        };

        setMessages(prev => [messageData, ...prev.slice(0, 99)]); // Keep last 100 messages
        
        if (messageHandler) {
          messageHandler(messageData);
        }

        message.ack();
      });

      subscription.on('error', (err) => {
        setError(err.message);
        console.error('Subscription error:', err);
      });

      return subscription;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.close();
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    publishing,
    error,
    messages,
    publishMessage,
    subscribeToTopic,
    unsubscribe
  };
};

// Hook for Google Cloud monitoring and health checks
export const useCloudMonitoring = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const performHealthCheck = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const health = await googleCloudService.healthCheck();
      setHealthStatus(health);
      return health;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiceInfo = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const info = await googleCloudService.getServiceInfo();
      setServiceInfo(info);
      return info;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logEvent = useCallback(async (severity, message, metadata = {}) => {
    setError(null);

    try {
      const result = await googleCloudService.logEvent(severity, message, metadata);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const createCustomMetric = useCallback(async (metricName, value, labels = {}) => {
    setError(null);

    try {
      const result = await googleCloudService.createCustomMetric(metricName, value, labels);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const startAutoHealthCheck = useCallback((intervalMs = 30000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      performHealthCheck();
    }, intervalMs);

    // Perform initial check
    performHealthCheck();
  }, [performHealthCheck]);

  const stopAutoHealthCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    getServiceInfo();
    
    return () => {
      stopAutoHealthCheck();
    };
  }, [getServiceInfo, stopAutoHealthCheck]);

  return {
    healthStatus,
    serviceInfo,
    loading,
    error,
    performHealthCheck,
    getServiceInfo,
    logEvent,
    createCustomMetric,
    startAutoHealthCheck,
    stopAutoHealthCheck
  };
};

// Hook for educational-specific Google Cloud features
export const useEducationalCloudFeatures = () => {
  const cloudStorage = useCloudStorage();
  const cloudAI = useCloudAI();
  const cloudMessaging = useCloudMessaging();
  const cloudMonitoring = useCloudMonitoring();

  // Assignment submission with auto-analysis
  const submitAssignment = useCallback(async (file, studentId, assignmentId, courseId) => {
    try {
      // Upload to appropriate bucket
      const bucketName = env.GOOGLE_CLOUD_STORAGE_BUCKET_MAIN;
      const uploadResult = await cloudStorage.uploadFile(file, bucketName, {
        metadata: {
          studentId,
          assignmentId,
          courseId,
          submissionType: 'assignment',
          submittedAt: new Date().toISOString()
        }
      });

      // If it's a text document, analyze it
      if (file.type.includes('text') || file.type.includes('document')) {
        const downloadResult = await cloudStorage.downloadFile(bucketName, uploadResult.fileName);
        const textContent = downloadResult.contents.toString();
        
        const textAnalysis = await cloudAI.analyzeText(textContent);
        
        // Log the submission event
        await cloudMonitoring.logEvent('INFO', 'Assignment submitted and analyzed', {
          studentId,
          assignmentId,
          courseId,
          analysisResults: textAnalysis
        });

        // Publish notification
        await cloudMessaging.publishMessage('assignment-submissions', {
          type: 'ASSIGNMENT_SUBMITTED',
          studentId,
          assignmentId,
          courseId,
          analysisResults: textAnalysis,
          uploadResult
        });

        return { uploadResult, textAnalysis };
      }

      return { uploadResult };
    } catch (error) {
      await cloudMonitoring.logEvent('ERROR', 'Assignment submission failed', {
        studentId,
        assignmentId,
        error: error.message
      });
      throw error;
    }
  }, [cloudStorage, cloudAI, cloudMessaging, cloudMonitoring]);

  // Multi-language content translation for accessibility
  const translateContent = useCallback(async (content, targetLanguages = ['es', 'fr', 'de']) => {
    try {
      const translations = {};
      
      for (const language of targetLanguages) {
        const result = await cloudAI.translateText(content, language);
        translations[language] = result;
      }

      await cloudMonitoring.logEvent('INFO', 'Content translated for accessibility', {
        originalLanguage: 'en',
        targetLanguages,
        contentLength: content.length
      });

      return translations;
    } catch (error) {
      await cloudMonitoring.logEvent('ERROR', 'Content translation failed', {
        error: error.message
      });
      throw error;
    }
  }, [cloudAI, cloudMonitoring]);

  // Generate audio content for accessibility
  const generateAudioContent = useCallback(async (text, languageCode = 'en-US') => {
    try {
      const audioResult = await cloudAI.synthesizeSpeech(text, languageCode);
      
      // Upload audio to storage
      const bucketName = env.GOOGLE_CLOUD_STORAGE_BUCKET_MEDIA;
      const audioFileName = `audio/${Date.now()}-speech.mp3`;
      
      const uploadResult = await cloudStorage.uploadFile(
        { name: audioFileName },
        bucketName,
        {
          metadata: {
            contentType: 'audio/mp3',
            generatedFrom: 'text-to-speech',
            languageCode,
            textLength: text.length
          }
        }
      );

      await cloudMonitoring.logEvent('INFO', 'Audio content generated', {
        languageCode,
        textLength: text.length,
        audioFile: audioFileName
      });

      return { audioResult, uploadResult };
    } catch (error) {
      await cloudMonitoring.logEvent('ERROR', 'Audio generation failed', {
        error: error.message
      });
      throw error;
    }
  }, [cloudAI, cloudStorage, cloudMonitoring]);

  return {
    ...cloudStorage,
    ...cloudAI,
    ...cloudMessaging,
    ...cloudMonitoring,
    submitAssignment,
    translateContent,
    generateAudioContent
  };
};

export default {
  useCloudStorage,
  useCloudAI,
  useCloudMessaging,
  useCloudMonitoring,
  useEducationalCloudFeatures
};
