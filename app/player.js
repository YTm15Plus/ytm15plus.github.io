// player.js — versão com troca de qualidade corrigida (progressivo)
// Mantém a UI 2015 e o fluxo original. Foca em garantir que o botão "Quality"
// realmente troque a fonte e preserve o tempo de reprodução.

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
video.insertAdjacentElement('beforebegin', videoPlayer);
htmlVideoCont.appendChild(video);
video.removeAttribute("controls");
const controlsCont = document.createElement("div");
controlsCont.classList.add("player-controls-container");
let leftArrowUnicode = '\u25C0';
let rightArrowUnicode = '\u25B6';
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
<div class="player-controls-background">
</div>
</div>
<div class="player-error">
</div>
<div class="player-options-container">
<div class="player-options-content">
</div>
</div>
`;
const seekNotifications = controlsCont.querySelectorAll('.seek-notification');
const forwardNotificationValue = controlsCont.querySelector('.video-forward-notify span');
const rewindNotificationValue = controlsCont.querySelector('.video-rewind-notify span');
const playerError = controlsCont.querySelector(".player-error");
const playerOptCont = controlsCont.querySelector(".player-options-container");
const playerOptContent = playerOptCont.querySelector(".player-options-content");
const playerOptClose = document.createElement("button");
playerOptClose.classList.add("controls-button", "hide-options-button", "has-ripple");
playerOptClose.title = "Hide options";
playerOptClose.ariaLabel = "Hide options";
playerOptClose.innerHTML = `<img class="player-img-icon button-icon hide-icon inactive" src="ic_vidcontrol_hide_controls.png"></img>
<img class="player-img-icon button-icon hide-icon active" src="ic_vidcontrol_hide_controls_pressed.png"></img>`;
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
currentTime.ariaLabel = "Current time is " + currentTime.innerHTML;
btnsCont.appendChild(currentTime);
const progressCont = document.createElement("div");
progressCont.classList.add("progress-container");
const progress = document.createElement("div");
progress.classList.add("progress");
progress.innerHTML = `<div class="progress-filled"><div class="progress-track"></div>
<div class="player-storyboard-container">
<div class="player-storyboard">
<video class="storyboard-video" preload="also" muted src=""></video>
</div>
<div class="player-storyboard-time-tooltip">
00:00
</div>
</div>
</div>`;
const SBVideo = progress.querySelector("video");
const storyboard = progress.querySelector(".player-storyboard");
const storyboardTime = progress.querySelector(".player-storyboard-time-tooltip");
const progressBar = progress.querySelector(".progress-filled");
const progressTrack = progress.querySelector(".progress-track");
progressCont.appendChild(progress);
const prevVidBtn = document.createElement("button");
prevVidBtn.classList.add("controls-button", "controls-btn-disabled", "prev-vid-button", "has-ripple");
prevVidBtn.ariaLabel = "Previous video";
prevVidBtn.ariaDisabled = "true";
prevVidBtn.title = "Previous video";
prevVidBtn.innerHTML = `<img class="player-img-icon button-icon prev-vid-icon" src="ic_vidcontrol_prev.png"></img>`;
controlsMiddle.appendChild(prevVidBtn);
const toggleButton = document.createElement("button");
toggleButton.classList.add("controls-button", "toggle-button", "play-pause-button", "has-ripple");
toggleButton.ariaLabel = "Play video";
toggleButton.ariaPressed = "false";
toggleButton.title = "Toggle Play";
/* toggleButton.innerHTML = `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_play.png"></img>`; */
toggleButton.innerHTML = `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png"></img>`;
controlsMiddle.appendChild(toggleButton);
const nextVidBtn = document.createElement("button");
nextVidBtn.classList.add("controls-button", "controls-btn-disabled", "next-vid-button", "has-ripple");
nextVidBtn.ariaLabel = "Next video";
nextVidBtn.ariaDisabled = "true";
nextVidBtn.title = "Next video";
nextVidBtn.innerHTML = `<img class="player-img-icon button-icon next-vid-icon" src="ic_vidcontrol_next.png"></img>`;
controlsMiddle.appendChild(nextVidBtn);
btnsCont.appendChild(progressCont);
const playerExitWatchBtn = document.createElement("button");
playerExitWatchBtn.classList.add("controls-button", "exit-watch-button", "has-ripple");
playerExitWatchBtn.title = "Collapse watchpage";
playerExitWatchBtn.ariaLabel = "Collapse watchpage";
playerExitWatchBtn.innerHTML = `<img class="player-img-icon button-icon exit-watch-icon inactive" src="ic_vidcontrol_collapse.png"></img>
<img class="player-img-icon button-icon exit-watch-icon active" src="ic_vidcontrol_collapse_pressed.png"></img>`;
playerExitWatchBtn.ariaPressed = "false";
controlsTop.appendChild(playerExitWatchBtn);
const playerTitle = document.createElement("h3");
playerTitle.classList.add("player-title");
playerTitle.ariaLabel = "";
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
sliderVol.setAttribute("value", 1);
labSliderVol.textContent = "Volume: " + Math.round(sliderVol.value * 100) + "%";
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
sliderPR.setAttribute("value", 1);
labSliderPR.textContent = "Speed: " + sliderPR.value + "x";
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
playerShareBtn.innerHTML = `<img class="player-img-icon button-icon share-icon inactive" src="ic_vidcontrol_share.png"></img>
<img class="player-img-icon button-icon share-icon active" src="ic_vidcontrol_share_pressed.png"></img>`;
playerShareBtn.ariaPressed = "false";
controlsTop.appendChild(playerShareBtn);
const overflowBtn = document.createElement("button");
overflowBtn.classList.add("controls-button", "overflow-button", "has-ripple");
overflowBtn.title = "More options";
overflowBtn.ariaLabel = "More options";
overflowBtn.innerHTML = `<img class="player-img-icon button-icon menu-icon inactive" src="ic_vidcontrol_overflow.png"></img>
<img class="player-img-icon button-icon menu-icon active" src="ic_vidcontrol_overflow_pressed.png"></img>`;
overflowBtn.ariaPressed = "false";
controlsTop.appendChild(overflowBtn);
const duration = document.createElement("span");
duration.classList.add("player-time-count", "player-duration");
duration.innerHTML = "00:00";
duration.ariaLabel = "Duration is " + duration.innerHTML;
btnsCont.appendChild(duration);
const fullScreenBtn = document.createElement("button");
fullScreenBtn.classList.add("controls-button", "toggle-button", "fullscreen-button", "has-ripple");
fullScreenBtn.title = "Toggle Fullscreen";
fullScreenBtn.ariaLabel = "Open fullscreen";
fullScreenBtn.innerHTML = `<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png"></img>
<img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png"></img>`;
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
<div class="player-dialog-content">
</div>
<div class="player-dialog-footer">
</div>
`;
const playerDialogHeader = playerOptDialog.querySelector(".player-dialog-header");
const playerDialogFooter = playerOptDialog.querySelector(".player-dialog-footer");
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
playerDialogFooter.appendChild(playerOptCloseDialog);
const playerOptItem = document.createElement("div");
playerOptItem.classList.add("player-options-item");
playerOptContent.appendChild(playerOptItem);
const playerOptMisc = document.createElement("button");
playerOptMisc.classList.add("controls-button", "options-item-button", "misc-button", "has-ripple");
playerOptMisc.title = "Miscellaneous";
playerOptMisc.ariaLabel = "Miscellaneous";
playerOptMisc.innerHTML = `<img class="player-img-icon button-icon misc-icon inactive" src="player_icon_misc.png"></img>
<img class="player-img-icon button-icon misc-icon active" src="player_icon_misc_pressed.png"></img>`;
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
playerOptQual.innerHTML = `<img class="player-img-icon button-icon quality-icon inactive" src="ic_vidcontrol_quality.png"></img>
<img class="player-img-icon button-icon quality-icon active" src="ic_vidcontrol_quality_pressed.png"></img>`;
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
playerOptIFrame.innerHTML = `<img class="player-img-icon button-icon iframe-icon inactive" src="player_icon_iframe.png"></img>
<img class="player-img-icon button-icon iframe-icon active" src="player_icon_iframe_pressed.png"></img>`;
playerOptIFrame.ariaPressed = "false";
const playerOptIFrameText = document.createElement("span");
playerOptIFrameText.textContent = "YT iFrame Player";
playerOptIFrameText.classList.add("options-item-text");
playerOptItem3.appendChild(playerOptIFrame);
playerOptItem3.appendChild(playerOptIFrameText);

let controlsVisible = false;
let coTimO = null;

controlsBG.onclick = function(){
if (!controlsVisible) {
controlsVisible = true;
controlsOverlay.classList.add("controls-visible");

if (coTimO) clearTimeout(coTimO);
coTimO = setTimeout(function(){
controlsVisible = false;
controlsOverlay.classList.remove("controls-visible");
}, 4000);

if (video.paused) {
if (coTimO) clearTimeout(coTimO);
};

video.addEventListener("playing", function(){
if (!videoPlayer.classList.contains("dbl-tap-seek-mode")) {
if (coTimO) clearTimeout(coTimO);
coTimO = setTimeout(function(){
controlsVisible = false;
controlsOverlay.classList.remove("controls-visible");
}, 4000);
};
}, {once:true});

video.addEventListener("pause", function(){
if (!videoPlayer.classList.contains("dbl-tap-seek-mode")) {
if (coTimO) clearTimeout(coTimO);
};
}, {once:true});

} else if (controlsVisible) {
controlsVisible = false;
controlsOverlay.classList.remove("controls-visible");
if (coTimO) clearTimeout(coTimO);
}
};

function togglePlay() {
  if (video.paused || video.ended) {
    video.play();
  } else {
    video.pause();
  }
}

function toggleFullScreen() {
  if (document.webkitFullscreenElement || document.fullscreenElement) {
    if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  } else {
    if (videoPlayer.webkitRequestFullscreen) videoPlayer.webkitRequestFullscreen();
    else if (videoPlayer.requestFullscreen) videoPlayer.requestFullscreen();
  }
}

function updateToggleButton() {
  videoPlayer.classList.remove("player-ended");
  toggleButton.innerHTML = video.paused ? `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png"></img>` : `<img class="player-img-icon button-icon pause-icon" src="ic_vidcontrol_pause_play_00.png"></img>`;
  toggleButton.ariaLabel = video.paused ? "Play video" : "Pause video";
  toggleButton.ariaPressed = video.paused ? "false" : "true";
  if (video.ended) {
  toggleButton.innerHTML = `<img class="player-img-icon button-icon reload-icon" src="ic_vidcontrol_reload.png"></img>`;
  toggleButton.ariaLabel = "Replay video";
  toggleButton.ariaPressed = "false";
  videoPlayer.classList.add("player-ended");
  if (!controlsOverlay.classList.contains("controls-visible")) {
  controlsBG.click();
  }
  }
}

