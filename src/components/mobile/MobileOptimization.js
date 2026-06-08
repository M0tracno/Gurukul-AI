import React, { useRef, useEffect, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Mobile optimization utilities and touch gesture support

// Touch gesture detection hook
export const useTouchGestures = (element, options = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onTap,
    onDoubleTap,
    onLongPress,
    threshold = 50,
    longPressDelay = 500,
  } = options;

  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    initialDistance: 0,
    tapCount: 0,
  });

  useEffect(() => {
    if (!element?.current) return;

    const el = element.current;
    let longPressTimer = null;
    let doubleTapTimer = null;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      const time = Date.now();

      setTouchState(prev => ({
        ...prev,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: time,
        initialDistance: e.touches.length > 1 ? 
          getDistance(e.touches[0], e.touches[1]) : 0,
      }));

      // Long press detection
      if (onLongPress) {
        longPressTimer = setTimeout(() => {
          onLongPress(e);
        }, longPressDelay);
      }

      e.preventDefault();
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      
      setTouchState(prev => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
      }));

      // Clear long press if moved too much
      if (longPressTimer) {
        const deltaX = Math.abs(touch.clientX - touchState.startX);
        const deltaY = Math.abs(touch.clientY - touchState.startY);
        
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      // Pinch detection
      if (e.touches.length === 2 && onPinch) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / touchState.initialDistance;
        onPinch({ scale, distance: currentDistance });
      }

      e.preventDefault();
    };

    const handleTouchEnd = (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      const deltaX = touchState.currentX - touchState.startX;
      const deltaY = touchState.currentY - touchState.startY;
      const deltaTime = Date.now() - touchState.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Swipe detection
      if (distance > threshold && deltaTime < 500) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && onSwipeRight) onSwipeRight(e);
          if (deltaX < 0 && onSwipeLeft) onSwipeLeft(e);
        } else {
          if (deltaY > 0 && onSwipeDown) onSwipeDown(e);
          if (deltaY < 0 && onSwipeUp) onSwipeUp(e);
        }
      }

      // Tap detection
      if (distance < 10 && deltaTime < 300) {
        setTouchState(prev => ({ ...prev, tapCount: prev.tapCount + 1 }));

        if (doubleTapTimer) {
          clearTimeout(doubleTapTimer);
          doubleTapTimer = null;
          if (onDoubleTap) onDoubleTap(e);
          setTouchState(prev => ({ ...prev, tapCount: 0 }));
        } else {
          doubleTapTimer = setTimeout(() => {
            if (touchState.tapCount === 1 && onTap) onTap(e);
            setTouchState(prev => ({ ...prev, tapCount: 0 }));
            doubleTapTimer = null;
          }, 250);
        }
      }
    };

    const getDistance = (touch1, touch2) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimer) clearTimeout(longPressTimer);
      if (doubleTapTimer) clearTimeout(doubleTapTimer);
    };
  }, [element, options, touchState]);

  return touchState;
};

