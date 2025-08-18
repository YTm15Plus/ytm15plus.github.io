/* 2015YTm – Player (força 1080p quando possível, corrige loading infinito)
   Requisitos do ambiente:
   - window.APIbaseURLNew (ex.: "https://seu-backend.example/api/")
   - window.playerVideoId (ID do vídeo a reproduzir)
   - Este arquivo deve ser incluído DEPOIS do HTML da watch page
*/

(function () {
  // ---------- Helpers básicos ----------
  const byId = (id) => document.getElementById(id);
  const loadScriptOnce = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-dyn="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.setAttribute("data-dyn", src);
      s.onload = resolve;
      s.onerror = () => reject(new Error("script load failed: " + src));
      document.head.appendChild(s);
    });

  const hasAudio = (fmt) => {
    // Muitos backends já mandam 'audioQuality' ou 'audioChannels' ou 'mimeType' com 'audio'
    if (!fmt) return false;
    if (fmt.audioQuality || fmt.audioChannels) return true;
    if (fmt.mimeType && /audio\//i.test(fmt.mimeType)) return true;
    // alguns backends incluem 'hasAudio'
    if (typeof fmt.hasAudio === "boolean") return fmt.hasAudio;
    return false;
  };

  const isProgressive = (fmt) =>
    !!(fmt && hasAudio(fmt) && fmt.mimeType && /video\//i.test(fmt.mimeType));

  const getHeightFromLabel = (label) => {
    if (!label) return 0;
    // "1080p", "720p60", etc.
    const m = label.match(/(\d{3,4})p/);
    return m ? parseInt(m[1], 10) : 0;
  };

  const sortByQualityDesc = (arr) =>
    arr
      .slice()
      .sort((a, b) => getHeightFromLabel(b.qualityLabel) - getHeightFromLabel(a.qualityLabel));

  // ---------- Construção de DOM do player (mantém seu layout) ----------
  const video = document.createElement("video");
  video.setAttribute("controls", "");
  video.preload = "auto";
  video.id = "player";
  video.classList.add("player-api", "video-stream");
  video.crossOrigin = "anonymous"; // ajuda em MSE/CORS

  const videoPlayer = document.createElement("div");
  videoPlayer.classList.add("video-player");
  videoPlayer.id = video.id;
  videoPlayer.setAttribute("tabindex", "-1");

  const htmlVideoCont = document.createElement("div");
  htmlVideoCont.ariaLabel = "2015YouTube Video Player";
  htmlVideoCont.classList.add("html-video-container");
  htmlVideoCont.id = "movie-player";

  videoPlayer.appendChild(htmlVideoCont);
  // injeta antes do player antigo (se existir)
  document.body.appendChild(videoPlayer);
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
</div>`;
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
  playerOptClose.innerHTML = `
  <img class="player-img-icon button-icon hide-icon inactive" src="ic_vidcontrol_hide_controls.png">
  <img class="player-img-icon button-icon hide-icon active" src="ic_vidcontrol_hide_controls_pressed.png">`;
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

  const mkSlider = (id, label, min, max, step, val) => {
    const lab = document.createElement("label");
    lab.setAttribute("for", id);
    lab.classList.add("controls-slider-label");
    const inp = document.createElement("input");
    inp.type = "range";
    inp.name = id;
    inp.id = id;
    inp.classList.add("controls-slider");
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.setAttribute("value", String(val));
    return { lab, inp };
  };

  const { lab: labSliderVol, inp: sliderVol } = mkSlider("volume", "Volume", 0, 1, 0.01, 1);
  labSliderVol.textContent = "Volume: 100%";
  const { lab: labSliderPR, inp: sliderPR } = mkSlider("playbackRate", "Speed", 0.25, 2, 0.05, 1);
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
  playerShareBtn.innerHTML = `
  <img class="player-img-icon button-icon share-icon inactive" src="ic_vidcontrol_share.png">
  <img class="player-img-icon button-icon share-icon active" src="ic_vidcontrol_share_pressed.png">`;
  playerShareBtn.ariaPressed = "false";
  controlsTop.appendChild(playerShareBtn);

  const overflowBtn = document.createElement("button");
  overflowBtn.classList.add("controls-button", "overflow-button", "has-ripple");
  overflowBtn.title = "More options";
  overflowBtn.ariaLabel = "More options";
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
  fullScreenBtn.title = "Toggle Fullscreen";
  fullScreenBtn.ariaLabel = "Open fullscreen";
  fullScreenBtn.innerHTML = `
  <img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png">
  <img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
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

  const mkOptItem = (iconInactive, iconActive, title, text) => {
    const wrap = document.createElement("div");
    wrap.classList.add("player-options-item");
    const btn = document.createElement("button");
    btn.classList.add("controls-button", "options-item-button", "has-ripple");
    btn.title = title;
    btn.ariaLabel = title;
    btn.innerHTML = `
      <img class="player-img-icon button-icon inactive" src="${iconInactive}">
      <img class="player-img-icon button-icon active" src="${iconActive}">
    `;
    btn.ariaPressed = "false";
    const span = document.createElement("span");
    span.textContent = text;
    span.classList.add("options-item-text");
    wrap.appendChild(btn);
    wrap.appendChild(span);
    return { wrap, btn, span };
  };

  const misc = mkOptItem("player_icon_misc.png", "player_icon_misc_pressed.png", "Miscellaneous", "Misc");
  const qual = mkOptItem("ic_vidcontrol_quality.png", "ic_vidcontrol_quality_pressed.png", "Quality", "Quality");
  const iframeOpt = mkOptItem("player_icon_iframe.png", "player_icon_iframe_pressed.png", "YT iFrame Player", "YT iFrame Player");
  playerOptContent.appendChild(misc.wrap);
  playerOptContent.appendChild(qual.wrap);
  playerOptContent.appendChild(iframeOpt.wrap);

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

  const playerOptSelect = document.createElement("div");
  playerOptSelect.classList.add("player-dialog-select");

  // ---------- Estado global do player ----------
  let coTimO = null;
  let scrubTime = 0;
  let controlsVisible = false;

  // Guard para iFrame player externo
  function closeIFramePlayer() {
    try {
      if (typeof iframePlayerCont !== "undefined" && iframePlayerCont) {
        iframePlayerCont.classList.add("iframe-not-visible");
        setTimeout(function () {
          iframePlayerCont.remove();
          iframePlayerCont.classList.remove("iframe-not-visible");
          videoPlayer.classList.remove("player-iframe-visible");
        }, 350);
      }
    } catch (_) {}
  }

  // ---------- Exibição/ocultação dos overlays ----------
  controlsBG.onclick = function () {
    if (!controlsVisible) {
      controlsVisible = true;
      controlsOverlay.classList.add("controls-visible");
      coTimO = setTimeout(() => {
        controlsVisible = false;
        controlsOverlay.classList.remove("controls-visible");
      }, 4000);

      if (video.paused) {
        // mantém visível quando pausado
        clearTimeout(coTimO);
      }

      video.addEventListener("playing", function () {
        if (!videoPlayer.classList.contains("dbl-tap-seek-mode")) {
          clearTimeout(coTimO);
          coTimO = setTimeout(() => {
            controlsVisible = false;
            controlsOverlay.classList.remove("controls-visible");
          }, 4000);
        }
      });

      video.addEventListener("pause", function () {
        if (!videoPlayer.classList.contains("dbl-tap-seek-mode")) {
          clearTimeout(coTimO);
        }
      });
    } else {
      controlsVisible = false;
      controlsOverlay.classList.remove("controls-visible");
      if (coTimO) clearTimeout(coTimO);
    }
  };

  function togglePlay() {
    if (video.paused || video.ended) video.play();
    else video.pause();
  }

  function toggleFullScreen() {
    if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    } else {
      videoPlayer.webkitRequestFullscreen?.() || videoPlayer.requestFullscreen?.();
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
      if (!controlsOverlay.classList.contains("controls-visible")) {
        controlsBG.click();
      }
    }
  }

  function updateFSButton() {
    if (document.webkitFullscreenElement || document.fullscreenElement) {
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

  function handleProgress() {
    if (!video.duration) return;
    const progressPercentage = (video.currentTime / video.duration) * 100;
    progressBar.style.flexBasis = `${progressPercentage}%`;
    const cur = video.currentTime;
    const fmt = (t) =>
      (t > 3599
        ? new Date(1000 * t).toISOString().substr(11, 8)
        : new Date(1000 * t).toISOString().substr(14, 5));
    currentTime.innerHTML = fmt(cur);
    currentTime.ariaLabel = "Current time is " + currentTime.innerHTML;
  }

  function removeScrubbingClass() {
    progressTrack.classList.remove("scrubbing");
    videoPlayer.classList.remove("player-seek-mode");
    if (scrubTime) video.currentTime = scrubTime;
  }

  function scrub(e) {
    const w = progress.offsetWidth;
    const posX =
      e.type === "touchmove"
        ? e.targetTouches[0].clientX - e.target.getBoundingClientRect().x
        : e.offsetX;
    scrubTime = (posX / w) * (video.duration || 0);
    if (scrubTime > 0 && scrubTime < (video.duration || 0)) {
      const fmt = (t) =>
        (t > 3599
          ? new Date(1000 * t).toISOString().substr(11, 8)
          : new Date(1000 * t).toISOString().substr(14, 5));
      storyboardTime.innerHTML = fmt(scrubTime);
    }
    const progressPercentage = (scrubTime / (video.duration || 1)) * 100;
    progressBar.style.flexBasis = `${progressPercentage}%`;
    SBVideo.currentTime = scrubTime;
    updateToggleButton();
    const isDown = mousedown === true;
    progressTrack.classList.toggle("scrubbing", isDown);
    videoPlayer.classList.toggle("player-seek-mode", isDown);
    if (!isDown) video.currentTime = scrubTime;
  }

  function handleSliderUpdate() {
    video[this.name] = this.value;
    if (this.id === "playbackRate") {
      labSliderPR.textContent = "Speed: " + this.value + "x";
    }
    if (this.id === "volume") {
      labSliderVol.textContent = "Volume: " + Math.round(this.value * 100) + "%";
    }
  }

  function handleSkip() {
    video.currentTime += +this.dataset.skip;
    updateToggleButton();
  }
  function handleSkipKey(skip) {
    video.currentTime += +skip;
    updateToggleButton();
  }
  function handleDurationChange() {
    if (!isFinite(video.duration)) return;
    const t =
      video.duration > 3599
        ? new Date(1000 * video.duration).toISOString().substr(11, 8)
        : new Date(1000 * video.duration).toISOString().substr(14, 5);
    duration.innerHTML = t;
    duration.ariaLabel = "Duration is " + t;
  }

  // Dbl-tap seek
  let timer;
  let rewindSpeed = 0;
  let forwardSpeed = 0;
  let rewindSpeed2 = 0;
  let forwardSpeed2 = 0;

  function updateCurrentTime(delta) {
    const isRewinding = delta < 0;
    if (isRewinding) {
      rewindSpeed = delta;
      rewindSpeed2 += delta;
      forwardSpeed = 0;
      forwardSpeed2 = 0;
    } else {
      forwardSpeed = delta;
      forwardSpeed2 += delta;
      rewindSpeed = 0;
      rewindSpeed2 = 0;
    }
    clearTimeout(timer);
    const speed = isRewinding ? rewindSpeed : forwardSpeed;
    const speed2 = isRewinding ? rewindSpeed2 : forwardSpeed2;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + speed));
    const notificationValue = isRewinding ? rewindNotificationValue : forwardNotificationValue;
    notificationValue.textContent = (isRewinding ? "-" : "") + Math.abs(speed2) + " seconds";
    timer = setTimeout(() => {
      rewindSpeed = rewindSpeed2 = forwardSpeed = forwardSpeed2 = 0;
    }, 2000);
  }

  function animateNotificationIn(isRewinding) {
    (isRewinding ? seekNotifications[0] : seekNotifications[1]).classList.remove("animate-in");
    videoPlayer.classList.remove("dbl-tap-seek-mode");
    setTimeout(() => {
      (isRewinding ? seekNotifications[0] : seekNotifications[1]).classList.add("animate-in");
      videoPlayer.classList.add("dbl-tap-seek-mode");
    }, 10);
  }
  function animateNotificationOut(el) {
    el.classList.remove("animate-in");
    videoPlayer.classList.remove("dbl-tap-seek-mode");
  }
  Array.from(seekNotifications).forEach((n) => {
    n.addEventListener("animationend", () => setTimeout(() => animateNotificationOut(n), 200));
  });

  let clickCount = 0;
  let timeout;
  controlsBG.addEventListener("click", function (e) {
    if (timeout) clearTimeout(timeout);
    clickCount++;
    if (clickCount === 2) {
      const videoWidth = video.offsetWidth;
      e.offsetX < videoWidth / 2 ? updateCurrentTime(-10) || animateNotificationIn(true) : (updateCurrentTime(10), animateNotificationIn(false));
      clickCount = 0;
    }
    timeout = setTimeout(() => (clickCount = 0), 300);
  });

  function openPlayerOptions() {
    videoPlayer.classList.add("player-options-shown");
  }
  function hidePlayerOptions() {
    videoPlayer.classList.remove("player-options-shown");
    closePlayerDialog();
  }
  function openPlayerDialog() {
    playerOptDialog.setAttribute("open", "");
  }
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

  // ---------- Troca de qualidade ----------
  let sources = []; // {label, url, mimeType, progressive:boolean}
  let currentLabel = null;
  let dashController = null; // instancia do dash.js

  function buildQualityDialog() {
    playerDialogTitle.textContent = "Quality";
    playerDialogContent.innerHTML = "";
    playerOptSelect.innerHTML = "";
    playerDialogContent.appendChild(playerOptSelect);
    playerDialogContent.setAttribute("content-identifier", "player-quality");
    playerOptDialog.id = "playerDialogQuality";

    // ordena do maior para o menor
    const opts = sortByQualityDesc(sources);
    opts.forEach((src) => {
      const btn = document.createElement("button");
      btn.classList.add("controls-button", "player-select-button", "has-ripple");
      btn.title = src.label;
      btn.ariaLabel = src.label;
      btn.innerHTML = src.label + (src.label === currentLabel ? " (Selected)" : "");
      btn.ariaPressed = src.label === currentLabel ? "true" : "false";
      btn.dataset.label = src.label;
      btn.onclick = async (e) => {
        const label = e.currentTarget.dataset.label;
        await switchQuality(label);
        // atualiza visual
        Array.from(playerOptSelect.querySelectorAll(".player-select-button")).forEach((b) => {
          const isSel = b.dataset.label === label;
          b.ariaPressed = isSel ? "true" : "false";
          b.innerHTML = b.dataset.label + (isSel ? " (Selected)" : "");
        });
      };
      playerOptSelect.appendChild(btn);
    });
  }

  async function ensureDash() {
    if (window.dashjs) return;
    await loadScriptOnce("https://cdn.jsdelivr.net/npm/dashjs@4.7.3/dist/dash.all.min.js");
  }

  async function playDASH(manifestUrl, startAt) {
    await ensureDash();
    if (dashController) {
      try {
        dashController.reset();
      } catch (_) {}
      dashController = null;
    }
    dashController = window.dashjs.MediaPlayer().create();
    dashController.initialize(video, manifestUrl, false);
    dashController.updateSettings({
      streaming: {
        abr: { autoSwitchBitrate: { video: false } }, // vamos travar qualidade via label se necessário
      },
    });
    // tenta ir para 1080p se existir
    const tryStart = () => {
      if (typeof startAt === "number" && isFinite(startAt)) video.currentTime = Math.max(0, startAt);
      video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", tryStart, { once: true });
    // fallback caso 'loadedmetadata' não dispare
    setTimeout(tryStart, 750);
  }

  async function switchQuality(label) {
    const prevTime = video.currentTime || 0;
    const wasPaused = video.paused;

    // mostra loading
    videoPlayer.classList.add("player-loading");

    const sel = sources.find((s) => s.label === label);
    if (!sel) return;

    currentLabel = label;

    // limpa <source> progressivos anteriores
    video.pause();
    video.removeAttribute("src");
    while (video.firstChild) video.removeChild(video.firstChild);

    if (sel.progressive) {
      // MP4 com áudio + vídeo
      const srcEl = document.createElement("source");
      srcEl.src = sel.url;
      if (sel.mimeType) srcEl.type = sel.mimeType;
      video.appendChild(srcEl);
      video.load();
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = Math.min(prevTime, video.duration || prevTime);
          if (!wasPaused) video.play().catch(() => {});
          videoPlayer.classList.remove("player-loading");
        },
        { once: true }
      );
      // storyboard (opcional)
      SBVideo.src = sel.url;
    } else if (sel.manifest) {
      // DASH
      await playDASH(sel.manifest, prevTime);
      if (wasPaused) {
        // se estava pausado, não iniciar automaticamente
        video.pause();
      }
      videoPlayer.classList.remove("player-loading");
    } else {
      // Fallback: setar URL direta mesmo sem áudio (não recomendado, mas evita travar UI)
      video.src = sel.url;
      video.load();
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = Math.min(prevTime, video.duration || prevTime);
          if (!wasPaused) video.play().catch(() => {});
          videoPlayer.classList.remove("player-loading");
        },
        { once: true }
      );
    }
  }

  // ---------- Eventos básicos ----------
  toggleButton.addEventListener("click", togglePlay);
  fullScreenBtn.addEventListener("click", toggleFullScreen);
  overflowBtn.addEventListener("click", openPlayerOptions);
  playerOptClose.addEventListener("click", hidePlayerOptions);
  misc.btn.addEventListener("click", function () {
    openPlayerDialog();
    openPlayerDialogMisc();
  });
  qual.btn.addEventListener("click", function () {
    openPlayerDialog();
    buildQualityDialog();
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
  let mousedown = false;
  progress.addEventListener("mousedown", function () {
    mousedown = true;
  });
  progress.addEventListener("mousemove", function (e) {
    mousedown && scrub(e);
  });
  progress.addEventListener("mouseup", function () {
    mousedown = false;
    removeScrubbingClass();
  });
  progress.addEventListener("touchstart", function () {
    mousedown = true;
  });
  progress.addEventListener("touchmove", function (e) {
    mousedown && scrub(e);
  });
  progress.addEventListener("touchend", function () {
    mousedown = false;
    removeScrubbingClass();
  });

  Array.from(sliders).forEach((s) => s.addEventListener("input", handleSliderUpdate));
  Array.from(skipBtns).forEach((b) => b.addEventListener("click", handleSkip));

  video.addEventListener("error", function () {
    videoPlayer.classList.add("player-has-error");
    playerError.textContent = `The video failed to load

Tap to retry`;
    videoPlayer.classList.remove("player-loading");
  });

  playerError.addEventListener("click", function () {
    video.load();
    SBVideo.load();
  });

  video.addEventListener("loadstart", function () {
    if (!videoPlayer.classList.contains("player-loading")) {
      videoPlayer.classList.add("player-loading");
    }
    poster.style.backgroundImage = `url("${video.poster || ""}")`;
    videoPlayer.classList.remove("player-started", "player-has-error", "player-options-shown", "player-mini-mode");
    videoPlayer.classList.remove("hide-prev-next-btns");
    closeIFramePlayer();
    closePlayerDialog();
  });
  video.addEventListener("waiting", function () {
    if (!videoPlayer.classList.contains("player-loading")) {
      videoPlayer.classList.add("player-loading");
    }
  });
  video.addEventListener("playing", function () {
    if (!videoPlayer.classList.contains("player-started")) {
      videoPlayer.classList.add("player-started");
    }
    setTimeout(() => {
      videoPlayer.classList.remove("player-loading");
    }, 10);
  });
  video.addEventListener("suspend", function () {
    setTimeout(() => videoPlayer.classList.remove("player-loading"), 10);
  });

  videoPlayer.addEventListener("keydown", function (e) {
    if (e.code === "Space") togglePlay();
    if (e.code === "ArrowLeft") handleSkipKey(-10);
    if (e.code === "ArrowRight") handleSkipKey(10);
  });

  // ---------- Inserção/Carregamento do vídeo ----------
  async function insertYTmPlayer(parentEl) {
    // em alguns cenários o app original chama com container específico; aqui garantimos append
    (parentEl || document.body).appendChild(videoPlayer);

    // limpa estado
    video.poster = "";
    video.innerHTML = ``;
    video.dataset.title = "";
    video.removeAttribute("src");
    currentTime.innerHTML = "00:00";
    duration.innerHTML = "00:00";
    video.load();

    const YTmVideoId = window.playerVideoId; // definido fora
    if (!window.APIbaseURLNew) {
      console.error("APIbaseURLNew não definido.");
      videoPlayer.classList.add("player-has-error");
      playerError.textContent = `Server configuration missing

Sorry about that...`;
      return;
    }

    // Proteção contra stuck loading
    let loadingGuard = setTimeout(() => {
      videoPlayer.classList.remove("player-loading");
    }, 6000);

    const xhr = new XMLHttpRequest();
    xhr.open("GET", window.APIbaseURLNew + "dl?cgeo=US&id=" + encodeURIComponent(YTmVideoId), true);
    // Alguns backends exigem headers; mantenho os seus se forem necessários:
    try {
      xhr.setRequestHeader("x-rapidapi-key", "4b0791fe33mshce00ad033774274p196706jsn957349df7a8f");
      xhr.setRequestHeader("x-rapidapi-host", "yt-api.p.rapidapi.com");
    } catch (_) {}

    xhr.onerror = function () {
      clearTimeout(loadingGuard);
      videoPlayer.classList.add("player-has-error");
      playerError.textContent = `There was an error retrieving the video from the server

Sorry about that...`;
      console.error("player xhr error:", xhr.status);
    };

    xhr.onload = async function () {
      clearTimeout(loadingGuard);
      if (xhr.status !== 200) {
        xhr.onerror();
        return;
      }
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        xhr.onerror();
        return;
      }

      try {
        // Título / poster
        if (data.title) {
          video.dataset.title = data.title;
          playerTitle.textContent = data.title;
        }
        if (data.thumbnail && data.thumbnail[3] && data.thumbnail[3].url) {
          video.poster = data.thumbnail[3].url;
          poster.style.backgroundImage = `url("${video.poster}")`;
        }

        // Coleta de formatos disponíveis
        // Preferimos lista 'formats' (progressivos) e, se disponível, usar DASH manifest para 1080p
        sources = [];

        const addSource = (o) => {
          if (!o) return;
          // Evita duplicados por label+url
          if (sources.some((s) => s.label === o.label && s.url === o.url)) return;
          sources.push(o);
        };

        if (Array.isArray(data.formats)) {
          data.formats.forEach((f) => {
            const lbl = f.qualityLabel || f.quality || "";
            if (!lbl) return;
            addSource({
              label: lbl,
              url: f.url,
              mimeType: f.mimeType || "",
              progressive: isProgressive(f),
            });
          });
        }

        // Alguns backends expõem adaptive ou manifest
        if (data.dash && data.dash.url) {
          // campo customizado (ex.: {dash: {url}})
          addSource({
            label: "DASH (auto)",
            url: "",
            mimeType: "",
            progressive: false,
            manifest: data.dash.url,
          });
        } else if (data.dashManifestUrl) {
          addSource({
            label: "DASH (auto)",
            url: "",
            mimeType: "",
            progressive: false,
            manifest: data.dashManifestUrl,
          });
        }

        // Se o backend tiver 'adaptiveFormats', podemos mapear as labels para mostrar opções,
        // mas para tocar 1080p com áudio realmente precisamos do manifest.
        if (Array.isArray(data.adaptiveFormats)) {
          // Apenas para exibir opções (não dá para usar URL de vídeo-only direto com áudio)
          const vids = data.adaptiveFormats.filter((f) => /video\//i.test(f.mimeType || ""));
          sortByQualityDesc(vids).forEach((f) => {
            const lbl = f.qualityLabel || f.size || "";
            if (!lbl) return;
            addSource({
              label: lbl,
              url: f.url,
              mimeType: f.mimeType || "",
              progressive: false, // vídeo-only
            });
          });
        }

        // Ordena e remove labels inválidas
        sources = sources.filter((s) => s.label && (s.url || s.manifest));
        sources = sortByQualityDesc(sources);

        // Estratégia para "forçar 1080p":
        // 1) Se houver progressivo 1080p, usa.
        // 2) Senão, se houver DASH manifest, usa.
        // 3) Senão, cai para melhor progressivo (tipicamente 720p).
        const pick1080Progressive =
          sources.find((s) => s.progressive && getHeightFromLabel(s.label) >= 1080) || null;
        const dashAuto = sources.find((s) => s.manifest) || null;
        const bestProgressive = sources.find((s) => s.progressive) || null;

        if (pick1080Progressive) {
          currentLabel = pick1080Progressive.label;
          await switchQuality(currentLabel);
        } else if (dashAuto) {
          currentLabel = dashAuto.label;
          await switchQuality(currentLabel);
        } else if (bestProgressive) {
          currentLabel = bestProgressive.label;
          await switchQuality(currentLabel);
        } else if (sources.length) {
          // Se sobrou apenas vídeo-only, ainda tentamos tocar (sem áudio) para não travar UI
          currentLabel = sources[0].label;
          await switchQuality(currentLabel);
        } else {
          throw new Error("No playable sources");
        }

        // Abastece o dialog de qualidade
        // (só depois de termos 'sources' prontos)
        // Nada de abrir automaticamente; o botão abrirá quando o usuário quiser
      } catch (err) {
        console.error(err);
        videoPlayer.classList.add("player-has-error");
        playerError.textContent = `There was an error preparing the video

Sorry about that...`;
        videoPlayer.classList.remove("player-loading");
      }
    };

    xhr.send();
  }

  // Exponha para o app original, se ele chamar insertYTmPlayer(parent)
  window.insertYTmPlayer = insertYTmPlayer;

  // Se o app não chamar, iniciamos aqui automaticamente
  // Procura um container padrão da watch page, se existir
  const defaultParent = document.querySelector(".watch-player-container") || document.body;
  insertYTmPlayer(defaultParent);

})();