function updateFSButton() {
  if (document.webkitFullscreenElement || document.fullscreenElement) {
    fullScreenBtn.innerHTML = `<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_on.png"></img>
<img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_on_pressed.png"></img>`;
    fullScreenBtn.ariaPressed = "true";
    fullScreenBtn.ariaLabel = "Exit fullscreen";
    videoPlayer.classList.add("player-is-fullscreen");
  } else {
    fullScreenBtn.innerHTML = `<img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png"></img>
<img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png"></img>`;
    fullScreenBtn.ariaPressed = "false";
    fullScreenBtn.ariaLabel = "Open fullscreen";
    videoPlayer.classList.remove("player-is-fullscreen");
  }
}

function handleProgress() {
  const progressPercentage = (video.currentTime / (video.duration || 1)) * 100;
  if (mousedown == false) {
  progressBar.style.flexBasis = `${progressPercentage}%`;
  }
  if (video.currentTime > 3599) {
  currentTime.innerHTML = new Date(1000 * video.currentTime).toISOString().substr(11, 8);
  } else {
  currentTime.innerHTML = new Date(1000 * video.currentTime).toISOString().substr(14, 5);
  }
  currentTime.ariaLabel = "Current time is " + currentTime.innerHTML;
}

function removeScrubbingClass(e) {
    progressTrack.classList.remove("scrubbing");
    videoPlayer.classList.remove("player-seek-mode");
    if (scrubTime) {
    video.currentTime = scrubTime;
    }
}

