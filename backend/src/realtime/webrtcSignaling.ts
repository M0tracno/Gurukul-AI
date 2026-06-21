import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';
import { ptmService } from '../services/ptmService.js';
import { failure } from '../utils/envelope.js';
import type { AuthenticatedSocket } from './socketManager.js';

/**
 * WebRTC Signaling Handler
 *
 * Relays WebRTC signaling messages (offer, answer, ICE candidates) between
 * authorized PTM participants via Socket.IO. Enforces that only participants
 * of a scheduled/active PTM can exchange signaling at or after the meeting's
 * start time.
 *
 * Requirements:
 * - 18.1: Establish WebRTC connection at/after start time
 * - 18.2: Transmit audio/video while active (handled by WebRTC client once connected)
 * - 18.3: Reconnect on drop (client-side triggers re-signaling)
 * - 18.4: Release media on leave (client-side + server cleanup)
 */

/**
 * SDP descriptor relayed between peers (server does not interpret it).
 */
interface SDPDescriptor {
  type: string;
  sdp?: string;
}

/**
 * ICE candidate relayed between peers (server does not interpret it).
 */
interface ICECandidateDescriptor {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

/**
 * Payload for a WebRTC offer or answer.
 */
interface SignalOfferAnswer {
  ptmId: string;
  sdp: SDPDescriptor;
}

/**
 * Payload for an ICE candidate relay.
 */
interface SignalIceCandidate {
  ptmId: string;
  candidate: ICECandidateDescriptor;
}

/**
 * Payload for joining/leaving a PTM room.
 */
interface PTMRoomPayload {
  ptmId: string;
}

/**
 * Tracks which users are in each PTM room for signaling relay.
 * Key: ptmId, Value: Set of userIds currently in the room.
 */
const ptmRooms = new Map<string, Set<string>>();

/**
 * Get the PTM room name for Socket.IO.
 */
function getPTMRoom(ptmId: string): string {
  return `ptm_${ptmId}`;
}

/**
 * Validate that a user can participate in signaling for a PTM.
 * Checks:
 * 1. User is an authorized participant (via ptmService.authorizeJoin)
 * 2. Current time is at or after the PTM's scheduled start time (Requirement 18.1)
 *
 * @returns The PTM result if valid, or throws/returns null on failure
 */
async function validatePTMSignaling(
  ptmId: string,
  userId: string,
  socket: AuthenticatedSocket
): Promise<boolean> {
  try {
    // Authorize the user as a PTM participant (Requirement 17.4)
    const ptm = await ptmService.authorizeJoin(ptmId, userId);

    // Check that the current time is at or after the scheduled start (Requirement 18.1)
    const now = new Date();
    if (now < ptm.scheduledStart) {
      socket.emit('ptm_error', {
        status: 403,
        envelope: failure('PTM has not started yet. You can join at or after the scheduled start time.'),
        ptmId,
      });
      return false;
    }

    return true;
  } catch (error: unknown) {
    // ptmService.authorizeJoin throws AppError for 404/403
    const message = error instanceof Error ? error.message : 'Unauthorized to join PTM';
    socket.emit('ptm_error', {
      status: 403,
      envelope: failure(message),
      ptmId,
    });
    return false;
  }
}

/**
 * Set up WebRTC signaling event handlers on a connected, authenticated socket.
 *
 * Events handled:
 * - ptm_join: User joins the PTM signaling room
 * - ptm_offer: Relay an SDP offer to the other participant
 * - ptm_answer: Relay an SDP answer to the other participant
 * - ptm_ice_candidate: Relay an ICE candidate to the other participant
 * - ptm_leave: User leaves the PTM signaling room (Requirement 18.4)
 */
export function setupWebRTCSignaling(socket: AuthenticatedSocket, io: SocketIOServer): void {
  const { userId } = socket.user;

  /**
   * ptm_join: Authorize and join the PTM signaling room.
   * Notifies other participants that a new peer has joined.
   */
  socket.on('ptm_join', async (data: PTMRoomPayload) => {
    const { ptmId } = data;

    if (!ptmId) {
      socket.emit('ptm_error', {
        status: 400,
        envelope: failure('ptmId is required'),
        ptmId: null,
      });
      return;
    }

    const authorized = await validatePTMSignaling(ptmId, userId, socket);
    if (!authorized) return;

    const room = getPTMRoom(ptmId);

    // Track the user in the PTM room
    if (!ptmRooms.has(ptmId)) {
      ptmRooms.set(ptmId, new Set());
    }
    ptmRooms.get(ptmId)!.add(userId);

    // Join the Socket.IO room
    socket.join(room);

    logger.info('User joined PTM signaling room', { userId, ptmId, room });

    // Notify other participants that a new peer has joined
    socket.to(room).emit('ptm_peer_joined', {
      ptmId,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Inform the joining user of existing peers in the room
    const existingPeers = Array.from(ptmRooms.get(ptmId)!).filter((id) => id !== userId);
    socket.emit('ptm_joined', {
      ptmId,
      existingPeers,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * ptm_offer: Relay an SDP offer to the other participant(s) in the PTM room.
   */
  socket.on('ptm_offer', async (data: SignalOfferAnswer) => {
    const { ptmId, sdp } = data;

    if (!ptmId || !sdp) {
      socket.emit('ptm_error', {
        status: 400,
        envelope: failure('ptmId and sdp are required for an offer'),
        ptmId,
      });
      return;
    }

    const authorized = await validatePTMSignaling(ptmId, userId, socket);
    if (!authorized) return;

    const room = getPTMRoom(ptmId);

    logger.info('Relaying WebRTC offer', { userId, ptmId });

    // Relay the offer to the other participant(s) in the room
    socket.to(room).emit('ptm_offer', {
      ptmId,
      sdp,
      fromUserId: userId,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * ptm_answer: Relay an SDP answer to the offering participant.
   */
  socket.on('ptm_answer', async (data: SignalOfferAnswer) => {
    const { ptmId, sdp } = data;

    if (!ptmId || !sdp) {
      socket.emit('ptm_error', {
        status: 400,
        envelope: failure('ptmId and sdp are required for an answer'),
        ptmId,
      });
      return;
    }

    const authorized = await validatePTMSignaling(ptmId, userId, socket);
    if (!authorized) return;

    const room = getPTMRoom(ptmId);

    logger.info('Relaying WebRTC answer', { userId, ptmId });

    // Relay the answer to the other participant(s) in the room
    socket.to(room).emit('ptm_answer', {
      ptmId,
      sdp,
      fromUserId: userId,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * ptm_ice_candidate: Relay an ICE candidate to the other participant(s).
   */
  socket.on('ptm_ice_candidate', async (data: SignalIceCandidate) => {
    const { ptmId, candidate } = data;

    if (!ptmId || !candidate) {
      socket.emit('ptm_error', {
        status: 400,
        envelope: failure('ptmId and candidate are required'),
        ptmId,
      });
      return;
    }

    const authorized = await validatePTMSignaling(ptmId, userId, socket);
    if (!authorized) return;

    const room = getPTMRoom(ptmId);

    // Relay the ICE candidate to the other participant(s) in the room
    socket.to(room).emit('ptm_ice_candidate', {
      ptmId,
      candidate,
      fromUserId: userId,
    });
  });

  /**
   * ptm_leave: User leaves the PTM signaling room.
   * Releases the signaling channel; client is responsible for releasing media tracks
   * (Requirement 18.4).
   */
  socket.on('ptm_leave', (data: PTMRoomPayload) => {
    const { ptmId } = data;

    if (!ptmId) return;

    const room = getPTMRoom(ptmId);

    // Remove from tracking
    if (ptmRooms.has(ptmId)) {
      ptmRooms.get(ptmId)!.delete(userId);
      if (ptmRooms.get(ptmId)!.size === 0) {
        ptmRooms.delete(ptmId);
      }
    }

    // Leave the Socket.IO room
    socket.leave(room);

    // Notify remaining participants that this peer left
    socket.to(room).emit('ptm_peer_left', {
      ptmId,
      userId,
      timestamp: new Date().toISOString(),
    });

    logger.info('User left PTM signaling room', { userId, ptmId });
  });

  /**
   * On socket disconnect, clean up all PTM rooms this user was in.
   */
  socket.on('disconnect', () => {
    for (const [ptmId, users] of ptmRooms.entries()) {
      if (users.has(userId)) {
        users.delete(userId);

        // Notify remaining participants
        const room = getPTMRoom(ptmId);
        socket.to(room).emit('ptm_peer_left', {
          ptmId,
          userId,
          timestamp: new Date().toISOString(),
          reason: 'disconnect',
        });

        if (users.size === 0) {
          ptmRooms.delete(ptmId);
        }
      }
    }
  });
}

/**
 * Get the currently tracked PTM rooms (useful for testing/monitoring).
 */
export function getPTMRooms(): Map<string, Set<string>> {
  return ptmRooms;
}

/**
 * Clear all PTM rooms (useful for testing).
 */
export function clearPTMRooms(): void {
  ptmRooms.clear();
}
