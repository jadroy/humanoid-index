"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import URDFLoader from "urdf-loader";

// Shared Draco decoder — fetched lazily once on first GLB load, ~340 KB.
let sharedDraco: DRACOLoader | null = null;
const getDraco = () => {
  if (sharedDraco) return sharedDraco;
  sharedDraco = new DRACOLoader();
  sharedDraco.setDecoderPath("/draco/");
  sharedDraco.setDecoderConfig({ type: "wasm" });
  return sharedDraco;
};

export type MaterialPreset = "clay" | "brushed" | "chrome";

interface Robot3DProps {
  urdfUrl: string;
  meshBase: string;
  material?: MaterialPreset;
  className?: string;
  style?: React.CSSProperties;
}

const PRESETS: Record<
  MaterialPreset,
  { color: number; metalness: number; roughness: number; envIntensity: number }
> = {
  clay: { color: 0xe2e3e6, metalness: 0.0, roughness: 0.7, envIntensity: 0.35 },
  brushed: { color: 0xc8cbd0, metalness: 0.75, roughness: 0.38, envIntensity: 0.9 },
  chrome: { color: 0xeef0f3, metalness: 0.98, roughness: 0.15, envIntensity: 1.15 },
};

const applyPreset = (root: THREE.Object3D, preset: MaterialPreset) => {
  const cfg = PRESETS[preset];
  root.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((raw) => {
      const m = raw as THREE.MeshStandardMaterial;
      if (!m || !("isMaterial" in m)) return;
      m.color = new THREE.Color(cfg.color);
      m.metalness = cfg.metalness;
      m.roughness = cfg.roughness;
      m.envMapIntensity = cfg.envIntensity;
      m.needsUpdate = true;
    });
  });
};

export default function Robot3D({
  urdfUrl,
  meshBase,
  material = "clay",
  className = "",
  style,
}: Robot3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<THREE.Object3D | null>(null);

  // Re-apply material when prop changes, without rebuilding the scene
  useEffect(() => {
    if (robotRef.current) applyPreset(robotRef.current, material);
  }, [material]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 800;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);
    camera.position.set(2.2, 1.4, 2.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Built-in studio HDRI via PMREM — gives metals something to reflect
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // Soft fill so clay (no envmap influence) still reads
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc4c8d0, 0.35);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -1;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 6;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    // Soft circular contact shadow under the robot
    const shadowSize = 1.8;
    const shadowTex = makeContactShadowTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowSize, shadowSize),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.002;
    scene.add(ground);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.7, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = 6;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;

    // URDFs are Z-up, three.js is Y-up
    const robotGroup = new THREE.Group();
    robotGroup.rotation.x = -Math.PI / 2;
    scene.add(robotGroup);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(getDraco());

    const loader = new URDFLoader();
    loader.packages = { "": meshBase };
    // Redirect URDF's STL refs to our precomputed Draco-compressed GLBs.
    loader.loadMeshCb = (urdfMeshPath, _manager, onComplete) => {
      const glbPath = urdfMeshPath
        .replace(/\/meshes\//, "/meshes-glb/")
        .replace(/\.STL$/i, ".glb");
      gltfLoader.load(
        glbPath,
        (gltf) => onComplete(gltf.scene),
        undefined,
        (err) => {
          console.error("[Robot3D] mesh load failed", glbPath, err);
          onComplete(new THREE.Object3D());
        }
      );
    };

    let disposed = false;

    loader.load(urdfUrl, (robot) => {
      if (disposed) return;
      robot.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      robotGroup.add(robot);
      robotRef.current = robot;
      applyPreset(robot, material);

      // Frame the robot
      const box = new THREE.Box3().setFromObject(robot);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const worldCenter = center.clone().applyMatrix4(robotGroup.matrixWorld);
      controls.target.copy(worldCenter);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 2.4;
      camera.position.set(dist * 0.7, worldCenter.y + maxDim * 0.4, dist * 0.7);
      camera.lookAt(worldCenter);
      controls.update();
    });

    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
    };
    // setAnimationLoop auto-pauses on tab blur (vs requestAnimationFrame).
    renderer.setAnimationLoop(tick);

    // Pause rendering when the viewer scrolls off-screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        renderer.setAnimationLoop(entry.isIntersecting ? tick : null);
      },
      { threshold: 0 }
    );
    io.observe(mount);

    const onResize = () => {
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 800;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Keep wheel-zoom local to the viewer — bubble-phase so OrbitControls
    // (which listens on the canvas itself) gets to handle zoom first, then we
    // stop the event before the carousel's wheel handler sees it.
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    mount.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      mount.removeEventListener("wheel", onWheel);
      controls.dispose();
      pmrem.dispose();
      envTex.dispose();
      shadowTex.dispose();
      // Walk the scene and release GPU resources from loaded meshes.
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            if (!mat) return;
            // Dispose any texture maps the material might hold.
            (["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap"] as const)
              .forEach((k) => mat[k]?.dispose?.());
            mat.dispose?.();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urdfUrl, meshBase]);

  return <div ref={mountRef} className={className} style={style} />;
}

// Radial soft-shadow texture (no real depth pass, just a baked falloff)
function makeContactShadowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(20,22,28,0.95)");
  grad.addColorStop(0.35, "rgba(20,22,28,0.55)");
  grad.addColorStop(0.75, "rgba(20,22,28,0.08)");
  grad.addColorStop(1, "rgba(20,22,28,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