let mousedown = false;
let scrubTime = 0;

function scrub(e) {
  if (e.type == "touchmove") {
    var bcr = e.target.getBoundingClientRect();
    var e_x = e.targetTouches[0].clientX - bcr.x;
    scrubTime = (e_x / progress.offsetWidth) * (video.duration || 0);
    if (scrubTime < video.duration && scrubTime > 0) {
    if (scrubTime > 3599) {
    storyboardTime.innerHTML = new Date(1000 * scrubTime).toISOString().substr(11, 8);
    } else {
    storyboardTime.innerHTML = new Date(1000 * scrubTime).toISOString().substr(14, 5);
    }
    }
    const progressPercentage = (scrubTime / (video.duration || 1)) * 100;
    progressBar.style.flexBasis = `${progressPercentage}%`;
    SBVideo.currentTime = scrubTime;
    updateToggleButton();
    if (mousedown == true) {
    progressTrack.classList.add("scrubbing");
    videoPlayer.classList.add("player-seek-mode");
    if (coTimO) {
    clearTimeout(coTimO);
    };
    } else if (mousedown == false) {
    progressTrack.classList.remove("scrubbing");
    videoPlayer.classList.remove("player-seek-mode");
    video.currentTime = scrubTime;
    };
  } else {
    scrubTime = (e.offsetX / progress.offsetWidth) * (video.duration || 0);
    if (scrubTime < video.duration && scrubTime > 0) {
    if (scrubTime > 3599) {
    storyboardTime.innerHTML = new Date(1000 * scrubTime).toISOString().substr(11, 8);
    } else {
    storyboardTime.innerHTML = new Date(1000 * scrubTime).toISOString().substr(14, 5);
    }
    }
    const progressPercentage = (scrubTime / (video.duration || 1)) * 100;
    progressBar.style.flexBasis = `${progressPercentage}%`;
    SBVideo.currentTime = scrubTime;
    updateToggleButton();
    if (mousedown == true) {
    progressTrack.classList.add("scrubbing");
    videoPlayer.classList.add("player-seek-mode");
    if (coTimO) {
    clearTimeout(coTimO);
    };
    } else if (mousedown == false) {
    progressTrack.classList.remove("scrubbing");
    videoPlayer.classList.remove("player-seek-mode");
    video.currentTime = scrubTime;
    };
  };
}

