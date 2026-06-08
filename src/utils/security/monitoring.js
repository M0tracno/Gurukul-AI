import CryptoJS from 'crypto-js';

/**
 * Security Monitoring Utilities - Phase 5 Security Enhancement
 * Provides utility functions for security monitoring and threat detection
 */


/**
 * Device fingerprinting for security monitoring
 */
export const generateDeviceFingerprint = () => {
  const components = [];
  
  // Browser information
  components.push(navigator.userAgent);  components.push(navigator.language);
  components.push(navigator.platform);
  components.push(navigator.hardwareConcurrency || 'unknown');
  
  // Screen information
  components.push(window.screen.width);
  components.push(window.screen.height);
  components.push(window.screen.colorDepth);
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Canvas fingerprinting
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    components.push(canvas.toDataURL());
  } catch (e) {
    components.push('canvas-error');
  }
  
  // WebGL fingerprinting
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    }
  } catch (e) {
    components.push('webgl-error');
  }
  
  // Audio fingerprinting
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 10000;
    gainNode.gain.value = 0;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    components.push(Array.from(dataArray).join(''));
    
    oscillator.disconnect();
    analyser.disconnect();
    gainNode.disconnect();
  } catch (e) {
    components.push('audio-error');
  }
  
  // Generate hash from all components
  const fingerprint = CryptoJS.MD5(components.join('|')).toString();
  
  return {
    fingerprint,
    components: components.length,
    timestamp: new Date().toISOString(),
    confidence: calculateFingerprintConfidence(components)
  };
};

/**
 * Calculate confidence level of device fingerprint
 */
const calculateFingerprintConfidence = (components) => {
  let score = 0;
  const maxScore = 100;
  
  // More components = higher confidence
  score += Math.min(components.length * 5, 40);
  
  // Check for unique identifiers - ensuring components are strings
  if (components.some(c => typeof c === 'string' && c.includes('canvas'))) score += 20;
  if (components.some(c => typeof c === 'string' && c.includes('webgl'))) score += 15;
  if (components.some(c => typeof c === 'string' && c.includes('audio'))) score += 15;
  if (components.some(c => typeof c === 'string' && c.includes('timezone'))) score += 10;
  
  return Math.min(score, maxScore);
};

/**
 * Detect suspicious user behavior patterns
 */
export const analyzeBehaviorPattern = (events) => {
  const analysis = {
    suspiciousActivity: false,
    riskScore: 0,
    patterns: [],
    recommendations: []
  };
  
  if (!events || events.length === 0) {
    return analysis;
  }
  
  // Analyze login patterns
  const loginEvents = events.filter(e => e.type === 'login');
  if (loginEvents.length > 0) {
    // Check for unusual login times
    const loginHours = loginEvents.map(e => new Date(e.timestamp).getHours());
    const unusualHours = loginHours.filter(h => h < 6 || h > 22);
    
    if (unusualHours.length / loginHours.length > 0.3) {
      analysis.patterns.push('Unusual login times detected');
      analysis.riskScore += 20;
    }
    
    // Check for rapid successive logins
    const rapidLogins = detectRapidEvents(loginEvents, 5 * 60 * 1000); // 5 minutes
    if (rapidLogins > 3) {
      analysis.patterns.push('Multiple rapid login attempts');
      analysis.riskScore += 30;
    }
  }
  
  // Analyze location patterns
  const locationEvents = events.filter(e => e.location);
  if (locationEvents.length > 1) {
    const locations = locationEvents.map(e => e.location);
    const uniqueCountries = new Set(locations.map(l => l.country)).size;
    const uniqueCities = new Set(locations.map(l => l.city)).size;
    
    if (uniqueCountries > 2) {
      analysis.patterns.push('Multiple countries detected');
      analysis.riskScore += 25;
    }
    
    if (uniqueCities > 5) {
      analysis.patterns.push('Multiple cities detected');
      analysis.riskScore += 15;
    }
  }
  
  // Analyze device patterns
  const deviceEvents = events.filter(e => e.device);
  if (deviceEvents.length > 0) {
    const uniqueDevices = new Set(deviceEvents.map(e => e.device.fingerprint)).size;
    
    if (uniqueDevices > 3) {
      analysis.patterns.push('Multiple devices detected');
      analysis.riskScore += 20;
    }
  }
  
  // Analyze failed attempts
  const failedEvents = events.filter(e => e.success === false);
  const failureRate = failedEvents.length / events.length;
  
  if (failureRate > 0.3) {
    analysis.patterns.push('High failure rate detected');
    analysis.riskScore += 35;
  }
  
  // Generate recommendations
  if (analysis.riskScore > 50) {
    analysis.suspiciousActivity = true;
    analysis.recommendations.push('Require additional authentication');
    analysis.recommendations.push('Monitor user activity closely');
  }
  
  if (analysis.riskScore > 70) {
    analysis.recommendations.push('Consider temporary account restriction');
    analysis.recommendations.push('Contact user to verify activity');
  }
  
  return analysis;
};

