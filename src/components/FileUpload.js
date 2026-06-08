import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ 
  endpoint, 
  onSuccess, 
  onError, 
  allowedTypes = 'image/*,application/pdf',
  maxFileSize = 5, // in MB
  buttonText = 'Upload File',
  additionalFields = {}
}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Check file size
    const fileSizeInMB = selectedFile.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
      setError(`File size should not exceed ${maxFileSize}MB`);
      setFile(null);
      return;
    }
    
    setError('');
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Add any additional fields to the form data
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      setUploading(false);
      setFile(null);
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      setUploading(false);
      const errorMessage = err.response?.data?.message || 'Failed to upload file';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="file-input-container">
        <input
          type="file"
          id="file"
          accept={allowedTypes}
          onChange={handleFileChange}
          disabled={uploading}
          className="file-input"
        />
        <label htmlFor="file" className="file-label">
          {file ? file.name : 'Choose File'}
        </label>
      </div>

      {file && (
        <div className="file-details">
          <p>File: {file.name}</p>
          <p>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      )}

      {error && <div className="upload-error">{error}</div>}

      {uploading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="upload-button"
      >
        {uploading ? 'Uploading...' : buttonText}
      </button>

      <style jsx>{`
        .file-upload-container {
          margin: 20px 0;
          width: 100%;
        }
        .file-input-container {
          position: relative;
          margin-bottom: 10px;
        }
        .file-input {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .file-label {
          display: block;
          padding: 10px 15px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .file-details {
          margin: 10px 0;
          font-size: 14px;
          color: #666;
        }
        .upload-error {
          color: #d32f2f;
          margin: 10px 0;
          font-size: 14px;
        }
        .progress-container {
          height: 20px;
          width: 100%;
          background-color: #f5f5f5;
          border-radius: 4px;
          margin: 10px 0;
          position: relative;
        }
        .progress-bar {
          height: 100%;
          background-color: #4caf50;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #333;
          font-size: 12px;
        }
        .upload-button {
          padding: 10px 20px;
          background-color: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .upload-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default FileUpload; 


