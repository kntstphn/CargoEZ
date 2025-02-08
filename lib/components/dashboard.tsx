"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const objectToBodyMap = useRef(new Map<THREE.Mesh, CANNON.Body>());
  const worldRef = useRef<CANNON.World | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const addBoxRef = useRef<(() => void) | null>(null);

  // Dragging references
  const selectedBodyRef = useRef<CANNON.Body | null>(null);
  const isDraggingRef = useRef(false);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls;

  useEffect(() => {
    if (!containerRef.current) return;

    // 🌍 Physics World
    const world = new CANNON.World();
    world.gravity.set(0, -9.8, 0);
    worldRef.current = world;

    // 🎬 Three.js Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
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

    // 🏆 Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true;
    controls.enableZoom = true;

    // 🛠️ Ground
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.2, 5),
      new THREE.MeshBasicMaterial({ color: 0x808080 })
    );
    platform.position.set(0, -1, 0);
    scene.add(platform);

    // 📦 Physics Ground
    const groundShape = new CANNON.Box(new CANNON.Vec3(2.5, 0.1, 2.5));
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.position.set(0, -1, 0);
    world.addBody(groundBody);

    // 🏗️ Walls (Visual + Physics)
    const addWall = (x: number, z: number, rotationY: number) => {
      const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x303030 });

      // Three.js wall
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(5, 2, 0.2),
        wallMaterial
      );
      wall.position.set(x, 0, z);
      wall.rotation.y = rotationY;
      scene.add(wall);

      // Cannon.js physics wall
      const wallShape =
        rotationY === 0
          ? new CANNON.Box(new CANNON.Vec3(2.5, 1, 0.1)) // Front/Back
          : new CANNON.Box(new CANNON.Vec3(0.1, 1, 2.5)); // Sides

      const wallBody = new CANNON.Body({ mass: 0, shape: wallShape });
      wallBody.position.set(x, 0, z);
      world.addBody(wallBody);
    };

    addWall(0, -2.5, 0); // Back wall
    addWall(-2.5, 0, Math.PI / 2); // Left wall

    // 📦 Add Box Function
    // const addBox = () => {
    //   if (!sceneRef.current || !worldRef.current) return;

    //   // Create a visual box
    //   const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    //   const boxMaterial = new THREE.MeshBasicMaterial({
    //     color: Math.random() * 0xffffff,
    //   });
    //   const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

    //   // Spawn at a random position
    //   boxMesh.position.set(Math.random() * 3 - 1.5, 3, Math.random() * 3 - 1.5);
    //   sceneRef.current.add(boxMesh);

    //   // Create physics box
    //   const boxShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
    //   const boxBody = new CANNON.Body({ mass: 1, shape: boxShape });
    //   boxBody.position.set(
    //     boxMesh.position.x,
    //     boxMesh.position.y,
    //     boxMesh.position.z
    //   );

    //   worldRef.current.addBody(boxBody);

    //   // Store the mesh-body mapping
    //   objectToBodyMap.current.set(boxMesh, boxBody);
    // };
    const addBox = () => {
      if (!sceneRef.current || !worldRef.current) return;

      // 🎨 Three.js Visual Box
      const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() * 0xffffff,
      });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

      // Spawn at a random position
      boxMesh.position.set(Math.random() * 3 - 1.5, 3, Math.random() * 3 - 1.5);
      sceneRef.current.add(boxMesh);

      // ⚡ Cannon.js Physics Box
      const physicsMaterial = new CANNON.Material("boxMaterial");
      physicsMaterial.restitution = 0; // No bouncing

      const boxShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
      const boxBody = new CANNON.Body({
        mass: 5, // ⬆️ Make the box heavier
        shape: boxShape,
        material: physicsMaterial,
      });

      // Apply damping to slow down unnecessary movement
      boxBody.linearDamping = 0.3;
      boxBody.angularDamping = 0.5;

      // Set the initial position of the physics body
      boxBody.position.set(
        boxMesh.position.x,
        boxMesh.position.y,
        boxMesh.position.z
      );

      worldRef.current.addBody(boxBody);

      // Store the mesh-body mapping
      objectToBodyMap.current.set(boxMesh, boxBody);
    };

    // Store function for button click
    addBoxRef.current = addBox;

    // Add some boxes initially
    for (let i = 0; i < 3; i++) addBox();

    // 🖱️ Mouse Dragging Logic
    const onMouseDown = (event: MouseEvent) => {
      if (!worldRef.current) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        const selectedMesh = intersects[0].object as THREE.Mesh;
        if (objectToBodyMap.current.has(selectedMesh)) {
          selectedBodyRef.current = objectToBodyMap.current.get(selectedMesh)!;
          isDraggingRef.current = true;

          // Disable OrbitControls while dragging
          controls.enabled = false;
        }
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !selectedBodyRef.current) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const newPosition = raycaster.ray.origin.add(
        raycaster.ray.direction.multiplyScalar(5)
      );

      // 🚧 Prevent box from going outside the walls
      const clampedX = Math.max(-2.25, Math.min(2.25, newPosition.x));
      const clampedZ = Math.max(-2.25, Math.min(2.25, newPosition.z));
      const clampedY = Math.max(-0.75, Math.min(3, newPosition.y));

      selectedBodyRef.current.position.set(clampedX, clampedY, clampedZ);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      selectedBodyRef.current = null;

      // Re-enable OrbitControls when done dragging
      controls.enabled = true;
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // 🎮 Touch Controls for Dragging
    // const onTouchStart = (event: TouchEvent) => {
    //   if (!worldRef.current) return;
    //   controls.enabled = false; // Disable controls when touch starts

    //   const touch = event.touches[0];
    //   mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    //   mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    //   raycaster.setFromCamera(mouse, camera);

    //   const intersects = raycaster.intersectObjects(scene.children);

    //   if (intersects.length > 0) {
    //     const selectedMesh = intersects[0].object as THREE.Mesh;
    //     if (objectToBodyMap.current.has(selectedMesh)) {
    //       selectedBodyRef.current = objectToBodyMap.current.get(selectedMesh)!;
    //       isDraggingRef.current = true;
    //     }
    //   }
    // };

    // const onTouchMove = (event: TouchEvent) => {
    //   if (!isDraggingRef.current || !selectedBodyRef.current) return;

    //   controls.enabled = false;

    //   const touch = event.touches[0];
    //   mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    //   mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    //   raycaster.setFromCamera(mouse, camera);

    //   const newPosition = raycaster.ray.origin.add(
    //     raycaster.ray.direction.multiplyScalar(5)
    //   );

    //   selectedBodyRef.current.position.set(
    //     newPosition.x,
    //     newPosition.y,
    //     newPosition.z
    //   );
    // };

    // const onTouchEnd = () => {
    //   isDraggingRef.current = false;
    //   selectedBodyRef.current = null;
    // };

    // window.addEventListener("touchstart", onTouchStart);
    // window.addEventListener("touchmove", onTouchMove);
    // window.addEventListener("touchend", onTouchEnd);

    // 🔄 Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      world.step(1 / 60);

      objectToBodyMap.current.forEach((body, mesh) => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      // window.removeEventListener("touchstart", onTouchStart);
      // window.removeEventListener("touchmove", onTouchMove);
      // window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div>
      <button
        onClick={() => addBoxRef.current?.()}
        style={{ position: "absolute", top: 10, left: 10 }}
      >
        Add Box
      </button>
      <div ref={containerRef} />
    </div>
  );
}

export default Dashboard;
