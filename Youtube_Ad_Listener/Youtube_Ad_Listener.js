/* eslint-disable spaced-comment */
// ==UserScript==
// @name         YouTube Ad Listener
// @namespace    https://example.com/
// @version      1.0.0
// @description  Mute and hide YouTube ads, and attempt to skip them when possible.
// @author       You
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
/* eslint-enable spaced-comment */

(() => {
  "use strict";

  // Set to true to enable debug logging
  const DEBUG = false;

  const log = (...args) => {
    if (DEBUG) {
      console.log("[YT-Ad-Blocker]", ...args);
    }
  };

  const debounce = (fn, delay) => {
    let timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(fn, delay);
    };
  };

  // Classes that definitively indicate an ad is currently playing
  // Note: "ad-created" is NOT included because it appears even on regular videos
  const AD_PLAYER_CLASSES = [
    "ad-showing",
    "ad-interrupting",
    "ytp-ad-overlay-open",
  ];

  const AD_ELEMENT_SELECTORS = [
    ".video-ads",
    ".ytp-ad-module",
    ".ytp-ad-player-overlay-layout",
    ".ytp-ad-persistent-progress-bar-container",
    ".ytp-ad-overlay-container",
    ".ytp-ad-overlay-slot",
    ".ytp-ad-overlay",
  ];

  const AD_SIGNAL_SELECTORS = [
    ".ytp-ad-button",
    ".ytp-ad-badge",
    ".ytp-ad-preview-container",
    ".ytp-ad-text",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
  ];

  const SKIP_BUTTON_SELECTORS = [
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
  ];

  let wasMutedBeforeAd = false;
  let mutedByScript = false;
  let wasVolumeBeforeAd = null;

  // Cached DOM elements
  let cachedPlayer = null;
  let cachedVideo = null;

  const invalidateCache = () => {
    cachedPlayer = null;
    cachedVideo = null;
    log("Cache invalidated");
  };

  const hideAdsStyle = () => {
    const existingStyle = document.getElementById("yt-ads-blocker-style");
    
    // Check if style exists AND is still in the document
    if (existingStyle && document.head.contains(existingStyle)) {
      return;
    }

    // Remove orphaned style if it exists but isn't in head
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement("style");
    style.id = "yt-ads-blocker-style";
    style.textContent = `
      ${AD_ELEMENT_SELECTORS.join(", ")} {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    log("Ad-hiding styles injected");
  };

  const getPlayer = () => {
    if (!cachedPlayer || !document.contains(cachedPlayer)) {
      cachedPlayer = document.getElementById("movie_player");
    }
    return cachedPlayer;
  };

  const getVideo = () => {
    if (!cachedVideo || !document.contains(cachedVideo)) {
      cachedVideo =
        document.querySelector("video.html5-main-video") ||
        document.querySelector("video");
    }
    return cachedVideo;
  };

  const isElementVisible = (element) => {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    return element.getClientRects().length > 0;
  };

  const hasVisibleSelector = (selectors) =>
    selectors.some((selector) =>
      isElementVisible(document.querySelector(selector))
    );

  const isAdPlaying = () => {
    const player = getPlayer();
    if (!player) {
      return false;
    }

    // Primary check: "ad-showing" is the most reliable indicator
    if (player.classList.contains("ad-showing")) {
      log("Ad detected via ad-showing class");
      return true;
    }

    // Secondary check: other ad player classes
    const hasAdClass = AD_PLAYER_CLASSES.some((className) =>
      player.classList.contains(className)
    );

    if (hasAdClass) {
      log("Ad detected via player class");
      return true;
    }

    // Tertiary check: visible ad elements/signals (only if player exists)
    const hasAdElement = hasVisibleSelector(AD_ELEMENT_SELECTORS);
    const hasAdSignal = hasVisibleSelector(AD_SIGNAL_SELECTORS);

    if (hasAdSignal || hasAdElement) {
      log("Ad detected via visible elements");
      return true;
    }

    return false;
  };

  const clickSkipButton = () => {
    for (const selector of SKIP_BUTTON_SELECTORS) {
      const skipButton = document.querySelector(selector);
      if (
        skipButton &&
        !skipButton.disabled &&
        isElementVisible(skipButton)
      ) {
        skipButton.click();
        log("Clicked skip button:", selector);
        return true;
      }
    }
    return false;
  };

  const trySkipAd = () => {
    const video = getVideo();
    if (!video) {
      return;
    }

    if (!clickSkipButton() && Number.isFinite(video.duration)) {
      try {
        video.currentTime = Math.max(0, video.duration - 0.1);
        log("Skipped to end of ad video");
      } catch (error) {
        log("Error seeking:", error.message);
      }
    }
  };

  const setMuted = (mute) => {
    const player = getPlayer();
    const video = getVideo();

    if (!player && !video) {
      return;
    }

    if (mute) {
      // Only save state when first muting
      if (!mutedByScript) {
        if (player && typeof player.isMuted === "function") {
          wasMutedBeforeAd = player.isMuted();
        } else if (video) {
          wasMutedBeforeAd = video.muted;
        } else {
          wasMutedBeforeAd = false;
        }

        wasVolumeBeforeAd = video ? video.volume : null;
        log("Saved audio state - muted:", wasMutedBeforeAd, "volume:", wasVolumeBeforeAd);
      }

      if (player && typeof player.mute === "function") {
        player.mute();
      }

      if (video) {
        video.muted = true;
      }

      mutedByScript = true;
      return;
    }

    // Restore state when unmuting
    if (mutedByScript) {
      if (!wasMutedBeforeAd) {
        if (player && typeof player.unMute === "function") {
          player.unMute();
        }
        if (video) {
          video.muted = false;
        }
      }

      if (video && wasVolumeBeforeAd !== null) {
        video.volume = wasVolumeBeforeAd;
      }

      log("Restored audio state - muted:", wasMutedBeforeAd, "volume:", wasVolumeBeforeAd);
      mutedByScript = false;
      wasVolumeBeforeAd = null;
    }
  };

  const updateAdState = () => {
    try {
      if (isAdPlaying()) {
        hideAdsStyle();
        setMuted(true);
        trySkipAd();
        return;
      }

      setMuted(false);
    } catch (error) {
      log("Error in updateAdState:", error.message);
    }
  };

  const debouncedUpdateAdState = debounce(updateAdState, 100);

  const observeDom = () => {
    const observer = new MutationObserver(debouncedUpdateAdState);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  };

  const handleNavigation = () => {
    log("Navigation detected, reinitializing");
    invalidateCache();
    hideAdsStyle();
    updateAdState();
  };

  const init = () => {
    try {
      hideAdsStyle();
      updateAdState();
      observeDom();

      // Fallback interval - less frequent since MutationObserver handles most cases
      window.setInterval(updateAdState, 2000);

      // Handle YouTube SPA navigation
      window.addEventListener("yt-navigate-finish", handleNavigation);
      window.addEventListener("yt-navigate-start", invalidateCache);

      log("Initialized successfully");
    } catch (error) {
      console.error("[YT-Ad-Blocker] Initialization error:", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
