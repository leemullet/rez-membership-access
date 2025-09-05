/*
 * INFINITE TICKER IMPLEMENTATION TODO LIST
 * ========================================
 *
 * STEP 1: ADD THE SCRIPT
 * - [ ] Include the InfiniteTicker JavaScript file in your project
 * - [ ] Add <script src="https://yytjx2.csb.app/infinite-ticker.js"></script> before closing </body>
 *
 * STEP 2: HTML STRUCTURE
 * - [ ] Create wrapper element with class "ticker"
 * - [ ] Add ticker items inside with class "ticker-item"
 * - [ ] Basic structure:
 *       <div class="ticker">
 *         <div class="ticker-item">Content 1</div>
 *         <div class="ticker-item">Content 2</div>
 *         <div class="ticker-item">Content 3</div>
 *       </div>
 *
 * STEP 3: OPTIONAL HTML ATTRIBUTES (add to .ticker element)
 * - [ ] ticker-speed="50" - Set animation speed (pixels per second)
 * - [ ] ticker-gap="20" - Set space between items (pixels)
 * - [ ] ticker-direction="left" - Direction: "left" or "right"
 * - [ ] ticker-pause-on-hover="true" - Enable/disable hover pause
 * - [ ] ticker-pause-on-focus="true" - Enable/disable focus pause
 *
 * STEP 4: WEBFLOW SPECIFIC (if using Webflow)
 * - [ ] Add "ticker" class to a wrapper wrapping the Collection List wrapper
 * - [ ] Add "ticker-item" class to Collection Item within the CMS setup
 * - [ ] Set Collection List to show ALL items (no limit)
 *
 * STEP 5: BASIC CSS
 * - [ ] Style .ticker container (width, height, background)
 * - [ ] Style .ticker-item elements (padding, fonts, colors)
 *
 * That's it! The script auto-initializes when the page loads.
 */

class InfiniteTicker {
    constructor(options = {}) {
      this.options = {
        selector: ".ticker",
        itemSelector: ".ticker-item",
        speed: 50,
        gap: 20,
        direction: "left",
        pauseOnHover: true,
        pauseOnFocus: true,
        debug: false, // Set to true to enable debug logging
        responsive: {
          mobile: { maxWidth: 768, gap: 10, speed: 40 },
          tablet: { maxWidth: 1024, gap: 15, speed: 45 },
        },
        ...options,
      };
  
      this.tickers = [];
      this.animationFrameId = null;
      this.isInitialized = false;
      this.isMobile = this.checkMobile();
      this.lastWindowWidth = window.innerWidth;
      this.resizeThreshold = 100; // Only resize if width changes by more than this
  
      this.init();
    }
  
