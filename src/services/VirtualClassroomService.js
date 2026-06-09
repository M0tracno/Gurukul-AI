import { io } from 'socket.io-client';
import EventEmitter from 'events';

// Phase 3A: Virtual Classroom Service - Core Infrastructure
// Foundational service for immersive learning experiences

class VirtualClassroomService extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = false;
    this.virtualRoom = null;
    this.participants = new Map();
    this.mediaDevices = {
      camera: null,
      microphone: null,
      screen: null,
    };
    this.arvrSupported = false;
    this.sessionRecorder = null;
    this.collaborativeTools = new Map();
  }

  async initialize() {
    try {
      console.log('Initializing Virtual Classroom Service...');

      // Check device capabilities
      await this.checkDeviceCapabilities();

      // Initialize WebRTC foundation
      await this.initializeWebRTC();

      // Check AR/VR support
      this.arvrSupported = await this.checkARVRSupport();

      console.log('Virtual Classroom Service initialized successfully');
      this.emit('initialized', {
        capabilities: this.getCapabilities(),
        arvrSupported: this.arvrSupported,
      });

      return true;
    } catch (error) {
      console.error('Virtual classroom initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async initializeVirtualClassroom(classroomId, userRole, options = {}) {
    try {
      console.log(`Joining virtual classroom: ${classroomId} as ${userRole}`);

      // Initialize socket connection
      this.socket = io('/virtual-classroom', {
        query: {
          classroomId,
          userRole,
          capabilities: JSON.stringify(this.getCapabilities()),
        },
        timeout: 10000,
      });

      // Setup peer connections for video/audio
      await this.setupMediaDevices(options.mediaSettings);

      // Initialize AR/VR if supported and requested
      if (this.arvrSupported && options.enableARVR) {
        await this.initializeARVR();
      }

      // Setup collaborative tools
      await this.initializeCollaborativeTools();

      // Setup event listeners
      this.setupEventListeners();

      // Join the virtual room
      await this.joinVirtualRoom(classroomId, userRole);

      this.virtualRoom = {
        id: classroomId,
        role: userRole,
        joinedAt: new Date().toISOString(),
        features: this.getEnabledFeatures(),
      };

      this.emit('classroom-joined', this.virtualRoom);
      return {
        success: true,
        features: this.getEnabledFeatures(),
        participants: Array.from(this.participants.values()),
      };
    } catch (error) {
      console.error('Virtual classroom joining failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async checkDeviceCapabilities() {
    const capabilities = {
      camera: false,
      microphone: false,
      screen: false,
      webrtc: false,
      webxr: false,
    };

    try {
      // Check media devices
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        capabilities.webrtc = true;

        const devices = await navigator.mediaDevices.enumerateDevices();
        capabilities.camera = devices.some(device => device.kind === 'videoinput');
        capabilities.microphone = devices.some(device => device.kind === 'audioinput');
      }

      // Check screen sharing
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        capabilities.screen = true;
      }

      // Check WebXR support
      if ('xr' in navigator) {
        capabilities.webxr = await navigator.xr.isSessionSupported('immersive-vr');
      }

      this.capabilities = capabilities;
      return capabilities;
    } catch (error) {
      console.warn('Device capability check failed:', error);
      this.capabilities = capabilities;
      return capabilities;
    }
  }

  async initializeWebRTC() {
    // WebRTC configuration
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    // Initialize peer connection
    this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);

    // Setup peer connection events
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.emit('ice-candidate', event.candidate);
      }
    };

    this.peerConnection.ontrack = event => {
      this.emit('remote-stream', event.streams[0]);
    };

    return true;
  }

  async checkARVRSupport() {
    try {
      if (!('xr' in navigator)) {
        return false;
      }

      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');

      return vrSupported || arSupported;
    } catch (error) {
      console.warn('AR/VR support check failed:', error);
      return false;
    }
  }

  async setupMediaDevices(settings = {}) {
    const defaultSettings = {
      video: { width: 1280, height: 720, frameRate: 30 },
      audio: { echoCancellation: true, noiseSuppression: true },
    };

    const mediaSettings = { ...defaultSettings, ...settings };

    try {
      if (this.capabilities.camera || this.capabilities.microphone) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: this.capabilities.camera ? mediaSettings.video : false,
          audio: this.capabilities.microphone ? mediaSettings.audio : false,
        });

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, stream);
        });

        this.mediaDevices.camera = stream.getVideoTracks()[0] || null;
        this.mediaDevices.microphone = stream.getAudioTracks()[0] || null;

        this.emit('media-ready', {
          video: !!this.mediaDevices.camera,
          audio: !!this.mediaDevices.microphone,
        });
      }
    } catch (error) {
      console.warn('Media device setup failed:', error);
      this.emit('media-error', error);
    }
  }

  async startScreenShare() {
    try {
      if (!this.capabilities.screen) {
        throw new Error('Screen sharing not supported');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true,
      });

      this.mediaDevices.screen = stream.getVideoTracks()[0];

      // Replace video track in peer connection
      const sender = this.peerConnection
        .getSenders()
        .find(s => s.track && s.track.kind === 'video');

      if (sender) {
        await sender.replaceTrack(this.mediaDevices.screen);
      }

      this.socket.emit('screen-share-start', { userId: this.getUserId() });
      this.emit('screen-share-started', stream);

      // Handle screen share end
      this.mediaDevices.screen.onended = () => {
        this.stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Screen sharing failed:', error);
      this.emit('screen-share-error', error);
      throw error;
    }
  }

  async stopScreenShare() {
    try {
      if (this.mediaDevices.screen) {
        this.mediaDevices.screen.stop();
        this.mediaDevices.screen = null;

        // Revert to camera if available
        if (this.mediaDevices.camera) {
          const sender = this.peerConnection
            .getSenders()
            .find(s => s.track && s.track.kind === 'video');

          if (sender) {
            await sender.replaceTrack(this.mediaDevices.camera);
          }
        }

        this.socket.emit('screen-share-stop', { userId: this.getUserId() });
        this.emit('screen-share-stopped');
      }
    } catch (error) {
      console.error('Stop screen sharing failed:', error);
      this.emit('error', error);
    }
  }

  async startSessionRecording() {
    try {
      if (!this.getCurrentStream()) {
        throw new Error('No active stream to record');
      }

      const mediaRecorder = new MediaRecorder(this.getCurrentStream(), {
        mimeType: 'video/webm;codecs=vp9',
      });

      const chunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        this.saveRecording(blob);
        this.emit('recording-saved', { blob, duration: this.getRecordingDuration() });
      };

      mediaRecorder.onerror = error => {
        console.error('Recording error:', error);
        this.emit('recording-error', error);
      };

      this.sessionRecorder = {
        recorder: mediaRecorder,
        startTime: Date.now(),
        chunks,
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      this.emit('recording-started');

      return mediaRecorder;
    } catch (error) {
      console.error('Session recording failed:', error);
      this.emit('recording-error', error);
      throw error;
    }
  }

  stopSessionRecording() {
    if (this.sessionRecorder && this.sessionRecorder.recorder) {
      this.sessionRecorder.recorder.stop();
      this.emit('recording-stopped');
    }
  }

  async initializeARVR() {
    if (!this.arvrSupported) {
      console.warn('AR/VR not supported on this device');
      return false;
    }

    try {
      // Initialize WebXR session
      const session = await navigator.xr.requestSession('immersive-vr');

      this.xrSession = session;

      session.addEventListener('end', () => {
        this.xrSession = null;
        this.emit('arvr-session-ended');
      });

      this.emit('arvr-initialized', { session });
      return true;
    } catch (error) {
      console.warn('AR/VR initialization failed:', error);
      return false;
    }
  }

  async initializeCollaborativeTools() {
    this.collaborativeTools.set('whiteboard', {
      active: false,
      participants: new Set(),
      tools: ['pen', 'eraser', 'shapes', 'text'],
    });

    this.collaborativeTools.set('quiz', {
      active: false,
      questions: [],
      responses: new Map(),
    });

    this.collaborativeTools.set('breakout', {
      rooms: new Map(),
      assignments: new Map(),
    });
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('participant-joined', this.handleParticipantJoined.bind(this));
    this.socket.on('participant-left', this.handleParticipantLeft.bind(this));
    this.socket.on('screen-share-received', this.handleScreenShareReceived.bind(this));
    this.socket.on('ar-object-shared', this.handleARObjectShared.bind(this));
    this.socket.on('collaborative-tool-update', this.handleCollaborativeToolUpdate.bind(this));
    this.socket.on('quiz-started', this.handleQuizStarted.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
  }

  handleParticipantJoined(participant) {
    this.participants.set(participant.id, participant);
    this.emit('participant-joined', participant);
  }

  handleParticipantLeft(participantId) {
    this.participants.delete(participantId);
    this.emit('participant-left', participantId);
  }

  handleScreenShareReceived(data) {
    this.emit('screen-share-received', data);
  }

  handleARObjectShared(data) {
    this.emit('ar-object-shared', data);
  }

  handleCollaborativeToolUpdate(data) {
    const tool = this.collaborativeTools.get(data.tool);
    if (tool) {
      Object.assign(tool, data.update);
      this.emit('collaborative-tool-updated', data);
    }
  }

  handleQuizStarted(quizData) {
    const quizTool = this.collaborativeTools.get('quiz');
    quizTool.active = true;
    quizTool.questions = quizData.questions;
    this.emit('quiz-started', quizData);
  }

  handleDisconnect() {
    this.isConnected = false;
    this.emit('disconnected');
  }

  async joinVirtualRoom(classroomId, userRole) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join-room', { classroomId, userRole }, response => {
        if (response.success) {
          this.isConnected = true;
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  getCurrentStream() {
    if (this.mediaDevices.screen) {
      return new MediaStream([this.mediaDevices.screen]);
    }

    const tracks = [];
    if (this.mediaDevices.camera) tracks.push(this.mediaDevices.camera);
    if (this.mediaDevices.microphone) tracks.push(this.mediaDevices.microphone);

    return tracks.length > 0 ? new MediaStream(tracks) : null;
  }

  getCapabilities() {
    return this.capabilities || {};
  }

  getEnabledFeatures() {
    return {
      video: !!this.mediaDevices.camera,
      audio: !!this.mediaDevices.microphone,
      screenShare: this.capabilities.screen,
      recording: true,
      arvr: this.arvrSupported,
      collaborative: true,
    };
  }

  getUserId() {
    return this.socket?.id || 'anonymous';
  }

  getRecordingDuration() {
    if (!this.sessionRecorder) return 0;
    return Date.now() - this.sessionRecorder.startTime;
  }

  saveRecording(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-session-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async cleanup() {
    try {
      // Stop recording if active
      if (this.sessionRecorder) {
        this.stopSessionRecording();
      }

      // Stop media tracks
      Object.values(this.mediaDevices).forEach(track => {
        if (track && track.stop) {
          track.stop();
        }
      });

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      // End XR session
      if (this.xrSession) {
        await this.xrSession.end();
      }

      // Disconnect socket
      if (this.socket) {
        this.socket.disconnect();
      }

      // Clear state
      this.participants.clear();
      this.collaborativeTools.clear();
      this.virtualRoom = null;
      this.isConnected = false;

      this.emit('cleaned-up');
    } catch (error) {
      console.error('Cleanup failed:', error);
      this.emit('error', error);
    }
  }

  // Mock methods for development
  mockClassroomJoin(classroomId, userRole) {
    console.log(`Mock: Joining classroom ${classroomId} as ${userRole}`);
    setTimeout(() => {
      this.emit('classroom-joined', {
        id: classroomId,
        role: userRole,
        features: this.getEnabledFeatures(),
      });
    }, 1000);
  }
}

export default VirtualClassroomService;
