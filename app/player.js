// player.js — força 1080p quando disponível (progressivo e HLS), fallback para o maior disponível

/*************** base ***************/
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
let leftArrowUnicode = "\u25C0";
let rightArrowUnicode = "\u25B6";
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
const playerOptClose = document.createElement("button");
playerOptClose.classList.add("controls-button", "hide-options-button", "has-ripple");
playerOptClose.title = "Hide options";
playerOptClose.ariaLabel = "Hide options";
playerOptClose.innerHTML = `<img class="player-img-icon button-icon hide-icon inactive" src="ic_vidcontrol_hide_controls.png"><img class="player-img-icon button-icon hide-icon active" src="ic_vidcontrol_hide_controls_pressed.png">`;
playerOptClose.ariaPressed = "false";
playerOptContent.appendChild(playerOptClose);
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
        <video class="storyboard-video" preload="also" muted src=""></video>
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
playerExitWatchBtn.innerHTML = `<img class="player-img-icon button-icon exit-watch-icon inactive" src="ic_vidcontrol_collapse.png"><img class="player-img-icon button-icon exit-watch-icon active" src="ic_vidcontrol_collapse_pressed.png">`;
playerExitWatchBtn.ariaPressed = "false";
controlsTop.appendChild(playerExitWatchBtn);

const playerTitle = document.createElement("h3");
playerTitle.classList.add("player-title");
playerTitle.innerHTML = "";
controlsTop.appendChild(playerTitle);

const labSliderVol = document.createElement("label");
labSliderVol.setAttribute("for", "volume");
labSliderVol.classList.add("controls-slider-label");
const sliderVol = document.createElement("input");
sliderVol.type = "range";
sliderVol.name = "volume";
sliderVol.id = "volume";
sliderVol.classList.add("controls-slider");
sliderVol.min = "0";
sliderVol.max = "1";
sliderVol.step = "0.01";
sliderVol.value = "1";
labSliderVol.textContent = "Volume: 100%";

const labSliderPR = document.createElement("label");
labSliderPR.setAttribute("for", "playbackRate");
labSliderPR.classList.add("controls-slider-label");
const sliderPR = document.createElement("input");
sliderPR.type = "range";
sliderPR.name = "playbackRate";
sliderPR.id = "playbackRate";
sliderPR.classList.add("controls-slider");
sliderPR.min = "0.25";
sliderPR.max = "2";
sliderPR.step = "0.05";
sliderPR.value = "1";
labSliderPR.textContent = "Speed: 1x";

const skipBtn1 = document.createElement("button");
skipBtn1.classList.add("controls-button", "skip-button", "has-ripple");
skipBtn1.innerHTML = `<< 10s`;
skipBtn1.dataset.skip = "-10";
const skipBtn2 = document.createElement("button");
skipBtn2.classList.add("controls-button", "skip-button", "has-ripple");
skipBtn2.innerHTML = `10s >>`;
skipBtn2.dataset.skip = "10";

const controlsSpacer = document.createElement("div");
controlsSpacer.classList.add("controls-spacer");
controlsTop.appendChild(controlsSpacer);

const playerShareBtn = document.createElement("button");
playerShareBtn.classList.add("controls-button", "share-button", "has-ripple");
playerShareBtn.title = "Share video";
playerShareBtn.ariaLabel = "Share video";
playerShareBtn.innerHTML = `<img class="player-img-icon button-icon share-icon inactive" src="ic_vidcontrol_share.png"><img class="player-img-icon button-icon share-icon active" src="ic_vidcontrol_share_pressed.png">`;
playerShareBtn.ariaPressed = "false";
controlsTop.appendChild(playerShareBtn);

const overflowBtn = document.createElement("button");
overflowBtn.classList.add("controls-button", "overflow-button", "has-ripple");
overflowBtn.title = "More options";
overflowBtn.ariaLabel = "More options";
overflowBtn.innerHTML = `<img class="player-img-icon button-icon menu-icon inactive" src="ic_vidcontrol_overflow.png"><img class="player-img-icon button-icon menu-icon active" src="ic_vidcontrol_overflow_pressed.png">`;
overflowBtn.ariaPressed = "false";
controlsTop.appendChild(overflowBtn);

