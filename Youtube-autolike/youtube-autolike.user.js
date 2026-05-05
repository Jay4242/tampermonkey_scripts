// ==UserScript==
// @name         YouTube autolike
// @namespace
// @version      2.1
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
    var lastVideoId = null;
    var startTimer = null;

    function isWatchPage() {
        return location.pathname === '/watch';
    }

    function getVideoId() {
        return new URLSearchParams(location.search).get('v');
    }

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

    function isAdPlaying() {
        const player = document.querySelector('#movie_player');
        return player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
    }

    function removeListener() {
        if (timeUpdateHandler) {
            document.removeEventListener('timeupdate', timeUpdateHandler, true);
            timeUpdateHandler = null;
        }
    }

    function onTimeUpdate() {
        if (liked) {
            removeListener();
            return;
        }
        if (isLiked()) return;
        if (isAdPlaying()) return;
        const video = document.querySelector('video.html5-main-video');
        if (!video || !video.duration || video.readyState < 1) return;
        if (video.currentTime / video.duration >= likePercent) {
            doLike();
            removeListener();
        }
    }

    function startWatcher() {
        removeListener();
        if (startTimer) {
            clearTimeout(startTimer);
            startTimer = null;
        }
        liked = false;
        timeUpdateHandler = onTimeUpdate;
        startTimer = setTimeout(function () {
            startTimer = null;
            document.addEventListener('timeupdate', onTimeUpdate, true);
        }, 3000);
    }

    function onUrlChange() {
        if (!isWatchPage()) {
            lastVideoId = null;
            return;
        }
        var newId = getVideoId();
        if (!newId || newId === lastVideoId) return;
        lastVideoId = newId;
        startWatcher();
    }

    window.addEventListener('yt-navigate-finish', onUrlChange);
    setInterval(onUrlChange, 1000);
})();