function handleSliderUpdate() {
  video[this.name] = this.value;
  if (this.id == "playbackRate"){
  labSliderPR.textContent = "Speed: " + this.value + "x";
  };
  if (this.id == "volume"){
  labSliderVol.textContent = "Volume: " + Math.round(this.value * 100) + "%";
  };
}

Array.from(sliders).forEach(function(slider){
  slider.addEventListener("input", handleSliderUpdate);
});

function handleSkip() {
  video.currentTime += +this.dataset.skip;
  updateToggleButton();
}
function handleSkipKey(skip) {
  video.currentTime += +skip;
  updateToggleButton();
}
function handleDurationChange(){
  const d = video.duration || 0;
  if (d > 3599) {
  duration.innerHTML = new Date(1000 * d).toISOString().substr(11, 8);
  } else {
  duration.innerHTML = new Date(1000 * d).toISOString().substr(14, 5);
  }
  duration.ariaLabel = "Duration is " + duration.innerHTML;
};

Array.from(skipBtns).forEach(function(btn){
  btn.addEventListener("click", handleSkip);
});

/* dbl tap seek */
var timer;
var rewindSpeed = 0;
var forwardSpeed = 0;
var rewindSpeed2 = 0;
var forwardSpeed2 = 0;

function updateCurrentTime(delta){
    var isRewinding = delta < 0;
  
    if(isRewinding){
      rewindSpeed = delta;
      rewindSpeed2 = rewindSpeed2 + delta;
      forwardSpeed = 0;
      forwardSpeed2 = 0;
    }else{
      forwardSpeed = delta;
      forwardSpeed2 = forwardSpeed2 + delta;
      rewindSpeed = 0;
      rewindSpeed2 = 0;
    }
    
    clearTimeout(timer);
  
    var speed = (isRewinding ? rewindSpeed : forwardSpeed);
    var speed2 = (isRewinding ? rewindSpeed2 : forwardSpeed2);
    video.currentTime = video.currentTime + speed;
  
    var NotificationValue =  isRewinding ? rewindNotificationValue : forwardNotificationValue ;
    NotificationValue.innerHTML = `${Math.abs(speed2)} seconds`;
    if (isRewinding) {
    NotificationValue.innerHTML = `-${Math.abs(speed2)} seconds`;
    }
  
    timer = setTimeout(function(){
      rewindSpeed = 0;
      rewindSpeed2 = 0;
      forwardSpeed = 0;
      forwardSpeed2 = 0;
    }, 2000);
}

