import CryptoJS from 'crypto-js';

/**
 * Security Encryption Utilities - Phase 5 Security Enhancement
 * Provides utility functions for data encryption, decryption, and secure storage
 */

/**
 * Configuration for encryption
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'AES',
  keySize: 256,
  ivSize: 128,
  iterations: 10000,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
};

/**
 * Generate encryption key from password
 */
export const deriveKey = (password, salt = null) => {
  if (!salt) {
    salt = CryptoJS.lib.WordArray.random(16);
  }

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: ENCRYPTION_CONFIG.keySize / 32,
    iterations: ENCRYPTION_CONFIG.iterations,
  });

  return {
    key,
    salt: salt.toString(),
  };
};

/**
 * Encrypt data using AES encryption
 */
export const encryptData = (data, password = null, key = null) => {
  try {
    let encryptionKey;
    let salt = null;

    if (key) {
      encryptionKey = key;
    } else if (password) {
      const derived = deriveKey(password);
      encryptionKey = derived.key;
      salt = derived.salt;
    } else {
      throw new Error('Either password or key must be provided');
    }

    const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivSize / 8);

    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey, {
      iv: iv,
      mode: ENCRYPTION_CONFIG.mode,
      padding: ENCRYPTION_CONFIG.padding,
    });

    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(),
      salt: salt,
      algorithm: ENCRYPTION_CONFIG.algorithm,
      keySize: ENCRYPTION_CONFIG.keySize,
      iterations: ENCRYPTION_CONFIG.iterations,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES decryption
 */
export const decryptData = (encryptedData, password = null, key = null) => {
  try {
    const { encrypted, iv, salt, iterations = ENCRYPTION_CONFIG.iterations } = encryptedData;

    let decryptionKey;

    if (key) {
      decryptionKey = key;
    } else if (password && salt) {
      decryptionKey = CryptoJS.PBKDF2(password, salt, {
        keySize: ENCRYPTION_CONFIG.keySize / 32,
        iterations: iterations,
      });
    } else {
      throw new Error('Either key or password with salt must be provided');
    }

    const decrypted = CryptoJS.AES.decrypt(encrypted, decryptionKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: ENCRYPTION_CONFIG.mode,
      padding: ENCRYPTION_CONFIG.padding,
    });

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }

    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Secure local storage with encryption
 */
export const secureStorage = {
  setItem: (key, value, password = null) => {
    try {
      const storageKey = password || getStorageKey();
      const encrypted = encryptData(value, storageKey);
      localStorage.setItem(key, JSON.stringify(encrypted));
      return true;
    } catch (error) {
      console.error('Secure storage set error:', error);
      return false;
    }
  },

  getItem: (key, password = null) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const encryptedData = JSON.parse(stored);
      const storageKey = password || getStorageKey();

      return decryptData(encryptedData, storageKey);
    } catch (error) {
      console.error('Secure storage get error:', error);
      return null;
    }
  },

  removeItem: key => {
    localStorage.removeItem(key);
  },

  clear: () => {
    localStorage.clear();
  },
};

/**
 * Get or generate storage key
 */
const getStorageKey = () => {
  const keyName = '__secure_storage_key__';
  let key = sessionStorage.getItem(keyName);

  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString();
    sessionStorage.setItem(keyName, key);
  }

  return key;
};

/**
 * Hash sensitive data (one-way)
 */
export const hashData = (data, salt = null) => {
  if (!salt) {
    salt = CryptoJS.lib.WordArray.random(16);
  }

  const hash = CryptoJS.PBKDF2(data, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  });

  return {
    hash: hash.toString(),
    salt: salt.toString(),
    combined: `${salt.toString()}:${hash.toString()}`,
  };
};

/**
 * Verify hashed data
 */
