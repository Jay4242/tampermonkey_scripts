// ==UserScript==
// @name         YouTube autolike
// @namespace
// @version      2.4
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
        if (isShortsPage()) {
            return document.querySelector('ytd-reel-video-renderer like-button-view-model button[aria-pressed]')
                || document.querySelector('#shorts-player')?.closest('ytd-reel-video-renderer')?.querySelector('like-button-view-model button[aria-pressed]')
                || document.querySelector('like-button-view-model button[aria-pressed]');
        }
        return document.querySelector('.ytLikeButtonViewModelHost button')
            || document.querySelector('like-button-view-model button[aria-pressed]')
            || document.querySelector('button[aria-pressed][aria-label^="like this video"]');
    }

    function getVideoEl() {
        if (isShortsPage()) {
            return document.querySelector('#shorts-player video.html5-main-video')
                || document.querySelector('ytd-reel-video-renderer video.html5-main-video')
                || document.querySelector('video.html5-main-video');
        }
        return document.querySelector('#movie_player video.html5-main-video')
            || document.querySelector('video.html5-main-video');
    }

    function isLiked() {
        const btn = getLikeBtn();
        if (btn === null) return false;
        return btn.getAttribute('aria-pressed') == 'true';
    }

    function doLike() {
        if (liked || isLiked()) {
            liked = true;
            return;
        }
        const btn = getLikeBtn();
        if (!btn) return;
        btn.click();
        if (isLiked()) liked = true;
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
        if (startTimer) {
            clearTimeout(startTimer);
            startTimer = null;
        }
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    function checkProgress() {
        if (liked || isLiked()) return true;
        if (isAdPlaying()) return;
        var video = getVideoEl();
        if (!video || !video.duration || !isFinite(video.duration) || video.readyState < 1) return;
        if (video.currentTime / video.duration >= likePercent) {
            doLike();
            if (liked || isLiked()) {
                liked = true;
                return true;
            }
        }
    }

    function onTimeUpdate() {
        if (checkProgress()) {
            removeAllWatchers();
        }
    }

    function startWatcher() {
        removeAllWatchers();
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
        }, isShortsPage() ? 1000 : 3000);
    }

    function onUrlChange() {
        if (!isWatchPage()) {
            removeAllWatchers();
            lastVideoId = null;
            return;
        }
        var newId = getVideoId();
        if (!newId) return;
        if (newId === lastVideoId) {
            if (!timeUpdateHandler && !pollInterval && !startTimer && !liked && !isLiked()) {
                startWatcher();
            }
            return;
        }
        lastVideoId = newId;
        startWatcher();
    }

    window.addEventListener('yt-navigate-finish', onUrlChange);
    setInterval(onUrlChange, 1000);
})();
