// ==UserScript==
// @name         YouTube Livestream Auto-Sync
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Automatically clicks the "Live" button on YouTube livestreams when out of sync.
// @author       LLM
// @match        https://www.youtube.com/watch?v=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function clickLiveButton() {
        // This selector targets the "Live" button that appears when you're behind the live edge.
        // It often has the text "LIVE" and might be part of the controls.
        // YouTube's UI can change, so this might need adjustment in the future.
        const liveButton = document.querySelector('button.ytp-live-badge.ytp-button:not([disabled])');

        // Ensure the button has the text "Live" and is visible
        if (liveButton && liveButton.textContent.trim() === 'Live' && liveButton.offsetParent !== null) {
            console.log('YouTube Livestream Auto-Sync: "Live" button found and visible. Clicking to sync.');
            liveButton.click();
        }
    }

    // Use a MutationObserver to watch for changes in the DOM, especially when the player loads or changes state.
    // This is more efficient than setInterval for detecting UI elements.
    const observer = new MutationObserver((mutationsList, observer) => {
        // Check if we are on a livestream page
        if (window.location.pathname === '/watch' && document.querySelector('.ytp-live-badge')) {
            clickLiveButton();
        }
    });

    // Start observing the document body for child list changes and subtree changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Also run it periodically in case MutationObserver misses something or for initial load
    setInterval(clickLiveButton, 3000); // Check every 3 seconds

})();
