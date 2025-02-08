"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(new THREE.Vector3(0, 0, 0));
  const selectedObjectRef = useRef<THREE.Mesh | null>(null);
  const isDraggingRef = useRef(false);
  const isClippedRef = useRef(false);
  const mouseRef = useRef(new THREE.Vector2());
  const controlsRef = useRef<OrbitControls | null>(null);
  const plane = new THREE.Plane();
  const raycaster = new THREE.Raycaster();
  const dragOffset = new THREE.Vector3();
  let longPressTimer: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    scene.add(cube);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.2, 5),
      new THREE.MeshBasicMaterial({ color: 0x808080 })
    );
    platform.position.set(0, -1, 0);
    scene.add(platform);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controlsRef.current = controls;

    const animate = () => {
      requestAnimationFrame(animate);
      if (selectedObjectRef.current && !isClippedRef.current) {
        selectedObjectRef.current.position.copy(positionRef.current);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onMouseDown = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObject(cube);
      if (intersects.length > 0) {
        longPressTimer = setTimeout(() => {
          selectedObjectRef.current = cube;
          isDraggingRef.current = true;
          controlsRef.current!.enabled = false;

          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(plane.normal),
            intersects[0].point
          );

          dragOffset.copy(intersects[0].point).sub(cube.position);
        }, 300);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !selectedObjectRef.current) return;
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseRef.current, camera);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);
      positionRef.current.copy(intersection.sub(dragOffset));

      // Check for clipping onto the platform
      if (Math.abs(positionRef.current.y - platform.position.y) < 0.2) {
        positionRef.current.y = platform.position.y + 0.1;
      }
    };

    const onMouseUp = () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      isDraggingRef.current = false;
      selectedObjectRef.current = null;
      controlsRef.current!.enabled = true;
    };

    const onDoubleClick = () => {
      if (Math.abs(positionRef.current.y - platform.position.y) < 0.2) {
        isClippedRef.current = !isClippedRef.current;
        if (!isClippedRef.current) {
          positionRef.current.y += 0.2; // Unclip the cube
        }
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("dblclick", onDoubleClick);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("dblclick", onDoubleClick);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} />;
}

export default Dashboard;
