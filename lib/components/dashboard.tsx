"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedObjectRef = useRef<THREE.Mesh | null>(null);
  const isDraggingRef = useRef(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectToBodyMap = useRef(new Map<THREE.Mesh, CANNON.Body>());
  const mouseRef = useRef(new THREE.Vector2());
  const worldRef = useRef<CANNON.World | null>(null);
  let scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer;
  let platform: THREE.Mesh;
  let groundBody: CANNON.Body;

  useEffect(() => {
    if (!containerRef.current) return;

    // 🌍 Initialize Cannon.js physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.8, 0);
    worldRef.current = world;

    // Three.js Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // 🛠️ Add ground (Platform)
    platform = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.2, 5),
      new THREE.MeshBasicMaterial({ color: 0x808080 })
    );
    platform.position.set(0, -1, 0);
    scene.add(platform);

    // 📦 Create physics ground using a Box instead of a Plane
    const groundShape = new CANNON.Box(new CANNON.Vec3(2.5, 0.1, 2.5));
    groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.position.set(0, -1, 0);
    world.addBody(groundBody);

    // 🏆 Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controlsRef.current = controls;

    // 🖱️ Mouse Events for Dragging
    let dragTimeout: NodeJS.Timeout;

    const onMouseDown = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObjects(
        Array.from(objectToBodyMap.current.keys())
      );

      if (intersects.length > 0) {
        dragTimeout = setTimeout(() => {
          selectedObjectRef.current = intersects[0].object as THREE.Mesh;
          isDraggingRef.current = true;
          controlsRef.current!.enabled = false;

          const body = objectToBodyMap.current.get(selectedObjectRef.current);
          if (body) {
            body.type = CANNON.Body.KINEMATIC;
          }
        }, 300);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !selectedObjectRef.current) return;

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObject(platform);

      if (intersects.length > 0) {
        const body = objectToBodyMap.current.get(selectedObjectRef.current);
        if (body) {
          const point = intersects[0].point;
          body.position.set(point.x, point.y, point.z);
        }
      }
    };

    const onMouseUp = () => {
      clearTimeout(dragTimeout);
      if (isDraggingRef.current && selectedObjectRef.current) {
        const body = objectToBodyMap.current.get(selectedObjectRef.current);
        if (body) {
          body.type = CANNON.Body.DYNAMIC;
        }
      }

      isDraggingRef.current = false;
      selectedObjectRef.current = null;
      controlsRef.current!.enabled = true;
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 🔄 Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      world.step(1 / 60);

      objectToBodyMap.current.forEach((body, mesh) => {
        if (!isDraggingRef.current) {
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  const addBox = () => {
    if (!worldRef.current) return;

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() * 0xffffff,
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 2, 0);
    scene.add(box);

    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    const boxBody = new CANNON.Body({ mass: 1, shape: boxShape });
    boxBody.position.set(0, 2, 0);
    worldRef.current.addBody(boxBody);

    objectToBodyMap.current.set(box, boxBody);
  };

  return (
    <div>
      <button
        onClick={addBox}
        style={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}
      >
        Add Box
      </button>
      <div ref={containerRef} />
    </div>
  );
}

export default Dashboard;