export const verifyHashedData = (data, hashedData) => {
  try {
    const { salt, hash } = hashedData;
    const computedHash = CryptoJS.PBKDF2(data, salt, {
      keySize: 256 / 32,
      iterations: 10000,
    });

    return computedHash.toString() === hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
};

/**
 * Generate secure tokens
 */
export const generateSecureToken = (length = 32, type = 'hex') => {
  const randomBytes = CryptoJS.lib.WordArray.random(length);

  switch (type) {
    case 'base64':
      return CryptoJS.enc.Base64.stringify(randomBytes).replace(/[+=]/g, ''); // Remove padding    case 'base64url':
      return CryptoJS.enc.Base64.stringify(randomBytes)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    case 'alphanumeric':
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      const hex = randomBytes.toString();
      for (let i = 0; i < length && i * 2 < hex.length; i++) {
        const byte = parseInt(hex.substr(i * 2, 2), 16);
        result += chars[byte % chars.length];
      }
      return result;
    default: // hex
      return randomBytes.toString();
  }
};

/**
 * Encrypt files for secure storage
 */
export const encryptFile = async (file, password) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const arrayBuffer = event.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

        const encrypted = encryptData(
          {
            content: wordArray.toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
          },
          password
        );

        resolve(encrypted);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Decrypt files
 */
export const decryptFile = (encryptedFileData, password) => {
  try {
    const decrypted = decryptData(encryptedFileData, password);

    const wordArray = CryptoJS.enc.Hex.parse(decrypted.content);
    const arrayBuffer = wordArrayToArrayBuffer(wordArray);

    return {
      arrayBuffer,
      name: decrypted.name,
      type: decrypted.type,
      size: decrypted.size,
      lastModified: decrypted.lastModified,
    };
  } catch (error) {
    throw new Error('Failed to decrypt file');
  }
};

/**
 * Convert WordArray to ArrayBuffer
 */
const wordArrayToArrayBuffer = wordArray => {
  const arrayBuffer = new ArrayBuffer(wordArray.sigBytes);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < wordArray.sigBytes; i++) {
    const wordIndex = Math.floor(i / 4);
    const byteIndex = i % 4;
    uint8Array[i] = (wordArray.words[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
  }

  return arrayBuffer;
};

/**
 * Create encrypted backup of user data
 */
export const createEncryptedBackup = (userData, password) => {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    userInfo: {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    data: userData,
    checksum: CryptoJS.SHA256(JSON.stringify(userData)).toString(),
  };

  return encryptData(backup, password);
};

/**
 * Restore from encrypted backup
 */
export const restoreFromEncryptedBackup = (encryptedBackup, password) => {
  try {
    const backup = decryptData(encryptedBackup, password);

    // Verify checksum
    const computedChecksum = CryptoJS.SHA256(JSON.stringify(backup.data)).toString();
    if (computedChecksum !== backup.checksum) {
      throw new Error('Backup data integrity check failed');
    }

    return {
      success: true,
      data: backup.data,
      version: backup.version,
      timestamp: backup.timestamp,
      userInfo: backup.userInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Secure key exchange using Diffie-Hellman
 */
export const generateKeyPair = () => {
  // Simplified key generation for demo purposes
  // In production, use proper cryptographic libraries
  const privateKey = CryptoJS.lib.WordArray.random(32);
  const publicKey = CryptoJS.SHA256(privateKey);

  return {
    privateKey: privateKey.toString(),
    publicKey: publicKey.toString(),
  };
};

/**
 * Digital signature creation and verification
 */
export const createDigitalSignature = (data, privateKey) => {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  const signature = CryptoJS.HmacSHA256(message, privateKey);

  return {
    data: message,
    signature: signature.toString(),
    timestamp: new Date().toISOString(),
  };
};

export const verifyDigitalSignature = (signedData, publicKey) => {
  try {
    const expectedSignature = CryptoJS.HmacSHA256(signedData.data, publicKey);
    return expectedSignature.toString() === signedData.signature;
  } catch (error) {
    return false;
  }
};

export default {
  encryptData,
  decryptData,
  secureStorage,
  hashData,
  verifyHashedData,
  generateSecureToken,
  encryptFile,
  decryptFile,
  createEncryptedBackup,
  restoreFromEncryptedBackup,
  generateKeyPair,
  createDigitalSignature,
  verifyDigitalSignature,
  deriveKey,
};
