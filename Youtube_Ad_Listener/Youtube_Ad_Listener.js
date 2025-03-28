// ==UserScript==
// @name         YouTube Ad Listener
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Listens for YouTube ad requests and mutes the video during ad breaks and skips ads when possible
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
            const muteButton = document.querySelector('.ytp-mute-button.ytp-button');
            if (muteButton) {
                muteButton.click();
                tabMuted = true;
                mutedByUser = true;
                console.log('Muting tab by clicking mute button');
            }
        }
    }

    // Function to unmute the tab
    function unmuteTab() {
        if (tabMuted && !mutedByUser) {
            const muteButton = document.querySelector('.ytp-mute-button.ytp-button');
            if (muteButton) {
                muteButton.click();
                tabMuted = false;
                console.log('Unmuting tab by clicking mute button');
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
    const f = () => {
        const btn = document.querySelector('.ytp-skip-ad-button');
        const adText = document.querySelector('.ytp-skip-ad-button__text');
        const v = document.querySelector('video');
        if(adText){
            v.currentTime = v.duration
        }
        if(btn){
            v.currentTime = v.duration
            btn.click();
            setTimeout(2000);
            btn.click();
            setTimeout(4000);
            btn.click();
        }
    }
    setInterval(f, 100);
})();