const duration = document.createElement("span");
duration.classList.add("player-time-count", "player-duration");
duration.innerHTML = "00:00";
duration.ariaLabel = "Duration is 00:00";
btnsCont.appendChild(duration);

const fullScreenBtn = document.createElement("button");
fullScreenBtn.classList.add("controls-button", "toggle-button", "fullscreen-button", "has-ripple");
fullScreenBtn.title = "Toggle Fullscreen";
fullScreenBtn.ariaLabel = "Open fullscreen";
fullScreenBtn.innerHTML = `<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png"><img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
fullScreenBtn.ariaPressed = "false";
btnsCont.appendChild(fullScreenBtn);

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
<div class="player-dialog-footer"></div>`;
const playerDialogTitle = playerOptDialog.querySelector(".player-dialog-title");
const playerDialogContent = playerOptDialog.querySelector(".player-dialog-content");
playerOptCont.appendChild(playerOptDialog);
playerOptCont.appendChild(playerDialogOverlay);

const playerOptCloseDialog = document.createElement("button");
playerOptCloseDialog.classList.add("controls-button", "close-plyr-dialog-button", "has-ripple");
playerOptCloseDialog.title = "Close dialog";
playerOptCloseDialog.ariaLabel = "Close dialog";
playerOptCloseDialog.innerHTML = `Close`;
playerOptCloseDialog.ariaPressed = "false";
playerOptDialog.parentElement.querySelector(".player-dialog-footer")?.appendChild?.(playerOptCloseDialog);

const playerOptItem = document.createElement("div");
playerOptItem.classList.add("player-options-item");
playerOptContent.appendChild(playerOptItem);
const playerOptMisc = document.createElement("button");
playerOptMisc.classList.add("controls-button", "options-item-button", "misc-button", "has-ripple");
playerOptMisc.title = "Miscellaneous";
playerOptMisc.ariaLabel = "Miscellaneous";
playerOptMisc.innerHTML = `<img class="player-img-icon button-icon misc-icon inactive" src="player_icon_misc.png"><img class="player-img-icon button-icon misc-icon active" src="player_icon_misc_pressed.png">`;
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
playerOptQual.title = "Quality";
playerOptQual.ariaLabel = "Quality";
playerOptQual.innerHTML = `<img class="player-img-icon button-icon quality-icon inactive" src="ic_vidcontrol_quality.png"><img class="player-img-icon button-icon quality-icon active" src="ic_vidcontrol_quality_pressed.png">`;
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
playerOptIFrame.title = "YT iFrame Player";
playerOptIFrame.ariaLabel = "YT iFrame Player";
playerOptIFrame.innerHTML = `<img class="player-img-icon button-icon iframe-icon inactive" src="player_icon_iframe.png"><img class="player-img-icon button-icon iframe-icon active" src="player_icon_iframe_pressed.png">`;
playerOptIFrame.ariaPressed = "false";
const playerOptIFrameText = document.createElement("span");
playerOptIFrameText.textContent = "YT iFrame Player";
playerOptIFrameText.classList.add("options-item-text");
playerOptItem3.appendChild(playerOptIFrame);
playerOptItem3.appendChild(playerOptIFrameText);

/*************** estado ***************/
let controlsVisible = false;
let coTimO = null;
let mousedown = false;
let scrubTime = 0;

let shouldKeepOptionsOpen = false;
let restoreDialogId = "";

let hls = null;
let isUsingHls = false;
let hlsManifestUrl = "";

/* alvo de qualidade */
const TARGET_HEIGHT = 1080;