function animateNotificationIn(isRewinding){
  isRewinding ? seekNotifications[0].classList.remove('animate-in') : seekNotifications[1].classList.remove('animate-in'); 
  videoPlayer.classList.remove("dbl-tap-seek-mode");
  setTimeout(function(){
  isRewinding ? seekNotifications[0].classList.add('animate-in') : seekNotifications[1].classList.add('animate-in'); 
  videoPlayer.classList.add("dbl-tap-seek-mode");
  }, 10);
}

function animateNotificationOut(e){
    e.classList.remove('animate-in');
    videoPlayer.classList.remove("dbl-tap-seek-mode");
}

function forwardVideo(){
    updateCurrentTime(10);
    animateNotificationIn(false);
}

function rewindVideo(){
    updateCurrentTime(-10);
    animateNotificationIn(true);
}

function doubleClickHandler(e){
    const videoWidth = video.offsetWidth;
    (e.offsetX < videoWidth/2) ? rewindVideo() : forwardVideo();
}

Array.from(seekNotifications).forEach(function(notification){
  notification.addEventListener('animationend', function(){
    setTimeout(animateNotificationOut(notification), 200);
  });
});

/* dblclick em mobile */
var clickCount = 0;
var timeoutDC;
controlsBG.addEventListener("click", function(e) {
    if (timeoutDC) {
        clearTimeout(timeoutDC);
    }
    clickCount++;

    if (clickCount === 2) {
        doubleClickHandler(e);
        clickCount = 0;
    }
    timeoutDC = setTimeout(function() {
        clickCount = 0;
    }, 300);
})

function openPlayerOptions(){
  videoPlayer.classList.add("player-options-shown");
};
function hidePlayerOptions(){
  videoPlayer.classList.remove("player-options-shown");
  closePlayerDialog();
};

function openPlayerDialog(){
playerOptDialog.setAttribute("open", "");
};
function closePlayerDialog(){
playerOptDialog.removeAttribute("open");
setTimeout(function(){
playerDialogTitle.textContent = "";
playerDialogContent.innerHTML = "";
playerDialogContent.removeAttribute("content-identifier");
playerOptDialog.id = "";
playerOptSelect.innerHTML = "";
}, 300);
};

function openPlayerDialogMisc(){
playerDialogTitle.textContent = "Misc";
playerDialogContent.innerHTML = "";
playerOptSelect.innerHTML = "";
playerDialogContent.appendChild(playerMiscOptions);
playerDialogContent.setAttribute("content-identifier", "player-misc");
playerOptDialog.id = "playerDialogMisc";
};

