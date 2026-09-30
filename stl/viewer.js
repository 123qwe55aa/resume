import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { STLLoader } from './vendor/STLLoader.js';
import { fileError, layoutOffsets } from './core.js';

const viewport = document.querySelector('#viewport');
const status = document.querySelector('#status');
const cards = [...document.querySelectorAll('.model-card')];
const slots = [null, null];
const revisions = [0, 0];
let mode = 'side';
let renderer;
function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('error', error);
}
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch {
  document.querySelector('#webgl-error').hidden = false;
  document.querySelectorAll('input,button').forEach(el => { el.disabled = true; });
  message('WebGL 不可用，请启用浏览器硬件加速。', true);
}
if (renderer) start();
function start() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  viewport.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '交互式三维模型');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10000);
  camera.up.set(0, 0, 1);
  camera.position.set(90, -120, 90);
  const controls = new OrbitControls(camera, renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4b5350, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(60, -80, 120);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x99d9ff, 1.8);
  fill.position.set(-80, 50, 40);
  scene.add(fill);
  const grid = new THREE.GridHelper(100, 20, 0x647a70, 0x3e4b45);
  grid.rotation.x = Math.PI / 2;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);
  const render = () => renderer.render(scene, camera);
  controls.addEventListener('change', render);
  const resize = () => {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    render();
  };
  new ResizeObserver(resize).observe(viewport);
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    document.querySelector('#webgl-error').hidden = false;
    message('3D 显示已中断，请刷新页面并重新加载文件。', true);
  });
  function bounds() {
    const box = new THREE.Box3();
    slots.forEach(s => { if (s?.mesh.visible) box.expandByObject(s.mesh); });
    return box;
  }
  function fit() {
    const box = bounds();
    if (box.isEmpty()) { render(); return; }
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.001);
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.2;
    const direction = new THREE.Vector3(1, -1.5, 1).normalize();
    controls.target.copy(sphere.center);
    camera.position.copy(sphere.center).addScaledVector(direction, distance);
    camera.near = Math.max(radius / 10000, 0.000001);
    camera.far = Math.max(distance * 100, radius * 1000);
    controls.minDistance = radius * 0.02;
    controls.maxDistance = distance * 30;
    camera.updateProjectionMatrix();
    controls.update();
    const size = box.getSize(new THREE.Vector3());
    const gridSize = Math.max(size.x, size.y, size.z, 0.001) * 2;
    grid.scale.setScalar(gridSize / 100);
    grid.position.set(sphere.center.x, sphere.center.y, box.min.z - radius * 0.02);
    render();
  }
  function arrange() {
    const loaded = slots.filter(Boolean);
    const offsets = layoutOffsets(loaded.map(s => ({min:s.box.min.toArray(),max:s.box.max.toArray()})), mode);
    loaded.forEach((s,i) => s.mesh.position.fromArray(offsets[i]));
    document.querySelector('#empty').hidden = loaded.length > 0;
    document.querySelector('#count').textContent = `${loaded.length} 个模型`;
    fit();
  }
  function materials() {
    const wireframe = document.querySelector('#wireframe').checked;
    const transparent = document.querySelector('#transparent').checked;
    slots.forEach(s => {
      if (!s) return;
      s.mesh.material.wireframe = wireframe;
      s.mesh.material.transparent = transparent;
      s.mesh.material.opacity = transparent ? 0.5 : 1;
      s.mesh.material.depthWrite = !transparent;
      s.mesh.material.needsUpdate = true;
    });
    render();
  }
  function dispose(i) {
    if (!slots[i]) return;
    scene.remove(slots[i].mesh);
    slots[i].mesh.geometry.dispose();
    slots[i].mesh.material.dispose();
    slots[i] = null;
  }
  async function load(file, i) {
    if (!file) return;
    const error = fileError(file);
    if (error) { message(error, true); return; }
    const revision = ++revisions[i];
    message(`正在读取模型 ${i === 0 ? 'A' : 'B'}：${file.name}`);
    let geometry;
    try {
      const buffer = await file.arrayBuffer();
      if (revision !== revisions[i]) return;
      geometry = new STLLoader().parse(buffer);
      const positions = geometry.getAttribute('position');
      if (!positions || positions.count < 3 || positions.count % 3) throw new Error('文件没有有效的三角网格。');
      for (const v of positions.array) if (!Number.isFinite(v)) throw new Error('网格包含无效坐标。');
      geometry.computeBoundingBox();
      const box = geometry.boundingBox.clone();
      if (box.isEmpty() || box.getSize(new THREE.Vector3()).length() === 0) throw new Error('模型尺寸为零。');
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({color:i === 0 ? 0x99f6d6 : 0xefa76f, roughness:0.55, metalness:0.12, side:THREE.DoubleSide});
      const mesh = new THREE.Mesh(geometry, material);
      dispose(i);
      slots[i] = { mesh, box };
      scene.add(mesh);
      const card = cards[i];
      card.querySelector('.filename').textContent = file.name;
      const size = box.getSize(new THREE.Vector3());
      const format = v => Number(v.toPrecision(5)).toLocaleString('zh-CN');
      card.querySelector('.details').textContent = `${(file.size/1024/1024).toFixed(2)} MB · ${(positions.count/3).toLocaleString()} 三角面\nX ${format(size.x)} × Y ${format(size.y)} × Z ${format(size.z)}（文件单位）`;
      card.querySelector('.details').style.whiteSpace = 'pre-line';
      card.querySelector('.visible').disabled = false;
      card.querySelector('.visible').checked = true;
      card.querySelector('.remove').disabled = false;
      materials();
      arrange();
      message(`模型 ${i === 0 ? 'A' : 'B'} 已加载。可拖动查看或加载另一个 STL。`);
    } catch (e) {
      geometry?.dispose();
      message(`无法读取 ${file.name}：请确认文件是有效的 STL，并尝试重新导出。`, true);
    }
  }
  cards.forEach((card, i) => {
    const input = card.querySelector('input[type=file]');
    input.addEventListener('change', () => { load(input.files[0], i); input.value = ''; });
    card.querySelector('.visible').addEventListener('change', e => {
      if (slots[i]) { slots[i].mesh.visible = e.target.checked; fit(); }
    });
    card.querySelector('.remove').addEventListener('click', () => {
      revisions[i]++;
      dispose(i);
      card.querySelector('.filename').textContent = '尚未加载';
      card.querySelector('.details').textContent = 'ASCII / Binary · 最大 100 MB';
      card.querySelector('.visible').disabled = true;
      card.querySelector('.visible').checked = true;
      card.querySelector('.remove').disabled = true;
      arrange();
      message(`模型 ${i === 0 ? 'A' : 'B'} 已移除。`);
    });
    const zone = card.querySelector('.dropzone');
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('dragover');
      if (e.dataTransfer.files.length !== 1) { message('每个模型位置请选择一个 STL。', true); return; }
      load(e.dataTransfer.files[0], i);
    });
  });
  viewport.addEventListener('dragover', e => e.preventDefault());
  viewport.addEventListener('drop', e => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (files.length > 2) { message('一次最多选择两个 STL。', true); return; }
    if (files.length === 2) files.forEach((file,i) => load(file,i));
    else if (files.length === 1) load(files[0], slots[0] ? 1 : 0);
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    arrange();
  }));
  document.querySelector('#fit').addEventListener('click', fit);
  document.querySelector('#wireframe').addEventListener('change', materials);
  document.querySelector('#transparent').addEventListener('change', materials);
  resize();
}
