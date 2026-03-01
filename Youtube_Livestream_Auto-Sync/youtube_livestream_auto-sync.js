// ==UserScript==
// @name         YouTube Livestream Auto-Sync
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Automatically clicks the "Live" button on YouTube livestreams when out of sync.
// @author       LLM
// @match        https://www.youtube.com/watch?v=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function isBehindLiveEdge(button) {
        if (!button) {
            return false;
        }

        const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
        const tooltip = (button.getAttribute('data-tooltip-title') || '').toLowerCase();
        const isDisabled = button.disabled || button.getAttribute('aria-disabled') === 'true';

        // Current YouTube UI usually exposes this exact wording when playback is behind.
        const skipAheadLabel = ariaLabel.includes('skip ahead to live broadcast') || tooltip.includes('skip ahead to live broadcast');
        const genericSkipAhead = ariaLabel.includes('skip ahead') || tooltip.includes('skip ahead');

        return !isDisabled && (skipAheadLabel || genericSkipAhead);
    }

    function clickLiveButton() {
        const liveButton = document.querySelector('button.ytp-live-badge, .ytp-time-wrapper button.ytp-live-badge');

        if (liveButton && liveButton.offsetParent !== null && isBehindLiveEdge(liveButton)) {
            console.log('YouTube Livestream Auto-Sync: "Live" button found and visible. Clicking to sync.');
            liveButton.click();
        }
    }

    // Use a MutationObserver to watch for changes in the DOM, especially when the player loads or changes state.
    // This is more efficient than setInterval for detecting UI elements.
    const observer = new MutationObserver(() => {
        if (window.location.pathname === '/watch') {
            clickLiveButton();
        }
    });

    // Start observing the document body for child list changes and subtree changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Periodic fallback for player state changes that don't trigger useful DOM mutations.
    setInterval(() => {
        if (window.location.pathname === '/watch') {
            clickLiveButton();
        }
    }, 3000);

})();