// Responsive design hook
export const useResponsiveDesign = () => {
  const theme = useTheme();
  const originalTheme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  const [orientation, setOrientation] = useState(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    orientation,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
};

// Touch-friendly component wrapper
export const TouchFriendlyWrapper = React.forwardRef(({ 
  children, 
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onTap,
  onDoubleTap,
  onLongPress,
  style,
  ...props 
}, ref) => {
  const elementRef = useRef();
  const { isMobile } = useResponsiveDesign();

  useTouchGestures(elementRef, {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onTap,
    onDoubleTap,
    onLongPress,
  });

  const touchFriendlyStyle = {
    ...style,
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    ...(isMobile && {
      minHeight: '44px', // iOS accessibility guideline
      minWidth: '44px',
    }),
  };

  return (
    <div
      ref={(el) => {
        elementRef.current = el;
        if (ref) {
          if (typeof ref === 'function') ref(el);
          else ref.current = el;
        }
      }}
      style={touchFriendlyStyle}
      {...props}
    >
      {children}
    </div>
  );
});

// Pull-to-refresh component
export const PullToRefresh = ({ 
  onRefresh, 
  children, 
  refreshThreshold = 80,
  loadingComponent = <div>Refreshing...</div> 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef();

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (startY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      setPullDistance(distance);
      
      if (distance > 0) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > refreshThreshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setStartY(0);
  };

  const pullProgress = Math.min(pullDistance / refreshThreshold, 1);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        transform: `translateY(${pullDistance * 0.5}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            position: 'absolute',
            top: -60,
            left: 0,
            right: 0,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pullProgress,
            transform: `scale(${pullProgress})`,
          }}
        >
          {isRefreshing ? loadingComponent : '⬇️ Pull to refresh'}
        </div>
      )}
      {children}
    </div>
  );
};

// Virtual keyboard detection hook
export const useVirtualKeyboard = () => {
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      if (heightDifference > 150) { // Threshold for keyboard detection
        setIsVirtualKeyboardOpen(true);
        setKeyboardHeight(heightDifference);
      } else {
        setIsVirtualKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      };
    } else {
      window.addEventListener('resize', handleViewportChange);
      return () => {
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  return { isVirtualKeyboardOpen, keyboardHeight };
};

// Mobile-optimized navigation component
export const MobileNavigation = ({ 
  items, 
  onItemSelect, 
  currentPath,
  bottomNavigation = true 
}) => {
  const { isMobile } = useResponsiveDesign();
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isMobile) return null;

  const handleItemSelect = (item, index) => {
    setSelectedIndex(index);
    onItemSelect(item, index);
  };

  const navStyle = {
    position: 'fixed',
    bottom: bottomNavigation ? 0 : 'auto',
    top: bottomNavigation ? 'auto' : 0,
    left: 0,
    right: 0,
    display: 'flex',
    backgroundColor: '#fff',
    borderTop: bottomNavigation ? '1px solid #e0e0e0' : 'none',
    borderBottom: bottomNavigation ? 'none' : '1px solid #e0e0e0',
    zIndex: 1000,
    height: '60px',
    alignItems: 'center',
    justifyContent: 'space-around',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
  };

  const itemStyle = (index) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    color: index === selectedIndex ? '#1976d2' : '#757575',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    minHeight: '44px', // Touch target size
  });

  return (
    <nav style={navStyle}>
      {items.map((item, index) => (
        <div
          key={item.key}
          style={itemStyle(index)}
          onClick={() => handleItemSelect(item, index)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleItemSelect(item, index);
            }
          }}
        >
          {item.icon}
          <span style={{ marginTop: '4px' }}>{item.label}</span>
        </div>
      ))}
    </nav>
  );
};

// Device capabilities detection
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    hasTouch: false,
    hasCamera: false,
    hasGeolocation: false,
    hasDeviceMotion: false,
    hasVibration: false,
    isStandalone: false,
    connectionType: 'unknown',
    deviceMemory: 'unknown',
  });

  useEffect(() => {
    const detectCapabilities = async () => {
      const newCapabilities = {
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        hasGeolocation: 'geolocation' in navigator,
        hasDeviceMotion: 'DeviceMotionEvent' in window,
        hasVibration: 'vibrate' in navigator,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone === true,
        connectionType: navigator.connection?.effectiveType || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
      };

      // Test camera access (non-intrusive)
      if (newCapabilities.hasCamera) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          newCapabilities.hasCamera = devices.some(device => device.kind === 'videoinput');
        } catch {
          newCapabilities.hasCamera = false;
        }
      }

      setCapabilities(newCapabilities);
    };

    detectCapabilities();
  }, []);

  return capabilities;
};

// Safe area handling for notched devices
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);
  return safeArea;
};

const MobileOptimization = {
  useTouchGestures,
  useResponsiveDesign,
  TouchFriendlyWrapper,
  PullToRefresh,
  useVirtualKeyboard,
  MobileNavigation,
  useDeviceCapabilities,
  useSafeArea,
};

export default MobileOptimization;
