import React, { useState, useEffect, useCallback } from 'react';

/**
 * Real-time Production Monitoring Dashboard
 * Provides live performance and security monitoring for the AdminDashboard
 * Part of the Educational Management System - AdminDashboard Enhancement Project
 */


const ProductionMonitor = ({ 
  isProduction = process.env.NODE_ENV === 'production',
  refreshInterval = 30000,
  enableNotifications = true 
}) => {
  const [monitoringData, setMonitoringData] = useState({
    performance: {
      score: 0,
      metrics: {},
      trend: []
    },
    security: {
      score: 0,
      threats: [],
      lastScan: null
    },
    system: {
      uptime: 0,
      responseTime: 0,
      errorRate: 0,
      activeUsers: 0
    },
    alerts: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  // Update performance metrics from observer entries
  const updatePerformanceMetrics = useCallback((entry) => {
    setMonitoringData(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        metrics: {
          ...prev.performance.metrics,
          [entry.name || entry.entryType]: entry.startTime || entry.value || entry.duration
        }
      }
    }));
    setLastUpdate(new Date());
  }, []);

  // Performance monitoring hook
  const usePerformanceMonitoring = () => {
    useEffect(() => {
      if (!isProduction) return;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          updatePerformanceMetrics(entry);
        });
      });

      observer.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });

      return () => observer.disconnect();
    }, []);
  };

  // Real-time data fetching
  const fetchMonitoringData = useCallback(async () => {
    try {
      setIsConnected(true);
      
      // Fetch performance data
      const performanceData = await fetchPerformanceData();
      
      // Fetch security data
      const securityData = await fetchSecurityData();
      
      // Fetch system data
      const systemData = await fetchSystemData();
      
      // Update state
      setMonitoringData(prev => ({
        performance: { ...prev.performance, ...performanceData },
        security: { ...prev.security, ...securityData },
        system: { ...prev.system, ...systemData },
        alerts: [...prev.alerts, ...checkForAlerts(performanceData, securityData, systemData)]
      }));
      
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      setIsConnected(false);
      
      if (enableNotifications) {
        createAlert('error', 'Monitoring connection lost', error.message);
      }
    }
  }, [enableNotifications]);

  // Performance data collection
  const fetchPerformanceData = async () => {
    // Real-time performance metrics
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
    
    const metrics = {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: lcp?.startTime || 0,
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };

    // Calculate performance score
    const score = calculatePerformanceScore(metrics);

    return {
      score,
      metrics,
      trend: [...(monitoringData.performance.trend || []), { time: Date.now(), score }].slice(-20)
    };
  };

  // Security monitoring
  const fetchSecurityData = async () => {
    try {
      // Check for common security indicators
      const threats = [];
      
      // CSP violations check
      if (window.securityPolicyViolationCallback) {
        threats.push(...window.securityPolicyViolationCallback.getViolations());
      }
      
      // XSS detection
      if (detectXSSAttempts()) {
        threats.push({
          type: 'xss',
          severity: 'high',
          description: 'Potential XSS attempt detected',
          timestamp: Date.now()
        });
      }
      
      // CSRF token validation
      if (!validateCSRFToken()) {
        threats.push({
          type: 'csrf',
          severity: 'medium',
          description: 'CSRF token validation failed',
          timestamp: Date.now()
        });
      }
      
      const score = calculateSecurityScore(threats);
      
      return {
        score,
        threats: threats.slice(-10), // Keep last 10 threats
        lastScan: Date.now()
      };
      
    } catch (error) {
      console.error('Security monitoring error:', error);
      return {
        score: 50,
        threats: [{
          type: 'monitoring_error',
          severity: 'low',
          description: 'Security monitoring error',
          timestamp: Date.now()
        }],
        lastScan: Date.now()
      };
    }
  };

  // System health monitoring
  const fetchSystemData = async () => {
    try {
      const startTime = Date.now();
      
      // Health check
      const healthResponse = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const responseTime = Date.now() - startTime;
      const healthData = await healthResponse.json();
      
      return {
        uptime: healthData.uptime || 0,
        responseTime,
        errorRate: healthData.errorRate || 0,
        activeUsers: healthData.activeUsers || 0,
        serverStatus: healthResponse.ok ? 'healthy' : 'unhealthy'
      };
      
    } catch (error) {
      return {
        uptime: 0,
        responseTime: 9999,
        errorRate: 1,
        activeUsers: 0,
        serverStatus: 'error'
      };
    }
  };

  // Alert system
  const checkForAlerts = (performance, security, system) => {
    const alerts = [];
    const now = Date.now();
    
    // Performance alerts
    if (performance.score < 70) {
      alerts.push({
        id: `perf-${now}`,
        type: 'performance',
        severity: performance.score < 50 ? 'critical' : 'warning',
        message: `Performance score is ${performance.score}/100`,
        timestamp: now
      });
    }
    
    // Security alerts
    if (security.score < 80) {
      alerts.push({
        id: `sec-${now}`,
        type: 'security',
        severity: security.score < 60 ? 'critical' : 'warning',
        message: `Security score is ${security.score}/100`,
        timestamp: now
      });
    }
    
    // System alerts
    if (system.responseTime > 3000) {
      alerts.push({
        id: `sys-${now}`,
        type: 'system',
        severity: 'warning',
        message: `High response time: ${system.responseTime}ms`,
        timestamp: now
      });
    }
    
    if (system.errorRate > 0.05) {
      alerts.push({
        id: `err-${now}`,
        type: 'system',
        severity: 'critical',
        message: `High error rate: ${(system.errorRate * 100).toFixed(2)}%`,
        timestamp: now
      });
    }
    
    return alerts;
  };

  // Utility functions
  const calculatePerformanceScore = (metrics) => {
    const weights = {
      domContentLoaded: 0.2,
      firstContentfulPaint: 0.3,
      largestContentfulPaint: 0.3,
      loadComplete: 0.2
    };
    
    let score = 100;
    
    // Deduct points based on timing thresholds
    if (metrics.domContentLoaded > 1500) score -= 10;
    if (metrics.firstContentfulPaint > 2000) score -= 20;
    if (metrics.largestContentfulPaint > 4000) score -= 30;
    if (metrics.loadComplete > 3000) score -= 15;
    
    // Memory usage penalty
    if (metrics.memoryUsage?.used > 50 * 1024 * 1024) score -= 10; // 50MB threshold
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateSecurityScore = (threats) => {
    let score = 100;
    
    threats.forEach(threat => {
      switch (threat.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
        default:
          score -= 1;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  };

  const detectXSSAttempts = () => {
    // Simple XSS detection - look for script injection attempts
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /eval\(/i
    ];
    
    const urlParams = new URLSearchParams(window.location.search);
    const allParams = Array.from(urlParams.values()).join(' ');
    
    return suspiciousPatterns.some(pattern => pattern.test(allParams));
  };

  const validateCSRFToken = () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    return !!token && token.length > 10;
  };

  const createAlert = (type, title, message) => {
    if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`AdminDashboard ${type.toUpperCase()}`, {
        body: `${title}: ${message}`,
        icon: '/favicon.ico'
      });
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    if (score >= 50) return '#fd7e14';
    return '#dc3545';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#dc3545',
      high: '#fd7e14',
      warning: '#ffc107',
      medium: '#17a2b8',
      low: '#28a745',
      info: '#6c757d'
    };
    return colors[severity] || colors.info;
  };

  // Hooks
  usePerformanceMonitoring();

  useEffect(() => {
    if (!isProduction) return;

    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchMonitoringData, refreshInterval, isProduction]);

  // Request notification permissions
  useEffect(() => {
    if (enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enableNotifications]);

  if (!isProduction) {
    return (
      <div className="production-monitor development-mode">
        <div className="monitor-header">
          <h3>🔧 Development Mode</h3>
          <p>Production monitoring is disabled in development environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="production-monitor">
      <div className="monitor-header">
        <h3>📊 Production Monitoring Dashboard</h3>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          {lastUpdate && (
            <span className="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="monitor-grid">
        {/* Performance Overview */}
        <div className="monitor-card performance">
          <h4>⚡ Performance</h4>
          <div className="score-display">
            <div 
              className="score-circle"
              style={{ borderColor: getScoreColor(monitoringData.performance.score) }}
            >
              <span style={{ color: getScoreColor(monitoringData.performance.score) }}>
                {monitoringData.performance.score}
              </span>
            </div>
          </div>
          <div className="metrics-grid">
            <div className="metric">
              <span className="label">FCP</span>
              <span className="value">
                {formatDuration(monitoringData.performance.metrics.firstContentfulPaint)}
              </span>
            </div>
            <div className="metric">
              <span className="label">LCP</span>
              <span className="value">
                {formatDuration(monitoringData.performance.metrics.largestContentfulPaint)}
              </span>
            </div>
            <div className="metric">
              <span className="label">DCL</span>
              <span className="value">
                {formatDuration(monitoringData.performance.metrics.domContentLoaded)}
              </span>
            </div>
            <div className="metric">
              <span className="label">Memory</span>
              <span className="value">
                {monitoringData.performance.metrics.memoryUsage ? 
                  `${(monitoringData.performance.metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB` : 
                  'N/A'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Security Overview */}
        <div className="monitor-card security">
          <h4>🔒 Security</h4>
          <div className="score-display">
            <div 
              className="score-circle"
              style={{ borderColor: getScoreColor(monitoringData.security.score) }}
            >
              <span style={{ color: getScoreColor(monitoringData.security.score) }}>
                {monitoringData.security.score}
              </span>
            </div>
          </div>
          <div className="threats-list">
            {monitoringData.security.threats.length === 0 ? (
              <div className="no-threats">✅ No threats detected</div>
            ) : (
              monitoringData.security.threats.slice(0, 3).map((threat, index) => (
                <div key={index} className="threat-item">
                  <span 
                    className="threat-severity"
                    style={{ backgroundColor: getSeverityColor(threat.severity) }}
                  >
                    {threat.severity}
                  </span>
                  <span className="threat-description">{threat.description}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="monitor-card system">
          <h4>💻 System Health</h4>
          <div className="system-metrics">
            <div className="metric">
              <span className="label">Response Time</span>
              <span className="value">{formatDuration(monitoringData.system.responseTime)}</span>
            </div>
            <div className="metric">
              <span className="label">Error Rate</span>
              <span className="value">{(monitoringData.system.errorRate * 100).toFixed(2)}%</span>
            </div>
            <div className="metric">
              <span className="label">Active Users</span>
              <span className="value">{monitoringData.system.activeUsers}</span>
            </div>
            <div className="metric">
              <span className="label">Uptime</span>
              <span className="value">{formatDuration(monitoringData.system.uptime)}</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="monitor-card alerts">
          <h4>🚨 Active Alerts</h4>
          <div className="alerts-list">
            {monitoringData.alerts.length === 0 ? (
              <div className="no-alerts">✅ No active alerts</div>
            ) : (
              monitoringData.alerts.slice(-5).map((alert) => (
                <div key={alert.id} className="alert-item">
                  <span 
                    className="alert-severity"
                    style={{ backgroundColor: getSeverityColor(alert.severity) }}
                  >
                    {alert.severity}
                  </span>
                  <div className="alert-content">
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Performance Trend Chart */}
      {monitoringData.performance.trend.length > 1 && (
        <div className="monitor-card trend-chart">
          <h4>📈 Performance Trend</h4>
          <div className="chart-container">
            <svg className="trend-svg" viewBox="0 0 400 100">
              {monitoringData.performance.trend.map((point, index) => {
                if (index === 0) return null;
                const prevPoint = monitoringData.performance.trend[index - 1];
                return (
                  <line
                    key={index}
                    x1={(index - 1) * (400 / (monitoringData.performance.trend.length - 1))}
                    y1={100 - prevPoint.score}
                    x2={index * (400 / (monitoringData.performance.trend.length - 1))}
                    y2={100 - point.score}
                    stroke={getScoreColor(point.score)}
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionMonitor;
