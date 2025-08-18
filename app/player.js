/* =========================
   2015YTm – PLAYER.JS (com HLS/1080p)
   ========================= */

/* ---------- util flags/vars ---------- */
let controlsVisible = false;
let coTimO = null;
let scrubTime = null;
let mousedown = false;

/* HLS state */
let hls = null;
let isUsingHls = false;
let hlsManifestUrl = "";

/* helpers presentes em outros arquivos (garantir fallbacks) */
const APIbaseURLNew =
  (typeof window !== "undefined" && window.APIbaseURLNew) ||
  ""; // se vazio, use seu backend padrão no watch.js
const RAPIDAPI_KEY = (typeof window !== "undefined" && window.RAPIDAPI_KEY) || "";
const RAPIDAPI_HOST = (typeof window !== "undefined" && window.RAPIDAPI_HOST) || "";

/* tenta obter o id do vídeo caso playerVideoId não exista globalmente */
function getVideoIdFallback() {
  try {
    const u = new URL(location.href);
    return u.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

/* ---------- DOM base do player ---------- */
const video = document.createElement("video");
video.setAttribute("controls", "");
video.preload = "auto";
video.id = "player";
video.classList.add("player-api", "video-stream");

const videoPlayer = document.createElement("div");
videoPlayer.classList.add("video-player");
videoPlayer.id = video.id;
videoPlayer.setAttribute("tabindex", "-1");

const htmlVideoCont = document.createElement("div");
htmlVideoCont.ariaLabel = "2015YouTube Video Player";
htmlVideoCont.classList.add("html-video-container");
htmlVideoCont.id = "movie-player";
videoPlayer.appendChild(htmlVideoCont);
video.insertAdjacentElement("beforebegin", videoPlayer);
htmlVideoCont.appendChild(video);
video.removeAttribute("controls");

const controlsCont = document.createElement("div");
controlsCont.classList.add("player-controls-container");
const leftArrowUnicode = "\u25C0";
const rightArrowUnicode = "\u25B6";

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

const seekNotifications = controlsCont.querySelectorAll(".seek-notification");
const forwardNotificationValue = controlsCont.querySelector(".video-forward-notify span");
const rewindNotificationValue = controlsCont.querySelector(".video-rewind-notify span");
const playerError = controlsCont.querySelector(".player-error");
const playerOptCont = controlsCont.querySelector(".player-options-container");
const playerOptContent = playerOptCont.querySelector(".player-options-content");
const poster = controlsCont.querySelector(".player-poster");

videoPlayer.appendChild(controlsCont);

const controlsTop = document.createElement("div");
controlsTop.classList.add("player-controls-top");
const controlsMiddle = document.createElement("div");
controlsMiddle.classList.add("player-controls-middle");
const controls = document.createElement("div");
controls.classList.add("player-controls");

const controlsOverlay = controlsCont.querySelector(".player-controls-overlay");
const controlsBG = controlsCont.querySelector(".player-controls-background");

controlsOverlay.appendChild(controlsTop);
controlsOverlay.appendChild(playerError);
controlsOverlay.appendChild(controlsMiddle);
controlsOverlay.appendChild(controls);

/* topo/meio/baixo */
const btnsCont = document.createElement("div");
btnsCont.classList.add("player-buttons-container");
controls.appendChild(btnsCont);

const currentTime = document.createElement("span");
currentTime.classList.add("player-time-count", "player-current-time");
currentTime.innerHTML = "00:00";
currentTime.ariaLabel = "Current time is 00:00";
btnsCont.appendChild(currentTime);

const progressCont = document.createElement("div");
progressCont.classList.add("progress-container");
const progress = document.createElement("div");
progress.classList.add("progress");
progress.innerHTML = `
  <div class="progress-filled">
    <div class="progress-track"></div>
    <div class="player-storyboard-container">
      <div class="player-storyboard">
        <video class="storyboard-video" preload="metadata" muted src=""></video>
      </div>
      <div class="player-storyboard-time-tooltip">00:00</div>
    </div>
  </div>`;
const SBVideo = progress.querySelector("video");
const storyboardTime = progress.querySelector(".player-storyboard-time-tooltip");
const progressBar = progress.querySelector(".progress-filled");
const progressTrack = progress.querySelector(".progress-track");
progressCont.appendChild(progress);

const prevVidBtn = document.createElement("button");
prevVidBtn.classList.add("controls-button", "controls-btn-disabled", "prev-vid-button", "has-ripple");
prevVidBtn.ariaLabel = "Previous video";
prevVidBtn.ariaDisabled = "true";
prevVidBtn.title = "Previous video";
prevVidBtn.innerHTML = `<img class="player-img-icon button-icon prev-vid-icon" src="ic_vidcontrol_prev.png">`;
controlsMiddle.appendChild(prevVidBtn);

const toggleButton = document.createElement("button");
toggleButton.classList.add("controls-button", "toggle-button", "play-pause-button", "has-ripple");
toggleButton.ariaLabel = "Play video";
toggleButton.ariaPressed = "false";
toggleButton.title = "Toggle Play";
toggleButton.innerHTML = `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png">`;
controlsMiddle.appendChild(toggleButton);

const nextVidBtn = document.createElement("button");
nextVidBtn.classList.add("controls-button", "controls-btn-disabled", "next-vid-button", "has-ripple");
nextVidBtn.ariaLabel = "Next video";
nextVidBtn.ariaDisabled = "true";
nextVidBtn.title = "Next video";
nextVidBtn.innerHTML = `<img class="player-img-icon button-icon next-vid-icon" src="ic_vidcontrol_next.png">`;
controlsMiddle.appendChild(nextVidBtn);

btnsCont.appendChild(progressCont);

const playerExitWatchBtn = document.createElement("button");
playerExitWatchBtn.classList.add("controls-button", "exit-watch-button", "has-ripple");
playerExitWatchBtn.title = "Collapse watchpage";
playerExitWatchBtn.ariaLabel = "Collapse watchpage";
playerExitWatchBtn.innerHTML = `
  <img class="player-img-icon button-icon exit-watch-icon inactive" src="ic_vidcontrol_collapse.png">
  <img class="player-img-icon button-icon exit-watch-icon active" src="ic_vidcontrol_collapse_pressed.png">`;
playerExitWatchBtn.ariaPressed = "false";
controlsTop.appendChild(playerExitWatchBtn);

const playerTitle = document.createElement("h3");
playerTitle.classList.add("player-title");
playerTitle.ariaLabel = "";
playerTitle.innerHTML = "";
controlsTop.appendChild(playerTitle);

/* Sliders & skips (Misc) */
const labSliderVol = document.createElement("label");
labSliderVol.setAttribute("for", "volume");
labSliderVol.classList.add("controls-slider-label");

const sliderVol = document.createElement("input");
sliderVol.type = "range"; sliderVol.name = "volume"; sliderVol.id = "volume";
sliderVol.classList.add("controls-slider"); sliderVol.min = "0"; sliderVol.max = "1";
sliderVol.step = "0.01"; sliderVol.setAttribute("value", 1);
labSliderVol.textContent = "Volume: " + Math.round(sliderVol.value * 100) + "%";

const labSliderPR = document.createElement("label");
labSliderPR.setAttribute("for", "playbackRate");
labSliderPR.classList.add("controls-slider-label");

const sliderPR = document.createElement("input");
sliderPR.type = "range"; sliderPR.name = "playbackRate"; sliderPR.id = "playbackRate";
sliderPR.classList.add("controls-slider"); sliderPR.min = "0.25"; sliderPR.max = "2";
sliderPR.step = "0.05"; sliderPR.setAttribute("value", 1);
labSliderPR.textContent = "Speed: " + sliderPR.value + "x";

const skipBtn1 = document.createElement("button");
skipBtn1.classList.add("controls-button", "skip-button", "has-ripple");
skipBtn1.innerHTML = `<< 10s`; skipBtn1.dataset.skip = "-10";

const skipBtn2 = document.createElement("button");
skipBtn2.classList.add("controls-button", "skip-button", "has-ripple");
skipBtn2.innerHTML = `10s >>`; skipBtn2.dataset.skip = "10";

const controlsSpacer = document.createElement("div");
controlsSpacer.classList.add("controls-spacer");
controlsTop.appendChild(controlsSpacer);

const playerShareBtn = document.createElement("button");
playerShareBtn.classList.add("controls-button", "share-button", "has-ripple");
playerShareBtn.title = "Share video"; playerShareBtn.ariaLabel = "Share video";
playerShareBtn.innerHTML = `
  <img class="player-img-icon button-icon share-icon inactive" src="ic_vidcontrol_share.png">
  <img class="player-img-icon button-icon share-icon active" src="ic_vidcontrol_share_pressed.png">`;
playerShareBtn.ariaPressed = "false";
controlsTop.appendChild(playerShareBtn);

const overflowBtn = document.createElement("button");
overflowBtn.classList.add("controls-button", "overflow-button", "has-ripple");
overflowBtn.title = "More options"; overflowBtn.ariaLabel = "More options";
overflowBtn.innerHTML = `
  <img class="player-img-icon button-icon menu-icon inactive" src="ic_vidcontrol_overflow.png">
  <img class="player-img-icon button-icon menu-icon active" src="ic_vidcontrol_overflow_pressed.png">`;
overflowBtn.ariaPressed = "false";
controlsTop.appendChild(overflowBtn);

const duration = document.createElement("span");
duration.classList.add("player-time-count", "player-duration");
duration.innerHTML = "00:00";
duration.ariaLabel = "Duration is 00:00";
btnsCont.appendChild(duration);

const fullScreenBtn = document.createElement("button");
fullScreenBtn.classList.add("controls-button", "toggle-button", "fullscreen-button", "has-ripple");
fullScreenBtn.title = "Toggle Fullscreen"; fullScreenBtn.ariaLabel = "Open fullscreen";
fullScreenBtn.innerHTML = `
  <img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png">
  <img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
fullScreenBtn.ariaPressed = "false";
btnsCont.appendChild(fullScreenBtn);

/* Dialog & Options */
const playerDialogOverlay = document.createElement("div");
playerDialogOverlay.classList.add("player-dialog-overlay");

const playerOptDialog = document.createElement("dialog");
playerOptDialog.classList.add("player-options-dialog");
playerOptDialog.id = "";
playerOptDialog.innerHTML = `
<div class="player-dialog-header">
  <h3 class="player-dialog-title" aria-label=""></h3>
</div>
<div class="player-dialog-content"></div>
<div class="player-dialog-footer"></div>
`;
const playerDialogFooter = playerOptDialog.querySelector(".player-dialog-footer");
const playerDialogTitle = playerOptDialog.querySelector(".player-dialog-title");
const playerDialogContent = playerOptDialog.querySelector(".player-dialog-content");
playerOptCont.appendChild(playerOptDialog);
playerOptCont.appendChild(playerDialogOverlay);

const playerOptCloseDialog = document.createElement("button");
playerOptCloseDialog.classList.add("controls-button", "close-plyr-dialog-button", "has-ripple");
playerOptCloseDialog.title = "Close dialog";
playerOptCloseDialog.ariaLabel = "Close dialog";
playerOptCloseDialog.textContent = "Close";
playerOptCloseDialog.ariaPressed = "false";
playerDialogFooter.appendChild(playerOptCloseDialog);

const playerOptItem = document.createElement("div");
playerOptItem.classList.add("player-options-item");
playerOptContent.appendChild(playerOptItem);

const playerOptClose = document.createElement("button");
playerOptClose.classList.add("controls-button", "hide-options-button", "has-ripple");
playerOptClose.title = "Hide options";
playerOptClose.ariaLabel = "Hide options";
playerOptClose.innerHTML = `
  <img class="player-img-icon button-icon hide-icon inactive" src="ic_vidcontrol_hide_controls.png">
  <img class="player-img-icon button-icon hide-icon active" src="ic_vidcontrol_hide_controls_pressed.png">`;
playerOptClose.ariaPressed = "false";
playerOptContent.appendChild(playerOptClose);

const playerOptMisc = document.createElement("button");
playerOptMisc.classList.add("controls-button", "options-item-button", "misc-button", "has-ripple");
playerOptMisc.title = "Miscellaneous"; playerOptMisc.ariaLabel = "Miscellaneous";
playerOptMisc.innerHTML = `
  <img class="player-img-icon button-icon misc-icon inactive" src="player_icon_misc.png">
  <img class="player-img-icon button-icon misc-icon active" src="player_icon_misc_pressed.png">`;
playerOptMisc.ariaPressed = "false";
const playerOptMiscText = document.createElement("span");
playerOptMiscText.textContent = "Misc";
playerOptMiscText.classList.add("options-item-text");
playerOptItem.appendChild(playerOptMisc);
playerOptItem.appendChild(playerOptMiscText);

const playerMiscOptions = document.createElement("div");
playerMiscOptions.classList.add("player-misc-options");
playerMiscOptions.appendChild(labSliderVol);
playerMiscOptions.appendChild(sliderVol);
playerMiscOptions.appendChild(labSliderPR);
playerMiscOptions.appendChild(sliderPR);
playerMiscOptions.appendChild(skipBtn1);
playerMiscOptions.appendChild(skipBtn2);
const sliders = playerMiscOptions.querySelectorAll(".controls-slider");
const skipBtns = playerMiscOptions.querySelectorAll("[data-skip]");

const playerOptItem2 = document.createElement("div");
playerOptItem2.classList.add("player-options-item");
playerOptContent.appendChild(playerOptItem2);

const playerOptQual = document.createElement("button");
playerOptQual.classList.add("controls-button", "options-item-button", "quality-button", "has-ripple");
playerOptQual.title = "Quality"; playerOptQual.ariaLabel = "Quality";
playerOptQual.innerHTML = `
  <img class="player-img-icon button-icon quality-icon inactive" src="ic_vidcontrol_quality.png">
  <img class="player-img-icon button-icon quality-icon active" src="ic_vidcontrol_quality_pressed.png">`;
playerOptQual.ariaPressed = "false";
const playerOptQualText = document.createElement("span");
playerOptQualText.textContent = "Quality";
playerOptQualText.classList.add("options-item-text");
playerOptItem2.appendChild(playerOptQual);
playerOptItem2.appendChild(playerOptQualText);

const playerOptSelect = document.createElement("div");
playerOptSelect.classList.add("player-dialog-select");

const playerOptItem3 = document.createElement("div");
playerOptItem3.classList.add("player-options-item");
playerOptContent.appendChild(playerOptItem3);

const playerOptIFrame = document.createElement("button");
playerOptIFrame.classList.add("controls-button", "options-item-button", "iframe-player-button", "has-ripple");
playerOptIFrame.title = "YT iFrame Player"; playerOptIFrame.ariaLabel = "YT iFrame Player";
playerOptIFrame.innerHTML = `
  <img class="player-img-icon button-icon iframe-icon inactive" src="player_icon_iframe.png">
  <img class="player-img-icon button-icon iframe-icon active" src="player_icon_iframe_pressed.png">`;
playerOptIFrame.ariaPressed = "false";
const playerOptIFrameText = document.createElement("span");
playerOptIFrameText.textContent = "YT iFrame Player";
playerOptIFrameText.classList.add("options-item-text");
playerOptItem3.appendChild(playerOptIFrame);
playerOptItem3.appendChild(playerOptIFrameText);

/* ---------- Overlay show/hide ---------- */
controlsBG.onclick = function () {
  if (!controlsVisible) {
    controlsVisible = true;
    controlsOverlay.classList.add("controls-visible");

    if (coTimO) clearTimeout(coTimO);
    coTimO = setTimeout(() => {
      controlsVisible = false;
      controlsOverlay.classList.remove("controls-visible");
    }, 4000);

    if (video.paused) {
      if (coTimO) clearTimeout(coTimO);
    }

    const onPlay = () => {
      if (!videoPlayer.classList.contains("dbl-tap-seek-mode")) {
        if (coTimO) clearTimeout(coTimO);
        coTimO = setTimeout(() => {
          controlsVisible = false;
          controlsOverlay.classList.remove("controls-visible");
        }, 4000);
      }
    };
    const onPause = () => {
      if (!videoPlayer.classList.contains("dbl-tap-seek-mode")) {
        if (coTimO) clearTimeout(coTimO);
      }
    };
    video.addEventListener("playing", onPlay, { once: true });
    video.addEventListener("pause", onPause, { once: true });
  } else {
    controlsVisible = false;
    controlsOverlay.classList.remove("controls-visible");
    if (coTimO) clearTimeout(coTimO);
  }
};

/* ---------- controls core ---------- */
function togglePlay() {
  if (video.paused || video.ended) video.play().catch(() => {});
  else video.pause();
}

function toggleFullScreen() {
  if (document.webkitFullscreenElement) document.webkitExitFullscreen();
  else videoPlayer.webkitRequestFullscreen();
}

function updateToggleButton() {
  videoPlayer.classList.remove("player-ended");
  toggleButton.innerHTML = video.paused
    ? `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png">`
    : `<img class="player-img-icon button-icon pause-icon" src="ic_vidcontrol_pause_play_00.png">`;
  toggleButton.ariaLabel = video.paused ? "Play video" : "Pause video";
  toggleButton.ariaPressed = video.paused ? "false" : "true";
  if (video.ended) {
    toggleButton.innerHTML = `<img class="player-img-icon button-icon reload-icon" src="ic_vidcontrol_reload.png">`;
    toggleButton.ariaLabel = "Replay video";
    toggleButton.ariaPressed = "false";
    videoPlayer.classList.add("player-ended");
    if (!controlsOverlay.classList.contains("controls-visible")) controlsBG.click();
  }
}

function updateFSButton() {
  if (document.webkitFullscreenElement) {
    fullScreenBtn.innerHTML = `
      <img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_on.png">
      <img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_on_pressed.png">`;
    fullScreenBtn.ariaPressed = "true";
    fullScreenBtn.ariaLabel = "Exit fullscreen";
    videoPlayer.classList.add("player-is-fullscreen");
  } else {
    fullScreenBtn.innerHTML = `
      <img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png">
      <img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
    fullScreenBtn.ariaPressed = "false";
    fullScreenBtn.ariaLabel = "Open fullscreen";
    videoPlayer.classList.remove("player-is-fullscreen");
  }
}

function fmtClock(sec) {
  const s = Math.max(0, +sec || 0);
  if (s > 3599) return new Date(1000 * s).toISOString().substr(11, 8);
  return new Date(1000 * s).toISOString().substr(14, 5);
}

function handleProgress() {
  if (!isFinite(video.duration) || video.duration <= 0) return;
  const pct = (video.currentTime / video.duration) * 100;
  if (!mousedown) progressBar.style.flexBasis = `${pct}%`;
  currentTime.innerHTML = fmtClock(video.currentTime);
  currentTime.ariaLabel = "Current time is " + currentTime.innerHTML;
}

function removeScrubbingClass() {
  progressTrack.classList.remove("scrubbing");
  videoPlayer.classList.remove("player-seek-mode");
  if (scrubTime != null) video.currentTime = scrubTime;
}

function scrub(e) {
  const rect = progress.getBoundingClientRect();
  let posX;
  if (e.type === "touchmove" || e.type === "touchstart") {
    const t = (e.touches && e.touches[0]) || (e.targetTouches && e.targetTouches[0]);
    if (!t) return;
    posX = Math.min(Math.max(t.clientX - rect.left, 0), rect.width);
  } else {
    posX = Math.min(Math.max(e.offsetX ?? (e.clientX - rect.left), 0), rect.width);
  }
  if (!isFinite(video.duration) || video.duration <= 0) return;
  scrubTime = (posX / progress.offsetWidth) * video.duration;
  storyboardTime.innerHTML = fmtClock(scrubTime);
  const pct = (scrubTime / video.duration) * 100;
  progressBar.style.flexBasis = `${pct}%`;
  SBVideo.currentTime = scrubTime;
  updateToggleButton();
  if (mousedown) {
    progressTrack.classList.add("scrubbing");
    videoPlayer.classList.add("player-seek-mode");
    if (coTimO) clearTimeout(coTimO);
  } else {
    progressTrack.classList.remove("scrubbing");
    videoPlayer.classList.remove("player-seek-mode");
    video.currentTime = scrubTime;
  }
}

function handleSliderUpdate() {
  const k = this.name;
  const v = parseFloat(this.value);
  if (k === "playbackRate") {
    video.playbackRate = v;
    playerMiscOptions.querySelector(`[for="${this.id}"].controls-slider-label`).textContent = `Speed: ${v}x`;
  } else if (k === "volume") {
    video.volume = v;
    playerMiscOptions.querySelector(`[for="${this.id}"].controls-slider-label`).textContent = `Volume: ${Math.round(v * 100)}%`;
  }
}

function handleSkip() {
  const d = parseFloat(this.dataset.skip || "0") || 0;
  video.currentTime = Math.max(0, Math.min((video.currentTime || 0) + d, video.duration || 9e9));
  updateToggleButton();
}
function handleSkipKey(skip) {
  const d = parseFloat(skip || "0") || 0;
  video.currentTime = Math.max(0, Math.min((video.currentTime || 0) + d, video.duration || 9e9));
  updateToggleButton();
}

function handleDurationChange() {
  if (!isFinite(video.duration)) return;
  duration.innerHTML = fmtClock(video.duration);
  duration.ariaLabel = "Duration is " + duration.innerHTML;
}

/* double tap seek */
let tapTimer, rewindSpeed = 0, forwardSpeed = 0, rewindSpeed2 = 0, forwardSpeed2 = 0;
function updateCurrentTime(delta) {
  const rew = delta < 0;
  if (rew) { rewindSpeed = delta; rewindSpeed2 += delta; forwardSpeed = 0; forwardSpeed2 = 0; }
  else { forwardSpeed = delta; forwardSpeed2 += delta; rewindSpeed = 0; rewindSpeed2 = 0; }
  clearTimeout(tapTimer);
  const speed2 = rew ? rewindSpeed2 : forwardSpeed2;
  video.currentTime = Math.max(0, Math.min((video.currentTime || 0) + (rew ? rewindSpeed : forwardSpeed), video.duration || 9e9));
  const el = rew ? rewindNotificationValue : forwardNotificationValue;
  el.innerHTML = (rew ? "-" : "") + `${Math.abs(speed2)} seconds`;
  tapTimer = setTimeout(() => { rewindSpeed = 0; rewindSpeed2 = 0; forwardSpeed = 0; forwardSpeed2 = 0; }, 2000);
}
function animateNotificationIn(isRewinding) {
  (isRewinding ? seekNotifications[0] : seekNotifications[1]).classList.remove("animate-in");
  videoPlayer.classList.remove("dbl-tap-seek-mode");
  setTimeout(() => {
    (isRewinding ? seekNotifications[0] : seekNotifications[1]).classList.add("animate-in");
    videoPlayer.classList.add("dbl-tap-seek-mode");
  }, 10);
}
function animateNotificationOut(e) {
  e.classList.remove("animate-in");
  videoPlayer.classList.remove("dbl-tap-seek-mode");
}
function forwardVideo() { updateCurrentTime(10); animateNotificationIn(false); }
function rewindVideo()  { updateCurrentTime(-10); animateNotificationIn(true); }
function doubleClickHandler(e) {
  const w = video.offsetWidth; (e.offsetX < w / 2) ? rewindVideo() : forwardVideo();
}
Array.from(seekNotifications).forEach(n => n.addEventListener("animationend", () => setTimeout(() => animateNotificationOut(n), 200)));

let clickCount = 0, clickTimeout;
controlsBG.addEventListener("click", function (e) {
  if (clickTimeout) clearTimeout(clickTimeout);
  clickCount++;
  if (clickCount === 2) { doubleClickHandler(e); clickCount = 0; }
  clickTimeout = setTimeout(() => { clickCount = 0; }, 300);
});

/* options/dialogs */
function openPlayerOptions() {
  videoPlayer.classList.add("player-options-shown");
}
function hidePlayerOptions() {
  videoPlayer.classList.remove("player-options-shown");
  closePlayerDialog();
}
function openPlayerDialog() { playerOptDialog.setAttribute("open", ""); }
function closePlayerDialog() {
  playerOptDialog.removeAttribute("open");
  setTimeout(() => {
    playerDialogTitle.textContent = "";
    playerDialogContent.innerHTML = "";
    playerDialogContent.removeAttribute("content-identifier");
    playerOptDialog.id = "";
    playerOptSelect.innerHTML = "";
  }, 200);
}
function openPlayerDialogMisc() {
  playerDialogTitle.textContent = "Misc";
  playerDialogContent.innerHTML = "";
  playerOptSelect.innerHTML = "";
  playerDialogContent.appendChild(playerMiscOptions);
  playerDialogContent.setAttribute("content-identifier", "player-misc");
  playerOptDialog.id = "playerDialogMisc";
}

/* ---------- Qualidade (HLS e progressivo) ---------- */
function labelFromHeight(h) { return h ? `${h}p` : "Auto"; }

function openPlayerDialogQual() {
  playerDialogTitle.textContent = "Quality";
  playerDialogContent.innerHTML = "";
  playerOptSelect.innerHTML = "";
  playerDialogContent.appendChild(playerOptSelect);
  playerDialogContent.setAttribute("content-identifier", "player-quality");
  playerOptDialog.id = "playerDialogQuality";

  if (isUsingHls && hls && Array.isArray(hls.levels) && hls.levels.length) {
    // HLS: níveis do manifesto
    const levels = hls.levels.map((l, i) => ({ idx: i, height: (l.height|0), bitrate: l.bitrate|0 }));
    // ordenar desc por height
    levels.sort((a, b) => (b.height - a.height) || (b.bitrate - a.bitrate));

    // Botão Auto
    const btnAuto = document.createElement("button");
    btnAuto.classList.add("controls-button", "player-select-button", "has-ripple");
    btnAuto.textContent = "Auto";
    btnAuto.title = "Auto";
    btnAuto.ariaLabel = "Auto";
    const pressedAuto = hls.autoLevelEnabled === true;
    btnAuto.setAttribute("aria-pressed", pressedAuto ? "true" : "false");
    btnAuto.onclick = () => {
      hls.autoLevelEnabled = true;
      btnAuto.setAttribute("aria-pressed", "true");
      playerOptSelect.querySelectorAll(".player-select-button").forEach(b => { if (b !== btnAuto) b.setAttribute("aria-pressed", "false"); });
      closePlayerDialog();
    };
    playerOptSelect.appendChild(btnAuto);

    // Botões por qualidade
    levels.forEach((L) => {
      const btn = document.createElement("button");
      btn.classList.add("controls-button", "player-select-button", "has-ripple");
      const text = labelFromHeight(L.height);
      btn.textContent = text;
      btn.title = text; btn.ariaLabel = text;

      const desiredIdx = hls.currentLevel ?? hls.nextLevel ?? -1;
      const pressed = !hls.autoLevelEnabled && desiredIdx === L.idx;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");

      btn.onclick = () => {
        try {
          hls.autoLevelEnabled = false;
          hls.startLevel = L.idx;
          hls.nextLevel  = L.idx;
          hls.currentLevel = L.idx;
        } catch {}
        playerOptSelect.querySelectorAll(".player-select-button").forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        closePlayerDialog();
      };
      playerOptSelect.appendChild(btn);
    });
  } else {
    // Progressivo: ler <source>
    const sources = Array.from(video.querySelectorAll("source"));
    if (!sources.length) {
      const info = document.createElement("div");
      info.style.padding = "10px";
      info.textContent = "No alternate qualities available.";
      playerDialogContent.appendChild(info);
      return;
    }
    sources.forEach((item) => {
      const btn = document.createElement("button");
      btn.classList.add("controls-button", "player-select-button", "has-ripple");
      const label = item.getAttribute("label") || item.getAttribute("quality") || "Video";
      btn.textContent = label; btn.title = label; btn.ariaLabel = label;
      const sel = item.getAttribute("selected") === "true";
      btn.setAttribute("aria-pressed", sel ? "true" : "false");
      btn.onclick = () => {
        const t = video.currentTime || 0;
        Array.from(video.querySelectorAll("source")).forEach(s => s.setAttribute("selected", "false"));
        item.setAttribute("selected", "true");
        const oldPaused = video.paused;
        video.src = item.src;
        video.load();
        video.currentTime = t;
        if (!oldPaused) video.play().catch(()=>{});
        playerOptSelect.querySelectorAll(".player-select-button").forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        closePlayerDialog();
      };
      playerOptSelect.appendChild(btn);
    });
  }
}

/* ---------- listener de botões ---------- */
toggleButton.addEventListener("click", togglePlay);
fullScreenBtn.addEventListener("click", toggleFullScreen);
overflowBtn.addEventListener("click", openPlayerOptions);
playerOptClose.addEventListener("click", hidePlayerOptions);
playerOptMisc.addEventListener("click", () => { openPlayerDialog(); openPlayerDialogMisc(); });
playerOptQual.addEventListener("click", () => { openPlayerDialog(); openPlayerDialogQual(); });
playerOptCloseDialog.addEventListener("click", closePlayerDialog);
video.addEventListener("click", togglePlay);
video.addEventListener("play", updateToggleButton);
video.addEventListener("pause", updateToggleButton);
video.addEventListener("durationchange", handleDurationChange);
videoPlayer.addEventListener("webkitfullscreenchange", updateFSButton);

video.addEventListener("timeupdate", handleProgress);
progress.addEventListener("click", scrub);
progress.addEventListener("mousedown", () => { mousedown = true; });
progress.addEventListener("mousemove", (e) => { mousedown && scrub(e); });
progress.addEventListener("mouseup", () => { mousedown = false; removeScrubbingClass(); });
progress.addEventListener("touchstart", () => { mousedown = true; });
progress.addEventListener("touchmove", (e) => { mousedown && scrub(e); });
progress.addEventListener("touchend", () => { mousedown = false; removeScrubbingClass(); });

/* ---------- erros & loading ---------- */
function showSpinner() { videoPlayer.classList.add("player-loading"); }
function hideSpinner() { videoPlayer.classList.remove("player-loading"); }

video.addEventListener("error", () => {
  videoPlayer.classList.add("player-has-error");
  playerError.textContent = `The video failed to load\n\nTap to retry`;
  hideSpinner();
  console.error("The video failed to load.");
});
playerError.addEventListener("click", () => { video.load(); SBVideo.load(); });

/* iFrame noop (evitar erros se não existir) */
function closeIFramePlayer() {
  const iframePlayerCont = document.querySelector(".iframe-player-container");
  if (!iframePlayerCont) return;
  iframePlayerCont.classList.add("iframe-not-visible");
  setTimeout(() => {
    iframePlayerCont.remove();
    videoPlayer.classList.remove("player-iframe-visible");
  }, 350);
}

/* estados de rede */
video.addEventListener("loadstart", () => {
  showSpinner();
  poster.style.backgroundImage = `url("${video.poster || ""}")`;
  videoPlayer.classList.remove("player-started", "player-has-error", "player-options-shown", "player-mini-mode");
  videoPlayer.classList.remove("hide-prev-next-btns");
  closeIFramePlayer();
  closePlayerDialog();
});
video.addEventListener("waiting", showSpinner);
video.addEventListener("playing", () => {
  videoPlayer.classList.add("player-started");
  setTimeout(hideSpinner, 10);
});
video.addEventListener("suspend", () => setTimeout(hideSpinner, 10));

videoPlayer.addEventListener("keydown", (e) => {
  if (e.code === "Space") togglePlay();
  if (e.code === "ArrowLeft") handleSkipKey(-10);
  if (e.code === "ArrowRight") handleSkipKey(10);
});

/* ---------- HLS helpers ---------- */
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.setAttribute("data-src", src);
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

function pickHlsLevelIndexByHeight(levels, targetHeight) {
  if (!Array.isArray(levels) || !levels.length) return null;
  let exact = levels.findIndex((l) => (l.height | 0) === targetHeight);
  if (exact >= 0) return exact;
  let bestBelow = -1, bestH = -1;
  levels.forEach((l, i) => {
    const h = l.height | 0;
    if (h <= targetHeight && h > bestH) { bestH = h; bestBelow = i; }
  });
  if (bestBelow >= 0) return bestBelow;
  let maxH = -1, maxIdx = 0;
  levels.forEach((l, i) => { const h = l.height | 0; if (h > maxH) { maxH = h; maxIdx = i; } });
  return maxIdx;
}

async function setupHls(hlsUrl) {
  isUsingHls = true;
  hlsManifestUrl = hlsUrl;

  if (!window.Hls) {
    try { await loadScriptOnce("https://cdn.jsdelivr.net/npm/hls.js@1.5.14/dist/hls.min.js"); }
    catch { isUsingHls = false; video.src = hlsUrl; return; }
  }

  if (window.Hls && window.Hls.isSupported()) {
    if (hls) { try { hls.destroy(); } catch {} hls = null; }

    const TARGET_HEIGHT = 1080;
    hls = new Hls({
      enableWorker: true,
      autoStartLoad: true,
      capLevelToPlayerSize: false,
      startLevel: -1
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      try {
        const idx = pickHlsLevelIndexByHeight(hls.levels, TARGET_HEIGHT);
        if (idx != null) {
          hls.autoLevelEnabled = false;
          hls.startLevel = idx;
          hls.nextLevel = idx;
          hls.currentLevel = idx;
        }
      } catch {}
      try { video.play()?.catch(() => {}); } catch {}
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      if (!hls || hls.autoLevelEnabled) return;
      const desired = pickHlsLevelIndexByHeight(hls.levels, 1080);
      if (desired != null && data.level !== desired) {
        hls.currentLevel = desired;
      }
    });

    hls.on(Hls.Events.ERROR, (e, data) => {
      if (data?.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      }
    });

    hls.loadSource(hlsManifestUrl);
    hls.attachMedia(video);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = hlsManifestUrl; // Safari nativo
  } else {
    isUsingHls = false;
    video.src = hlsUrl; // último recurso
  }
}

/* ---------- escolha de fontes ---------- */
function isProgressiveMime(m) { return /video\/mp4|video\/webm/i.test(m || ""); }
function looksLikeHls(mimeType, url) {
  return /application\/vnd\.apple\.mpegurl|application\/x-mpegURL/i.test(mimeType || "") || (url && /\.m3u8(\?|$)/i.test(url));
}

async function buildSourcesFromResponse(data) {
  const hlsUrl =
    data?.hlsManifestUrl ||
    data?.streamingData?.hlsManifestUrl ||
    (Array.isArray(data?.formats) && (data.formats.find(f => looksLikeHls(f.mimeType, f.url))?.url)) ||
    (Array.isArray(data?.adaptiveFormats) && (data.adaptiveFormats.find(f => looksLikeHls(f.mimeType, f.url))?.url));

  if (hlsUrl) {
    await setupHls(hlsUrl);
    const first = data?.formats?.[0]?.url ||
                  data?.adaptiveFormats?.find(f => isProgressiveMime(f.mimeType))?.url || "";
    if (first) SBVideo.src = first;
    return "hls";
  }

  const raw = []
    .concat(Array.isArray(data?.formats) ? data.formats : [])
    .concat(Array.isArray(data?.adaptiveFormats) ? data.adaptiveFormats : [])
    .filter(Boolean);

  const progressive = raw.filter(f => f.url && isProgressiveMime(f.mimeType || ""));
  progressive.sort((a, b) => {
    const na = parseInt((a.qualityLabel || a.quality || "").replace(/[^\d]/g, "")) || 0;
    const nb = parseInt((b.qualityLabel || b.quality || "").replace(/[^\d]/g, "")) || 0;
    return nb - na;
  });

  video.innerHTML = ``;

  const pick = progressive.find(f => /1080/.test(f.qualityLabel || f.quality || "")) || progressive[0];

  progressive.forEach((item) => {
    const s = document.createElement("source");
    s.src = item.url;
    s.type = item.mimeType || "video/mp4";
    s.setAttribute("label", item.qualityLabel || item.quality || "");
    s.setAttribute("selected", item === pick ? "true" : "false");
    video.appendChild(s);
  });

  if (raw?.[0]?.url) SBVideo.src = raw[0].url;
  return "progressive";
}

/* ---------- inserir player + carregar fontes ---------- */
function insertYTmPlayer(parent) {
  parent.appendChild(videoPlayer);

  // reset UI
  video.poster = "";
  video.innerHTML = ``;
  video.dataset.title = "";
  video.removeAttribute("src");
  currentTime.innerHTML = "00:00";
  duration.innerHTML = "00:00";
  video.load();

  const YTmVideoId = (typeof window !== "undefined" && window.playerVideoId) || getVideoIdFallback();
  if (!YTmVideoId) {
    videoPlayer.classList.add("player-has-error");
    playerError.textContent = `No video id found\n\nTap to retry`;
    return;
  }

  showSpinner();

  const xhr = new XMLHttpRequest();
  if (APIbaseURLNew) {
    xhr.open("GET", APIbaseURLNew.replace(/\/+$/,"/") + "dl?cgeo=US&id=" + encodeURIComponent(YTmVideoId), true);
    if (RAPIDAPI_KEY && RAPIDAPI_HOST) {
      xhr.setRequestHeader("x-rapidapi-key", RAPIDAPI_KEY);
      xhr.setRequestHeader("x-rapidapi-host", RAPIDAPI_HOST);
    }
  } else {
    // Fallback: tente usar caminho antigo se existente no app
    xhr.open("GET", "/api/dl?cgeo=US&id=" + encodeURIComponent(YTmVideoId), true);
  }

  xhr.onerror = function () {
    videoPlayer.classList.add("player-has-error");
    let msg = "There was an error retrieving the video from the server\n\nSorry about that...";
    try {
      if (xhr.response) {
        const j = JSON.parse(xhr.response);
        if (j?.error) msg = j.error + `\n\nSorry about that...`;
      }
    } catch {}
    playerError.textContent = msg;
    console.error("XHR error:", xhr.status);
    hideSpinner();
  };

  xhr.onload = async function () {
    if (xhr.status === 200) {
      try {
        const data = JSON.parse(xhr.response || "{}");

        try {
          video.poster =
            data?.thumbnail?.[3]?.url || data?.thumbnail?.[0]?.url ||
            data?.thumbnails?.[3]?.url || data?.thumbnails?.[0]?.url || "";
        } catch {}
        video.dataset.title = data.title || data.videoDetails?.title || "";
        playerTitle.innerText = video.dataset.title || "";

        const mode = await buildSourcesFromResponse(data);

        if (mode === "hls") {
          hideSpinner();
          const p = video.play();
          if (p && typeof p.then === "function") p.then(hideSpinner).catch(() => { hideSpinner(); updateToggleButton(); });
        } else {
          const sel = video.querySelector('source[selected="true"]') || video.querySelector("source");
          if (sel) video.src = sel.src;
          try { video.load(); } catch {}
          const p = video.play();
          if (p && typeof p.then === "function") p.then(hideSpinner).catch(() => { hideSpinner(); updateToggleButton(); });
        }
      } catch (e) {
        xhr.onerror();
      }
    } else {
      xhr.onerror();
    }
  };

  xhr.send();
}

/* ---------- export para o restante do app ---------- */
/* Muitos módulos chamam insertYTmPlayer(container) */
window.insertYTmPlayer = insertYTmPlayer;

/* Opcional: inicializar automaticamente se existir um container padrão */
document.addEventListener("DOMContentLoaded", () => {
  const host = document.querySelector(".player-host") || document.querySelector(".page-container") || document.body;
  // inicia só se a página atual for de watch (ajuste se precisar)
  if (host && /watch/i.test(location.pathname) || /watch\.html$/i.test(location.pathname)) {
    // Responsável por chamar insertYTmPlayer geralmente é o watchpage.js.
    // Deixamos aqui como fallback manual:
    // insertYTmPlayer(host);
  }
});

/* ---------- listeners finais ---------- */
Array.from(sliders).forEach(slider => slider.addEventListener("input", handleSliderUpdate));
Array.from(skipBtns).forEach(btn => btn.addEventListener("click", handleSkip));
