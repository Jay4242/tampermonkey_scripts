// ==UserScript==
// @name         YouTube autolike
// @namespace
// @version      2.0
// @description  Auto-like YouTube video after watching a set percentage (default 80%).
// @match        https://www.youtube.com/*
// @grant        none
// @license      CC-BY-NC-SA-4.0
// ==/UserScript==

(function() {
    'use strict';

    const likeSelector = '.ytLikeButtonViewModelHost button';
    const likePercent = 0.8;
    var liked = false;
    var timeUpdateHandler = null;

    function isLiked() {
        const btn = document.querySelector(likeSelector);
        if (btn === null) return false;
        return btn.getAttribute('aria-pressed') == 'true';
    }

    function doLike() {
        if (liked || isLiked()) return;
        const btn = document.querySelector(likeSelector);
        if (btn) btn.click();
        liked = true;
    }

    function onTimeUpdate() {
        if (liked || isLiked()) {
            if (timeUpdateHandler) {
                document.removeEventListener('timeupdate', timeUpdateHandler, true);
                timeUpdateHandler = null;
            }
            return;
        }
        const video = document.querySelector('video.html5-main-video');
        if (!video || !video.duration || video.readyState < 1) return;
        if (video.currentTime / video.duration >= likePercent) {
            doLike();
            if (timeUpdateHandler) {
                document.removeEventListener('timeupdate', timeUpdateHandler, true);
                timeUpdateHandler = null;
            }
        }
    }

    function startWatcher() {
        if (timeUpdateHandler) {
            document.removeEventListener('timeupdate', timeUpdateHandler, true);
        }
        liked = false;
        timeUpdateHandler = onTimeUpdate;
        setTimeout(function () {
            document.addEventListener('timeupdate', onTimeUpdate, true);
        }, 3000);
    }

    window.addEventListener('yt-navigate-finish', startWatcher, true);
})();