    // Check if device is mobile
    checkMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768;
    }
  
    // Debug logging helper
    log(...args) {
      if (this.options.debug) {
        console.log("[Ticker]", ...args);
      }
    }
  
    warn(...args) {
      console.warn("[Ticker]", ...args);
    }
  
    error(...args) {
      console.error("[Ticker]", ...args);
    }
  
    init() {
      const elements = document.querySelectorAll(this.options.selector);
  
      if (elements.length === 0) {
        this.warn(`No elements found with selector: ${this.options.selector}`);
        return;
      }
  
      elements.forEach((element) => this.setupTicker(element));
      this.setupEventListeners();
      this.startAnimation();
      this.isInitialized = true;
    }
  
    setupTicker(element) {
      const ticker = {
        element,
        container: null,
        items: [],
        isPaused: false,
        currentOffset: 0,
        progress: 0, // Track progress as percentage
        containerWidth: 0,
        itemsWidth: 0,
        config: this.getElementConfig(element),
      };
  
      this.createTickerStructure(ticker);
      this.calculateDimensions(ticker);
      this.cloneItemsForInfiniteScroll(ticker);
      this.setupAccessibility(ticker);
      this.setupInteractionListeners(ticker);
  
      this.tickers.push(ticker);
    }
  
    getElementConfig(element) {
      const responsive = this.getResponsiveConfig();
  
      return {
        speed:
          parseFloat(element.getAttribute("ticker-speed")) ||
          responsive.speed ||
          this.options.speed,
        gap:
          parseInt(element.getAttribute("ticker-gap")) ||
          responsive.gap ||
          this.options.gap,
        direction:
          element.getAttribute("ticker-direction") || this.options.direction,
        pauseOnHover:
          element.getAttribute("ticker-pause-on-hover") !== "false" &&
          this.options.pauseOnHover,
        pauseOnFocus:
          element.getAttribute("ticker-pause-on-focus") !== "false" &&
          this.options.pauseOnFocus,
      };
    }
  
    getResponsiveConfig() {
      const width = window.innerWidth;
      const { mobile, tablet } = this.options.responsive;
  
      if (width <= mobile.maxWidth) return mobile;
      if (width <= tablet.maxWidth) return tablet;
      return {};
    }
  
    createTickerStructure(ticker) {
      const { element, config } = ticker;
      const tickerItems = element.querySelectorAll(this.options.itemSelector);
  
      if (tickerItems.length === 0) {
        this.error(
          'No ticker items found. Make sure Collection Items have the "ticker-item" class.'
        );
        return;
      }
  
      ticker.originalItems = Array.from(tickerItems);
  
      // Create new container
      ticker.container = document.createElement("div");
      ticker.container.className = "ticker-container";
      ticker.container.style.cssText = `
        display: flex;
        align-items: center;
        gap: ${config.gap}px;
        will-change: transform;
        position: relative;
        transform: translateZ(0);
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      `;
  
      // Setup main element
      element.style.cssText = `
        position: relative;
        overflow: hidden;
        width: 100%;
        -webkit-mask-image: linear-gradient(90deg, transparent, black 2%, black 98%, transparent);
        mask-image: linear-gradient(90deg, transparent, black 2%, black 98%, transparent);
      `;
  
      // Clear element and add container
      element.innerHTML = "";
      element.appendChild(ticker.container);
  
      // Add original items to container
      ticker.originalItems.forEach((item) => {
        const itemClone = item.cloneNode(true);
        itemClone.style.cssText += `
          flex-shrink: 0;
          white-space: nowrap;
        `;
        ticker.container.appendChild(itemClone);
      });
    }
  
    calculateDimensions(ticker) {
      // Force layout calculation
      ticker.element.offsetHeight;
  
      ticker.containerWidth = ticker.element.offsetWidth;
  
      // Calculate the width of one complete set of items
      let totalItemWidth = 0;
      const items = ticker.container.children;
  
      for (let i = 0; i < ticker.originalItems.length; i++) {
        if (items[i]) {
          totalItemWidth += items[i].offsetWidth;
          if (i < ticker.originalItems.length - 1) {
            totalItemWidth += ticker.config.gap;
          }
        }
      }
  
      ticker.singleSetWidth = totalItemWidth;
      this.log("Container width:", ticker.containerWidth);
      this.log("Single set width:", ticker.singleSetWidth);
    }
  
    cloneItemsForInfiniteScroll(ticker, preservePosition = false) {
      const { container, containerWidth, singleSetWidth } = ticker;
      
      // Store current progress before cloning
      let currentProgress = 0;
      if (preservePosition && ticker.singleSetWidth) {
        currentProgress = Math.abs(ticker.currentOffset % ticker.singleSetWidth) / ticker.singleSetWidth;
      }
  
      // Remove existing clones
      const existingClones = container.querySelectorAll(".ticker-clone");
      existingClones.forEach((clone) => clone.remove());
  
      // Calculate how many complete sets we need to fill the screen + buffer
      const setsNeeded = Math.ceil((containerWidth * 2) / singleSetWidth) + 2;
      this.log("Sets needed for infinite scroll:", setsNeeded);
  
      // Clone original items multiple times
      for (let set = 0; set < setsNeeded; set++) {
        ticker.originalItems.forEach((item) => {
          const clone = item.cloneNode(true);
          clone.classList.add("ticker-clone");
          clone.setAttribute("aria-hidden", "true");
          clone.style.cssText += `
            flex-shrink: 0;
            white-space: nowrap;
          `;
          container.appendChild(clone);
        });
      }
  
      // Update total width
      ticker.totalWidth = container.scrollWidth;
  
      // Restore position or set initial
      if (preservePosition && currentProgress > 0) {
        // Restore previous progress
        if (ticker.config.direction === "left") {
          ticker.currentOffset = -singleSetWidth * currentProgress;
        } else {
          ticker.currentOffset = -singleSetWidth * (1 - currentProgress);
        }
      } else {
        // Set initial position based on direction
        if (ticker.config.direction === "right") {
          ticker.currentOffset = -singleSetWidth;
        } else {
          ticker.currentOffset = 0;
        }
      }
  
      this.log("Total width after cloning:", ticker.totalWidth);
      this.log("Restored offset:", ticker.currentOffset);
    }
  
    setupAccessibility(ticker) {
      const { element } = ticker;
  
      element.setAttribute("role", "marquee");
      element.setAttribute("aria-live", "off");
      element.setAttribute("aria-label", "Scrolling content");
  
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        ticker.config.speed = 0;
      }
    }
  
    setupInteractionListeners(ticker) {
      const { element, config } = ticker;
      
      // Touch detection
      let touchStartX = 0;
      let touchStartY = 0;
      let isTouching = false;
  
      // Touch handlers for mobile
      if (this.isMobile) {
        const handleTouchStart = (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          isTouching = true;
          
          if (config.pauseOnHover) {
            ticker.isPaused = true;
          }
        };
  
        const handleTouchMove = (e) => {
          if (!isTouching) return;
          
          const touchX = e.touches[0].clientX;
          const touchY = e.touches[0].clientY;
          const diffX = Math.abs(touchX - touchStartX);
          const diffY = Math.abs(touchY - touchStartY);
          
          // If scrolling vertically, don't pause ticker
          if (diffY > diffX) {
            ticker.isPaused = false;
            isTouching = false;
          }
        };
  
        const handleTouchEnd = () => {
          isTouching = false;
          ticker.isPaused = false;
        };
  
        element.addEventListener("touchstart", handleTouchStart, { passive: true });
        element.addEventListener("touchmove", handleTouchMove, { passive: true });
        element.addEventListener("touchend", handleTouchEnd, { passive: true });
        element.addEventListener("touchcancel", handleTouchEnd, { passive: true });
        
        ticker.touchStartHandler = handleTouchStart;
        ticker.touchMoveHandler = handleTouchMove;
        ticker.touchEndHandler = handleTouchEnd;
      } else {
        // Desktop hover handling
        if (config.pauseOnHover) {
          const handleMouseEnter = () => {
            ticker.isPaused = true;
            element.style.cursor = "pointer";
          };
  
          const handleMouseLeave = () => {
            ticker.isPaused = false;
            element.style.cursor = "default";
          };
  
          element.addEventListener("mouseenter", handleMouseEnter, { passive: true });
          element.addEventListener("mouseleave", handleMouseLeave, { passive: true });
          
          ticker.mouseEnterHandler = handleMouseEnter;
          ticker.mouseLeaveHandler = handleMouseLeave;
        }
      }
  
      // Focus handling (both mobile and desktop)
      if (config.pauseOnFocus) {
        const handleFocusIn = () => {
          ticker.isPaused = true;
        };
  
        const handleFocusOut = () => {
          ticker.isPaused = false;
        };
  
        element.addEventListener("focusin", handleFocusIn);
        element.addEventListener("focusout", handleFocusOut);
  
        ticker.focusInHandler = handleFocusIn;
        ticker.focusOutHandler = handleFocusOut;
      }
  
      // Ensure element can receive events
      element.style.pointerEvents = "auto";
    }
  
    setupEventListeners() {
      let resizeTimeout;
      let lastHeight = window.innerHeight;
  
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        
        resizeTimeout = setTimeout(() => {
          const currentWidth = window.innerWidth;
          const currentHeight = window.innerHeight;
          const widthDiff = Math.abs(currentWidth - this.lastWindowWidth);
          const heightDiff = Math.abs(currentHeight - lastHeight);
          
          // Only handle resize if width changed significantly
          // Ignore height-only changes (mobile address bar)
          if (widthDiff > this.resizeThreshold) {
            this.log(`Significant width change detected: ${widthDiff}px`);
            this.lastWindowWidth = currentWidth;
            lastHeight = currentHeight;
            this.handleResize();
          } else if (heightDiff > 0 && widthDiff === 0) {
            // Height-only change (likely mobile address bar)
            this.log("Height-only change detected, ignoring...");
            lastHeight = currentHeight;
          }
        }, 250);
      });
  
      // Visibility change handling
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.stopAnimation();
        } else {
          this.startAnimation();
        }
      });
      
      // Handle orientation change separately
      if (this.isMobile) {
        window.addEventListener("orientationchange", () => {
          setTimeout(() => {
            this.lastWindowWidth = window.innerWidth;
            this.handleResize();
          }, 300);
        });
      }
    }
  
    handleResize() {
      this.log("Handling resize with position preservation...");
      this.tickers.forEach((ticker) => {
        ticker.config = this.getElementConfig(ticker.element);
        ticker.container.style.gap = `${ticker.config.gap}px`;
        this.calculateDimensions(ticker);
        // Pass true to preserve position
        this.cloneItemsForInfiniteScroll(ticker, true);
      });
    }
  
    startAnimation() {
      if (this.animationFrameId) return;
  
      let lastTime = 0;
      const animate = (currentTime) => {
        if (lastTime === 0) lastTime = currentTime;
        const deltaTime = Math.min(currentTime - lastTime, 50); // Cap deltaTime to prevent jumps
        lastTime = currentTime;
  
        this.tickers.forEach((ticker) => this.updateTicker(ticker, deltaTime));
        this.animationFrameId = requestAnimationFrame(animate);
      };
  
      this.animationFrameId = requestAnimationFrame(animate);
    }
  
    stopAnimation() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  
    updateTicker(ticker, deltaTime) {
      if (ticker.isPaused || ticker.config.speed === 0 || !ticker.singleSetWidth)
        return;
  
      const { container, config, singleSetWidth } = ticker;
      const movement = (config.speed * deltaTime) / 1000;
  
      if (config.direction === "left") {
        ticker.currentOffset -= movement;
        if (ticker.currentOffset <= -singleSetWidth) {
          ticker.currentOffset += singleSetWidth;
        }
      } else {
        ticker.currentOffset += movement;
        if (ticker.currentOffset >= 0) {
          ticker.currentOffset = -singleSetWidth;
        }
      }
  
      // Use transform3d for better mobile performance
      container.style.transform = `translate3d(${ticker.currentOffset}px, 0, 0)`;
    }
  
    // Public methods
    pause(selector = null) {
      this.tickers
        .filter((ticker) => !selector || ticker.element.matches(selector))
        .forEach((ticker) => {
          ticker.isPaused = true;
        });
    }
  
    resume(selector = null) {
      this.tickers
        .filter((ticker) => !selector || ticker.element.matches(selector))
        .forEach((ticker) => {
          ticker.isPaused = false;
        });
    }
  
    setSpeed(speed, selector = null) {
      this.tickers
        .filter((ticker) => !selector || ticker.element.matches(selector))
        .forEach((ticker) => {
          ticker.config.speed = speed;
        });
    }
  
    // Enable/disable debug logging
    enableDebug() {
      this.options.debug = true;
    }
  
    disableDebug() {
      this.options.debug = false;
    }
  
    destroy() {
      this.stopAnimation();
  
      this.tickers.forEach((ticker) => {
        // Remove event listeners
        if (ticker.mouseEnterHandler) {
          ticker.element.removeEventListener("mouseenter", ticker.mouseEnterHandler);
        }
        if (ticker.mouseLeaveHandler) {
          ticker.element.removeEventListener("mouseleave", ticker.mouseLeaveHandler);
        }
        if (ticker.touchStartHandler) {
          ticker.element.removeEventListener("touchstart", ticker.touchStartHandler);
        }
        if (ticker.touchMoveHandler) {
          ticker.element.removeEventListener("touchmove", ticker.touchMoveHandler);
        }
        if (ticker.touchEndHandler) {
          ticker.element.removeEventListener("touchend", ticker.touchEndHandler);
          ticker.element.removeEventListener("touchcancel", ticker.touchEndHandler);
        }
        if (ticker.focusInHandler) {
          ticker.element.removeEventListener("focusin", ticker.focusInHandler);
        }
        if (ticker.focusOutHandler) {
          ticker.element.removeEventListener("focusout", ticker.focusOutHandler);
        }
  
        if (ticker.element) {
          ticker.element.removeAttribute("style");
          ticker.element.innerHTML = "";
  
          // Restore original items
          ticker.originalItems.forEach((item) => {
            ticker.element.appendChild(item);
          });
        }
      });
  
      this.tickers = [];
      this.isInitialized = false;
    }
  }
  
  // Clean Webflow initialization
  function initializeWebflowTicker() {
    const tryInitialize = () => {
      const tickerElements = document.querySelectorAll(".ticker");
  
      if (tickerElements.length === 0) {
        console.warn("No ticker elements found");
        return false;
      }
  
      // Check if ticker items exist
      let hasTickerItems = false;
      tickerElements.forEach((element) => {
        if (element.querySelectorAll(".ticker-item").length > 0) {
          hasTickerItems = true;
        }
      });
  
      if (!hasTickerItems) {
        console.warn("No ticker items found, waiting for CMS content...");
        return false;
      }
  
      // Initialize with debug disabled by default
      window.webflowTicker = new InfiniteTicker({
        selector: ".ticker",
        itemSelector: ".ticker-item",
        speed: 50,
        gap: 20,
        direction: "left",
        pauseOnHover: true,
        debug: false, // Set to true if you need debugging
        responsive: {
          mobile: { maxWidth: 768, gap: 10, speed: 30 },
          tablet: { maxWidth: 1024, gap: 15, speed: 40 },
        },
      });
  
      console.log("Ticker initialized successfully!");
      return true;
    };
  
    // Try immediately
    if (tryInitialize()) return;
  
    // Retry with backoff
    let attempts = 0;
    const maxAttempts = 10;
  
    const retryInitialization = () => {
      attempts++;
  
      if (tryInitialize() || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) {
          console.error("Failed to initialize ticker after maximum attempts");
        }
        return;
      }
  
      setTimeout(retryInitialization, 500);
    };
  
    setTimeout(retryInitialization, 500);
  }
  
  // Auto-initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWebflowTicker);
  } else {
    initializeWebflowTicker();
  }
  
  // Export for module systems
  if (typeof module !== "undefined" && module.exports) {
    module.exports = InfiniteTicker;
  }
  if (typeof window !== "undefined") {
    window.InfiniteTicker = InfiniteTicker;
  }
  
  // Usage examples:
  // 
  // Enable debug logging:
  // window.webflowTicker.enableDebug();
  // 
  // Disable debug logging:
  // window.webflowTicker.disableDebug();
  // 
  // Create ticker with debug enabled:
  // new InfiniteTicker({ debug: true });