/* spinner failsafe */
const SPINNER_FAILSAFE_MS = 12000;
let spinnerTimer = null;
function showSpinner() {
  if (!videoPlayer.classList.contains("player-loading")) videoPlayer.classList.add("player-loading");
  if (spinnerTimer) clearTimeout(spinnerTimer);
  spinnerTimer = setTimeout(() => {
    if (video.readyState < 1) {
      videoPlayer.classList.add("player-has-error");
      playerError.textContent = `The video failed to load

Tap to retry`;
      hideSpinner();
    }
  }, SPINNER_FAILSAFE_MS);
}
function hideSpinner() {
  if (spinnerTimer) { clearTimeout(spinnerTimer); spinnerTimer = null; }
  videoPlayer.classList.remove("player-loading");
}

/*************** UI handlers ***************/
controlsBG.onclick = function () {
  if (!controlsVisible) {
    controlsVisible = true;
    controlsOverlay.classList.add("controls-visible");
    if (coTimO) clearTimeout(coTimO);
    coTimO = setTimeout(() => { controlsVisible = false; controlsOverlay.classList.remove("controls-visible"); }, 4000);
  } else {
    controlsVisible = false;
    controlsOverlay.classList.remove("controls-visible");
    if (coTimO) clearTimeout(coTimO);
  }
};

