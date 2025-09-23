/*
 * GSAP-POWERED INFINITE TICKER
 * ----------------------------
 * Drop-in alternative to the rAF ticker using GSAP for smoother, robust timing.
 *
 * Requirements: GSAP 3.x. If not present, this script will lazy-load it from CDN.
 *
 * Usage (auto-init on DOMContentLoaded):
 *   new GsapInfiniteTicker({ selector: '.ticker', itemSelector: '.ticker-item' });
 */

(function () {
  function loadGsapIfNeeded(onReady) {
    if (typeof window !== "undefined" && window.gsap) {
      onReady(window.gsap);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js";
    script.async = true;
    script.onload = function () { onReady(window.gsap); };
    script.onerror = function () { console.error("[Ticker] Failed to load GSAP"); };
    document.head.appendChild(script);
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  function isMobileUA() {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function GsapInfiniteTicker(options) {
    this.options = {
      selector: ".ticker",
      itemSelector: ".ticker-item",
      gap: 20,
      speed: 50, // px/s
      direction: "left", // or "right"
      pauseOnHover: true,
      pauseOnFocus: true,
      responsive: {
        mobile: { maxWidth: 768, gap: 10, speed: 40 },
        tablet: { maxWidth: 1024, gap: 15, speed: 45 }
      }
    };
    for (var k in options) this.options[k] = options[k];

    this.tickers = [];
    this._isMobile = isMobileUA() || (typeof window !== "undefined" && window.innerWidth <= 768);
    this._visibilityPaused = false;
    this._reducedMotionMql = null;

    var self = this;
    loadGsapIfNeeded(function () { self.init(); });
  }

  GsapInfiniteTicker.prototype._getResponsive = function () {
    var width = window.innerWidth;
    var r = this.options.responsive || {};
    var mobile = r.mobile || { maxWidth: 0 };
    var tablet = r.tablet || { maxWidth: 0 };
    if (mobile.maxWidth && width <= mobile.maxWidth) return mobile;
    if (tablet.maxWidth && width <= tablet.maxWidth) return tablet;
    return {};
  };

  GsapInfiniteTicker.prototype._getElementConfig = function (el) {
    var resp = this._getResponsive();
    return {
      gap: parseInt(el.getAttribute("ticker-gap")) || resp.gap || this.options.gap,
      speed: parseFloat(el.getAttribute("ticker-speed")) || resp.speed || this.options.speed,
      direction: el.getAttribute("ticker-direction") || this.options.direction,
      pauseOnHover: el.getAttribute("ticker-pause-on-hover") !== "false" && this.options.pauseOnHover,
      pauseOnFocus: el.getAttribute("ticker-pause-on-focus") !== "false" && this.options.pauseOnFocus
    };
  };

  GsapInfiniteTicker.prototype.init = function () {
    var elements = document.querySelectorAll(this.options.selector);
    if (!elements.length) {
      console.warn("[Ticker] No elements found for", this.options.selector);
      return;
    }
    for (var i = 0; i < elements.length; i++) this._setup(elements[i]);
    this._setupGlobalListeners();
  };

  GsapInfiniteTicker.prototype._setup = function (element) {
    var config = this._getElementConfig(element);

    // Build structure
    var originalItems = Array.prototype.slice.call(element.querySelectorAll(this.options.itemSelector));
    if (!originalItems.length) {
      console.error("[Ticker] No ticker items found inside", element);
      return;
    }

    // main wrapper styles
    element.style.position = "relative";
    element.style.overflow = "hidden";
    element.style.width = "100%";

    // container
    var container = document.createElement("div");
    container.className = "ticker-container";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = config.gap + "px";
    container.style.willChange = "transform";
    container.style.backfaceVisibility = "hidden";
    container.style.transform = "translateZ(0)";

    // clone content once for seamless wrap
    var temp = document.createDocumentFragment();
    for (var i = 0; i < originalItems.length; i++) {
      var c1 = originalItems[i].cloneNode(true);
      c1.style.flexShrink = "0";
      c1.style.whiteSpace = "nowrap";
      temp.appendChild(c1);
    }
    for (var j = 0; j < originalItems.length; j++) {
      var c2 = originalItems[j].cloneNode(true);
      c2.setAttribute("aria-hidden", "true");
      c2.style.flexShrink = "0";
      c2.style.whiteSpace = "nowrap";
      temp.appendChild(c2);
    }

    // mount
    element.innerHTML = "";
    element.appendChild(container);
    container.appendChild(temp);

    var ticker = {
      element: element,
      container: container,
      config: config,
      tween: null,
      setWidth: 0,
      autoPaused: false
    };

    this._measureAndAnimate(ticker);
    this._bindInteractions(ticker);
    this.tickers.push(ticker);
  };

  GsapInfiniteTicker.prototype._measureSetWidth = function (ticker) {
    var children = ticker.container.children;
    var half = Math.floor(children.length / 2);
    var total = 0;
    for (var i = 0; i < half; i++) {
      var rect = children[i].getBoundingClientRect();
      total += Math.round(rect.width);
      if (i < half - 1) total += ticker.config.gap;
    }
    ticker.setWidth = Math.max(0, total);
  };

  GsapInfiniteTicker.prototype._measureAndAnimate = function (ticker) {
    var self = this;
    // measure after images/fonts if needed
    this._measureSetWidth(ticker);
    if (!ticker.setWidth) return;

    if (ticker.tween) {
      ticker.tween.kill();
      ticker.tween = null;
    }

    var distance = ticker.setWidth;
    var pxPerSec = Math.max(1, ticker.config.speed);
    var duration = distance / pxPerSec;
    var dir = ticker.config.direction === "right" ? 1 : -1;

    // reset transform
    window.gsap.set(ticker.container, { x: 0 });

    ticker.tween = window.gsap.to(ticker.container, {
      x: dir * -distance,
      ease: "none",
      duration: duration,
      repeat: -1,
      modifiers: {
        x: function (x) {
          var v = parseFloat(x);
          if (dir === -1) {
            if (v <= -distance) v += distance;
          } else {
            if (v >= 0) v -= distance;
          }
          return round(v) + "px";
        }
      }
    });
  };

  GsapInfiniteTicker.prototype._bindInteractions = function (ticker) {
    var self = this;
    // hover
    if (ticker.config.pauseOnHover) {
      ticker._mouseenter = function () { if (ticker.tween) ticker.tween.pause(); };
      ticker._mouseleave = function () { if (ticker.tween) ticker.tween.resume(); };
      ticker.element.addEventListener("mouseenter", ticker._mouseenter, { passive: true });
      ticker.element.addEventListener("mouseleave", ticker._mouseleave, { passive: true });
    }
    // focus
    if (ticker.config.pauseOnFocus) {
      ticker._focusin = function () { if (ticker.tween) ticker.tween.pause(); };
      ticker._focusout = function () { if (ticker.tween) ticker.tween.resume(); };
      ticker.element.addEventListener("focusin", ticker._focusin);
      ticker.element.addEventListener("focusout", ticker._focusout);
    }
    // intersection pause (optional)
    if (typeof IntersectionObserver !== "undefined") {
      ticker._io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var off = !e.isIntersecting || e.intersectionRatio === 0;
          ticker.autoPaused = off;
          if (ticker.tween) {
            if (off) ticker.tween.pause(); else ticker.tween.resume();
          }
        });
      }, { threshold: 0 });
      ticker._io.observe(ticker.element);
    }

    // assets load updates
    var imgs = ticker.element.querySelectorAll("img");
    imgs.forEach ? imgs.forEach(function (img) {
      if (!img.complete) {
        img.addEventListener("load", function () { self._measureAndAnimate(ticker); }, { once: true });
      }
    }) : null;
  };

  GsapInfiniteTicker.prototype._setupGlobalListeners = function () {
    var self = this;
    // resize debounce
    window.addEventListener("resize", debounce(function () {
      self.tickers.forEach(function (t) {
        // update config based on responsive breakpoints
        t.config = self._getElementConfig(t.element);
        t.container.style.gap = t.config.gap + "px";
        self._measureAndAnimate(t);
      });
    }, 200));

    // visibility
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        self._visibilityPaused = true;
        self.tickers.forEach(function (t) { if (t.tween) t.tween.pause(); });
      } else {
        if (self._visibilityPaused) {
          self.tickers.forEach(function (t) { if (t.tween && !t.autoPaused) t.tween.resume(); });
          self._visibilityPaused = false;
        }
      }
    });

    // reduced motion
    try {
      this._reducedMotionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (this._reducedMotionMql && this._reducedMotionMql.addEventListener) {
        this._reducedMotionMql.addEventListener("change", function (e) {
          self.tickers.forEach(function (t) {
            if (!t.tween) return;
            if (e.matches) t.tween.pause(); else if (!t.autoPaused) t.tween.resume();
          });
        });
      }
    } catch (e) {}
  };

  // Public API
  GsapInfiniteTicker.prototype.pause = function (selector) {
    this.tickers.filter(function (t) { return !selector || t.element.matches(selector); })
      .forEach(function (t) { if (t.tween) t.tween.pause(); });
  };
  GsapInfiniteTicker.prototype.resume = function (selector) {
    this.tickers.filter(function (t) { return !selector || t.element.matches(selector); })
      .forEach(function (t) { if (t.tween && !t.autoPaused) t.tween.resume(); });
  };
  GsapInfiniteTicker.prototype.setSpeed = function (speed, selector) {
    var self = this;
    this.tickers.filter(function (t) { return !selector || t.element.matches(selector); })
      .forEach(function (t) { t.config.speed = speed; self._measureAndAnimate(t); });
  };
  GsapInfiniteTicker.prototype.setDirection = function (direction, selector) {
    var self = this;
    this.tickers.filter(function (t) { return !selector || t.element.matches(selector); })
      .forEach(function (t) { t.config.direction = direction; self._measureAndAnimate(t); });
  };
  GsapInfiniteTicker.prototype.destroy = function () {
    this.tickers.forEach(function (t) {
      if (t.tween) t.tween.kill();
      if (t._io) try { t._io.disconnect(); } catch (_) {}
      if (t.element) t.element.removeAttribute("style");
    });
    this.tickers = [];
  };

  // Auto-init helper for Webflow-like usage
  function initializeTicker() {
    var els = document.querySelectorAll('.ticker');
    if (!els.length) return;
    if (!window.webflowGsapTicker) {
      window.webflowGsapTicker = new GsapInfiniteTicker({ selector: '.ticker', itemSelector: '.ticker-item' });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTicker);
  } else {
    initializeTicker();
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = GsapInfiniteTicker;
  }
  if (typeof window !== "undefined") {
    window.GsapInfiniteTicker = GsapInfiniteTicker;
  }
})();


