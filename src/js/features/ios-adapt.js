/**
 * PM-18: Adaptive UI for iPhone (Safari and Home Screen app)
 * 
 * Provides safe-area aware layout, responsive viewport detection,
 * and device-specific optimizations for iOS Safari browsers.
 */

(function() {
  "use strict";

  // ========== DYNAMIC VIEWPORT DETECTION =========
  
  /**
   * Detect current viewport and set corresponding CSS variables
   */
  function updateViewportVariables() {
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;
    
    // Set dynamic view-height variable for JS calculations
    if (typeof document.documentElement.style !== 'undefined') {
      document.documentElement.style.setProperty('--view-height', `${vh}px`);
    }
  }

  // ========== SAFE AREA DETECTION =========
  
  /**
   * Get safe-area values from CSS custom properties or browser env variables
   */
  function getSafeAreaValues() {
    const result = { top: 0, bottom: 0, left: 0, right: 0 };
    
    // Try CSS variables first (modern iOS browsers)
    if (typeof window.getComputedStyle !== 'undefined') {
      try {
        const rootStyles = getComputedStyle(document.documentElement);
        result.top = parseInt(rootStyles.getPropertyValue('--safe-area-top')) || 0;
        result.bottom = parseInt(rootStyles.getPropertyValue('--safe-area-bottom')) || 0;
        result.left = parseInt(rootStyles.getPropertyValue('--safe-area-inset-left')) || 0;
        result.right = parseInt(rootStyles.getPropertyValue('--safe-area-inset-right')) || 0;
      } catch (e) {
        // Fallback to env variables
      }
    }
    
    // Fall back to browser env variables (iOS Safari)
    try {
      const nav = window.navigator.userAgent.includes("Safari") && 
                   navigator.userAgent.indexOf("Chrome") === -1;
      if (nav) {
        result.top = parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 
                    parseInt(env('safe-area-top', '0'));
        result.bottom = parseInt(env('safe-area-bottom', '0'));
        result.left = parseInt(env('safe-area-left', '0'));
        result.right = parseInt(env('safe-area-right', '0'));
      }
    } catch (e) {}
    
    return result;
  }

  /**
   * Check if element is within safe area bounds
   */
  function isInSafeArea(el) {
    const rect = el.getBoundingClientRect();
    const safe = getSafeAreaValues();
    
    // Simple check: if rect's max value exceeds safe-area max, it might overflow
    return !(rect.width + (safe.right || 0) < window.innerWidth ||
              rect.top > (safe.top || 0));
  }

  /**
   * Detect portrait/landscape orientation
   */
  function getOrientation() {
    if (window.orientation !== undefined) {
      return window.orientation === 90 ? 'landscape' : 'portrait';
    }
    // Fallback for non-orientation-aware browsers
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;
    return vw > vh ? 'landscape' : 'portrait';
  }

  /**
   * Check if device is likely an iPhone (AC1/2 device-specific handling)
   */
  function isiPhone() {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('iphone') || ua.includes('ipad') || 
           (typeof getComputedStyle !== 'undefined' && window.innerWidth < 600);
  }

  /**
   * Apply device-specific optimizations
   */
  function applyDeviceOptimizations() {
    if (!isiPhone()) return;
    
    // iOS Safari specific optimizations
    const body = document.body;
    
    // Prevent zoom on double tap (AC7)
    document.addEventListener('dblclick', function(event) {
      event.preventDefault();
      event.stopPropagation();
    }, true);
    
    // Disable text selection
    document.body.classList.add('no-text-selection');
    
    // Add touch-action: pan-y to allow gestures while preventing default
    input, select, button;
    try {
      Object.values(document.querySelectorAll('input, select, button')).forEach(function(el) {
        el.style.touchAction = 'pan-y';
      });
    } catch (e) {}
  }

  // ========== RESPONSIVE LAYOUT HANDLERS =========
  
  /**
   * Adjust layout based on current orientation
   */
  function adjustLayoutForOrientation() {
    const orientation = getOrientation();
    
    if (orientation === 'landscape') {
      // Two-column game layout
      const gameContainer = document.querySelector('.game-container');
      if (gameContainer) {
        gameContainer.classList.add('landscape-mode');
        
        // Adjust topbar for landscape
        const topbar = document.querySelector('.topbar');
        if (topbar) {
          topbar.classList.add('landscape-mode');
        }
      }
    } else {
      // Portrait mode - single column preferred unless medium viewport
      const gameContainer = document.querySelector('.game-container');
      if (gameContainer) {
        gameContainer.classList.remove('landscape-mode');
      }
    }
  }

  /**
   * Adjust safe-area padding for critical elements
   */
  function adjustSafeAreas() {
    const safe = getSafeAreaValues();
    
    // Adjust topbar bottom gap if needed
    const topbar = document.querySelector('.topbar');
    if (topbar && safe.top > 0) {
      topbar.style.marginBottom = `calc(var(--safe-area-inset-top))`;
    }
    
    // Adjust question-box height
    const questionBox = document.querySelector('.question-box');
    if (questionBox && safe.bottom > 0) {
      questionBox.style.maxHeight = 
        `calc(60vh - var(--safe-area-inset-bottom))`;
    }
    
    // Adjust keypad
    const keypad = document.querySelector('.keypad');
    if (keypad && safe.bottom > 0) {
      keypad.style.maxBottom = 
        `calc(70vh - var(--safe-area-inset-bottom))`;
    }
  }

  /**
   * Adjust layout for Home Screen app mode (PM-18 AC8)
   */
  function enableHomeScreenAppMode() {
    const body = document.body;
    
    // Add back button to all screens
    if (!body.classList.contains('home-app')) {
      body.classList.add('home-app');
      
      // Add back button UI (if needed)
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-btn';
        topbar.insertBefore(backBtn, topbar.firstChild);
      }
    }
  }

  /**
   * Prevent zoom on quick double taps (AC7)
   */
  function preventQuickZoom() {
    document.addEventListener('touchstart', function(e) {
      const touchCount = e.touches.length;
      if (touchCount === 2 && !e.shiftKey) {
        // Only prevent if we've seen one tap already this second
        if (!window.lastTap || Date.now() - window.lastTap > 300) {
          e.preventDefault();
        }
        window.lastTap = Date.now();
      }
    }, true);
  }

  /**
   * Lazy image loading for catalog (AC6)
   */
  function enableLazyImages() {
    const images = document.querySelectorAll('.evo-stage img:not([src])');
    
    if (!images.length) return;
    
    // Create new Image objects to fetch before display
    const lazyMap = {};
    images.forEach(function(img) {
      const src = img.getAttribute('src');
      if (src) {
        const newImg = new Image();
        newImg.src = src;
        newImg.onload = function() {
          img.src = src;
          img.parentElement.classList.add('loaded');
        };
        lazyMap[src] = newImg;
      }
    });
  }

  // ========== INITIALIZATION =========
  
  /**
   * Initialize iOS adaptive UI
   */
  function initIosAdapt() {
    // Run on page load
    updateViewportVariables();
    applyDeviceOptimizations();
    adjustLayoutForOrientation();
    adjustSafeAreas();
    
    // Event listeners for dynamic updates
    window.addEventListener('resize', function() {
      updateViewportVariables();
      adjustLayoutForOrientation();
      adjustSafeAreas();
    });
    
    window.addEventListener('orientationchange', function() {
      adjustLayoutForOrientation();
    });
    
    // Enable lazy images
    enableLazyImages();
    
    // Home screen app mode
    enableHomeScreenAppMode();
  }

  // ========== EXPORT =========
  
  if (typeof window !== 'undefined') {
    window.PM_IOS_Adapt = {
      updateViewportVariables: updateViewportVariables,
      getSafeAreaValues: getSafeAreaValues,
      isInSafeArea: isInSafeArea,
      getOrientation: getOrientation,
      isiPhone: isiPhone,
      applyDeviceOptimizations: applyDeviceOptimizations,
      adjustLayoutForOrientation: adjustLayoutForOrientation,
      adjustSafeAreas: adjustSafeAreas,
      enableHomeScreenAppMode: enableHomeScreenAppMode,
      preventQuickZoom: preventQuickZoom,
      enableLazyImages: enableLazyImages,
      
      // Auto-initialize on load
      init: initIosAdapt
    };
    
    // Auto-run when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIosAdapt);
    } else {
      initIosAdapt();
    }
  }

})();