/* ======= TROCA DE QUALIDADE: corrigido ======= */
async function switchQuality(targetUrl, targetLabel) {
  // pausa/estado atual
  const wasPlaying = !video.paused && !video.ended;
  const prevTime = video.currentTime || 0;

  // marca seleção nos <source>
  Array.from(video.querySelectorAll('source')).forEach(s => {
    const sel = (s.src === targetUrl || s.getAttribute('src') === targetUrl);
    s.setAttribute('selected', sel ? 'true' : 'false');
  });

  // aplica nova fonte corretamente
  try { video.pause(); } catch(e){}
  videoPlayer.classList.add('player-loading');
  playerError.textContent = "";

  // trocar via src direto é mais estável do que só mexer no <source>
  video.src = targetUrl;
  try { video.load(); } catch(e){}

  await new Promise((resolve) => {
    const onMeta = () => { 
      video.removeEventListener('loadedmetadata', onMeta);
      resolve();
    };
    video.addEventListener('loadedmetadata', onMeta, {once:true});
    // se já carregou metadados (cache), resolve logo:
    if (video.readyState >= 1) { video.removeEventListener('loadedmetadata', onMeta); resolve(); }
  });

  // restaura posição (se dentro da duração)
  try {
    const safeTime = Math.min(prevTime, Math.max(0, (video.duration || prevTime) - 0.25));
    video.currentTime = safeTime;
  } catch(e){}

  // tenta reproduzir se estava tocando
  if (wasPlaying) {
    try {
      const p = video.play();
      if (p && typeof p.then === 'function') await p;
    } catch(e){}
  }

  playerTitle.innerText = video.dataset.title || '';
  videoPlayer.classList.remove('player-loading');
  updateToggleButton();
}

function openPlayerDialogQual(){
playerDialogTitle.textContent = "Quality";
playerDialogContent.innerHTML = "";
playerOptSelect.innerHTML = "";
playerDialogContent.appendChild(playerOptSelect);
playerDialogContent.setAttribute("content-identifier", "player-quality");
playerOptDialog.id = "playerDialogQuality";

// cria lista baseada nos <source> progressivos
const videoSources = Array.from(video.querySelectorAll("source"))
  .map(s => ({
    label: s.getAttribute("label") || "",
    url: s.src || s.getAttribute("src") || "",
    selected: (s.getAttribute("selected") === "true")
  }))
  // filtra entradas válidas
  .filter(s => s.url);

// ordena por resolução se der (ex.: "1080p", "720p"...)
videoSources.sort((a,b) => {
  const na = parseInt((a.label||'').replace(/[^\d]/g,'')) || 0;
  const nb = parseInt((b.label||'').replace(/[^\d]/g,'')) || 0;
  return nb - na;
});

videoSources.forEach(function(item){
  const playerSelectBtn = document.createElement("button");
  playerSelectBtn.classList.add("controls-button", "player-select-button", "has-ripple");
  const text = item.selected ? `${item.label} (Selected)` : item.label || "Unknown";
  playerSelectBtn.title = text;
  playerSelectBtn.ariaLabel = text;
  playerSelectBtn.innerHTML = text;
  playerSelectBtn.ariaPressed = item.selected ? "true" : "false";
  playerSelectBtn.dataset.src = item.url;
  playerSelectBtn.dataset.label = item.label || "";

  playerSelectBtn.onclick = async (ev) => {
    const src = ev.currentTarget.dataset.src;
    const lbl = ev.currentTarget.dataset.label;
    await switchQuality(src, lbl);
    // atualiza rótulos do diálogo depois da troca
    Array.from(playerOptSelect.querySelectorAll(".player-select-button")).forEach(btn=>{
      const isSel = (btn.dataset.src === src);
      btn.ariaPressed = isSel ? "true" : "false";
      btn.innerHTML = isSel ? `${btn.dataset.label} (Selected)` : btn.dataset.label;
      btn.title = btn.innerHTML;
      btn.ariaLabel = btn.innerHTML;
    });
  };

  playerOptSelect.appendChild(playerSelectBtn);
});
};
/* ======= /TROCA DE QUALIDADE ======= */

