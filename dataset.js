(() => {
  const root = document.querySelector('.dataset-experience');
  if (!root) return;
  const stage = root.querySelector('.room-stage');
  const launch = root.querySelector('.orbit-launch');
  const message = root.querySelector('.room-error');
  const choices = [...root.querySelectorAll('.semantic-choice')];
  let viewer, loading, selected = null;

  async function openViewer() {
    if (viewer) return viewer;
    if (loading) return loading;
    if (location.protocol === 'file:') {
      message.textContent = 'To explore in 3D, open this page through a local web server. The overview remains visible here.';
      return null;
    }
    launch.disabled = true;
    launch.querySelector('span').textContent = 'Loading room…';
    stage.dataset.state = 'loading';
    delete stage.dataset.viewerError;
    message.textContent = '';
    loading = (async () => {
      try {
        const { createRoomViewer } = await import('./room-viewer.js?v=20261020');
        viewer = await createRoomViewer(stage, selected);
        stage.dataset.state = 'ready';
        launch.hidden = true;
        launch.style.display = 'none';
        root.querySelector('.orbit-tools').hidden = false;
        root.querySelector('.orbit-help').hidden = false;
        stage.querySelector('canvas').focus({ preventScroll: true });
        return viewer;
      } catch (error) {
        stage.dataset.state = 'poster';
        message.textContent = 'The 3D view could not load on this device. You can still explore all room and object images below.';
        launch.querySelector('span').textContent = 'Retry 360° view';
        stage.dataset.viewerError = String(error.message || error);
        return null;
      } finally {
        launch.disabled = false;
        loading = null;
      }
    })();
    return loading;
  }

  launch.addEventListener('click', openViewer);
  choices.forEach(button => button.addEventListener('click', async () => {
    selected = Number(button.dataset.instance);
    choices.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const active = await openViewer();
    if (active) active.select(selected);
  }));
  root.querySelectorAll('[data-orbit]').forEach(button => button.addEventListener('click', () => {
    if (!viewer) return;
    if (button.dataset.orbit === 'spin') {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      viewer.spin(on);
    } else if (button.dataset.orbit === 'reset') {
      selected = null;
      choices.forEach(item => item.setAttribute('aria-pressed', 'false'));
      viewer.select(null);
      viewer.reset();
      root.querySelector('[data-orbit="spin"]').setAttribute('aria-pressed', 'false');
    } else viewer.rotate(button.dataset.orbit === 'left' ? -Math.PI / 6 : Math.PI / 6);
  }));

})();
