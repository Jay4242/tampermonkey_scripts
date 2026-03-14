// ==UserScript==
// @name         YouTube Livestream Auto-Sync
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automatically clicks the "Live" button on YouTube livestreams when out of sync.
// @author       LLM
// @match        https://www.youtube.com/watch?v=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function isBehindLiveEdge(liveButton, timeDisplay) {
        if (!liveButton) {
            return false;
        }

        const isDisabled = liveButton.disabled || liveButton.getAttribute('aria-disabled') === 'true';

        if (timeDisplay) {
            const timeContents = timeDisplay.querySelector('.ytp-time-contents');
            if (timeContents) {
                const ariaLabel = (timeContents.getAttribute('aria-label') || '').toLowerCase();
                const clipLabel = (timeContents.getAttribute('aria-label') || '').toLowerCase();

                if (ariaLabel.includes('clip')) {
                    return false;
                }

                const currentMatch = ariaLabel.match(/(\d+)\s+days?\s+(\d+)\s+hours?\s+(\d+)\s+minutes?\s+(\d+)\s+seconds?/i);
                const durationMatch = ariaLabel.match(/of\s+(\d+)\s+days?\s+(\d+)\s+hours?\s+(\d+)\s+minutes?\s+(\d+)\s+seconds?/i);

                if (currentMatch && durationMatch) {
                    const currentSeconds = parseInt(currentMatch[1]) * 86400 + parseInt(currentMatch[2]) * 3600 + parseInt(currentMatch[3]) * 60 + parseInt(currentMatch[4]);
                    const durationSeconds = parseInt(durationMatch[1]) * 86400 + parseInt(durationMatch[2]) * 3600 + parseInt(durationMatch[3]) * 60 + parseInt(durationMatch[4]);

                    const timeDiff = durationSeconds - currentSeconds;
                    if (timeDiff > 30) {
                        return !isDisabled;
                    }
                }
            }

            const timeText = (timeDisplay.textContent || '').toLowerCase();
            if (timeText.includes(':') && !timeText.startsWith('live')) {
                const timeParts = timeDisplay.querySelector('.ytp-time-current');
                const durationParts = timeDisplay.querySelector('.ytp-time-duration');
                if (timeParts && durationParts) {
                    const currentTime = timeParts.textContent.trim();
                    const durationTime = durationParts.textContent.trim();

                    const parseTime = (timeStr) => {
                        const parts = timeStr.split(':').map(Number);
                        if (parts.length === 4) {
                            return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
                        } else if (parts.length === 3) {
                            return parts[0] * 3600 + parts[1] * 60 + parts[2];
                        } else if (parts.length === 2) {
                            return parts[0] * 60 + parts[1];
                        }
                        return 0;
                    };

                    const currentSecs = parseTime(currentTime);
                    const durationSecs = parseTime(durationTime);

                    if (durationSecs > currentSecs && (durationSecs - currentSecs) > 30) {
                        return !isDisabled;
                    }
                }
            }
        }

        const ariaLabel = (liveButton.getAttribute('aria-label') || '').toLowerCase();
        const title = (liveButton.getAttribute('title') || '').toLowerCase();

        const skipAheadPatterns = [
            'skip ahead to live',
            'skip to live',
            'jump to live',
            'go to live'
        ];

        for (const pattern of skipAheadPatterns) {
            if (ariaLabel.includes(pattern) || title.includes(pattern)) {
                return !isDisabled;
            }
        }

        return !isDisabled && (ariaLabel.includes('live') || title.includes('live'));
    }

    function clickLiveButton() {
        const timeDisplay = document.querySelector('.ytp-time-display.ytp-live');
        const liveButton = timeDisplay ? timeDisplay.querySelector('button.ytp-live-badge') : null;

        if (liveButton && liveButton.offsetParent !== null && isBehindLiveEdge(liveButton, timeDisplay)) {
            console.log('YouTube Livestream Auto-Sync: "Live" button found and visible. Clicking to sync.');
            liveButton.click();
        }
    }

    const observer = new MutationObserver(() => {
        if (window.location.pathname === '/watch') {
            clickLiveButton();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
        if (window.location.pathname === '/watch') {
            clickLiveButton();
        }
    }, 3000);

})();