/**
 * Detect rapid events within a time window
 */
const detectRapidEvents = (events, windowMs) => {
  let maxRapidEvents = 0;
  
  for (let i = 0; i < events.length; i++) {
    const baseTime = new Date(events[i].timestamp).getTime();
    let rapidCount = 1;
    
    for (let j = i + 1; j < events.length; j++) {
      const eventTime = new Date(events[j].timestamp).getTime();
      if (eventTime - baseTime <= windowMs) {
        rapidCount++;
      } else {
        break;
      }
    }
    
    maxRapidEvents = Math.max(maxRapidEvents, rapidCount);
  }
  
  return maxRapidEvents;
};

/**
 * Security event correlation
 */
export const correlateSecurityEvents = (events) => {
  const correlations = [];
  const eventGroups = {};
  
  // Group events by type and time proximity
  events.forEach(event => {
    const timeWindow = Math.floor(new Date(event.timestamp).getTime() / (5 * 60 * 1000)); // 5-minute windows
    const key = `${event.type}_${timeWindow}`;
    
    if (!eventGroups[key]) {
      eventGroups[key] = [];
    }
    eventGroups[key].push(event);
  });
  
  // Analyze correlations
  Object.entries(eventGroups).forEach(([key, groupEvents]) => {
    if (groupEvents.length > 1) {
      const [type, timeWindow] = key.split('_');
      
      correlations.push({
        type: 'temporal_clustering',
        pattern: `Multiple ${type} events in 5-minute window`,
        events: groupEvents,
        riskScore: Math.min(groupEvents.length * 10, 50),
        timestamp: new Date(parseInt(timeWindow) * 5 * 60 * 1000)
      });
    }
  });
  
  // Check for attack patterns
  const failedLogins = events.filter(e => e.type === 'login' && !e.success);
  if (failedLogins.length >= 5) {
    correlations.push({
      type: 'brute_force_attempt',
      pattern: 'Multiple failed login attempts',
      events: failedLogins,
      riskScore: 80,
      timestamp: new Date()
    });
  }
  
  // Check for privilege escalation attempts
  const privilegeEvents = events.filter(e => e.type === 'privilege_change');
  if (privilegeEvents.length > 0) {
    correlations.push({
      type: 'privilege_escalation',
      pattern: 'Privilege escalation attempts detected',
      events: privilegeEvents,
      riskScore: 70,
      timestamp: new Date()
    });
  }
  
  return correlations.sort((a, b) => b.riskScore - a.riskScore);
};

/**
 * Generate security metrics
 */
