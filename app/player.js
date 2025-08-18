/* 2015YTm – Player modular (força 1080p quando possível, corrige loading infinito)
   Uso:
     YTmPlayer.init({ container: HTMLElement, videoId: 'VIDEO_ID', apiBase: 'https://.../', prefer1080: true })
*/

(function () {
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
    if (!fmt) return false;
    if (fmt.audioQuality || fmt.audioChannels) return true;
    if (typeof fmt.hasAudio === "boolean") return fmt.hasAudio;
    if (fmt.mimeType && /audio\//i.test(fmt.mimeType)) return true;
    if (fmt.mimeType && /video\/mp4/i.test(fmt.mimeType) && fmt.url && !/mime=video%2F/i.test(fmt.url)) return true;
    return false;
  };

  const isProgressive = (fmt) =>
    !!(fmt && hasAudio(fmt) && fmt.mimeType && /video\//i.test(fmt.mimeType));

  const getHeightFromLabel = (label) => {
    if (!label) return 0;
    const m = label.match(/(\d{3,4})p/);
    return m ? parseInt(m[1], 10) : 0;
  };

  const sortByQualityDesc = (arr) =>
    arr
      .slice()
      .sort((a, b) => getHeightFromLabel(b.label) - getHeightFromLabel(a.label));

  function createDOM() {
    const video = document.createElement("video");
    video.setAttribute("controls", "");
    video.preload = "auto";
    video.id = "player";
    video.classList.add("player-api", "video-stream");
    video.crossOrigin = "anonymous";

    const videoPlayer = document.createElement("div");
    videoPlayer.classList.add("video-player");
    videoPlayer.id = video.id;
    videoPlayer.setAttribute("tabindex", "-1");

    const htmlVideoCont = document.createElement("div");
    htmlVideoCont.ariaLabel = "2015YouTube Video Player";
    htmlVideoCont.classList.add("html-video-container");
    htmlVideoCont.id = "movie-player";

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

    const controlsTop = document.createElement("div");
    controlsTop.classList.add("player-controls-top");
    const controlsMiddle = document.createElement("div");
    controlsMiddle.classList.add("player-controls-middle");
    const controls = document.createElement("div");
    controls.classList.add("player-controls");
    const controlsOverlay = controlsCont.querySelector(".player-controls-overlay");
    const controlsBG = controlsCont.querySelector(".player-controls-background");

    const btnsCont = document.createElement("div");
    btnsCont.classList.add("player-buttons-container");

    const currentTime = document.createElement("span");
    currentTime.classList.add("player-time-count", "player-current-time");
    currentTime.innerHTML = "00:00";
    currentTime.ariaLabel = "Current time is 00:00";

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

    const toggleButton = document.createElement("button");
    toggleButton.classList.add("controls-button", "toggle-button", "play-pause-button", "has-ripple");
    toggleButton.ariaLabel = "Play video";
    toggleButton.ariaPressed = "false";
    toggleButton.title = "Toggle Play";
    toggleButton.innerHTML = `<img class="player-img-icon button-icon play-icon" src="ic_vidcontrol_pause_play_11.png">`;

    const nextVidBtn = document.createElement("button");
    nextVidBtn.classList.add("controls-button", "controls-btn-disabled", "next-vid-button", "has-ripple");
    nextVidBtn.ariaLabel = "Next video";
    nextVidBtn.ariaDisabled = "true";
    nextVidBtn.title = "Next video";
    nextVidBtn.innerHTML = `<img class="player-img-icon button-icon next-vid-icon" src="ic_vidcontrol_next.png">`;

    const playerExitWatchBtn = document.createElement("button");
    playerExitWatchBtn.classList.add("controls-button", "exit-watch-button", "has-ripple");
    playerExitWatchBtn.title = "Collapse watchpage";
    playerExitWatchBtn.ariaLabel = "Collapse watchpage";
    playerExitWatchBtn.innerHTML = `
  <img class="player-img-icon button-icon exit-watch-icon inactive" src="ic_vidcontrol_collapse.png">
  <img class="player-img-icon button-icon exit-watch-icon active" src="ic_vidcontrol_collapse_pressed.png">`;
    playerExitWatchBtn.ariaPressed = "false";

    const playerTitle = document.createElement("h3");
    playerTitle.classList.add("player-title");

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

    const playerShareBtn = document.createElement("button");
    playerShareBtn.classList.add("controls-button", "share-button", "has-ripple");
    playerShareBtn.title = "Share video";
    playerShareBtn.ariaLabel = "Share video";
    playerShareBtn.innerHTML = `
  <img class="player-img-icon button-icon share-icon inactive" src="ic_vidcontrol_share.png">
  <img class="player-img-icon button-icon share-icon active" src="ic_vidcontrol_share_pressed.png">`;
    playerShareBtn.ariaPressed = "false";

    const overflowBtn = document.createElement("button");
    overflowBtn.classList.add("controls-button", "overflow-button", "has-ripple");
    overflowBtn.title = "More options";
    overflowBtn.ariaLabel = "More options";
    overflowBtn.innerHTML = `
  <img class="player-img-icon button-icon menu-icon inactive" src="ic_vidcontrol_overflow.png">
  <img class="player-img-icon button-icon menu-icon active" src="ic_vidcontrol_overflow_pressed.png">`;
    overflowBtn.ariaPressed = "false";

    const duration = document.createElement("span");
    duration.classList.add("player-time-count", "player-duration");
    duration.innerHTML = "00:00";
    duration.ariaLabel = "Duration is 00:00";

    const fullScreenBtn = document.createElement("button");
    fullScreenBtn.classList.add("controls-button", "toggle-button", "fullscreen-button", "has-ripple");
    fullScreenBtn.title = "Toggle Fullscreen";
    fullScreenBtn.ariaLabel = "Open fullscreen";
    fullScreenBtn.innerHTML = `
  <img class="player-img-icon button-icon fullscreen-icon inactive" src="ic_vidcontrol_fullscreen_off.png">
  <img class="player-img-icon button-icon fullscreen-icon active" src="ic_vidcontrol_fullscreen_off_pressed.png">`;
    fullScreenBtn.ariaPressed = "false";

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

    const playerOptCloseDialog = document.createElement("button");
    playerOptCloseDialog.classList.add("controls-button", "close-plyr-dialog-button", "has-ripple");
    playerOptCloseDialog.title = "Close dialog";
    playerOptCloseDialog.ariaLabel = "Close dialog";
    playerOptCloseDialog.textContent = "Close";
    playerDialogFooter.appendChild(playerOptCloseDialog);

    const mkOptItem = (iconInactive, iconActive, title, text, extraClass) => {
      const wrap = document.createElement("div");
      wrap.classList.add("player-options-item");
      const btn = document.createElement("button");
      btn.classList.add("controls-button", "options-item-button", "has-ripple", extraClass || "");
      btn.title = title;
      btn.ariaLabel = title;
      btn.innerHTML = `
        <img class="player-img-icon button-icon inactive" src="${iconInactive}">
        <img class="player-img-icon button-icon active" src="${iconActive}">
      `;
      const span = document.createElement("span");
      span.textContent = text;
      span.classList.add("options-item-text");
      wrap.appendChild(btn);
      wrap.appendChild(span);
      return { wrap, btn };
    };
    const misc = mkOptItem("player_icon_misc.png", "player_icon_misc_pressed.png", "Miscellaneous", "Misc", "misc-button");
    const qual = mkOptItem("ic_vidcontrol_quality.png", "ic_vidcontrol_quality_pressed.png", "Quality", "Quality", "quality-button");
    const iframeOpt = mkOptItem("player_icon_iframe.png", "player_icon_iframe_pressed.png", "YT iFrame Player", "YT iFrame Player", "iframe-player-button");

    const playerMiscOptions = document.createElement("div");
    playerMiscOptions.classList.add("player-misc-options");
    playerMiscOptions.appendChild(labSliderVol);
    playerMiscOptions.appendChild(sliderVol);
    playerMiscOptions.appendChild(labSliderPR);
    playerMiscOptions.appendChild(sliderPR);
    playerMiscOptions.appendChild(skipBtn1);
    playerMiscOptions.appendChild(skipBtn2);

    const playerOptSelect = document.createElement("div");
    playerOptSelect.classList.add("player-dialog-select");

    // layout tree
    videoPlayer.appendChild(htmlVideoCont);
    htmlVideoCont.appendChild(video);
    videoPlayer.appendChild(controlsCont);
    const controlsOverlay = controlsCont.querySelector(".player-controls-overlay");
    controlsOverlay.appendChild(controlsTop);
    controlsOverlay.appendChild(playerError);
    controlsOverlay.appendChild(controlsMiddle);
    controlsOverlay.appendChild(controls);
    controlsMiddle.appendChild(prevVidBtn);
    controlsMiddle.appendChild(toggleButton);
    controlsMiddle.appendChild(nextVidBtn);
    controlsTop.appendChild(playerExitWatchBtn);
    controlsTop.appendChild(playerTitle);
    const playerOptContent = controlsCont.querySelector(".player-options-content");
    playerOptContent.appendChild(misc.wrap);
    playerOptContent.appendChild(qual.wrap);
    playerOptContent.appendChild(iframeOpt.wrap);
    controls.appendChild(btnsCont);
    btnsCont.appendChild(currentTime);
    btnsCont.appendChild(progressCont);
    controlsTop.appendChild(controlsSpacer);
    controlsTop.appendChild(playerShareBtn);
    controlsTop.appendChild(overflowBtn);
    btnsCont.appendChild(duration);
    btnsCont.appendChild(fullScreenBtn);
    playerOptCont.appendChild(playerOptDialog);
    playerOptCont.appendChild(playerDialogOverlay);

    return {
      video,
      videoPlayer,
      htmlVideoCont,
      controlsCont,
      controlsOverlay,
      controlsBG,
      poster,
      playerError,
      playerOptCont,
      playerOptContent,
      playerOptClose,
      currentTime,
      progress,
      SBVideo,
      storyboardTime,
      progressBar,
      progressTrack,
      prevVidBtn,
      toggleButton,
      nextVidBtn,
      playerExitWatchBtn,
      playerTitle,
      labSliderVol,
      sliderVol,
      labSliderPR,
      sliderPR,
      skipBtn1,
      skipBtn2,
      playerShareBtn,
      overflowBtn,
      duration,
      fullScreenBtn,
      playerDialogOverlay,
      playerOptDialog,
      playerDialogTitle,
      playerDialogContent,
      playerOptCloseDialog,
      playerOptSelect,
      miscBtn: misc.btn,
      qualBtn: qual.btn,
      iframeBtn: iframeOpt.btn,
      seekNotifications,
      forwardNotificationValue,
      rewindNotificationValue
    };
  }

  function initEvents(ctx) {
    const {
      video,
      videoPlayer,
      controlsOverlay,
      controlsBG,
      toggleButton,
      fullScreenBtn,
      duration,
      currentTime,
      progress,
      progressBar,
      progressTrack,
      storyboardTime,
      playerError,
      playerOptDialog,
      playerDialogTitle,
      playerDialogContent,
      playerOptCloseDialog,
      labSliderPR,
      labSliderVol,
      sliderPR,
      sliderVol,
      skipBtn1,
      skipBtn2,
      seekNotifications,
      forwardNotificationValue,
      rewindNotificationValue
    } = ctx;

    let mousedown = false;
    let scrubTime = 0;
    let controlsVisible = false;
    let coTimO = null;

    function togglePlay() {
      if (video.paused || video.ended) video.play();
      else video.pause();
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

    function toggleFullScreen() {
      if (document.webkitFullscreenElement || document.fullscreenElement) {
        (document.webkitExitFullscreen || document.exitFullscreen).call(document);
      } else {
        (videoPlayer.webkitRequestFullscreen || videoPlayer.requestFullscreen).call(videoPlayer);
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
      updateToggleButton();
      const isDown = mousedown === true;
      progressTrack.classList.toggle("scrubbing", isDown);
      videoPlayer.classList.toggle("player-seek-mode", isDown);
      if (!isDown) video.currentTime = scrubTime;
    }

    function handleSliderUpdate(e) {
      video[e.target.name] = e.target.value;
      if (e.target.id === "playbackRate") labSliderPR.textContent = "Speed: " + e.target.value + "x";
      if (e.target.id === "volume") labSliderVol.textContent = "Volume: " + Math.round(e.target.value * 100) + "%";
    }

    function handleSkip(delta) {
      video.currentTime = Math.max(0, Math.min((video.duration || 0), video.currentTime + delta));
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

    // dbl-tap seek
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
      const n = isRewinding ? seekNotifications[0] : seekNotifications[1];
      n.classList.remove("animate-in");
      videoPlayer.classList.remove("dbl-tap-seek-mode");
      setTimeout(() => {
        n.classList.add("animate-in");
        videoPlayer.classList.add("dbl-tap-seek-mode");
      }, 10);
    }

    controlsBG.addEventListener("click", function (e) {
      if (ctx._dblTimeout) clearTimeout(ctx._dblTimeout);
      ctx._clicks = (ctx._clicks || 0) + 1;
      if (ctx._clicks === 2) {
        const videoWidth = video.offsetWidth;
        e.offsetX < videoWidth / 2 ? (updateCurrentTime(-10), animateNotificationIn(true)) : (updateCurrentTime(10), animateNotificationIn(false));
        ctx._clicks = 0;
      }
      ctx._dblTimeout = setTimeout(() => (ctx._clicks = 0), 300);
    });

    controlsBG.onclick = function () {
      if (!controlsVisible) {
        controlsVisible = true;
        controlsOverlay.classList.add("controls-visible");
        coTimO = setTimeout(() => {
          controlsVisible = false;
          controlsOverlay.classList.remove("controls-visible");
        }, 4000);
        if (video.paused) clearTimeout(coTimO);
      } else {
        controlsVisible = false;
        controlsOverlay.classList.remove("controls-visible");
        if (coTimO) clearTimeout(coTimO);
      }
    };

    // listeners
    toggleButton.addEventListener("click", togglePlay);
    fullScreenBtn.addEventListener("click", toggleFullScreen);
    sliderPR.addEventListener("input", handleSliderUpdate);
    sliderVol.addEventListener("input", handleSliderUpdate);
    skipBtn1.addEventListener("click", () => handleSkip(-10));
    skipBtn2.addEventListener("click", () => handleSkip(10));
    video.addEventListener("click", togglePlay);
    video.addEventListener("play", updateToggleButton);
    video.addEventListener("pause", updateToggleButton);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("timeupdate", handleProgress);
    progress.addEventListener("click", scrub);
    progress.addEventListener("mousedown", () => (mousedown = true));
    progress.addEventListener("mousemove", (e) => mousedown && scrub(e));
    progress.addEventListener("mouseup", () => {
      mousedown = false;
      removeScrubbingClass();
    });
    progress.addEventListener("touchstart", () => (mousedown = true));
    progress.addEventListener("touchmove", (e) => mousedown && scrub(e));
    progress.addEventListener("touchend", () => {
      mousedown = false;
      removeScrubbingClass();
    });

    video.addEventListener("error", function () {
      videoPlayer.classList.add("player-has-error");
      playerError.textContent = `The video failed to load

Tap to retry`;
      videoPlayer.classList.remove("player-loading");
    });

    playerError.addEventListener("click", function () {
      video.load();
    });

    // Não fechamos mais o dialog em loadstart (isso causava a "caixa sumir")
    playerOptCloseDialog.addEventListener("click", () => {
      playerOptDialog.removeAttribute("open");
    });

    // expõe funções de utilidade ao contexto
    ctx._ui = {
      togglePlay,
      updateToggleButton
    };
  }

  async function ensureDash() {
    if (window.dashjs) return;
    await loadScriptOnce("https://cdn.jsdelivr.net/npm/dashjs@4.7.3/dist/dash.all.min.js");
  }

  function buildQualityUI(ctx) {
    const { playerOptDialog, playerDialogTitle, playerDialogContent, playerOptSelect } = ctx;
    return function openQualityDialog() {
      playerDialogTitle.textContent = "Quality";
      playerDialogContent.innerHTML = "";
      playerOptSelect.innerHTML = "";
      playerDialogContent.appendChild(playerOptSelect);
      playerOptDialog.id = "playerDialogQuality";
      playerOptDialog.setAttribute("open", "");

      // monta lista ordenada
      const opts = sortByQualityDesc(ctx.sources);
      opts.forEach((src) => {
        const btn = document.createElement("button");
        btn.classList.add("controls-button", "player-select-button", "has-ripple");
        btn.title = src.label;
        btn.ariaLabel = src.label;
        btn.dataset.label = src.label;
        btn.textContent = src.label + (src.label === ctx.currentLabel ? " (Selected)" : "");
        btn.ariaPressed = src.label === ctx.currentLabel ? "true" : "false";
        btn.onclick = async (e) => {
          const label = e.currentTarget.dataset.label;
          await ctx.switchQuality(label, { keepDialogOpen: true });
          // refresh seleção
          Array.from(playerOptSelect.querySelectorAll(".player-select-button")).forEach((b) => {
            const sel = b.dataset.label === label;
            b.ariaPressed = sel ? "true" : "false";
            b.textContent = b.dataset.label + (sel ? " (Selected)" : "");
          });
        };
        playerOptSelect.appendChild(btn);
      });
    };
  }

  function pickStartSource(ctx, prefer1080) {
    const { sources } = ctx;
    const progressive1080 = sources.find((s) => s.progressive && getHeightFromLabel(s.label) >= 1080);
    const dashAuto = sources.find((s) => s.manifest);
    const bestProgressive = sources.find((s) => s.progressive);
    if (prefer1080 && progressive1080) return progressive1080;
    if (prefer1080 && dashAuto) return dashAuto;
    if (bestProgressive) return bestProgressive;
    return sources[0];
  }

  function attachPlayerStateHandlers(ctx) {
    const { video, videoPlayer, poster } = ctx;
    video.addEventListener("loadstart", function () {
      videoPlayer.classList.add("player-loading");
      if (video.poster) poster.style.backgroundImage = `url("${video.poster}")`;
      videoPlayer.classList.remove("player-started", "player-has-error", "player-options-shown", "player-mini-mode");
    });
    video.addEventListener("waiting", function () {
      videoPlayer.classList.add("player-loading");
    });
    video.addEventListener("playing", function () {
      videoPlayer.classList.add("player-started");
      setTimeout(() => videoPlayer.classList.remove("player-loading"), 10);
    });
    video.addEventListener("suspend", function () {
      setTimeout(() => videoPlayer.classList.remove("player-loading"), 10);
    });
  }

  async function init({ container, videoId, apiBase, prefer1080 = true }) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error("YTmPlayer.init: container inválido");
    }
    if (!videoId) throw new Error("YTmPlayer.init: videoId ausente");
    if (!apiBase) throw new Error("YTmPlayer.init: apiBase ausente");

    const ctx = Object.assign(createDOM(), {
      container,
      videoId,
      apiBase,
      prefer1080,
      sources: [],
      currentLabel: null,
      dash: {
        controller: null,
        levels: [] // [{height, qualityIndex}]
      }
    });

    // inserir no container correto (não polui outras páginas)
    container.appendChild(ctx.videoPlayer);

    initEvents(ctx);
    attachPlayerStateHandlers(ctx);

    // Options overlay
    const { playerOptCont, qualBtn, miscBtn, playerOptDialog } = ctx;
    const openPlayerOptions = () => ctx.videoPlayer.classList.add("player-options-shown");
    const hidePlayerOptions = () => ctx.videoPlayer.classList.remove("player-options-shown");
    playerOptCont.querySelector(".hide-options-button").addEventListener("click", hidePlayerOptions);
    ctx.controlsCont.querySelector(".overflow-button").addEventListener("click", openPlayerOptions);
    miscBtn.addEventListener("click", () => {
      playerOptDialog.setAttribute("open", "");
      ctx.playerDialogTitle.textContent = "Misc";
      ctx.playerDialogContent.innerHTML = "";
      ctx.playerDialogContent.appendChild((() => {
        const d = document.createElement("div");
        d.classList.add("player-misc-options");
        d.appendChild(ctx.labSliderVol);
        d.appendChild(ctx.sliderVol);
        d.appendChild(ctx.labSliderPR);
        d.appendChild(ctx.sliderPR);
        d.appendChild(ctx.skipBtn1);
        d.appendChild(ctx.skipBtn2);
        return d;
      })());
    });

    const openQualityDialog = buildQualityUI(ctx);
    qualBtn.addEventListener("click", openQualityDialog);

    // fetch dos dados
    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", apiBase.replace(/\/+$/, "") + "/dl?cgeo=US&id=" + encodeURIComponent(videoId), true);

      // Só seta headers RapidAPI se for esse host
      try {
        const u = new URL(apiBase, location.origin);
        if (u.host.includes("yt-api.p.rapidapi.com")) {
          xhr.setRequestHeader("x-rapidapi-key", "4b0791fe33mshce00ad033774274p196706jsn957349df7a8f");
          xhr.setRequestHeader("x-rapidapi-host", "yt-api.p.rapidapi.com");
        }
      } catch (_) {}

      xhr.onerror = () => reject(new Error("api error " + xhr.status));
      xhr.onload = () => {
        if (xhr.status !== 200) return reject(new Error("api status " + xhr.status));
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(e);
        }
      };
      xhr.send();
    }).catch((e) => {
      ctx.videoPlayer.classList.add("player-has-error");
      ctx.playerError.textContent = `There was an error retrieving the video from the server

Sorry about that...`;
      throw e;
    });

    // título/poster
    if (data.title) {
      ctx.video.dataset.title = data.title;
      ctx.playerTitle.textContent = data.title;
    }
    if (data.thumbnail && data.thumbnail[3] && data.thumbnail[3].url) {
      ctx.video.poster = data.thumbnail[3].url;
      ctx.poster.style.backgroundImage = `url("${ctx.video.poster}")`;
    }

    // montar sources
    const addSource = (o) => {
      if (!o) return;
      if (!o.label || (!o.url && !o.manifest)) return;
      if (ctx.sources.some((s) => s.label === o.label && s.url === o.url && s.manifest === o.manifest)) return;
      ctx.sources.push(o);
    };

    if (Array.isArray(data.formats)) {
      data.formats.forEach((f) => {
        const lbl = f.qualityLabel || f.quality || "";
        if (!lbl) return;
        addSource({
          label: lbl,
          url: f.url,
          mimeType: f.mimeType || "",
          progressive: isProgressive(f)
        });
      });
    }

    if (data.dashManifestUrl) {
      addSource({ label: "DASH (auto)", progressive: false, manifest: data.dashManifestUrl });
    } else if (data.dash && data.dash.url) {
      addSource({ label: "DASH (auto)", progressive: false, manifest: data.dash.url });
    }

    // Opcional: listar qualidades de adaptiveFormats (vídeo-only) para mapear no dash depois
    let adaptiveHeights = [];
    if (Array.isArray(data.adaptiveFormats)) {
      const vids = data.adaptiveFormats.filter((f) => /video\//i.test(f.mimeType || ""));
      vids.forEach((f) => {
        const lbl = f.qualityLabel || "";
        const h = getHeightFromLabel(lbl);
        if (h) adaptiveHeights.push(h);
        addSource({ label: lbl, url: f.url, mimeType: f.mimeType || "", progressive: false });
      });
      adaptiveHeights = Array.from(new Set(adaptiveHeights)).sort((a, b) => b - a);
    }

    ctx.sources = sortByQualityDesc(ctx.sources);
    if (!ctx.sources.length) {
      ctx.videoPlayer.classList.add("player-has-error");
      ctx.playerError.textContent = `No playable sources

Sorry about that...`;
      return;
    }

    // Troca de qualidade
    ctx.switchQuality = async function (label, { keepDialogOpen = false } = {}) {
      const prevTime = ctx.video.currentTime || 0;
      const wasPaused = ctx.video.paused;
      ctx.videoPlayer.classList.add("player-loading");

      const sel = ctx.sources.find((s) => s.label === label) || ctx.sources[0];
      ctx.currentLabel = label;

      // limpa fontes anteriores
      ctx.video.pause();
      ctx.video.removeAttribute("src");
      while (ctx.video.firstChild) ctx.video.removeChild(ctx.video.firstChild);

      if (sel.progressive) {
        const srcEl = document.createElement("source");
        srcEl.src = sel.url;
        if (sel.mimeType) srcEl.type = sel.mimeType;
        ctx.video.appendChild(srcEl);
        ctx.video.load();
        ctx.video.addEventListener(
          "loadedmetadata",
          () => {
            ctx.video.currentTime = Math.min(prevTime, ctx.video.duration || prevTime);
            if (!wasPaused) ctx.video.play().catch(() => {});
            ctx.videoPlayer.classList.remove("player-loading");
          },
          { once: true }
        );
      } else if (sel.manifest) {
        await ensureDash();
        if (ctx.dash.controller) {
          try { ctx.dash.controller.reset(); } catch (_) {}
          ctx.dash.controller = null;
        }
        ctx.dash.controller = window.dashjs.MediaPlayer().create();
        ctx.dash.controller.initialize(ctx.video, sel.manifest, false);
        ctx.dash.controller.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: false } } }
        });

        // quando as reps chegarem, monta níveis e tenta fixar 1080p se preferido
        const onStreamInitialized = () => {
          const levels = ctx.dash.controller.getBitrateInfoListFor("video") || [];
          ctx.dash.levels = levels.map((lv) => ({
            height: lv.height || 0,
            qualityIndex: lv.qualityIndex
          })).sort((a, b) => b.height - a.height);

          // se o label pedido tem altura numérica, tenta fixar
          const wantH = getHeightFromLabel(label) || (ctx.prefer1080 ? 1080 : 0);
          if (wantH) {
            const best = ctx.dash.levels.find((l) => l.height >= wantH) || ctx.dash.levels[0];
            if (best) ctx.dash.controller.setQualityFor("video", best.qualityIndex, true);
          }
          // posiciona e toca
          const start = () => {
            ctx.video.currentTime = Math.max(0, prevTime);
            if (!wasPaused) ctx.video.play().catch(() => {});
            ctx.videoPlayer.classList.remove("player-loading");
          };
          ctx.video.addEventListener("loadedmetadata", start, { once: true });
          setTimeout(start, 600);
        };

        ctx.dash.controller.on(window.dashjs.MediaPlayer.events.STREAM_INITIALIZED, onStreamInitialized);
        ctx.video.load();
      } else {
        // fallback (evita travar UI)
        ctx.video.src = sel.url;
        ctx.video.load();
        ctx.video.addEventListener(
          "loadedmetadata",
          () => {
            ctx.video.currentTime = Math.min(prevTime, ctx.video.duration || prevTime);
            if (!wasPaused) ctx.video.play().catch(() => {});
            ctx.videoPlayer.classList.remove("player-loading");
          },
          { once: true }
        );
      }

      if (!keepDialogOpen) {
        ctx.playerOptDialog.removeAttribute("open");
      }
    };

    // fonte inicial (forçar 1080 se possível)
    const startSrc = pickStartSource(ctx, prefer1080);
    ctx.currentLabel = startSrc.label;
    await ctx.switchQuality(ctx.currentLabel, { keepDialogOpen: true }); // deixa dialog fechado; param aqui é só pra não sumir se usarem o botão

    // ligar botões opções
    ctx.qualBtn.addEventListener("click", () => {
      // reabre com lista atualizada e marca seleção
      const openQualityDialog = buildQualityUI(ctx);
      openQualityDialog();
    });

    // expõe para debugging se quiser
    window.__YTmPlayerCtx = ctx;

    return ctx;
  }

  // API pública
  window.YTmPlayer = { init };
})();
