import * as THREE from 'three';
import { OrbitControls } from './assets/vendor/three/OrbitControls.js';
import { GLTFLoader } from './assets/vendor/three/GLTFLoader.js';
import { EffectComposer } from './assets/vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from './assets/vendor/three/postprocessing/RenderPass.js';
import { OutlinePass } from './assets/vendor/three/postprocessing/OutlinePass.js';
import { OutputPass } from './assets/vendor/three/postprocessing/OutputPass.js';

export async function createRoomViewer(stage, initialSelection = null) {
  const host = stage.querySelector('.room-canvas');
  const pin = stage.querySelector('.semantic-pin');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '3D room with human-object interactions. Drag or use arrow keys to rotate; use plus and minus to zoom; press Home to reset.');
  let model;
  try {
    model = (await new GLTFLoader().loadAsync(new URL('./assets/dataset/room-2922.glb?v=20261020', import.meta.url).href)).scene;
  } catch (error) {
    renderer.dispose();
    throw error;
  }
  const scene = new THREE.Scene();
  scene.add(model);
  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, -4, 9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffedd8, 1);
  rim.position.set(-5, 4, 3);
  scene.add(rim);
  const people = [], objects = [];
  model.traverse(node => {
    if (!node.isMesh) return;
    node.frustumCulled = false;
    const name = node.name;
    if (name.startsWith('human_') || name.startsWith('object_')) {
      const human = name.startsWith('human_');
      node.material = new THREE.MeshStandardMaterial({ color: human ? '#2998ad' : '#df914d', roughness: .88, metalness: 0, side: THREE.DoubleSide });
      (human ? people : objects).push(node);
    } else {
      const colors = node.geometry.getAttribute('color');
      node.material = new THREE.MeshBasicMaterial({ color: colors ? 0xffffff : '#b5aa91', vertexColors: !!colors, side: THREE.DoubleSide });
    }
  });
  const bounds = new THREE.Box3().setFromObject(model);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const gradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(37,29,20,.8)');
  gradient.addColorStop(.6, 'rgba(37,29,20,.45)');
  gradient.addColorStop(1, 'rgba(37,29,20,0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  const contactShadows = [];
  [...people, ...objects].forEach(node => {
    if (node.name === 'object_1') return;
    const body = node.name.startsWith('human_');
    const box = new THREE.Box3().setFromObject(node);
    const footBox = new THREE.Box3();
    const points = node.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < points.count; i++) {
      v.fromBufferAttribute(points, i).applyMatrix4(node.matrixWorld);
      if (v.z < box.min.z + .045) footBox.expandByPoint(v);
    }
    const contact = body ? footBox : box;
    const c = contact.getCenter(new THREE.Vector3());
    const s = contact.getSize(new THREE.Vector3());
    const material = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: body ? .22 : .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.1, s.x) * 1.35, Math.max(.1, s.y) * 1.35), material);
    shadow.position.set(c.x, c.y, box.min.z - .001);
    shadow.userData.instance = Number(node.name.split('_')[1]);
    shadow.userData.opacity = material.opacity;
    contactShadows.push(shadow);
    scene.add(shadow);
  });
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  center.z = .6;
  const radius = Math.max(size.x, size.y) * .53;
  const camera = new THREE.OrthographicCamera(-radius, radius, radius, -radius, .05, 200);
  camera.up.set(0, 0, 1);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outline.visibleEdgeColor.set('#ffb42e');
  outline.hiddenEdgeColor.set('#ff8c21');
  outline.edgeStrength = 7;
  outline.edgeThickness = 2.5;
  outline.edgeGlow = .45;
  outline.downSampleRatio = 1;
  composer.addPass(outline);
  composer.addPass(new OutputPass());
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);
  controls.enableDamping = true;
  controls.dampingFactor = .09;
  controls.enablePan = false;
  controls.minPolarAngle = .15;
  controls.maxPolarAngle = Math.PI / 2.35;
  controls.minZoom = .65;
  controls.maxZoom = 3;
  controls.zoomSpeed = .8;
  controls.rotateSpeed = .6;
  controls.autoRotateSpeed = .55;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: null };
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  let activePoint = center.clone(), selected = initialSelection, frame = null, visible = true;
  const azimuth = THREE.MathUtils.degToRad(35), elevation = THREE.MathUtils.degToRad(55);
  const initialOffset = new THREE.Vector3(Math.cos(azimuth) * Math.cos(elevation), Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation)).multiplyScalar(18);
  let viewFit;
  function measureInitialView() {
    const reference = camera.clone();
    reference.position.copy(center).add(initialOffset);
    reference.lookAt(center);
    reference.updateMatrixWorld(true);
    const projected = new THREE.Box3();
    const v = new THREE.Vector3();
    model.updateMatrixWorld(true);
    model.traverse(node => {
      if (!node.isMesh) return;
      const points = node.geometry.getAttribute('position');
      const transform = new THREE.Matrix4().multiplyMatrices(reference.matrixWorldInverse, node.matrixWorld);
      for (let i = 0; i < points.count; i++) projected.expandByPoint(v.fromBufferAttribute(points, i).applyMatrix4(transform));
    });
    return { width: projected.max.x - projected.min.x, height: projected.max.y - projected.min.y, x: (projected.max.x + projected.min.x) / 2, y: (projected.max.y + projected.min.y) / 2 };
  }
  viewFit = measureInitialView();
  const reset = () => {
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(center);
    camera.position.copy(center).add(initialOffset);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
    controls.enableDamping = true;
    requestRender();
  };
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    fitCamera(width, height);
    requestRender();
  }
  function fitCamera(width, height, fit = viewFit) {
    const aspect = width / height;
    const halfHeight = Math.max(fit.height / 2, fit.width / 2 / aspect) * 1.12;
    camera.left = fit.x - halfHeight * aspect;
    camera.right = fit.x + halfHeight * aspect;
    camera.top = fit.y + halfHeight;
    camera.bottom = fit.y - halfHeight;
    camera.updateProjectionMatrix();
  }
  function render() {
    frame = null;
    if (!visible || document.hidden) return;
    const changing = controls.update();
    if (selected === null) renderer.render(scene, camera);
    else composer.render();
    const p = activePoint.clone().project(camera);
    const x = (p.x * .5 + .5) * host.clientWidth, y = (-p.y * .5 + .5) * host.clientHeight;
    pin.hidden = selected === null || p.z > 1 || x < 0 || x > host.clientWidth || y < 0 || y > host.clientHeight;
    pin.style.left = `${host.offsetLeft + x}px`;
    pin.style.top = `${host.offsetTop + y}px`;
    stage.dataset.azimuth = controls.getAzimuthalAngle().toFixed(4);
    stage.dataset.zoom = camera.zoom.toFixed(3);
    stage.dataset.viewHeight = ((camera.top - camera.bottom) / camera.zoom).toFixed(6);
    if (changing || controls.autoRotate) requestRender();
  }
  function requestRender() { if (frame === null) frame = requestAnimationFrame(render); }
  function select(index) {
    selected = index;
    const highlighted = [];
    [...people, ...objects].forEach(node => {
      const human = node.name.startsWith('human_');
      const active = node.name === `${human ? 'human' : 'object'}_${index}`;
      const muted = index !== null && !active;
      node.material.color.set(muted ? '#c0c5bf' : human ? '#2196b1' : '#f29338');
      node.material.transparent = muted;
      node.material.opacity = muted ? .12 : 1;
      node.material.depthWrite = !muted;
      node.material.emissive.set(active ? (human ? '#083344' : '#5e2c08') : '#000000');
      node.material.emissiveIntensity = active ? .5 : 0;
      node.material.needsUpdate = true;
      if (active) highlighted.push(node);
    });
    outline.selectedObjects = highlighted;
    contactShadows.forEach(shadow => {
      shadow.material.opacity = index === null || shadow.userData.instance === index ? shadow.userData.opacity : .015;
    });
    const active = objects.find(node => node.name === `object_${index}`) || people.find(node => node.name === `human_${index}`);
    if (active) activePoint = new THREE.Box3().setFromObject(active).getCenter(new THREE.Vector3());
    stage.dataset.selectedInstance = index === null ? '' : String(index);
    stage.dataset.highlightedNodes = highlighted.map(node => node.name).join(',');
    requestRender();
  }
  function rotate(angle) {
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    requestRender();
  }
  controls.addEventListener('change', requestRender);
  renderer.domElement.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', '+', '=', '-', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') rotate(event.key === 'ArrowLeft' ? -.15 : .15);
      else if (event.key === 'Home') {
        select(null); reset();
        stage.closest('.dataset-experience').querySelectorAll('.semantic-choice').forEach(button => button.setAttribute('aria-pressed', 'false'));
      }
      else {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.key === '-' ? .9 : 1.1), controls.minZoom, controls.maxZoom);
        camera.updateProjectionMatrix(); requestRender();
      }
    }
  });
  host.replaceChildren(renderer.domElement);
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) requestRender(); }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', requestRender);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stage.dataset.state = 'poster';
    stage.querySelector('.room-error').textContent = '3D graphics paused. The room illustration is shown instead; reload the page to restart the viewer.';
    pin.hidden = true;
  });
  resize(); reset(); select(initialSelection); requestRender();
  return {
    select, rotate, reset,
    spin(value) { controls.autoRotate = value; requestRender(); },
    exportPoster(width = 2200) {
      const previous = selected;
      select(null); reset();
      const height = Math.round(width * viewFit.height / viewFit.width);
      renderer.setSize(width, height, false);
      fitCamera(width, height);
      renderer.render(scene, camera);
      const data = renderer.domElement.toDataURL('image/png');
      select(previous); resize();
      return { data, aspect: viewFit.width / viewFit.height, viewFit, width, height };
    }
  };
}
