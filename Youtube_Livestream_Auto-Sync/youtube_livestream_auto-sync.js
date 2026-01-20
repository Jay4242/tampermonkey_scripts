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
        // Select the live badge button that is NOT disabled (i.e., when the stream is behind the live edge)
        const liveButton = document.querySelector('.ytp-live-badge:not([disabled])');

        // Ensure the button is present and visible before clicking
        if (liveButton && liveButton.offsetParent !== null) {
            console.log('YouTube Livestream Auto-Sync: "Live" button found and visible. Clicking to sync.');
            liveButton.click();
        }
    }

    // Use a MutationObserver to watch for changes in the DOM, especially when the player loads or changes state.
    // This is more efficient than setInterval for detecting UI elements.
    const observer = new MutationObserver(() => {
        // Check if we are on a livestream page
        if (window.location.pathname === '/watch' && document.querySelector('.ytp-live-badge:not([disabled])')) {
            clickLiveButton();
        }
    });

    // Start observing the document body for child list changes and subtree changes
    observer.observe(document.body, { childList: true, subtree: true });

})();
