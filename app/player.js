// player.js — 2015 style, com seleção de qualidade >360p e fallback MSE
// Mantém sua UI/controles. Corrige variáveis globais e referências ausentes.
// Requer que o backend retorne data.formats com {url, mimeType, qualityLabel, itag? ...}
// Dica: passe ?v=<VIDEO_ID> na URL da watchpage.

(function () {
  'use strict';

  // ===== Helpers/Fallbacks =====
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function getVideoId() {
    if (typeof playerVideoId !== 'undefined' && playerVideoId) return playerVideoId;
    const u = new URL(location.href);
    return u.searchParams.get('v') || '';
  }

  // Permite manter seu global se já existir
  const APIbaseURLNew = (typeof window.APIbaseURLNew === 'string' && window.APIbaseURLNew) 
    ? window.APIbaseURLNew 
    : 'https://yt-api.p.rapidapi.com/';

  // ===== Estado do player =====
  let controlsVisible = false;
  let coTimO = null;
  let mousedown = false;
  let scrubTime = 0;
  let YTmVideoId = '';
  let mse = null;
  let mseUrl = null;
  let sbVideo = null;
  let sbAudio = null;
  let currentMode = 'native'; // 'native' | 'mse'
  let formatsRaw = [];
  let progressive = [];     // [{label, url, mime}]
  let adaptiveVideo = [];   // [{label, url, mime}]
  let adaptiveAudio = [];   // [{label, url, mime, score}]
  let bestAudio = null;     // objeto de adaptiveAudio escolhido
  let qualityOptions = [];  // [{label, mode:'native'|'mse', url?, vFmt?, aFmt?}]

  // ===== Construção de DOM (igual ao seu, com pequenas correções) =====
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  video.preload = 'auto';
  video.id = 'player';
  video.classList.add('player-api', 'video-stream');

  const videoPlayer = document.createElement('div');
  videoPlayer.classList.add('video-player');
  videoPlayer.id = video.id;
  videoPlayer.setAttribute('tabindex', '-1');

  const htmlVideoCont = document.createElement('div');
  htmlVideoCont.setAttribute('aria-label', '2015YouTube Video Player');
  htmlVideoCont.classList.add('html-video-container');
  htmlVideoCont.id = 'movie-player';
  videoPlayer.appendChild(htmlVideoCont);
  htmlVideoCont.appendChild(video);
  video.removeAttribute('controls');

  const controlsCont = document.createElement('div');
  controlsCont.classList.add('player-controls-container');
  const leftArrowUnicode = '\u25C0';
  const rightArrowUnicode = '\u25B6';
  controlsCont.innerHTML = `
<div class="player-poster" tabindex="-1"></div>
<div class="player-spinner-container">
  <svg class="player-spinner" width="60px" height="60px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
    <circle class="path" fill="none" stroke-width="6" stroke-linecap="spuare" cx="33" cy="33" r="30"></circle>
  </svg>
</div>
<div class="seek-notifications">
  <div class="video-rewind-notify rewind seek-notification">
    <div class="rewind-icon icon">
      <i class="left-triangle triangle" id="triangle-1">${leftArrowUnicode}</i>
      <i class="left-triangle triangle" id="triangle-2">${leftArrowUnicode}</i>
      <i class="left-triangle triangle" id="triangle-3">${leftArrowUnicode}</i>
      <span class="rewind">10 seconds</span>
    </div>
  </div>
  <div class="video-forward-notify forward seek-notification">
    <div class="forward-icon icon">
      <i class="right-triangle triangle" id="triangle-3">${rightArrowUnicode}</i>
      <i class="right-triangle triangle" id="triangle-2">${rightArrowUnicode}</i>
      <i class="right-triangle triangle" id="triangle-1">${rightArrowUnicode}</i>
      <span class="forward">10 seconds</span>
    </div>
  </div>
</div>
<div class="player-controls-overlay">
  <div class="player-controls-background"></div>
</div>
<div class="player-error"></div>
<div class="player-options-container">
  <div class="player-options-content"></div>
</div>
`;
  const seekNotifications = controlsCont.querySelectorAll('.seek-notification');
  const forwardNotificationValue = controlsCont.querySelector('.video-forward-notify span');
  const rewindNotificationValue = controlsCont.querySelector('.video-rewind-notify span');
  const playerError = controlsCont.querySelector('.player-error');
  const playerOptCont = controlsCont.querySelector('.player-options-container');
  const playerOptContent = playerOptCont.querySelector('.player-options-content');

  const playerOptClose = document.createElement('button');
  playerOptClose.classList.add('controls-button', 'hide-options-button', 'has-ripple');
  playerOptClose.title = 'Hide options';
  playerOptClose.ariaLabel = 'Hide options';
  playerOptClose.innerHTML = `
<img class="player-img-icon button-icon hide-icon inactive" src="ic_vidcontrol_hide_controls.png">
<img class="player-img-icon button-icon hide-icon active" src="ic_vidcontrol_hide_controls_pressed.png">`;
  playerOptClose.ariaPressed = 'false';
  playerOptContent.appendChild(playerOptClose);

  const poster = controlsCont.querySelector('.player-poster');
  videoPlayer.appendChild(controlsCont);

  const controlsTop = document.createElement('div');
  controlsTop.classList.add('player-controls-top');

  const controlsMiddle = document.createElement('div');
  controlsMiddle.classList.add('player-controls-middle');

  const controls = document.createElement('div');
  controls.classList.add('player-controls');

  const controlsOverlay = controlsCont.querySelector('.player-controls-overlay');
  const controlsBG = controlsCont.querySelector('.player-controls-background');

  controlsOverlay.appendChild(controlsTop);
  controlsOverlay.appendChild(playerError);
  controlsOverlay.appendChild(controlsMiddle);
  controlsOverlay.appendChild(controls);

  const btnsCont = document.createElement('div');
  btnsCont.classList.add('player-buttons-container');
  controls.appendChild(btnsCont);

  const currentTime = document.createElement('span');
  currentTime.classList.add('player-time-count', 'player-current-time');
  currentTime.textContent = '00:00';
  currentTime.ariaLabel = 'Current time is 00:00';
  btnsCont.appendChild(currentTime);

  const progressCont = document.createElement('div');
  progressCont.classList.add('progress-container');

  const progress = document.createElement('div');
  progress.classList.add('progress');
  progress.innerHTML = `
  <div class="progress-filled">
    <div class="progress-track"></div>
    <div class="player-storyboard-container">
      <div class="player-storyboard">
        <video class="storyboard-video" preload="also" muted src=""></video>
      </div>
      <div class="player-storyboard-time-tooltip">00:00</div>
    </div>
  </div>`;
  const SBVideo = progress.querySelector('video');
  const storyboardTime = progress.querySelector('.player-storyboard-time-tooltip');
  const progressBar = progress.querySelector('.progress-filled');
  const progressTrack = progress.querySelector('.progress-track');

  progressCont.appendChild(progress);

  const prevVidBtn = document.createElement('button');
  prevVidBtn.classList.add('controls-button', 'controls-btn-disabled', 'prev-vid-button', 'has-ripple');
  prevVidBtn.ariaLabel = 'Previous video';
  prevVidBtn.ariaDisabled = 'true';
  prevVidBtn.title = 'Previous video';
  prevVidBtn.innerHTML = `<img class="player-img-icon button-icon prev-vid-icon" src="ic_vidcontrol_prev.png">`;
  controlsMiddle.appendChild(prevVidBtn);

  const toggleButton = document.createElement('button');
  toggleButton.classList.add('controls-button', 'toggle-button', 'play-pause-button', 'has-ripple');
  toggleButton.ariaLabel = 'Play video';
  toggleButton.ariaPressed = 'false';
  toggleButton.title = 'Toggle Play';
  toggleButton.innerHTML = `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png">`;
  controlsMiddle.appendChild(toggleButton);

  const nextVidBtn = document.createElement('button');
  nextVidBtn.classList.add('controls-button', 'controls-btn-disabled', 'next-vid-button', 'has-ripple');
  nextVidBtn.ariaLabel = 'Next video';
  nextVidBtn.ariaDisabled = 'true';
  nextVidBtn.title = 'Next video';
  nextVidBtn.innerHTML = `<img class="player-img-icon button-icon next-vid-icon" src="ic_vidcontrol_next.png">`;
  controlsMiddle.appendChild(nextVidBtn);

  btnsCont.appendChild(progressCont);

  const playerExitWatchBtn = document.createElement('button');
  playerExitWatchBtn.classList.add('controls-button', 'exit-watch-button', 'has-ripple');
  playerExitWatchBtn.title = 'Collapse watchpage';
  playerExitWatchBtn.ariaLabel = 'Collapse watchpage';
  playerExitWatchBtn.innerHTML = `
<img class="player-img-icon button-icon exit-watch-icon inactive" src="ic_vidcontrol_collapse.png">
<img class="player-img-icon button-icon exit-watch-icon active" src="ic_vidcontrol_collapse_pressed.png">`;
  playerExitWatchBtn.ariaPressed = 'false';
  controlsTop.appendChild(playerExitWatchBtn);

  const playerTitle = document.createElement('h3');
  playerTitle.classList.add('player-title');
  playerTitle.ariaLabel = '';
  playerTitle.textContent = '';
  controlsTop.appendChild(playerTitle);

  // Sliders e misc
  const labSliderVol = document.createElement('label');
  labSliderVol.setAttribute('for', 'volume');
  labSliderVol.classList.add('controls-slider-label');

  const sliderVol = document.createElement('input');
  sliderVol.type = 'range';
  sliderVol.name = 'volume';
  sliderVol.id = 'volume';
  sliderVol.classList.add('controls-slider');
  sliderVol.min = '0';
  sliderVol.max = '1';
  sliderVol.step = '0.01';
  sliderVol.value = '1';
  labSliderVol.textContent = 'Volume: 100%';

  const labSliderPR = document.createElement('label');
  labSliderPR.setAttribute('for', 'playbackRate');
  labSliderPR.classList.add('controls-slider-label');

  const sliderPR = document.createElement('input');
  sliderPR.type = 'range';
  sliderPR.name = 'playbackRate';
  sliderPR.id = 'playbackRate';
  sliderPR.classList.add('controls-slider');
  sliderPR.min = '0.25';
  sliderPR.max = '2';
  sliderPR.step = '0.05';
  sliderPR.value = '1';
  labSliderPR.textContent = 'Speed: 1x';

  const skipBtn1 = document.createElement('button');
  skipBtn1.classList.add('controls-button', 'skip-button', 'has-ripple');
  skipBtn1.textContent = `<< 10s`;
  skipBtn1.dataset.skip = '-10';

  const skipBtn2 = document.createElement('button');
  skipBtn2.classList.add('controls-button', 'skip-button', 'has-ripple');
  skipBtn2.textContent = `10s >>`;
  skipBtn2.dataset.skip = '10';

  const controlsSpacer = document.createElement('div');
  controlsSpacer.classList.add('controls-spacer');
  controlsTop.appendChild(controlsSpacer);

  const playerShareBtn = document.createElement('button');
  playerShareBtn.classList.add('controls-button', 'share-button', 'has-ripple');
  playerShareBtn.title = 'Share video';
  playerShareBtn.ariaLabel = 'Share video';
  playerShareBtn.innerHTML = `
<img class="player-img-icon button-icon share-icon inactive" src="ic_vidcontrol_share.png">
<img class="player-img-icon button-icon share-icon active" src="ic_vidcontrol_share_pressed.png">`;
  playerShareBtn.ariaPressed = 'false';
  controlsTop.appendChild(playerShareBtn);

  const overflowBtn = document.createElement('button');
  overflowBtn.classList.add('controls-button', 'overflow-button', 'has-ripple');
  overflowBtn.title = 'More options';
  overflowBtn.ariaLabel = 'More options';
  overflowBtn.innerHTML = `
<img class="player-img-icon button-icon menu-icon inactive" src="ic_vidcontrol_overflow.png">
<img class="player-img-icon button-icon menu-icon active" src="ic_vidcontrol_overflow_pressed.png">`;
  overflowBtn.ariaPressed = 'false';
  controlsTop.appendChild(overflowBtn);

  const duration = document.createElement('span');
  duration.classList.add('player-time-count', 'player-duration');
  duration.textContent = '00:00';
  duration.ariaLabel = 'Duration is 00:00';
  btnsCont.appendChild(duration);

  const fullScreenBtn = document.createElement('button');
  fullScreenBtn.classList.add('controls-button', 'toggle-button', 'fullscreen-button', 'has-ripple');
  fullScreenBtn.title = 'Toggle Fullscreen';
  fullScreenBtn.ariaLabel = 'Open fullscreen';
  fullScreenBtn.innerHTML = `
<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png">
<img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
  fullScreenBtn.ariaPressed = 'false';
  btnsCont.appendChild(fullScreenBtn);

  const playerDialogOverlay = document.createElement('div');
  playerDialogOverlay.classList.add('player-dialog-overlay');

  const playerOptDialog = document.createElement('dialog');
  playerOptDialog.classList.add('player-options-dialog');
  playerOptDialog.id = '';
  playerOptDialog.innerHTML = `
<div class="player-dialog-header">
  <h3 class="player-dialog-title" aria-label=""></h3>
</div>
<div class="player-dialog-content"></div>
<div class="player-dialog-footer"></div>`;

  const playerDialogHeader = playerOptDialog.querySelector('.player-dialog-header');
  const playerDialogFooter = playerOptDialog.querySelector('.player-dialog-footer');
  const playerDialogTitle = playerOptDialog.querySelector('.player-dialog-title');
  const playerDialogContent = playerOptDialog.querySelector('.player-dialog-content');

  playerOptCont.appendChild(playerOptDialog);
  playerOptCont.appendChild(playerDialogOverlay);

  const playerOptCloseDialog = document.createElement('button');
  playerOptCloseDialog.classList.add('controls-button', 'close-plyr-dialog-button', 'has-ripple');
  playerOptCloseDialog.title = 'Close dialog';
  playerOptCloseDialog.ariaLabel = 'Close dialog';
  playerOptCloseDialog.textContent = 'Close';
  playerOptCloseDialog.ariaPressed = 'false';
  playerDialogFooter.appendChild(playerOptCloseDialog);

  const playerOptItem = document.createElement('div');
  playerOptItem.classList.add('player-options-item');
  playerOptContent.appendChild(playerOptItem);

  const playerOptMisc = document.createElement('button');
  playerOptMisc.classList.add('controls-button', 'options-item-button', 'misc-button', 'has-ripple');
  playerOptMisc.title = 'Miscellaneous';
  playerOptMisc.ariaLabel = 'Miscellaneous';
  playerOptMisc.innerHTML = `
<img class="player-img-icon button-icon misc-icon inactive" src="player_icon_misc.png">
<img class="player-img-icon button-icon misc-icon active" src="player_icon_misc_pressed.png">`;
  playerOptMisc.ariaPressed = 'false';

  const playerOptMiscText = document.createElement('span');
  playerOptMiscText.textContent = 'Misc';
  playerOptMiscText.classList.add('options-item-text');
  playerOptItem.appendChild(playerOptMisc);
  playerOptItem.appendChild(playerOptMiscText);

  const playerMiscOptions = document.createElement('div');
  playerMiscOptions.classList.add('player-misc-options');
  playerMiscOptions.appendChild(labSliderVol);
  playerMiscOptions.appendChild(sliderVol);
  playerMiscOptions.appendChild(labSliderPR);
  playerMiscOptions.appendChild(sliderPR);
  playerMiscOptions.appendChild(skipBtn1);
  playerMiscOptions.appendChild(skipBtn2);

  const sliders = playerMiscOptions.querySelectorAll('.controls-slider');
  const skipBtns = playerMiscOptions.querySelectorAll('[data-skip]');

  const playerOptItem2 = document.createElement('div');
  playerOptItem2.classList.add('player-options-item');
  playerOptContent.appendChild(playerOptItem2);

  const playerOptQual = document.createElement('button');
  playerOptQual.classList.add('controls-button', 'options-item-button', 'quality-button', 'has-ripple');
  playerOptQual.title = 'Quality';
  playerOptQual.ariaLabel = 'Quality';
  playerOptQual.innerHTML = `
<img class="player-img-icon button-icon quality-icon inactive" src="ic_vidcontrol_quality.png">
<img class="player-img-icon button-icon quality-icon active" src="ic_vidcontrol_quality_pressed.png">`;
  playerOptQual.ariaPressed = 'false';

  const playerOptQualText = document.createElement('span');
  playerOptQualText.textContent = 'Quality';
  playerOptQualText.classList.add('options-item-text');
  playerOptItem2.appendChild(playerOptQual);
  playerOptItem2.appendChild(playerOptQualText);

  const playerOptSelect = document.createElement('div');
  playerOptSelect.classList.add('player-dialog-select');

  const playerOptItem3 = document.createElement('div');
  playerOptItem3.classList.add('player-options-item');
  playerOptContent.appendChild(playerOptItem3);

  const playerOptIFrame = document.createElement('button');
  playerOptIFrame.classList.add('controls-button', 'options-item-button', 'iframe-player-button', 'has-ripple');
  playerOptIFrame.title = 'YT iFrame Player';
  playerOptIFrame.ariaLabel = 'YT iFrame Player';
  playerOptIFrame.innerHTML = `
<img class="player-img-icon button-icon iframe-icon inactive" src="player_icon_iframe.png">
<img class="player-img-icon button-icon iframe-icon active" src="player_icon_iframe_pressed.png">`;
  playerOptIFrame.ariaPressed = 'false';

  const playerOptIFrameText = document.createElement('span');
  playerOptIFrameText.textContent = 'YT iFrame Player';
  playerOptIFrameText.classList.add('options-item-text');
  playerOptItem3.appendChild(playerOptIFrame);
  playerOptItem3.appendChild(playerOptIFrameText);

  // ====== Interação (igual ao seu, com proteções) ======
  controlsBG.onclick = function () {
    if (!controlsVisible) {
      controlsVisible = true;
      controlsOverlay.classList.add('controls-visible');
      if (coTimO) clearTimeout(coTimO);
      coTimO = setTimeout(() => {
        controlsVisible = false;
        controlsOverlay.classList.remove('controls-visible');
      }, 4000);

      if (video.paused) {
        if (coTimO) clearTimeout(coTimO);
      }

      video.addEventListener('playing', function onPlaying() {
        if (!videoPlayer.classList.contains('dbl-tap-seek-mode')) {
          if (coTimO) clearTimeout(coTimO);
          coTimO = setTimeout(() => {
            controlsVisible = false;
            controlsOverlay.classList.remove('controls-visible');
          }, 4000);
        }
      }, { once: true });

      video.addEventListener('pause', function onPause() {
        if (!videoPlayer.classList.contains('dbl-tap-seek-mode')) {
          if (coTimO) clearTimeout(coTimO);
        }
      }, { once: true });

    } else {
      controlsVisible = false;
      controlsOverlay.classList.remove('controls-visible');
      if (coTimO) clearTimeout(coTimO);
    }
  };

  function togglePlay() {
    if (video.paused || video.ended) video.play(); else video.pause();
  }

  function toggleFullScreen() {
    if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    } else {
      if (videoPlayer.webkitRequestFullscreen) videoPlayer.webkitRequestFullscreen();
      else if (videoPlayer.requestFullscreen) videoPlayer.requestFullscreen();
    }
  }

  function updateToggleButton() {
    videoPlayer.classList.remove('player-ended');
    toggleButton.innerHTML = video.paused
      ? `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png">`
      : `<img class="player-img-icon button-icon pause-icon" src="ic_vidcontrol_pause_play_00.png">`;
    toggleButton.ariaLabel = video.paused ? 'Play video' : 'Pause video';
    toggleButton.ariaPressed = video.paused ? 'false' : 'true';

    if (video.ended) {
      toggleButton.innerHTML = `<img class="player-img-icon button-icon reload-icon" src="ic_vidcontrol_reload.png">`;
      toggleButton.ariaLabel = 'Replay video';
      toggleButton.ariaPressed = 'false';
      videoPlayer.classList.add('player-ended');
      if (!controlsOverlay.classList.contains('controls-visible')) controlsBG.click();
    }
  }

  function updateFSButton() {
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (fs) {
      fullScreenBtn.innerHTML = `
<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_on.png">
<img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_on_pressed.png">`;
      fullScreenBtn.ariaPressed = 'true';
      fullScreenBtn.ariaLabel = 'Exit fullscreen';
      videoPlayer.classList.add('player-is-fullscreen');
    } else {
      fullScreenBtn.innerHTML = `
<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png">
<img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
      fullScreenBtn.ariaPressed = 'false';
      fullScreenBtn.ariaLabel = 'Open fullscreen';
      videoPlayer.classList.remove('player-is-fullscreen');
    }
  }

  function handleProgress() {
    const pct = (video.currentTime / (video.duration || 1)) * 100;
    if (!mousedown) progressBar.style.flexBasis = `${pct}%`;
    const cur = video.currentTime;
    const fmt = (cur > 3599) ? '11,8' : '14,5';
    // não dá pra usar substring por formato aqui; usamos opções fixas:
    currentTime.textContent = (new Date(cur * 1000)).toISOString().substr(cur > 3599 ? 11 : 14, cur > 3599 ? 8 : 5);
    currentTime.ariaLabel = `Current time is ${currentTime.textContent}`;
  }

  function removeScrubbingClass() {
    progressTrack.classList.remove('scrubbing');
    videoPlayer.classList.remove('player-seek-mode');
    if (scrubTime) video.currentTime = scrubTime;
  }

  function scrub(e) {
    const width = progress.offsetWidth;
    let x;
    if (e.type === 'touchmove') {
      const bcr = e.target.getBoundingClientRect();
      x = e.targetTouches[0].clientX - bcr.x;
    } else {
      x = e.offsetX;
    }
    scrubTime = (x / width) * (video.duration || 0);
    if (scrubTime < video.duration && scrubTime > 0) {
      storyboardTime.textContent = (new Date(scrubTime * 1000)).toISOString().substr(scrubTime > 3599 ? 11 : 14, scrubTime > 3599 ? 8 : 5);
    }
    const pct = (scrubTime / (video.duration || 1)) * 100;
    progressBar.style.flexBasis = `${pct}%`;
    SBVideo.currentTime = scrubTime;
    updateToggleButton();
    if (mousedown) {
      progressTrack.classList.add('scrubbing');
      videoPlayer.classList.add('player-seek-mode');
      if (coTimO) clearTimeout(coTimO);
    } else {
      progressTrack.classList.remove('scrubbing');
      videoPlayer.classList.remove('player-seek-mode');
      video.currentTime = scrubTime;
    }
  }

  function handleSliderUpdate() {
    video[this.name] = this.value;
    if (this.id === 'playbackRate') {
      labSliderPR.textContent = `Speed: ${this.value}x`;
    }
    if (this.id === 'volume') {
      labSliderVol.textContent = `Volume: ${Math.round(this.value * 100)}%`;
    }
  }

  function handleSkip() { video.currentTime += +this.dataset.skip; updateToggleButton(); }
  function handleSkipKey(skip) { video.currentTime += +skip; updateToggleButton(); }

  function handleDurationChange() {
    const d = video.duration || 0;
    duration.textContent = (new Date(d * 1000)).toISOString().substr(d > 3599 ? 11 : 14, d > 3599 ? 8 : 5);
    duration.ariaLabel = `Duration is ${duration.textContent}`;
  }

  // Dbl-tap seek
  let timer;
  let rewindSpeed = 0, forwardSpeed = 0, rewindSpeed2 = 0, forwardSpeed2 = 0;

  function updateCurrentTime(delta) {
    const isRew = delta < 0;
    if (isRew) { rewindSpeed = delta; rewindSpeed2 += delta; forwardSpeed = 0; forwardSpeed2 = 0; }
    else { forwardSpeed = delta; forwardSpeed2 += delta; rewindSpeed = 0; rewindSpeed2 = 0; }
    clearTimeout(timer);
    const speed = isRew ? rewindSpeed : forwardSpeed;
    const speed2 = isRew ? rewindSpeed2 : forwardSpeed2;
    video.currentTime = video.currentTime + speed;
    const notif = isRew ? rewindNotificationValue : forwardNotificationValue;
    notif.textContent = isRew ? `-${Math.abs(speed2)} seconds` : `${Math.abs(speed2)} seconds`;
    timer = setTimeout(() => { rewindSpeed = 0; rewindSpeed2 = 0; forwardSpeed = 0; forwardSpeed2 = 0; }, 2000);
  }
  function animateNotificationIn(isRew) {
    (isRew ? seekNotifications[0] : seekNotifications[1]).classList.remove('animate-in');
    videoPlayer.classList.remove('dbl-tap-seek-mode');
    setTimeout(() => {
      (isRew ? seekNotifications[0] : seekNotifications[1]).classList.add('animate-in');
      videoPlayer.classList.add('dbl-tap-seek-mode');
    }, 10);
  }
  function animateNotificationOut(el) {
    el.classList.remove('animate-in');
    videoPlayer.classList.remove('dbl-tap-seek-mode');
  }
  function forwardVideo() { updateCurrentTime(10); animateNotificationIn(false); }
  function rewindVideo() { updateCurrentTime(-10); animateNotificationIn(true); }

  qsa('.seek-notification', controlsCont).forEach((n) => {
    n.addEventListener('animationend', () => setTimeout(() => animateNotificationOut(n), 200));
  });

  // "double click" mobile-like
  let clickCount = 0;
  let dcTimeout;
  controlsBG.addEventListener('click', function (e) {
    if (dcTimeout) clearTimeout(dcTimeout);
    clickCount++;
    if (clickCount === 2) {
      const w = video.offsetWidth;
      (e.offsetX < w / 2) ? rewindVideo() : forwardVideo();
      clickCount = 0;
    }
    dcTimeout = setTimeout(() => { clickCount = 0; }, 300);
  });

  function openPlayerOptions() { videoPlayer.classList.add('player-options-shown'); }
  function hidePlayerOptions() { videoPlayer.classList.remove('player-options-shown'); closePlayerDialog(); }

  function openPlayerDialog() { playerOptDialog.setAttribute('open', ''); }
  function closePlayerDialog() {
    playerOptDialog.removeAttribute('open');
    setTimeout(() => {
      playerDialogTitle.textContent = '';
      playerDialogContent.innerHTML = '';
      playerDialogContent.removeAttribute('content-identifier');
      playerOptDialog.id = '';
      playerOptSelect.innerHTML = '';
    }, 300);
  }

  function openPlayerDialogMisc() {
    playerDialogTitle.textContent = 'Misc';
    playerDialogContent.innerHTML = '';
    playerOptSelect.innerHTML = '';
    playerDialogContent.appendChild(playerMiscOptions);
    playerDialogContent.setAttribute('content-identifier', 'player-misc');
    playerOptDialog.id = 'playerDialogMisc';
  }

  // ===== Qualidade (reconstruído) =====
  function buildQualityList() {
    qualityOptions = [];

    // 1) Opções progressivas (preferidas)
    progressive.forEach(p => {
      qualityOptions.push({ label: p.label, mode: 'native', url: p.url, mime: p.mime });
    });

    // 2) Opções adaptativas com MSE (se possível)
    const canMSE = !!window.MediaSource;
    if (canMSE && bestAudio) {
      // agregar labels únicos (ex.: 720p, 1080p...)
      adaptiveVideo.forEach(v => {
        // evita duplicar se já existe progressiva com o mesmo rótulo
        const existsNative = qualityOptions.some(o => o.mode === 'native' && o.label === v.label);
        if (!existsNative) {
          // Só adiciona se o tipo é suportado
          try {
            if (MediaSource.isTypeSupported(v.mime) && MediaSource.isTypeSupported(bestAudio.mime)) {
              qualityOptions.push({ label: v.label, mode: 'mse', vFmt: v, aFmt: bestAudio });
            }
          } catch (e) { /* ignore */ }
        }
      });
    }
  }

  function openPlayerDialogQual() {
    playerDialogTitle.textContent = 'Quality';
    playerDialogContent.innerHTML = '';
    playerOptSelect.innerHTML = '';
    playerDialogContent.appendChild(playerOptSelect);
    playerDialogContent.setAttribute('content-identifier', 'player-quality');
    playerOptDialog.id = 'playerDialogQuality';

    buildQualityList();

    qualityOptions
      // ordena por resolução (extrai número antes de 'p', se houver)
      .sort((a, b) => {
        const na = parseInt((a.label || '').toLowerCase().replace(/[^\d]/g, ''), 10) || 0;
        const nb = parseInt((b.label || '').toLowerCase().replace(/[^\d]/g, ''), 10) || 0;
        return nb - na;
      })
      .forEach(opt => {
        const btn = document.createElement('button');
        btn.classList.add('controls-button', 'player-select-button', 'has-ripple');
        btn.title = opt.label;
        btn.ariaLabel = opt.label;
        btn.textContent = opt.label;
        btn.ariaPressed = 'false';

        btn.addEventListener('click', async () => {
          // pausa e reseta UI
          try { video.pause(); } catch (_) {}
          videoPlayer.classList.add('player-loading');
          playerError.textContent = '';

          if (opt.mode === 'native') {
            stopMSEIfAny();
            // limpa sources antigos e usa src direto
            clearNativeSources();
            const s = document.createElement('source');
            s.src = opt.url;
            s.type = opt.mime || 'video/mp4';
            s.setAttribute('label', opt.label);
            s.setAttribute('selected', 'true');
            video.appendChild(s);
            video.src = opt.url;
            currentMode = 'native';
            await safeLoadPlay();
          } else {
            // MSE: junta vídeo+áudio
            const v = opt.vFmt;
            const a = opt.aFmt;
            await startMSE(v, a);
          }

          updateToggleButton();
        });

        playerOptSelect.appendChild(btn);
      });
  }

  // ===== Eventos básicos =====
  toggleButton.addEventListener('click', togglePlay);
  fullScreenBtn.addEventListener('click', toggleFullScreen);
  overflowBtn.addEventListener('click', openPlayerOptions);
  playerOptClose.addEventListener('click', hidePlayerOptions);

  playerOptMisc.addEventListener('click', function () { openPlayerDialog(); openPlayerDialogMisc(); });
  playerOptQual.addEventListener('click', function () { openPlayerDialog(); openPlayerDialogQual(); });

  playerOptCloseDialog.addEventListener('click', closePlayerDialog);
  video.addEventListener('click', togglePlay);
  video.addEventListener('play', updateToggleButton);
  video.addEventListener('pause', updateToggleButton);
  video.addEventListener('durationchange', handleDurationChange);
  videoPlayer.addEventListener('webkitfullscreenchange', updateFSButton);
  document.addEventListener('fullscreenchange', updateFSButton);

  video.addEventListener('timeupdate', handleProgress);
  progress.addEventListener('click', scrub);
  progress.addEventListener('mousedown', function () { mousedown = true; });
  progress.addEventListener('mousemove', function (e) { mousedown && scrub(e); });
  progress.addEventListener('mouseup', function () { mousedown = false; removeScrubbingClass(); });
  progress.addEventListener('touchstart', function () { mousedown = true; });
  progress.addEventListener('touchmove', function (e) { mousedown && scrub(e); });
  progress.addEventListener('touchend', function () { mousedown = false; removeScrubbingClass(); });

  qsa('.controls-slider', playerMiscOptions).forEach(sl => sl.addEventListener('input', handleSliderUpdate));
  qsa('[data-skip]', playerMiscOptions).forEach(btn => btn.addEventListener('click', handleSkip));

  video.addEventListener('error', function () {
    videoPlayer.classList.add('player-has-error');
    playerError.textContent = `The video failed to load\n\nTap to retry`;
    console.error('Video element error.');
  });

  playerError.addEventListener('click', function () {
    if (currentMode === 'mse') {
      if (mse && mse.readyState === 'open') try { mse.endOfStream(); } catch (_) {}
      // recomeça MSE com últimos formatos se possível
    }
    video.load();
    SBVideo.load();
  });

  function closeIFramePlayer() {
    const iframePlayerCont = qs('#iframePlayerCont');
    if (!iframePlayerCont) return;
    iframePlayerCont.classList.add('iframe-not-visible');
    setTimeout(function () {
      iframePlayerCont.remove();
      iframePlayerCont.classList.remove('iframe-not-visible');
      videoPlayer.classList.remove('player-iframe-visible');
    }, 350);
  }

  video.addEventListener('loadstart', function () {
    if (!videoPlayer.classList.contains('player-loading')) {
      videoPlayer.classList.add('player-loading');
    }
    poster.style.backgroundImage = `url("${video.poster || ''}")`;
    videoPlayer.classList.remove('player-started');
    videoPlayer.classList.remove('player-has-error');
    playerTitle.textContent = video.dataset.title || '';
    videoPlayer.classList.remove('player-options-shown');
    videoPlayer.classList.remove('player-mini-mode');
    videoPlayer.classList.remove('hide-prev-next-btns');
    closeIFramePlayer();
    closePlayerDialog();
  });

  video.addEventListener('waiting', function () {
    if (!videoPlayer.classList.contains('player-loading')) videoPlayer.classList.add('player-loading');
  });

  video.addEventListener('playing', function () {
    if (!videoPlayer.classList.contains('player-started')) videoPlayer.classList.add('player-started');
    setTimeout(() => { videoPlayer.classList.remove('player-loading'); }, 10);
  });

  video.addEventListener('suspend', function () { setTimeout(() => videoPlayer.classList.remove('player-loading'), 10); });

  videoPlayer.addEventListener('keydown', function (e) {
    if (e.code === 'Space') togglePlay();
    if (e.code === 'ArrowLeft') handleSkipKey(-10);
    if (e.code === 'ArrowRight') handleSkipKey(10);
  });

  // ====== MSE util ======
  function stopMSEIfAny() {
    try {
      if (mseUrl) { URL.revokeObjectURL(mseUrl); mseUrl = null; }
      if (mse) {
        if (mse.readyState === 'open') { try { mse.endOfStream(); } catch (_) {} }
      }
    } catch (_) {}
    mse = null; sbVideo = null; sbAudio = null;
  }

  function clearNativeSources() {
    qsa('source', video).forEach(s => s.remove());
  }

  async function fetchAsArrayBuffer(url) {
    const r = await fetch(url, { credentials: 'omit', mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.arrayBuffer();
  }

  async function startMSE(vFmt, aFmt) {
    stopMSEIfAny();
    clearNativeSources();

    if (!window.MediaSource) throw new Error('MSE not supported');
    mse = new MediaSource();
    currentMode = 'mse';
    return new Promise((resolve, reject) => {
      mse.addEventListener('sourceopen', async () => {
        try {
          sbVideo = mse.addSourceBuffer(vFmt.mime);
          sbAudio = mse.addSourceBuffer(aFmt.mime);

          // Para evitar "QuotaExceeded", append serializado
          const vBuf = await fetchAsArrayBuffer(vFmt.url);
          const aBuf = await fetchAsArrayBuffer(aFmt.url);

          // append vídeo
          await appendBufferAsync(sbVideo, vBuf);
          // append áudio
          await appendBufferAsync(sbAudio, aBuf);

          if (mse.readyState === 'open') mse.endOfStream();

          // play
          videoPlayer.classList.remove('player-has-error');
          await safeLoadPlay();
          resolve();
        } catch (err) {
          console.error('MSE error:', err);
          videoPlayer.classList.add('player-has-error');
          playerError.textContent = `The video failed to load (MSE)\n\nTap to retry`;
          reject(err);
        }
      }, { once: true });

      mseUrl = URL.createObjectURL(mse);
      video.src = mseUrl;
    });
  }

  function appendBufferAsync(sb, buf) {
    return new Promise((res, rej) => {
      function onUpdateEnd() { sb.removeEventListener('updateend', onUpdateEnd); res(); }
      function onError(e) { sb.removeEventListener('error', onError); rej(e); }
      sb.addEventListener('updateend', onUpdateEnd);
      sb.addEventListener('error', onError, { once: true });
      try { sb.appendBuffer(buf); } catch (e) { sb.removeEventListener('updateend', onUpdateEnd); rej(e); }
    });
  }

  async function safeLoadPlay() {
    try {
      await video.load();
    } catch (_) {}
    try {
      const p = video.play();
      if (p && typeof p.then === 'function') await p;
    } catch (_) {}
    setTimeout(() => videoPlayer.classList.remove('player-loading'), 10);
  }

  // ====== Parse dos formatos do backend ======
  function parseFormats(formats) {
    formatsRaw = Array.isArray(formats) ? formats : [];
    progressive = [];
    adaptiveVideo = [];
    adaptiveAudio = [];
    bestAudio = null;

    formatsRaw.forEach(f => {
      const mime = (f.mimeType || '').toLowerCase();
      const label = f.qualityLabel || f.quality || '';
      const entry = { label, url: f.url, mime: f.mimeType || 'video/mp4' };

      if (!f.url || !f.mimeType) return;

      if (mime.startsWith('video/')) {
        // Heurística: se for "audio/mp4" óbvio é audio-only; se for "video/..." e tiver 'mp4a' nos codecs, é progressivo.
        // Melhor ainda: alguns backends trazem flags. Se houver hasAudio, usa.
        const hasAudioFlag = (typeof f.hasAudio === 'boolean') ? f.hasAudio : /mp4a|vorbis|opus/i.test(f.mimeType);
        if (hasAudioFlag) progressive.push(entry);
        else adaptiveVideo.push(entry);
      } else if (mime.startsWith('audio/')) {
        // score simples para escolher o melhor áudio
        const br = f.bitrate || f.averageBitrate || 0;
        adaptiveAudio.push({ ...entry, score: br || 1 });
      }
    });

    // Ordena progressivos pela resolução
    progressive.sort((a, b) => getRes(b.label) - getRes(a.label));
    // Ordena video adaptativo pela resolução
    adaptiveVideo.sort((a, b) => getRes(b.label) - getRes(a.label));
    // Melhor áudio
    adaptiveAudio.sort((a, b) => (b.score || 0) - (a.score || 0));
    bestAudio = adaptiveAudio[0] || null;
  }

  function getRes(label) {
    if (!label) return 0;
    const n = parseInt(String(label).toLowerCase().replace(/[^\d]/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }

  // ====== Inserção do player + fetch dos dados ======
  function insertYTmPlayer(parent) {
    // anexa o player somente aqui (evita "beforebegin" em elemento não conectado)
    if (!videoPlayer.isConnected) parent.appendChild(videoPlayer);

    // limpa estado
    stopMSEIfAny();
    clearNativeSources();

    video.poster = '';
    video.dataset.title = '';
    video.removeAttribute('src');
    currentTime.textContent = '00:00';
    duration.textContent = '00:00';
    video.load();

    YTmVideoId = getVideoId();
    if (!YTmVideoId) {
      videoPlayer.classList.add('player-has-error');
      playerError.textContent = 'Missing video id (?v=)';
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', APIbaseURLNew + 'dl?cgeo=US&id=' + encodeURIComponent(YTmVideoId), true);
    // mantenho seus headers RapidAPI
    xhr.setRequestHeader('x-rapidapi-key', '4b0791fe33mshce00ad033774274p196706jsn957349df7a8f');
    xhr.setRequestHeader('x-rapidapi-host', 'yt-api.p.rapidapi.com');
    xhr.onerror = function () {
      videoPlayer.classList.add('player-has-error');
      playerError.textContent = `There was an error retrieving the video from the server\n\nSorry about that...`;
      console.error('XHR error:', xhr.status);
    };
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.response);
          // thumbnail seguro
          try { video.poster = (data.thumbnail && data.thumbnail[3] && data.thumbnail[3].url) ? data.thumbnail[3].url : (data.thumbnail?.[0]?.url || ''); } catch (_) {}
          video.dataset.title = data.title || '';

          // storyboard (opcional)
          try { if (data.formats && data.formats[0]?.url) SBVideo.src = data.formats[0].url; } catch (_) {}

          parseFormats(data.formats || []);

          // Estratégia inicial: melhor progressivo; se não tiver, tenta 720p/1080p via MSE
          const bestNative = progressive[0];
          if (bestNative) {
            const s = document.createElement('source');
            s.src = bestNative.url;
            s.type = bestNative.mime || 'video/mp4';
            s.setAttribute('label', bestNative.label || '');
            s.setAttribute('selected', 'true');
            video.appendChild(s);
            video.src = bestNative.url;
            currentMode = 'native';
            safeLoadPlay();
          } else if (adaptiveVideo.length && bestAudio && window.MediaSource) {
            // escolhe o maior (ex.: 1080p) e usa MSE
            startMSE(adaptiveVideo[0], bestAudio).catch(() => {
              // fallback final: tenta pelo menos primeiro formato (pode tocar sem áudio)
              const v = adaptiveVideo[0];
              const s = document.createElement('source');
              s.src = v.url; s.type = v.mime || 'video/mp4';
              video.appendChild(s);
              video.src = v.url;
              currentMode = 'native';
              safeLoadPlay();
            });
          } else {
            // Último fallback: primeiro formato bruto
            const f = (data.formats || [])[0];
            if (f?.url) {
              const s = document.createElement('source');
              s.src = f.url; s.type = f.mimeType || 'video/mp4';
              video.appendChild(s);
              video.src = f.url;
              currentMode = 'native';
              safeLoadPlay();
            } else {
              xhr.onerror();
            }
          }
        } catch (e) {
          console.error('Parse error', e);
          xhr.onerror();
        }
      } else {
        xhr.onerror();
      }
    };
    xhr.send();
  }

  // ====== Expor a função esperada pelo seu app ======
  // Se o seu código chamava insertYTmPlayer(parent) de fora, mantemos o nome:
  window.insertYTmPlayer = insertYTmPlayer;

})();
