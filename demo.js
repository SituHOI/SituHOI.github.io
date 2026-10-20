(() => {
  'use strict';
  const root = document.getElementById('paired-demo');
  if (!root) return;
  const cards = [...root.querySelectorAll('.demo-clip')];
  const playButton = root.querySelector('#demo-play');
  const status = root.querySelector('.demo-status');
  const duration = 6;
  let tab = 'rgb', loadedMode = null, time = 0;
  let desiredPlaying = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inView = false, ready = false, version = 0;
  const video = document.createElement('video');
  video.className = 'demo-source';
  video.muted = video.defaultMuted = video.playsInline = video.loop = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  root.append(video);
  const canvases = cards.map(card => {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 640;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', card.querySelector('figcaption').textContent);
    card.querySelector('.demo-clip-media').append(canvas);
    return canvas;
  });
  const contexts = canvases.map(canvas => canvas.getContext('2d', { alpha: false }));
  const localMedia = new Map();
  async function seekableSource(source) {
    if (!localMedia.has(source)) {
      localMedia.set(source, fetch(source).then(response => {
        if (!response.ok) throw new Error('The demo video could not be loaded.');
        return response.blob();
      }).then(blob => URL.createObjectURL(blob)).catch(error => {
        localMedia.delete(source); throw error;
      }));
    }
    return localMedia.get(source);
  }
  function paint(frameTime = video.currentTime) {
    if (video.readyState < 2 || !ready) return;
    contexts.forEach((context, i) => {
      context.drawImage(video, (i % 4)*480, Math.floor(i/4)*640, 480, 640, 0, 0, 480, 640);
      canvases[i].dataset.frameTime = frameTime.toFixed(4);
      canvases[i].style.visibility = 'visible';
    });
    root.dataset.time = video.currentTime.toFixed(3);
  }
  function frameCallback(_now, metadata) {
    paint(metadata.mediaTime);
    video.requestVideoFrameCallback(frameCallback);
  }
  if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(frameCallback);
  else {
    const tick = () => { if (!video.paused) paint(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  video.addEventListener('seeked', () => paint());
  video.addEventListener('timeupdate', () => paint());
  function updateControls() {
    playButton.dataset.playing = String(desiredPlaying);
    playButton.setAttribute('aria-label', `${desiredPlaying ? 'Pause' : 'Play'} all clips`);
    playButton.title = desiredPlaying ? 'Pause' : 'Play';
    playButton.disabled = !ready;
    root.dataset.mode = loadedMode || tab;
  }
  function waitingFor(event, condition, timeout = 30000) {
    if (condition()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => done(new Error('Video loading timed out.')), timeout);
      const loaded = () => done();
      const failed = () => done(new Error('The demo video could not be loaded.'));
      function done(error) {
        clearTimeout(timer);
        video.removeEventListener(event, loaded);
        video.removeEventListener('error', failed);
        error ? reject(error) : resolve();
      }
      video.addEventListener(event, loaded, { once: true });
      video.addEventListener('error', failed, { once: true });
    });
  }
  async function play() {
    if (!ready || !desiredPlaying || !inView || document.hidden) return;
    const ticket = version;
    try { await video.play(); status.textContent = ''; }
    catch (_) {
      if (ticket !== version || !desiredPlaying || !inView) return;
      desiredPlaying = false;
      updateControls();
      status.textContent = 'Press Play to start all clips.';
    }
  }
  async function loadView(mode) {
    const ticket = ++version;
    if (ready) time = video.currentTime % duration;
    video.pause(); ready = false;
    updateControls();
    status.textContent = 'Loading matched clips…';
    canvases.forEach(canvas => { canvas.style.visibility = 'hidden'; });
    const revision = mode === 'rgb' ? '?v=20261020-3' : '?v=20261020';
    cards.forEach(card => { card.querySelector('img').src = `assets/demos/${card.dataset.clip}/${mode}.webp${revision}`; });
    try {
      const source = `assets/demos/atlas/${mode}.mp4${revision}`;
      video.dataset.source = source;
      video.src = source;
      video.load();
      await waitingFor('loadeddata', () => video.readyState >= 2);
      if (ticket !== version) return;
      if (location.protocol !== 'file:' && (!video.seekable.length || video.seekable.end(video.seekable.length-1) < duration-.1)) {
        const blobSource = await seekableSource(source);
        if (ticket !== version) return;
        video.src = blobSource; video.load();
        await waitingFor('loadeddata', () => video.readyState >= 2);
        if (ticket !== version) return;
      }
      video.currentTime = Math.min(time, duration-.04);
      await waitingFor('seeked', () => !video.seeking);
      if (ticket !== version) return;
      loadedMode = mode; ready = true;
      paint(); status.textContent = '';
      updateControls(); play();
    } catch (error) {
      if (ticket === version) status.textContent = `${error.message} Refresh to retry.`;
    }
  }
  function select(nextTab) {
    if (!['rgb', 'depth', 'aligned'].includes(nextTab)) return false;
    if (ready) time = video.currentTime;
    tab = nextTab;
    if (tab !== loadedMode || !ready) loadView(tab); else play();
    return true;
  }
  window.SituDemo = { select };
  playButton.addEventListener('click', () => {
    desiredPlaying = !desiredPlaying;
    if (desiredPlaying) play(); else video.pause();
    updateControls();
  });
  document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : play());
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) play(); else video.pause();
    }, { threshold: .05 }).observe(root);
  } else inView = true;
  updateControls(); select('rgb');
})();