export const calculateSecurityMetrics = (events, timeRange = 24 * 60 * 60 * 1000) => {
  const now = new Date().getTime();
  const recentEvents = events.filter(e => 
    now - new Date(e.timestamp).getTime() <= timeRange
  );
  
  const metrics = {
    totalEvents: recentEvents.length,
    successfulEvents: recentEvents.filter(e => e.success !== false).length,
    failedEvents: recentEvents.filter(e => e.success === false).length,
    uniqueUsers: new Set(recentEvents.map(e => e.userId)).size,
    uniqueIPs: new Set(recentEvents.map(e => e.ip)).size,
    eventTypes: {},
    hourlyDistribution: new Array(24).fill(0),
    riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    averageRiskScore: 0
  };
  
  // Calculate success rate
  metrics.successRate = metrics.totalEvents > 0 
    ? (metrics.successfulEvents / metrics.totalEvents) * 100 
    : 100;
  
  // Analyze event types
  recentEvents.forEach(event => {
    metrics.eventTypes[event.type] = (metrics.eventTypes[event.type] || 0) + 1;
    
    // Hourly distribution
    const hour = new Date(event.timestamp).getHours();
    metrics.hourlyDistribution[hour]++;
    
    // Risk distribution
    const riskScore = event.riskScore || 0;
    if (riskScore >= 80) metrics.riskDistribution.critical++;
    else if (riskScore >= 60) metrics.riskDistribution.high++;
    else if (riskScore >= 30) metrics.riskDistribution.medium++;
    else metrics.riskDistribution.low++;
  });
  
  // Calculate average risk score
  const totalRiskScore = recentEvents.reduce((sum, e) => sum + (e.riskScore || 0), 0);
  metrics.averageRiskScore = metrics.totalEvents > 0 
    ? Math.round(totalRiskScore / metrics.totalEvents) 
    : 0;
  
  // Security health score
  let healthScore = 100;
  healthScore -= Math.max(0, (100 - metrics.successRate) * 0.5); // Penalize low success rate
  healthScore -= Math.min(30, metrics.riskDistribution.critical * 10); // Penalize critical events
  healthScore -= Math.min(20, metrics.riskDistribution.high * 5); // Penalize high-risk events
  healthScore -= Math.min(10, metrics.averageRiskScore * 0.1); // Penalize high average risk
  
  metrics.healthScore = Math.max(0, Math.round(healthScore));
  
  return metrics;
};

/**
 * Real-time threat detection
 */
export const detectThreats = (event, recentEvents = []) => {
  const threats = [];
  
  // Check for brute force attacks
  const recentFailures = recentEvents.filter(e => 
    e.type === 'login' && 
    e.success === false &&
    e.ip === event.ip &&
    new Date().getTime() - new Date(e.timestamp).getTime() < 15 * 60 * 1000 // 15 minutes
  );
  
  if (recentFailures.length >= 3) {
    threats.push({
      type: 'brute_force',
      severity: 'high',
      description: 'Multiple failed login attempts from same IP',
      ip: event.ip,
      count: recentFailures.length,
      recommendation: 'Block IP address temporarily'
    });
  }
  
  // Check for account takeover attempts
  if (event.type === 'login' && event.success) {
    const previousLogins = recentEvents.filter(e =>
      e.type === 'login' &&
      e.success &&
      e.userId === event.userId &&
      new Date().getTime() - new Date(e.timestamp).getTime() < 60 * 60 * 1000 // 1 hour
    );
    
    const uniqueIPs = new Set(previousLogins.map(e => e.ip));
    const uniqueDevices = new Set(previousLogins.map(e => e.device?.fingerprint));
    
    if (uniqueIPs.size > 2 || uniqueDevices.size > 2) {
      threats.push({
        type: 'account_takeover',
        severity: 'critical',
        description: 'Multiple devices/IPs accessing same account',
        userId: event.userId,
        uniqueIPs: uniqueIPs.size,
        uniqueDevices: uniqueDevices.size,
        recommendation: 'Require immediate re-authentication'
      });
    }
  }
  
  // Check for privilege escalation
  if (event.type === 'privilege_change') {
    threats.push({
      type: 'privilege_escalation',
      severity: 'high',
      description: 'User privilege level changed',
      userId: event.userId,
      oldRole: event.oldRole,
      newRole: event.newRole,
      recommendation: 'Verify authorization for privilege change'
    });
  }
  
  // Check for suspicious data access
  if (event.type === 'data_access' && event.dataType === 'sensitive') {
    const recentAccess = recentEvents.filter(e =>
      e.type === 'data_access' &&
      e.userId === event.userId &&
      new Date().getTime() - new Date(e.timestamp).getTime() < 60 * 60 * 1000 // 1 hour
    );
    
    if (recentAccess.length > 10) {
      threats.push({
        type: 'data_exfiltration',
        severity: 'critical',
        description: 'Excessive sensitive data access',
        userId: event.userId,
        accessCount: recentAccess.length,
        recommendation: 'Monitor and restrict data access'
      });
    }
  }
  
  return threats;
};

const securityMonitoring = {
  generateDeviceFingerprint,
  analyzeBehaviorPattern,
  correlateSecurityEvents,
  calculateSecurityMetrics,
  detectThreats
};

export default securityMonitoring;
