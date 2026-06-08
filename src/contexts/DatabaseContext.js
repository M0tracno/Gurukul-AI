import env from '../config/env';
/**
 * Database Context
 * 
 * Provides access to database functions throughout the application.
 * In development mode, it uses mock data. In production, it connects to real database.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import MockDatabaseService, { getMockData } from '../utils/mockDatabaseService';

// Create the context
const DatabaseContext = createContext();

// Custom hook to use the database context
export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

// Database provider component
export const DatabaseProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [databaseService, setDatabaseService] = useState(null);
  const [data, setData] = useState({
    courses: [],
    students: [],
    assessments: [],
    notifications: [],
    analytics: null
  });

  // Initialize the database service
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setIsLoading(true);
        
        // For development/demo mode, use mock service
        if (env.USE_MOCK_SERVICES || env.USE_MOCK_DATA) {
          const mockService = new MockDatabaseService();
          setDatabaseService(mockService);
          
          // Load initial data
          setData({
            courses: await mockService.getData('courses'),
            students: await mockService.getData('students'),
            assessments: await mockService.getData('assessments'),
            notifications: await mockService.getData('notifications'),
            analytics: await mockService.getData('analytics')
          });
        } else {
          // In production, would connect to real database service
          console.log('Connecting to production database');
          // This is where you'd initialize your real database connection
          // For now, still use mock data even in production
          const mockService = new MockDatabaseService();
          setDatabaseService(mockService);
          
          // Load initial data
          setData({
            courses: await mockService.getData('courses'),
            students: await mockService.getData('students'),
            assessments: await mockService.getData('assessments'),
            notifications: await mockService.getData('notifications'),
            analytics: await mockService.getData('analytics')
          });
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Database initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    initializeDatabase();
  }, []);

  // Database operations
  const fetchData = async (dataType) => {
    if (!databaseService) return null;
    
    try {
      setIsLoading(true);
      const result = await databaseService.getData(dataType);
      
      // Update state for the specific data type
      setData(prevData => ({
        ...prevData,
        [dataType]: result
      }));
      
      setIsLoading(false);
      return result;
    } catch (err) {
      console.error(`Error fetching ${dataType}:`, err);
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  };
  
  const getItemById = async (dataType, id) => {
    if (!databaseService) return null;
    
    try {
      return await databaseService.getItemById(dataType, id);
    } catch (err) {
      console.error(`Error getting ${dataType} item:`, err);
      setError(err.message);
      return null;
    }
  };
  
  const addItem = async (dataType, item) => {
    if (!databaseService) return null;
    
    try {
      const result = await databaseService.addItem(dataType, item);
      
      // Update local state
      setData(prevData => ({
        ...prevData,
        [dataType]: [...prevData[dataType], result]
      }));
      
      return result;
    } catch (err) {
      console.error(`Error adding ${dataType} item:`, err);
      setError(err.message);
      return null;
    }
  };
  
  const updateItem = async (dataType, id, updates) => {
    if (!databaseService) return null;
    
    try {
      const result = await databaseService.updateItem(dataType, id, updates);
      
      // Update local state
      setData(prevData => ({
        ...prevData,
        [dataType]: prevData[dataType].map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      }));
      
      return result;
    } catch (err) {
      console.error(`Error updating ${dataType} item:`, err);
      setError(err.message);
      return null;
    }
  };
  
  const deleteItem = async (dataType, id) => {
    if (!databaseService) return null;
    
    try {
      const result = await databaseService.deleteItem(dataType, id);
      
      // Update local state
      setData(prevData => ({
        ...prevData,
        [dataType]: prevData[dataType].filter(item => item.id !== id)
      }));
      
      return result;
    } catch (err) {
      console.error(`Error deleting ${dataType} item:`, err);
      setError(err.message);
      return null;
    }
  };

  // Context value
  const contextValue = {
    // Data
    ...data,
    isLoading,
    error,
    
    // Methods
    fetchData,
    getItemById,
    addItem,
    updateItem,
    deleteItem,
    
    // Service
    databaseService
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
};

export default DatabaseContext;