function togglePlay() {
  if (videoPlayer.classList.contains("player-options-shown") || playerOptDialog.hasAttribute("open")) return;
  if (video.paused || video.ended) {
    const p = video.play();
    if (p && typeof p.then === "function") p.then(hideSpinner).catch(() => { hideSpinner(); updateToggleButton(); });
  } else video.pause();
}
function toggleFullScreen() {
  if (document.webkitFullscreenElement || document.fullscreenElement) {
    (document.webkitExitFullscreen || document.exitFullscreen).call(document);
  } else {
    (videoPlayer.webkitRequestFullscreen || videoPlayer.requestFullscreen).call(videoPlayer);
  }
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
  if (document.webkitFullscreenElement || document.fullscreenElement) {
    fullScreenBtn.innerHTML = `<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_on.png"><img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_on_pressed.png">`;
    fullScreenBtn.ariaPressed = "true";
    fullScreenBtn.ariaLabel = "Exit fullscreen";
    videoPlayer.classList.add("player-is-fullscreen");
  } else {
    fullScreenBtn.innerHTML = `<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png"><img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
    fullScreenBtn.ariaPressed = "false";
    fullScreenBtn.ariaLabel = "Open fullscreen";
    videoPlayer.classList.remove("player-is-fullscreen");
  }
}
function handleProgress() {
  const progressPercentage = (video.currentTime / (video.duration || 1)) * 100;
  if (!mousedown) progressBar.style.flexBasis = `${progressPercentage}%`;
  const t = video.currentTime;
  currentTime.innerHTML = (t > 3599) ? new Date(1000 * t).toISOString().substr(11, 8) : new Date(1000 * t).toISOString().substr(14, 5);
  currentTime.ariaLabel = "Current time is " + currentTime.innerHTML;
}
function removeScrubbingClass() {
  progressTrack.classList.remove("scrubbing");
  videoPlayer.classList.remove("player-seek-mode");
  if (scrubTime) video.currentTime = scrubTime;
}
function scrub(e) {
  if (e.type == "touchmove") {
    const bcr = e.target.getBoundingClientRect();
    const e_x = e.targetTouches[0].clientX - bcr.x;
    scrubTime = (e_x / progress.offsetWidth) * (video.duration || 0);
  } else {
    scrubTime = (e.offsetX / progress.offsetWidth) * (video.duration || 0);
  }
  if (scrubTime < video.duration && scrubTime > 0) {
    storyboardTime.innerHTML = (scrubTime > 3599) ? new Date(1000 * scrubTime).toISOString().substr(11, 8) : new Date(1000 * scrubTime).toISOString().substr(14, 5);
  }
  const pct = (scrubTime / (video.duration || 1)) * 100;
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
  video[this.name] = this.value;
  if (this.id === "playbackRate") labSliderPR.textContent = "Speed: " + this.value + "x";
  if (this.id === "volume") labSliderVol.textContent = "Volume: " + Math.round(this.value * 100) + "%";
}
Array.from(sliders).forEach((sl) => sl.addEventListener("input", handleSliderUpdate));
function handleSkip() { video.currentTime += +this.dataset.skip; updateToggleButton(); }
function handleSkipKey(skip) { video.currentTime += +skip; updateToggleButton(); }
function handleDurationChange() {
  const d = video.duration || 0;
  duration.innerHTML = (d > 3599) ? new Date(1000 * d).toISOString().substr(11, 8) : new Date(1000 * d).toISOString().substr(14, 5);
  duration.ariaLabel = "Duration is " + duration.innerHTML;
}
Array.from(skipBtns).forEach((btn) => btn.addEventListener("click", handleSkip));

/* dbl tap */
let timer, rewindSpeed = 0, forwardSpeed = 0, rewindSpeed2 = 0, forwardSpeed2 = 0;
function updateCurrentTimeDelta(delta) {
  const isRew = delta < 0;
  if (isRew) { rewindSpeed = delta; rewindSpeed2 += delta; forwardSpeed = 0; forwardSpeed2 = 0; }
  else { forwardSpeed = delta; forwardSpeed2 += delta; rewindSpeed = 0; rewindSpeed2 = 0; }
  clearTimeout(timer);
  video.currentTime = video.currentTime + (isRew ? rewindSpeed : forwardSpeed);
  const NotificationValue = isRew ? rewindNotificationValue : forwardNotificationValue;
  NotificationValue.innerHTML = (isRew ? "-" : "") + Math.abs(isRew ? rewindSpeed2 : forwardSpeed2) + " seconds";
  timer = setTimeout(() => { rewindSpeed = 0; rewindSpeed2 = 0; forwardSpeed = 0; forwardSpeed2 = 0; }, 2000);
}
function animateNotificationIn(isRew) {
  (isRew ? seekNotifications[0] : seekNotifications[1]).classList.remove("animate-in");
  videoPlayer.classList.remove("dbl-tap-seek-mode");
  setTimeout(function () {
    (isRew ? seekNotifications[0] : seekNotifications[1]).classList.add("animate-in");
    videoPlayer.classList.add("dbl-tap-seek-mode");
  }, 10);
}
function forwardVideo() { updateCurrentTimeDelta(10); animateNotificationIn(false); }
function rewindVideo() { updateCurrentTimeDelta(-10); animateNotificationIn(true); }
function doubleClickHandler(e) { (e.offsetX < video.offsetWidth / 2) ? rewindVideo() : forwardVideo(); }
Array.from(seekNotifications).forEach((notification) => {
  notification.addEventListener("animationend", () =>
    setTimeout(() => { notification.classList.remove("animate-in"); videoPlayer.classList.remove("dbl-tap-seek-mode"); }, 200)
  );
});
let clickCount = 0, timeoutDC;
controlsBG.addEventListener("click", function (e) {
  if (timeoutDC) clearTimeout(timeoutDC);
  clickCount++;
  if (clickCount === 2) { doubleClickHandler(e); clickCount = 0; }
  timeoutDC = setTimeout(() => { clickCount = 0; }, 300);
});

/*************** opções/qualidade ***************/
function openPlayerOptions(e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  video.style.pointerEvents = "none";
  videoPlayer.classList.add("player-options-shown");
}
function hidePlayerOptions() {
  videoPlayer.classList.remove("player-options-shown");
  video.style.pointerEvents = "";
  closePlayerDialog();
}
function openPlayerDialog() { playerOptDialog.setAttribute("open", ""); }
function closePlayerDialog() {
  playerOptDialog.removeAttribute("open");
  setTimeout(function () {
    playerDialogTitle.textContent = "";
    playerDialogContent.innerHTML = "";
    playerDialogContent.removeAttribute("content-identifier");
    playerOptDialog.id = "";
    playerOptSelect.innerHTML = "";
  }, 300);
}
function openPlayerDialogMisc() {
  playerDialogTitle.textContent = "Misc";
  playerDialogContent.innerHTML = "";
  playerOptSelect.innerHTML = "";
  playerDialogContent.appendChild(playerMiscOptions);
  playerDialogContent.setAttribute("content-identifier", "player-misc");
  playerOptDialog.id = "playerDialogMisc";
}
function ensureOptionsOpen() {
  videoPlayer.classList.add("player-options-shown");
  video.style.pointerEvents = "none";
  if (!playerOptDialog.hasAttribute("open")) playerOptDialog.setAttribute("open", "");
  if (restoreDialogId === "playerDialogQuality") { openPlayerDialogQual(); }
}

/* troca progressivo */
async function switchQualityProgressive(targetUrl, targetLabel) {
  const wasPlaying = !video.paused && !video.ended;
  const prevTime = video.currentTime || 0;

  Array.from(video.querySelectorAll("source")).forEach((s) => {
    const sel = (s.src === targetUrl || s.getAttribute("src") === targetUrl);
    s.setAttribute("selected", sel ? "true" : "false");
  });

  try { video.pause(); } catch {}
  shouldKeepOptionsOpen = true;
  restoreDialogId = "playerDialogQuality";
  showSpinner();

  video.src = targetUrl;
  try { video.load(); } catch {}

  await new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onErr);
    };
    const onMeta = () => { if (done) return; done = true; cleanup(); resolve(); };
    const onErr  = () => { if (done) return; done = true; cleanup(); resolve(); };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.addEventListener("error", onErr, { once: true });
    if (video.readyState >= 1) { cleanup(); resolve(); }
  });

  try { video.currentTime = Math.min(prevTime, Math.max(0, (video.duration || prevTime) - 0.25)); } catch {}
  if (wasPlaying) { try { await video.play(); } catch {} }
  hideSpinner();
  ensureOptionsOpen();
}

/* helpers lib externa */
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

/* HLS */
async function setupHls(hlsUrl) {
  isUsingHls = true;
  hlsManifestUrl = hlsUrl;

  if (!window.Hls) {
    try { await loadScriptOnce("https://cdn.jsdelivr.net/npm/hls.js@1.5.14/dist/hls.min.js"); }
    catch { isUsingHls = false; video.src = hlsUrl; return; }
  }

  if (window.Hls && window.Hls.isSupported()) {
    if (hls) { try { hls.destroy(); } catch {} hls = null; }
    hls = new Hls({ enableWorker: true, autoStartLoad: true });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // forçar 1080p se existir; senão, maior disponível
      try {
        const idx = pickHlsLevelIndexByHeight(hls.levels, TARGET_HEIGHT);
        if (idx != null) {
          hls.autoLevelEnabled = false;
          hls.currentLevel = idx;
        }
      } catch {}
      try { video.play()?.catch(()=>{}); } catch {}
    });

    hls.loadSource(hlsManifestUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (e, data) => {
      if (data?.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari nativo: o browser decide o nível (não há API pra fixar 1080p nativamente)
    video.src = hlsManifestUrl;
  } else {
    isUsingHls = false;
    video.src = hlsUrl;
  }
}

function pickHlsLevelIndexByHeight(levels, targetHeight) {
  if (!Array.isArray(levels) || !levels.length) return null;
  let exact = levels.findIndex(l => (l.height|0) === targetHeight);
  if (exact >= 0) return exact;
  // maior abaixo do alvo
  let bestBelow = -1; let bestH = -1;
  levels.forEach((l, i) => {
    const h = l.height|0;
    if (h <= targetHeight && h > bestH) { bestH = h; bestBelow = i; }
  });
  if (bestBelow >= 0) return bestBelow;
  // se não houver abaixo, pega o maior de todos
  let maxH = -1; let maxIdx = 0;
  levels.forEach((l, i) => { const h = l.height|0; if (h > maxH) { maxH = h; maxIdx = i; } });
  return maxIdx;
}

async function switchQualityHls(levelIndex) {
  if (!hls || !window.Hls || !Hls.isSupported()) return;
  shouldKeepOptionsOpen = true;
  restoreDialogId = "playerDialogQuality";
  const wasPlaying = !video.paused && !video.ended;
  const prevTime = video.currentTime || 0;
  showSpinner();
  try { hls.autoLevelEnabled = false; hls.currentLevel = levelIndex; } catch {}
  await new Promise((r) => setTimeout(r, 250));
  try { video.currentTime = Math.max(0, prevTime - 0.05); } catch {}
  if (wasPlaying) { try { await video.play(); } catch {} }
  hideSpinner();
  ensureOptionsOpen();
}

/* montar lista Qualidade */
function buildQualityList() {
  playerOptSelect.innerHTML = "";

  if (isUsingHls && hls && hls.levels && hls.levels.length) {
    const levels = hls.levels.map((lv, idx) => {
      const height = lv.height || 0;
      const label = height ? `${height}p` : (lv.name || `Level ${idx}`);
      return { index: idx, label, height };
    }).sort((a, b) => b.height - a.height);

    const cur = hls.currentLevel;
    levels.forEach((lv) => {
      const btn = document.createElement("button");
      btn.classList.add("controls-button", "player-select-button", "has-ripple");
      const selected = (cur === lv.index || (cur === -1 && lv.index === hls.nextLevel));
      btn.dataset.level = String(lv.index);
      btn.dataset.label = lv.label;
      btn.ariaPressed = selected ? "true" : "false";
      btn.title = selected ? `${lv.label} (Selected)` : lv.label;
      btn.innerHTML = btn.title;
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        await switchQualityHls(parseInt(btn.dataset.level, 10));
        Array.from(playerOptSelect.querySelectorAll(".player-select-button")).forEach((b) => {
          const isSel = (b === btn);
          b.ariaPressed = isSel ? "true" : "false";
          b.innerHTML = isSel ? `${b.dataset.label} (Selected)` : b.dataset.label;
          b.title = b.innerHTML;
        });
      });
      playerOptSelect.appendChild(btn);
    });
    return;
  }

  const sources = Array.from(video.querySelectorAll("source"))
    .map((s) => ({
      label: s.getAttribute("label") || "",
      url: s.src || s.getAttribute("src") || "",
      selected: (s.getAttribute("selected") === "true"),
    }))
    .filter((s) => s.url);

  sources.sort((a, b) => {
    const na = parseInt((a.label || "").replace(/[^\d]/g, "")) || 0;
    const nb = parseInt((b.label || "").replace(/[^\d]/g, "")) || 0;
    return nb - na;
  });

  sources.forEach((item) => {
    const btn = document.createElement("button");
    btn.classList.add("controls-button", "player-select-button", "has-ripple");
    btn.title = item.selected ? `${item.label} (Selected)` : item.label || "Unknown";
    btn.ariaLabel = btn.title; btn.innerHTML = btn.title;
    btn.ariaPressed = item.selected ? "true" : "false";
    btn.dataset.src = item.url; btn.dataset.label = item.label || "";
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      await switchQualityProgressive(btn.dataset.src, btn.dataset.label);
      Array.from(playerOptSelect.querySelectorAll(".player-select-button")).forEach((b) => {
        const isSel = (b.dataset.src === btn.dataset.src);
        b.ariaPressed = isSel ? "true" : "false";
        b.innerHTML = isSel ? `${b.dataset.label} (Selected)` : b.dataset.label;
        b.title = b.innerHTML;
      });
    });
    playerOptSelect.appendChild(btn);
  });
}

function openPlayerDialogQual(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  shouldKeepOptionsOpen = true;
  restoreDialogId = "playerDialogQuality";
  playerDialogTitle.textContent = "Quality";
  playerDialogContent.innerHTML = "";
  playerOptSelect.innerHTML = "";
  playerDialogContent.appendChild(playerOptSelect);
  playerDialogContent.setAttribute("content-identifier", "player-quality");
  playerOptDialog.id = "playerDialogQuality";
  buildQualityList();
  openPlayerDialog();
}

/*************** listeners ***************/
toggleButton.addEventListener("click", (e)=>{ e.stopPropagation(); togglePlay(); });
fullScreenBtn.addEventListener("click", (e)=>{ e.stopPropagation(); toggleFullScreen(); });
overflowBtn.addEventListener("click", openPlayerOptions);
playerOptClose.addEventListener("click", hidePlayerOptions);
playerOptMisc.addEventListener("click", (e) => { e.stopPropagation(); openPlayerDialog(); openPlayerDialogMisc(); });
playerOptQual.addEventListener("click", (e) => { e.stopPropagation(); openPlayerDialogQual(e); });
playerOptIFrame.addEventListener("click", (e) => { e.stopPropagation(); /* abrir iFrame se quiser */ });
playerOptCloseDialog.addEventListener("click", (e) => { e.stopPropagation(); closePlayerDialog(); });
playerOptDialog.addEventListener("click", (e) => { e.stopPropagation(); });
playerOptCont.addEventListener("click", (e) => { e.stopPropagation(); });

video.addEventListener("click", (e)=>{ e.stopPropagation(); togglePlay(); });
video.addEventListener("play", () => { hideSpinner(); updateToggleButton(); });
video.addEventListener("pause", () => { hideSpinner(); updateToggleButton(); });
video.addEventListener("durationchange", handleDurationChange);
videoPlayer.addEventListener("webkitfullscreenchange", updateFSButton);
document.addEventListener("fullscreenchange", updateFSButton);

video.addEventListener("timeupdate", handleProgress);
progress.addEventListener("click", scrub);
progress.addEventListener("mousedown", function () { mousedown = true; });
progress.addEventListener("mousemove", function (e) { mousedown && scrub(e); });
progress.addEventListener("mouseup", function () { mousedown = false; removeScrubbingClass(); });
progress.addEventListener("touchstart", function () { mousedown = true; });
progress.addEventListener("touchmove", function (e) { mousedown && scrub(e); });
progress.addEventListener("touchend", function () { mousedown = false; removeScrubbingClass(); });

video.addEventListener("loadedmetadata", () => { hideSpinner(); handleDurationChange(); });
video.addEventListener("canplay", hideSpinner);
video.addEventListener("canplaythrough", hideSpinner);
video.addEventListener("suspend", hideSpinner);

video.addEventListener("error", function () {
  hideSpinner();
  videoPlayer.classList.add("player-has-error");
  playerError.textContent = `The video failed to load

Tap to retry`;
  console.error("The video failed to load.");
});
playerError.addEventListener("click", function () {
  hideSpinner(); showSpinner();
  video.load(); SBVideo.load();
});

function closeIFramePlayer() {
  const iframePlayerCont = document.getElementById("iframePlayerCont");
  if (!iframePlayerCont) return;
  iframePlayerCont.classList.add("iframe-not-visible");
  setTimeout(function () {
    iframePlayerCont.remove();
    iframePlayerCont.classList.remove("iframe-not-visible");
    videoPlayer.classList.remove("player-iframe-visible");
  }, 350);
}

video.addEventListener("loadstart", function () {
  showSpinner();
  poster.style.backgroundImage = `url("${video.poster || ""}")`;
  videoPlayer.classList.remove("player-started", "player-has-error", "player-mini-mode", "hide-prev-next-btns");
  playerTitle.innerHTML = video.dataset.title || "";
  if (shouldKeepOptionsOpen) ensureOptionsOpen();
  else { videoPlayer.classList.remove("player-options-shown"); video.style.pointerEvents = ""; closePlayerDialog(); }
  closeIFramePlayer();
});
video.addEventListener("waiting", showSpinner);
video.addEventListener("playing", function () {
  videoPlayer.classList.add("player-started");
  hideSpinner();
});

/*************** backend -> fontes ***************/
function isProgressiveMime(mimeType) { return /video\/mp4|video\/webm/i.test(mimeType || ""); }
function looksLikeHls(mimeType, url) {
  return /application\/vnd\.apple\.mpegurl|application\/x-mpegURL/i.test(mimeType || "") || (url && /\.m3u8(\?|$)/i.test(url));
}

async function buildSourcesFromResponse(data) {
  let hlsUrl =
    data?.hlsManifestUrl ||
    data?.hls || data?.hlsUrl ||
    (Array.isArray(data?.formats) ? (data.formats.find(f => looksLikeHls(f.mimeType, f.url))?.url) : null);

  if (hlsUrl) {
    await setupHls(hlsUrl);
    if (data?.formats?.[0]?.url) SBVideo.src = data.formats[0].url;
    return "hls";
  }

  const formats = Array.isArray(data?.formats) ? data.formats : [];
  const progressive = formats.filter(f => f.url && isProgressiveMime(f.mimeType || ""));

  // ordenar por altura (qualityLabel)
  progressive.sort((a, b) => {
    const na = parseInt((a.qualityLabel || "").replace(/[^\d]/g, "")) || 0;
    const nb = parseInt((b.qualityLabel || "").replace(/[^\d]/g, "")) || 0;
    return nb - na;
  });

  video.innerHTML = ``;

  // procurar 1080p; senão, melhor abaixo
  let pick = progressive.find(f => /1080/.test(f.qualityLabel || "")) || progressive[0];

  progressive.forEach((item) => {
    const s = document.createElement("source");
    s.src = item.url;
    s.type = item.mimeType || "video/mp4";
    s.setAttribute("label", item.qualityLabel || "");
    s.setAttribute("selected", item === pick ? "true" : "false");
    video.appendChild(s);
  });

  if (formats?.[0]?.url) SBVideo.src = formats[0].url;
  return "progressive";
}

function insertYTmPlayer(parent) {
  parent.appendChild(videoPlayer);

  // reset
  video.poster = "";
  video.innerHTML = ``;
  video.dataset.title = "";
  video.removeAttribute("src");
  currentTime.innerHTML = "00:00";
  duration.innerHTML = "00:00";
  if (hls) { try { hls.destroy(); } catch {} hls = null; }
  isUsingHls = false;
  hlsManifestUrl = "";
  shouldKeepOptionsOpen = false;
  restoreDialogId = "";
  video.load();

  const YTmVideoId = (typeof playerVideoId !== "undefined" && playerVideoId)
    ? playerVideoId
    : (new URL(location.href)).searchParams.get("v") || "";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", APIbaseURLNew + "dl?cgeo=US&id=" + encodeURIComponent(YTmVideoId), true);
  xhr.setRequestHeader("x-rapidapi-key", "4b0791fe33mshce00ad033774274p196706jsn957349df7a8f");
  xhr.setRequestHeader("x-rapidapi-host", "yt-api.p.rapidapi.com");

  showSpinner();

  xhr.onerror = function () {
    hideSpinner();
    videoPlayer.classList.add("player-has-error");
    playerError.textContent = `There was an error retrieving the video from the server

Sorry about that...`;
    try {
      const r = JSON.parse(xhr.response || "{}");
      if (r.error) playerError.textContent = r.error + `

Sorry about that...`;
    } catch {}
    console.error("xhttpr operation error:", xhr.status);
  };

  xhr.onload = async function () {
    if (xhr.status === 200) {
      try {
        const data = JSON.parse(xhr.response || "{}");
        try { video.poster = data?.thumbnail?.[3]?.url || data?.thumbnail?.[0]?.url || ""; } catch {}
        video.dataset.title = data.title || "";
        playerTitle.innerText = video.dataset.title || "";

        const mode = await buildSourcesFromResponse(data);

        if (mode === "hls") {
          // hls.js MANIFEST_PARSED já tenta travar 1080p
          hideSpinner();
          const p = video.play();
          if (p && typeof p.then === "function") p.then(hideSpinner).catch(() => { hideSpinner(); updateToggleButton(); });
        } else {
          // progressivo: já escolhemos 1080p (ou melhor disponível)
          const sel = video.querySelector('source[selected="true"]') || video.querySelector("source");
          if (sel) video.src = sel.src;
          try { video.load(); } catch {}
          const p = video.play();
          if (p && typeof p.then === "function") p.then(hideSpinner).catch(() => { hideSpinner(); updateToggleButton(); });
        }
      } catch (e) { xhr.onerror(); }
    } else { xhr.onerror(); }
  };

  xhr.send();
}

window.insertYTmPlayer = window.insertYTmPlayer || insertYTmPlayer;