toggleButton.addEventListener("click", togglePlay);
fullScreenBtn.addEventListener("click", toggleFullScreen);
overflowBtn.addEventListener("click", openPlayerOptions);
playerOptClose.addEventListener("click", hidePlayerOptions);
playerOptMisc.addEventListener("click", function(){
openPlayerDialog();
openPlayerDialogMisc();
});
playerOptQual.addEventListener("click", function(){
openPlayerDialog();
openPlayerDialogQual();
});
playerOptCloseDialog.addEventListener("click", closePlayerDialog);
video.addEventListener("click", togglePlay);
video.addEventListener("play", updateToggleButton);
video.addEventListener("pause", updateToggleButton);
video.addEventListener("durationchange", handleDurationChange);
videoPlayer.addEventListener("webkitfullscreenchange", updateFSButton);
document.addEventListener("fullscreenchange", updateFSButton);

video.addEventListener("timeupdate", handleProgress);
progress.addEventListener("click", scrub);
progress.addEventListener("mousedown", function() {mousedown = true});
progress.addEventListener("mousemove", function(e) {mousedown && scrub(e)});
progress.addEventListener("mouseup", function() {mousedown = false; removeScrubbingClass()});
progress.addEventListener("touchstart", function() {mousedown = true});
progress.addEventListener("touchmove", function(e) {mousedown && scrub(e)});
progress.addEventListener("touchend", function() {mousedown = false; removeScrubbingClass()});

video.addEventListener("loadedmetadata", function(e){});
video.addEventListener("error", function(e){
videoPlayer.classList.add("player-has-error");
playerError.textContent = `The video failed to load

Tap to retry`;
console.error("The video failed to load. Sorry about that...");
});
playerError.addEventListener("click", function(e){
video.load();
SBVideo.load();
});

function closeIFramePlayer(){
    const iframePlayerCont = document.getElementById("iframePlayerCont");
    if (!iframePlayerCont) return;
    iframePlayerCont.classList.add("iframe-not-visible");
    setTimeout(function(){
    iframePlayerCont.remove();
    iframePlayerCont.classList.remove("iframe-not-visible");
    videoPlayer.classList.remove("player-iframe-visible");
    }, 350);
}

video.addEventListener("loadeddata", function(e){});
video.addEventListener("loadstart", function(e){
    if (!videoPlayer.classList.contains("player-loading")) {
    videoPlayer.classList.add("player-loading");
    }
    poster.style.backgroundImage = `url("${video.poster || ""}")`;
    videoPlayer.classList.remove("player-started");
    videoPlayer.classList.remove("player-has-error");
    playerTitle.innerHTML = video.dataset.title || "";
    videoPlayer.classList.remove("player-options-shown");
    videoPlayer.classList.remove("player-mini-mode");
    videoPlayer.classList.remove("hide-prev-next-btns");
    closeIFramePlayer();
    closePlayerDialog();
});
video.addEventListener("waiting", function(e) {
    if (!videoPlayer.classList.contains("player-loading")) {
    videoPlayer.classList.add("player-loading");
    }
});
video.addEventListener("canplay", function(e) {});
video.addEventListener("playing", function() {
    if (!videoPlayer.classList.contains("player-started")) {
    videoPlayer.classList.add("player-started");
    }
    setTimeout(function() {
    if (videoPlayer.classList.contains("player-loading")) {
    videoPlayer.classList.remove("player-loading");
    }
    }, 10);
});
video.addEventListener("suspend", function(e) {
    setTimeout(function() {
    if (videoPlayer.classList.contains("player-loading")) {
    videoPlayer.classList.remove("player-loading");
    }
    }, 10);
});
video.addEventListener("canplaythrough", function(e) {});
video.addEventListener("stalled", function(e) {});

videoPlayer.addEventListener("keydown", function(e){
  if (e.code === "Space"){
  togglePlay();
  };
  if (e.code === "ArrowLeft"){
  handleSkipKey(-10);
  };
  if (e.code === "ArrowRight"){
  handleSkipKey(10);
  };
});

