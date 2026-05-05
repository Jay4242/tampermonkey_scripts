// ==UserScript==
// @name         YouTube autolike
// @namespace
// @version      2.2
// @description  Auto-like YouTube video after watching a set percentage (default 80%).
// @match        https://www.youtube.com/*
// @grant        none
// @license      CC-BY-NC-SA-4.0
// ==/UserScript==

(function() {
    'use strict';

    const likePercent = 0.8;
    var liked = false;
    var timeUpdateHandler = null;
    var lastVideoId = null;
    var startTimer = null;
    var pollInterval = null;

    function isShortsPage() {
        return location.pathname.startsWith('/shorts/');
    }

    function isWatchPage() {
        return location.pathname === '/watch' || isShortsPage();
    }

    function getVideoId() {
        if (isShortsPage()) {
            return location.pathname.split('/')[2];
        }
        return new URLSearchParams(location.search).get('v');
    }

    function getLikeBtn() {
        return document.querySelector('.ytLikeButtonViewModelHost button')
            || document.querySelector('button[aria-pressed][aria-label^="like this video"]');
    }

    function isLiked() {
        const btn = getLikeBtn();
        if (btn === null) return false;
        return btn.getAttribute('aria-pressed') == 'true';
    }

    function doLike() {
        if (liked || isLiked()) return;
        const btn = getLikeBtn();
        if (!btn) return;
        btn.click();
        liked = true;
    }

    function isAdPlaying() {
        var player = document.querySelector('#movie_player') || document.querySelector('#shorts-player');
        return player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
    }

    function removeAllWatchers() {
        if (timeUpdateHandler) {
            document.removeEventListener('timeupdate', timeUpdateHandler, true);
            timeUpdateHandler = null;
        }
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function checkProgress() {
        if (liked || isLiked()) return true;
        if (isAdPlaying()) return;
        var video = document.querySelector('video.html5-main-video');
        if (!video || !video.duration || video.readyState < 1) return;
        if (video.currentTime / video.duration >= likePercent) {
            doLike();
            if (liked) return true;
        }
    }

    function onTimeUpdate() {
        if (checkProgress()) {
            removeAllWatchers();
        }
    }

    function startWatcher() {
        removeAllWatchers();
        if (startTimer) {
            clearTimeout(startTimer);
            startTimer = null;
        }
        liked = false;
        timeUpdateHandler = onTimeUpdate;
        startTimer = setTimeout(function () {
            startTimer = null;
            document.addEventListener('timeupdate', onTimeUpdate, true);
            pollInterval = setInterval(function () {
                if (checkProgress()) {
                    removeAllWatchers();
                }
            }, 500);
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
