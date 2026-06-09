import { io } from 'socket.io-client';

import env from '../config/env';

/**
 * WebRTC Video Service for PTM (Parent-Teacher Meeting) calls.
 *
 * Handles:
 * - Peer connection creation and lifecycle management
 * - Offer/answer SDP exchange via Socket.IO signaling
 * - ICE candidate relay
 * - Local and remote media track management
 * - Automatic reconnection on connection drop (Requirement 18.3)
 * - Media release on leave (Requirement 18.4)
 *
 * Requirements:
 * - 18.1: Establish WebRTC connection at/after PTM start time
 * - 18.2: Transmit audio/video while active
 * - 18.3: Reconnect on connection drop
 * - 18.4: Release media on leave
 */

/**
 * Default ICE server configuration.
 * In production, TURN servers should be configured for NAT traversal.
 */
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Connection states for the WebRTC service.
 */
const ConnectionState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
};

class WebRTCService {
  constructor() {
    /** @type {import('socket.io-client').Socket | null} */
    this.socket = null;
    /** @type {RTCPeerConnection | null} */
    this.peerConnection = null;
    /** @type {MediaStream | null} */
    this.localStream = null;
    /** @type {MediaStream | null} */
    this.remoteStream = null;
    /** @type {string | null} */
    this.currentPTMId = null;
    /** @type {string} */
    this.connectionState = ConnectionState.IDLE;
    /** @type {Map<string, Set<Function>>} */
    this.eventListeners = new Map();
    /** @type {number} */
    this.reconnectAttempts = 0;
    /** @type {number} */
    this.maxReconnectAttempts = 5;
    /** @type {number} */
    this.reconnectDelay = 2000;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.reconnectTimer = null;
    /** @type {RTCIceCandidateInit[]} */
    this.pendingIceCandidates = [];
    /** @type {boolean} */
    this.isInitiator = false;
    /** @type {RTCConfiguration} */
    this.iceConfig = { iceServers: DEFAULT_ICE_SERVERS };
  }

  // ==================== SOCKET CONNECTION ====================

