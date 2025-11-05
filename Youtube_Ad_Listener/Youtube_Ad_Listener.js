// ==UserScript==
// @name         YouTube Ad Listener
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Listens for YouTube ad requests and mutes the tab during ad breaks and skips ads when possible
// @author       You
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Store the original XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    let tabMuted = false;
    let mutedByUser = false;

    // Function to mute the tab
    function muteTab() {
        if (!tabMuted) {
            // Updated selector for the new mute button structure
            const muteButton = document.querySelector('.ytp-mute-button');
            if (muteButton) {
                // Determine if the button indicates the player is already muted (user muted)
                const isMuted = muteButton.getAttribute('aria-label')?.includes('Unmute');
                if (isMuted) {
                    // User has manually muted; respect their choice
                    mutedByUser = true;
                    console.log('User has muted the tab; respecting user mute');
                } else {
                    muteButton.click(); // Mute the player
                    tabMuted = true;
                    console.log('Muting tab by clicking mute button');
                }
            }
        }
    }

    // Function to unmute the tab
    function unmuteTab() {
        if (tabMuted && !mutedByUser) {
            // Updated selector for the new mute button structure
            const muteButton = document.querySelector('.ytp-mute-button');
            if (muteButton) {
                // Only click if the player is currently muted
                const isMuted = muteButton.getAttribute('aria-label')?.includes('Unmute');
                if (isMuted) {
                    muteButton.click(); // Unmute the player
                    tabMuted = false;
                    mutedByUser = false;
                    console.log('Unmuting tab by clicking mute button');
                }
            }
        }
    }

    // Override XMLHttpRequest
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const open = xhr.open;
        const send = xhr.send;
        let url;
        let adDetected = false;

        xhr.open = function(method, u) {
            url = u;
            open.apply(xhr, arguments);
        };

        xhr.send = function() {
            xhr.addEventListener('load', function() {
                if (url) {
                    if (url.startsWith('https://www.youtube.com/pagead/adview')) {
                        console.log('Ad request detected:', url);
                        adDetected = true;
                        muteTab(); // Mute the tab when an ad request is detected
                    } else if (url.startsWith('https://www.youtube.com/pagead/interaction')) {
                        console.log('Ad interaction detected, end of ad break:', url);
                        unmuteTab(); // Unmute the tab when ad interaction is detected
                        adDetected = false;
                    } else if (url.includes('label=video_companion_impression_tracking')) {
                        console.log('Video companion impression detected, unmuting tab:', url);
                        unmuteTab();
                    }
                }
            });
            send.apply(xhr, arguments);
        };

        return xhr;
    };

    // Skip ad implementation
    // Observe DOM changes to detect ad overlay elements and mute/unmute accordingly
    const adObserver = new MutationObserver(() => {
        const overlay = document.querySelector('.ytp-ad-player-overlay-layout');
        const player = document.querySelector('.html5-video-player');
        const adShowing = player && player.classList.contains('ad-showing');
        // New ad module selector introduced by YouTube
        const adModule = document.querySelector('.video-ads.ytp-ad-module');

        if (overlay || adShowing || adModule) {
            muteTab();
        } else if (!mutedByUser) {
            unmuteTab();
        }
    });
    adObserver.observe(document.body, { childList: true, subtree: true });
    // More reliable ad‑skip logic using async/await and proper delays
    async function attemptSkipAd() {
        const btn = document.querySelector('.ytp-skip-ad-button');
        const adText = document.querySelector('.ytp-skip-ad-button__text');
        const video = document.querySelector('video');

        if (!video) return;

        // If the “Skip” text is already visible, fast‑forward the video
        if (adText) {
            video.currentTime = video.duration;
        }

        // If a skip button exists, click it once after ensuring the video is at its end
        if (btn) {
            // Ensure the video is at its end to guarantee the ad is finished
            video.currentTime = video.duration;
            btn.click();
        }
    }

    // Run the skip routine frequently but without overwhelming the page
    // Observe for the appearance of the skip button and attempt to skip the ad when it appears
    const skipObserver = new MutationObserver(() => {
        if (document.querySelector('.ytp-skip-ad-button') ||
            document.querySelector('.ytp-image-background--gradient-vertical')) {
            attemptSkipAd();
        }
    });
    skipObserver.observe(document.body, { childList: true, subtree: true });
})();
