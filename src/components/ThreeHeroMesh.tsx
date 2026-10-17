'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeHeroMeshProps {
  theme?: 'dark' | 'light';
}

export default function ThreeHeroMesh({ theme = 'dark' }: ThreeHeroMeshProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for entire rotating mesh
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);

    // Theme Colors
    const isDark = theme === 'dark';
    const primaryColor = isDark ? 0x6366f1 : 0x4f46e5; // Indigo
    const accentColor = isDark ? 0x38bdf8 : 0x0284c7;  // Cyan
    const particleColor = isDark ? 0x818cf8 : 0x64748b;

    // 1. Central Geometric Micro-VM Core (Icosahedron wireframe)
    const geometry = new THREE.IcosahedronGeometry(1.4, 1);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.45 : 0.6,
    });
    const coreMesh = new THREE.Mesh(geometry, wireframeMaterial);
    meshGroup.add(coreMesh);

    // 2. Inner Solid Geometric Core
    const innerGeometry = new THREE.OctahedronGeometry(0.85, 0);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: isDark ? 0.75 : 0.85,
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    meshGroup.add(innerMesh);

    // 3. Orbiting Data Packet Particles (Representing Firecracker Micro-VM executions)
    const particleCount = 45;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.7 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      speeds.push(0.005 + Math.random() * 0.01);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: particleColor,
      size: isDark ? 0.055 : 0.065,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    meshGroup.add(particleSystem);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.2 : 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(accentColor, isDark ? 2.5 : 2.0, 50);
    pointLight.position.set(3, 3, 3);
    scene.add(pointLight);

    // Interactive Mouse Tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotationY = mouseX * 0.6;
      targetRotationX = -mouseY * 0.6;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', onResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Autonomous smooth spin
      coreMesh.rotation.y += 0.004;
      coreMesh.rotation.x += 0.002;

      innerMesh.rotation.y -= 0.007;
      innerMesh.rotation.z += 0.003;

      particleSystem.rotation.y += 0.003;
      particleSystem.rotation.x -= 0.002;

      // Smooth damped mouse parallax
      meshGroup.rotation.y += (targetRotationY - meshGroup.rotation.y) * 0.05;
      meshGroup.rotation.x += (targetRotationX - meshGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      innerGeometry.dispose();
      particleGeometry.dispose();
      wireframeMaterial.dispose();
      innerMaterial.dispose();
      particleMaterial.dispose();
    };
  }, [theme]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[220px] max-h-[320px] flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
      title="Interactive 3D Firecracker Micro-VM Cluster (Drag / Hover to Interact)"
    />
  );
}
