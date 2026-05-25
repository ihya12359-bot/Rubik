import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ColorCode, COLOR_HEX, FlatCubeState, DEFAULT_CENTERS } from '../types';
import { makeCubiesFromFlat, executeMoveOnFlat, STICKER_MAPPING } from '../utils/cubeState';

interface Rubik3DProps {
  flatState: FlatCubeState;
  onStateChange?: (newState: FlatCubeState) => void;
  animatingMove: string | null;
  animationProgress: number; // 0 to 1
  isEditMode: boolean;
  selectedColor: ColorCode;
  onModifySticker?: (face: string, index: number) => void;
  activeFace: string | null;
}

export const Rubik3D: React.FC<Rubik3DProps> = ({
  flatState,
  onStateChange,
  animatingMove,
  animationProgress,
  isEditMode,
  selectedColor,
  onModifySticker,
  activeFace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Keep refs of Three.js objects to avoid recreate
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubieMeshesRef = useRef<THREE.Group[]>([]);
  const flatStateRef = useRef<FlatCubeState>(flatState);

  // Sync state ref
  useEffect(() => {
    flatStateRef.current = flatState;
  }, [flatState]);

  // Re-generate meshes when flatState changed and NOT animating
  useEffect(() => {
    if (!animatingMove) {
      rebuildCube();
    }
  }, [flatState, animatingMove]);

  // Handle real-time alignment and rotation animations in requestAnimationFrame
  useEffect(() => {
    if (!animatingMove || cubieMeshesRef.current.length === 0) return;

    // We animate the meshes belonging to the active layer of animatingMove
    const baseMove = animatingMove.charAt(0);
    const modifier = animatingMove.slice(1);
    
    let isClockwise = modifier !== "'";
    if (baseMove === 'L' || baseMove === 'D' || baseMove === 'B') {
      isClockwise = !isClockwise; // Inverse coordinate orientation
    }
    const times = modifier === '2' ? 2 : 1;

    let axis: 'x' | 'y' | 'z' = 'x';
    let layerVal = 1;

    switch (baseMove) {
      case 'R': axis = 'x'; layerVal = 1; break;
      case 'L': axis = 'x'; layerVal = -1; break;
      case 'U': axis = 'y'; layerVal = 1; break;
      case 'D': axis = 'y'; layerVal = -1; break;
      case 'F': axis = 'z'; layerVal = 1; break;
      case 'B': axis = 'z'; layerVal = -1; break;
    }

    const targetAngle = (isClockwise ? -1 : 1) * Math.PI / 2 * times;
    const currentAngle = targetAngle * animationProgress;

    // Apply rotation to the matching layer cubies
    cubieMeshesRef.current.forEach((group) => {
      const uData = group.userData as { x: number; y: number; z: number };
      
      // Determine if it belongs to layer
      const belongs = 
        (axis === 'x' && uData.x === layerVal) ||
        (axis === 'y' && uData.y === layerVal) ||
        (axis === 'z' && uData.z === layerVal);

      if (belongs) {
        // Reset rotation and position to standard layout
        group.position.set(uData.x * 1.05, uData.y * 1.05, uData.z * 1.05);
        group.rotation.set(0, 0, 0);

        // Apply dynamic orbital rotation
        const originalPos = new THREE.Vector3(uData.x * 1.05, uData.y * 1.05, uData.z * 1.05);
        
        if (axis === 'x') {
          group.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), currentAngle);
          originalPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), currentAngle);
        } else if (axis === 'y') {
          group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), currentAngle);
          originalPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentAngle);
        } else if (axis === 'z') {
          group.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), currentAngle);
          originalPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), currentAngle);
        }
        
        group.position.copy(originalPos);
      } else {
        // Rest keep original
        group.position.set(uData.x * 1.05, uData.y * 1.05, uData.z * 1.05);
        group.rotation.set(0, 0, 0);
      }
    });

  }, [animatingMove, animationProgress]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background so we can style container
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.5, 4, 6.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 15;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    // Dynamic professional lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const topPurpleLight = new THREE.DirectionalLight(0x10B981, 0.15); // Green subtle glow
    topPurpleLight.position.set(0, 10, 0);
    scene.add(topPurpleLight);

    // Initial rebuild
    rebuildCube();

    // Raycasting for interactive editing
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (!isEditMode || !onModifySticker) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Find all stickers inside cubie meshes
      const stickerMeshes: THREE.Object3D[] = [];
      cubieMeshesRef.current.forEach((cMesh) => {
        cMesh.children.forEach((child) => {
          if (child.userData && child.userData.isSticker) {
            stickerMeshes.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(stickerMeshes);
      if (intersects.length > 0) {
        const hitSticker = intersects[0].object;
        const uData = hitSticker.userData as { face: string; index: number };
        
        // Block editing of fixed centers to keep it valid
        if (uData.index === 4) return;
        
        onModifySticker(uData.face, uData.index);
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Animation animation loop
    let animId: number;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };
    tick();

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth || 400;
      const h = containerRef.current.clientHeight || 450;
      
      const cam = cameraRef.current as THREE.PerspectiveCamera;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      
      rendererRef.current.setSize(w, h);
    });
    
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [isEditMode, selectedColor, onModifySticker]);

  // Re-builds 3D meshes based on flatState
  const rebuildCube = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old meshes
    cubieMeshesRef.current.forEach((m) => scene.remove(m));
    cubieMeshesRef.current = [];

    const cubiesData = makeCubiesFromFlat(flatStateRef.current);

    cubiesData.forEach((cubie) => {
      const group = new THREE.Group();
      group.userData = { x: cubie.x, y: cubie.y, z: cubie.z };

      // 1. Create central black box base
      const boxGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0x12131a, // Premium soft dark grey borders
        roughness: 0.6,
        metalness: 0.2,
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      group.add(boxMesh);

      // 2. Add Stickers on active sides
      const sSize = 0.76;
      const sThick = 0.035;

      // Directions: 0:+x, 1:-x, 2:+y, 3:-y, 4:+z, 5:-z
      const stickerGeoZ = new THREE.BoxGeometry(sSize, sSize, sThick);
      const stickerGeoY = new THREE.BoxGeometry(sSize, sThick, sSize);
      const stickerGeoX = new THREE.BoxGeometry(sThick, sSize, sSize);

      cubie.colors.forEach((col, cIdx) => {
        if (!col) return; // Interior

        const sColor = COLOR_HEX[col];
        
        // Soft gradient emissions for elegant glows
        const isHighlight = activeFace && isFaceAffected(activeFace, cIdx);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(sColor),
          roughness: 0.15,
          metalness: 0.05,
          emissive: isHighlight ? new THREE.Color(sColor).multiplyScalar(0.2) : new THREE.Color(0x000000),
        });

        let sMesh: THREE.Mesh | null = null;
        let offset = 0.485;

        // Find which face in STICKER_MAPPING this sticker belongs to
        const mappedInfo = getFaceAndStickerIndex(cubie.x, cubie.y, cubie.z, cIdx);

        if (cIdx === 0) { // +x standard
          sMesh = new THREE.Mesh(stickerGeoX, mat);
          sMesh.position.set(offset, 0, 0);
        } else if (cIdx === 1) { // -x
          sMesh = new THREE.Mesh(stickerGeoX, mat);
          sMesh.position.set(-offset, 0, 0);
        } else if (cIdx === 2) { // +y
          sMesh = new THREE.Mesh(stickerGeoY, mat);
          sMesh.position.set(0, offset, 0);
        } else if (cIdx === 3) { // -y
          sMesh = new THREE.Mesh(stickerGeoY, mat);
          sMesh.position.set(0, -offset, 0);
        } else if (cIdx === 4) { // +z
          sMesh = new THREE.Mesh(stickerGeoZ, mat);
          sMesh.position.set(0, 0, offset);
        } else if (cIdx === 5) { // -z
          sMesh = new THREE.Mesh(stickerGeoZ, mat);
          sMesh.position.set(0, 0, -offset);
        }

        if (sMesh && mappedInfo) {
          sMesh.userData = {
            isSticker: true,
            face: mappedInfo.face,
            index: mappedInfo.index,
          };
          group.add(sMesh);
        }
      });

      // Position group with standard spacing
      group.position.set(cubie.x * 1.05, cubie.y * 1.05, cubie.z * 1.05);
      scene.add(group);
      cubieMeshesRef.current.push(group);
    });
  };

  // Checks if a face is affected by an highlighting active movement
  const isFaceAffected = (move: string, cIdx: number): boolean => {
    const main = move.charAt(0);
    if (main === 'R' && cIdx === 0) return true;
    if (main === 'L' && cIdx === 1) return true;
    if (main === 'U' && cIdx === 2) return true;
    if (main === 'D' && cIdx === 3) return true;
    if (main === 'F' && cIdx === 4) return true;
    if (main === 'B' && cIdx === 5) return true;
    return false;
  };

  // Helper mapping helper to lookup back to STICKER_MAPPING flat indices
  const getFaceAndStickerIndex = (cx: number, cy: number, cz: number, colorIdx: number): { face: string; index: number } | null => {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
    for (const f of faces) {
      const match = STICKER_MAPPING[f].find((m) => m.x === cx && m.y === cy && m.z === cz && m.colorIdx === colorIdx);
      if (match) return { face: f, index: match.idx };
    }
    return null;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* 3D Canvas element */}
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing max-h-[460px]" style={{ outline: 'none' }} />
      
      {/* Subtle indicator of Edit Mode state */}
      {isEditMode && (
        <div className="absolute top-3 left-3 bg-emerald-500/90 text-white font-mono text-xs px-2.5 py-1 rounded-full shadow-lg border border-emerald-400 backdrop-blur-sm animate-pulse flex items-center gap-1.5 uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-white block animate-ping"></span>
          Mode Edit Aktif
        </div>
      )}

      {/* Touch instructions or controls tips */}
      <div className="absolute bottom-2 right-2 text-[10px] text-zinc-500 font-mono select-none pointer-events-none hidden sm:block">
        Geser mouse untuk rotasi 3D • Scroll zoom
      </div>
    </div>
  );
};