/* ========= CARREGAR FONTES DO BACKEND ========= */
function isProgressiveMime(mimeType) {
  // heurística simples: progressivo costuma ter áudio no mime/codec
  // ex: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"' ou webm 'vp9, opus'
  return /mp4a|opus|vorbis/i.test(mimeType || "");
}

function insertYTmPlayer(parent){
parent.appendChild(videoPlayer);

video.poster = "";
video.innerHTML = ``;
video.dataset.title = "";
video.removeAttribute("src");
currentTime.innerHTML = "00:00";
duration.innerHTML = "00:00";

video.load();

const YTmVideoId = (typeof playerVideoId !== "undefined" && playerVideoId) 
  ? playerVideoId 
  : (new URL(location.href)).searchParams.get("v") || "";

const playerxhttpr = new XMLHttpRequest();
playerxhttpr.open('GET', APIbaseURLNew + 'dl?cgeo=US&id=' + encodeURIComponent(YTmVideoId), true);
playerxhttpr.setRequestHeader('x-rapidapi-key', '4b0791fe33mshce00ad033774274p196706jsn957349df7a8f');
playerxhttpr.setRequestHeader('x-rapidapi-host', 'yt-api.p.rapidapi.com');
 
playerxhttpr.send();

playerxhttpr.onerror = function(){
      videoPlayer.classList.add("player-has-error");
      playerError.textContent = `There was an error retrieving the video from the server

Sorry about that...`;
      if (playerxhttpr.response) {
        try {
          playerError.textContent = JSON.parse(playerxhttpr.response).error + `

Sorry about that...`;
        } catch(e){}
      }
      console.error('There was a problem with the xhttpr operation:', playerxhttpr.status);
};
 
playerxhttpr.onload = function() {
  if (playerxhttpr.status === 200) {
      const data = JSON.parse(playerxhttpr.response || "{}");
      try { video.poster = data?.thumbnail?.[3]?.url || data?.thumbnail?.[0]?.url || ""; } catch(e){}
      video.innerHTML = ``;
      video.dataset.title = data.title || "";
      if (data?.formats?.[0]?.url) SBVideo.src = data.formats[0].url;

      // monta apenas fontes PROGRESSIVAS (com áudio), pois são as que o <video> troca bem
      const progressive = (data.formats || []).filter(f => f.url && f.mimeType && /^video\//i.test(f.mimeType) && isProgressiveMime(f.mimeType));

      // ordena por resolução (desc)
      progressive.sort((a,b) => {
        const na = parseInt((a.qualityLabel||'').replace(/[^\d]/g,'')) || 0;
        const nb = parseInt((b.qualityLabel||'').replace(/[^\d]/g,'')) || 0;
        return nb - na;
      });

      // adiciona as <source> no DOM
      progressive.forEach((item, idx) => {
        const vidSource = document.createElement("source");
        vidSource.src = item.url;
        vidSource.type = item.mimeType || "video/mp4";
        vidSource.setAttribute("label", item.qualityLabel || "");
        vidSource.setAttribute("selected", idx === 0 ? "true" : "false"); // seleciona a melhor
        video.appendChild(vidSource);
      });

      // define src inicial (melhor progressivo, se existir, senão primeiro formato bruto)
      const best = progressive[0] || data.formats?.[0];
      if (best?.url) {
        video.src = best.url;
      }

      // adiciona legendas se houver
      if (data.captions) {
        (data.captions.captionTracks || []).forEach(function(item) {
          const vidTrack = document.createElement("track");
          vidTrack.kind = "captions";
          vidTrack.src = item.baseUrl;
          vidTrack.srclang = item.languageCode;
          vidTrack.label = item.name;
          video.appendChild(vidTrack);
        });
      }

      // toca
      try { video.load(); } catch(e){}
      try { video.play(); } catch(e){}
  } else {
          playerxhttpr.onerror();
  }
};
};

/* expõe (se seu app chama de fora) */
window.insertYTmPlayer = window.insertYTmPlayer || insertYTmPlayer;