  /**
   * Initialize the Socket.IO connection for WebRTC signaling.
   * Reuses the same socket server as the messaging service but handles
   * PTM-specific events.
   *
   * @param {string} authToken - JWT access token for authentication
   * @param {object} [options] - Optional configuration
   * @param {RTCIceServer[]} [options.iceServers] - Custom ICE servers
   */
  async connect(authToken, options = {}) {
    if (options.iceServers) {
      this.iceConfig = { iceServers: options.iceServers };
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    const socketUrl = env.SOCKET_URL || env.API_URL;

    this.socket = io(socketUrl, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this._setupSignalingListeners();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('connect_error', error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Set up Socket.IO event listeners for WebRTC signaling.
   * @private
   */
  _setupSignalingListeners() {
    if (!this.socket) return;

    // When we successfully join a PTM room
    this.socket.on('ptm_joined', data => {
      const { ptmId, existingPeers } = data;
      this._emit('joined', { ptmId, existingPeers });

      // If there are existing peers, we are the initiator (we send the offer)
      if (existingPeers && existingPeers.length > 0) {
        this.isInitiator = true;
        this._createOffer();
      }
    });

    // When a new peer joins the PTM room
    this.socket.on('ptm_peer_joined', data => {
      this._emit('peer_joined', data);
      // The existing participant waits for the offer from the new joiner
      // (new joiner becomes initiator via ptm_joined handler)
    });

    // Receive an SDP offer from the remote peer
    this.socket.on('ptm_offer', async data => {
      const { sdp, fromUserId } = data;
      this._emit('offer_received', { fromUserId });
      await this._handleRemoteOffer(sdp);
    });

    // Receive an SDP answer from the remote peer
    this.socket.on('ptm_answer', async data => {
      const { sdp, fromUserId } = data;
      this._emit('answer_received', { fromUserId });
      await this._handleRemoteAnswer(sdp);
    });

    // Receive an ICE candidate from the remote peer
    this.socket.on('ptm_ice_candidate', async data => {
      const { candidate } = data;
      await this._handleRemoteIceCandidate(candidate);
    });

    // When a peer leaves the PTM
    this.socket.on('ptm_peer_left', data => {
      this._emit('peer_left', data);
      // Clean up the peer connection but keep local media for potential reconnect
      this._closePeerConnection();
    });

    // Error from the server
    this.socket.on('ptm_error', data => {
      this._emit('error', {
        type: 'signaling_error',
        message: data.envelope?.message || 'PTM signaling error',
        ptmId: data.ptmId,
      });
    });

    // Socket disconnect handling for reconnection (Requirement 18.3)
    this.socket.on('disconnect', reason => {
      if (this.currentPTMId && reason !== 'io client disconnect') {
        this._setConnectionState(ConnectionState.RECONNECTING);
        this._emit('connection_interrupted', { reason });
      }
    });

    // Socket reconnect — re-join the PTM room to restore signaling
    this.socket.on('connect', () => {
      if (this.currentPTMId && this.connectionState === ConnectionState.RECONNECTING) {
        this._rejoinPTM();
      }
    });
  }

  // ==================== PTM SESSION MANAGEMENT ====================

  /**
   * Join a PTM video session.
   *
   * Acquires local media (camera + microphone) and joins the PTM signaling
   * room. The server validates that it's at or after the PTM start time
   * (Requirement 18.1) and that the user is an authorized participant.
   *
   * @param {string} ptmId - The PTM meeting ID
   * @param {MediaStreamConstraints} [mediaConstraints] - Optional media constraints
   * @returns {Promise<MediaStream>} The local media stream
   */
  async joinPTM(ptmId, mediaConstraints = { audio: true, video: true }) {
    if (this.currentPTMId) {
      await this.leavePTM();
    }

    this._setConnectionState(ConnectionState.CONNECTING);
    this.currentPTMId = ptmId;
    this.reconnectAttempts = 0;

    try {
      // Acquire local media (Requirement 18.2)
      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      this._emit('local_stream', { stream: this.localStream });

      // Join the PTM signaling room
      this.socket.emit('ptm_join', { ptmId });

      return this.localStream;
    } catch (error) {
      this._setConnectionState(ConnectionState.FAILED);
      this._emit('error', {
        type: 'media_error',
        message: error.message || 'Failed to acquire media devices',
        ptmId,
      });
      throw error;
    }
  }

  /**
   * Leave the current PTM video session.
   *
   * Releases all media tracks and cleans up the peer connection
   * (Requirement 18.4).
   */
  async leavePTM() {
    if (!this.currentPTMId) return;

    const ptmId = this.currentPTMId;

    // Notify the server
    if (this.socket && this.socket.connected) {
      this.socket.emit('ptm_leave', { ptmId });
    }

    // Release media tracks (Requirement 18.4)
    this._releaseMedia();

    // Close the peer connection
    this._closePeerConnection();

    // Reset state
    this.currentPTMId = null;
    this.isInitiator = false;
    this.pendingIceCandidates = [];
    this._clearReconnectTimer();
    this._setConnectionState(ConnectionState.IDLE);

    this._emit('left', { ptmId });
  }

  /**
   * Disconnect the signaling socket entirely.
   * Call this when the user navigates away from the PTM feature.
   */
  disconnect() {
    this.leavePTM();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  // ==================== MEDIA CONTROLS ====================

  /**
   * Toggle the local audio track on/off.
   * @param {boolean} enabled - Whether audio should be enabled
   */
  setAudioEnabled(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      this._emit('audio_toggled', { enabled });
    }
  }

  /**
   * Toggle the local video track on/off.
   * @param {boolean} enabled - Whether video should be enabled
   */
  setVideoEnabled(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      this._emit('video_toggled', { enabled });
    }
  }

  /**
   * Get the current local media stream.
   * @returns {MediaStream | null}
   */
  getLocalStream() {
    return this.localStream;
  }

  /**
   * Get the current remote media stream.
   * @returns {MediaStream | null}
   */
  getRemoteStream() {
    return this.remoteStream;
  }

  /**
   * Get the current connection state.
   * @returns {string}
   */
  getConnectionState() {
    return this.connectionState;
  }

  // ==================== PEER CONNECTION MANAGEMENT ====================

  /**
   * Create a new RTCPeerConnection and configure it.
   * @private
   */
  _createPeerConnection() {
    if (this.peerConnection) {
      this._closePeerConnection();
    }

    this.peerConnection = new RTCPeerConnection(this.iceConfig);
    this.remoteStream = new MediaStream();

    // Add local tracks to the peer connection (Requirement 18.2)
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming remote tracks
    this.peerConnection.ontrack = event => {
      event.streams[0]?.getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      this._emit('remote_stream', { stream: this.remoteStream });
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = event => {
      if (event.candidate && this.socket && this.currentPTMId) {
        this.socket.emit('ptm_ice_candidate', {
          ptmId: this.currentPTMId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Monitor connection state for reconnection (Requirement 18.3)
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;

      switch (state) {
        case 'connected':
          this._setConnectionState(ConnectionState.CONNECTED);
          this.reconnectAttempts = 0;
          this._clearReconnectTimer();
          this._emit('connected', { ptmId: this.currentPTMId });
          break;

        case 'disconnected':
          // Temporary disconnect — attempt reconnection (Requirement 18.3)
          this._handleConnectionDrop();
          break;

        case 'failed':
          // Connection failed — attempt reconnection (Requirement 18.3)
          this._handleConnectionDrop();
          break;

        case 'closed':
          this._setConnectionState(ConnectionState.DISCONNECTED);
          break;
      }
    };

    // Monitor ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      this._emit('ice_state_change', { state: iceState });

      if (iceState === 'failed') {
        // ICE restart as part of reconnection (Requirement 18.3)
        this._attemptIceRestart();
      }
    };
  }

  /**
   * Create and send an SDP offer to the remote peer.
   * @private
   */
  async _createOffer() {
    try {
      this._createPeerConnection();

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('ptm_offer', {
        ptmId: this.currentPTMId,
        sdp: this.peerConnection.localDescription,
      });

      this._emit('offer_sent', { ptmId: this.currentPTMId });
    } catch (error) {
      this._emit('error', {
        type: 'offer_error',
        message: error.message || 'Failed to create offer',
        ptmId: this.currentPTMId,
      });
    }
  }

  /**
   * Handle a received SDP offer — create an answer.
   * @private
   * @param {RTCSessionDescriptionInit} sdp
   */
  async _handleRemoteOffer(sdp) {
    try {
      this._createPeerConnection();

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

      // Apply any ICE candidates that arrived before the remote description was set
      await this._flushPendingIceCandidates();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('ptm_answer', {
        ptmId: this.currentPTMId,
        sdp: this.peerConnection.localDescription,
      });

      this._emit('answer_sent', { ptmId: this.currentPTMId });
    } catch (error) {
      this._emit('error', {
        type: 'answer_error',
        message: error.message || 'Failed to handle offer',
        ptmId: this.currentPTMId,
      });
    }
  }

  /**
   * Handle a received SDP answer.
   * @private
   * @param {RTCSessionDescriptionInit} sdp
   */
  async _handleRemoteAnswer(sdp) {
    try {
      if (!this.peerConnection) return;

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

      // Apply any ICE candidates that arrived before the remote description was set
      await this._flushPendingIceCandidates();
    } catch (error) {
      this._emit('error', {
        type: 'answer_error',
        message: error.message || 'Failed to handle answer',
        ptmId: this.currentPTMId,
      });
    }
  }

  /**
   * Handle a received ICE candidate.
   * If the remote description isn't set yet, queue the candidate.
   * @private
   * @param {RTCIceCandidateInit} candidate
   */
  async _handleRemoteIceCandidate(candidate) {
    try {
      if (!this.peerConnection || !this.peerConnection.remoteDescription) {
        // Queue candidates until remote description is set
        this.pendingIceCandidates.push(candidate);
        return;
      }

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      // Non-fatal: some candidates may be redundant
      console.warn('Failed to add ICE candidate:', error.message);
    }
  }

  /**
   * Flush queued ICE candidates once the remote description is set.
   * @private
   */
  async _flushPendingIceCandidates() {
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Failed to add queued ICE candidate:', error.message);
      }
    }
  }

  // ==================== RECONNECTION (Requirement 18.3) ====================

  /**
   * Handle a connection drop. Attempt reconnection up to maxReconnectAttempts.
   * @private
   */
  _handleConnectionDrop() {
    if (this.connectionState === ConnectionState.RECONNECTING) return;
    if (!this.currentPTMId) return;

    this._setConnectionState(ConnectionState.RECONNECTING);
    this._emit('connection_drop', {
      ptmId: this.currentPTMId,
      attempt: this.reconnectAttempts,
    });

    this._scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   * @private
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._setConnectionState(ConnectionState.FAILED);
      this._emit('reconnect_failed', {
        ptmId: this.currentPTMId,
        attempts: this.reconnectAttempts,
      });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this._emit('reconnecting', {
      ptmId: this.currentPTMId,
      attempt: this.reconnectAttempts,
      nextAttemptIn: delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this._attemptReconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect by creating a new offer.
   * @private
   */
  _attemptReconnect() {
    if (!this.currentPTMId || !this.socket?.connected) {
      this._scheduleReconnect();
      return;
    }

    // Close old peer connection and create a fresh one with a new offer
    this._closePeerConnection();
    this._createOffer();
  }

  /**
   * Attempt an ICE restart without full renegotiation.
   * @private
   */
  async _attemptIceRestart() {
    if (!this.peerConnection || !this.currentPTMId) return;

    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('ptm_offer', {
        ptmId: this.currentPTMId,
        sdp: this.peerConnection.localDescription,
      });

      this._emit('ice_restart', { ptmId: this.currentPTMId });
    } catch (error) {
      // If ICE restart fails, fall back to full reconnection
      this._handleConnectionDrop();
    }
  }

  /**
   * Re-join the PTM signaling room after a socket reconnection.
   * @private
   */
  _rejoinPTM() {
    if (this.currentPTMId && this.socket?.connected) {
      this.socket.emit('ptm_join', { ptmId: this.currentPTMId });
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Release all local media tracks (Requirement 18.4).
   * @private
   */
  _releaseMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      this.remoteStream = null;
    }

    this._emit('media_released', { ptmId: this.currentPTMId });
  }

  /**
   * Close the peer connection without releasing local media.
   * Allows reconnection to reuse the same media stream.
   * @private
   */
  _closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  /**
   * Clear any pending reconnect timer.
   * @private
   */
  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Register an event listener.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Remove an event listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event to registered listeners.
   * @private
   * @param {string} event
   * @param {object} data
   */
  _emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebRTCService listener for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Update connection state and emit a state change event.
   * @private
   * @param {string} newState
   */
  _setConnectionState(newState) {
    const previousState = this.connectionState;
    this.connectionState = newState;
    this._emit('state_change', { previousState, currentState: newState });
  }

  // ==================== STATUS ====================

  /**
   * Get the full status of the WebRTC service.
   * @returns {object}
   */
  getStatus() {
    return {
      connectionState: this.connectionState,
      currentPTMId: this.currentPTMId,
      isInitiator: this.isInitiator,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
      localTracks: this.localStream
        ? this.localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
        : [],
      remoteTracks: this.remoteStream
        ? this.remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
        : [],
      reconnectAttempts: this.reconnectAttempts,
      socketConnected: !!this.socket?.connected,
      peerConnectionState: this.peerConnection?.connectionState || null,
      iceConnectionState: this.peerConnection?.iceConnectionState || null,
    };
  }
}

// Export singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;

// Also export the class for testing
export { WebRTCService, ConnectionState, DEFAULT_ICE_SERVERS };
