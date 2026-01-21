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

  const hideAdsStyle = () => {
    if (document.getElementById("yt-ads-blocker-style")) {
      return;
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
  };

  const getPlayer = () => document.getElementById("movie_player");

  const getVideo = () =>
    document.querySelector("video.html5-main-video") ||
    document.querySelector("video");

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
      return true;
    }

    // Secondary check: other ad player classes
    const hasAdClass = AD_PLAYER_CLASSES.some((className) =>
      player.classList.contains(className)
    );

    if (hasAdClass) {
      return true;
    }

    // Tertiary check: visible ad elements/signals (only if player exists)
    const hasAdElement = hasVisibleSelector(AD_ELEMENT_SELECTORS);
    const hasAdSignal = hasVisibleSelector(AD_SIGNAL_SELECTORS);

    return hasAdSignal || hasAdElement;
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
      } catch (error) {
        // ignore seeking errors
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
      if (!mutedByScript) {
        if (player && typeof player.isMuted === "function") {
          wasMutedBeforeAd = player.isMuted();
        } else if (video) {
          wasMutedBeforeAd = video.muted;
        } else {
          wasMutedBeforeAd = false;
        }

        wasVolumeBeforeAd = video ? video.volume : null;
      }

      if (player && typeof player.mute === "function") {
        player.mute();
      }

      if (video) {
        video.muted = true;
        if (video.volume > 0) {
          video.volume = 0;
        }
      }

      mutedByScript = true;
      return;
    }

    if (!mute && mutedByScript) {
      if (player) {
        if (!wasMutedBeforeAd && typeof player.unMute === "function") {
          player.unMute();
        } else if (wasMutedBeforeAd && typeof player.mute === "function") {
          player.mute();
        }
      }

      if (video) {
        video.muted = wasMutedBeforeAd;
        if (wasVolumeBeforeAd !== null) {
          video.volume = wasVolumeBeforeAd;
        }
      }

      mutedByScript = false;
      wasVolumeBeforeAd = null;
    }
  };

  const updateAdState = () => {
    if (isAdPlaying()) {
      hideAdsStyle();
      setMuted(true);
      trySkipAd();
      return;
    }

    setMuted(false);
  };

  const observeDom = () => {
    const observer = new MutationObserver(updateAdState);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  };

  const init = () => {
    hideAdsStyle();
    updateAdState();
    observeDom();
    window.setInterval(updateAdState, 1000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
