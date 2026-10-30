import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { inPocket, type JigInfo } from '@/lib/analysis';
import type { JigParams } from '@/lib/jig-params';

interface Scene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group;
  draw: () => void;
}

const BODY = new THREE.MeshStandardMaterial({ color: 0x5b8def, roughness: 0.55, metalness: 0.05 });
const BARREL = new THREE.MeshStandardMaterial({ color: 0xd4a72c, roughness: 0.3, metalness: 0.8 });
const PLUNGER = new THREE.MeshStandardMaterial({ color: 0xe8e2c8, roughness: 0.3, metalness: 0.8 });

/** OpenSCAD is Z-up; three's cylinders run along Y, so turn them upright. */
function cylinder(d: number, h: number, mat: THREE.Material, x: number, y: number, z0: number) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 16), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z0 + h / 2);
  return m;
}

export function Viewer3D({
  stl,
  params,
  info,
  showPins,
}: {
  stl: ArrayBuffer | null;
  params: JigParams;
  info: JigInfo | null;
  showPins: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Scene | null>(null);
  const framed = useRef<string>('');

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    camera.up.set(0, 0, 1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(40, -60, 90);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-50, 40, -30);
    scene.add(fill);
    const grid = new THREE.GridHelper(200, 200, 0x666666, 0x333333);
    grid.rotation.x = Math.PI / 2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    const model = new THREE.Group();
    scene.add(model);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    const draw = () => renderer.render(scene, camera);
    controls.addEventListener('change', draw);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    ctx.current = { renderer, scene, camera, controls, model, draw };
    resize();

    return () => {
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      ctx.current = null;
    };
  }, []);

  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    for (const child of [...c.model.children]) {
      c.model.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }
    if (!stl) {
      c.draw();
      return;
    }
    const geom = new STLLoader().parse(stl);
    geom.computeVertexNormals();
    c.model.add(new THREE.Mesh(geom, BODY));

    if (showPins && info && !params.flip_for_printing) {
      const tipLen = params.pin_total_len - params.pin_barrel_len;
      for (const pin of info.pins) {
        if (!pin.used) continue;
        const base = inPocket(info, pin.x, pin.y) ? params.pocket_depth : 0;
        const seat = base + info.stopH;
        c.model.add(cylinder(params.pin_barrel_d, params.pin_barrel_len, BARREL, pin.x, pin.y, seat));
        c.model.add(cylinder(params.pin_barrel_d * 0.6, tipLen, PLUNGER, pin.x, pin.y, seat - tipLen));
      }
    }

    // Reframe the camera only when the overall size changes noticeably.
    const box = new THREE.Box3().setFromObject(c.model);
    const size = box.getSize(new THREE.Vector3());
    const key = [size.x, size.y, size.z].map((v) => Math.round(v / 4)).join(',');
    if (key !== framed.current) {
      framed.current = key;
      const centre = box.getCenter(new THREE.Vector3());
      const radius = size.length() / 2;
      const dist = radius / Math.sin((c.camera.fov * Math.PI) / 360);
      c.controls.target.copy(centre);
      c.camera.position.copy(centre).add(new THREE.Vector3(0.55, -1, 0.75).normalize().multiplyScalar(dist * 1.05));
      c.camera.near = dist / 100;
      c.camera.far = dist * 20;
      c.camera.updateProjectionMatrix();
      c.controls.update();
    }
    c.draw();
  }, [stl, info, params, showPins]);

  return <div ref={host} className="h-full w-full touch-none" />;
}
