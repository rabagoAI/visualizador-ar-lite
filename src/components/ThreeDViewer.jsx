import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const ThreeDViewer = ({ file }) => { // Recibe el objeto 'file'
  const mountRef = useRef(null);
  
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Variables locales para la limpieza
    let objectURL = null; 
    let loadedModel = null;
    let controls = null;

    // --- 1. Configuración Básica de la Escena ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc); // Fondo gris

    // 2. Cámara (Perspectiva para 3D)
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.offsetWidth / currentMount.offsetHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3); 

    // 3. Renderizador (El motor que dibuja la escena)
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.offsetWidth, currentMount.offsetHeight);
    
    // Evitar añadir el lienzo múltiples veces
    if (currentMount.firstChild) {
      currentMount.removeChild(currentMount.firstChild);
    }
    currentMount.appendChild(renderer.domElement);

    // 4. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    // 5. Controles de Órbita (Permite mover la vista con el ratón)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 6. Lógica de Carga del Modelo 3D
    if (file) {
      const loader = new GLTFLoader();
      objectURL = URL.createObjectURL(file); // Crea una URL temporal para el archivo
      
      loader.load(
        objectURL, 
        (gltf) => {
          // --- ÉXITO DE CARGA ---
          console.log('✅ Modelo 3D cargado con éxito:', file.name); 

          loadedModel = gltf.scene;
          scene.add(loadedModel);

          // Centrar y escalar el modelo en la vista
          const box = new THREE.Box3().setFromObject(loadedModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Mover el modelo al origen (0, 0, 0)
          loadedModel.position.sub(center);

          // Ajustar la cámara para ver el modelo completo
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          cameraZ *= 2.0; // Espacio extra para verlo bien
          
          camera.position.set(0, size.y / 2, cameraZ);
          controls.target.set(0, size.y / 2, 0); // Enfocar al centro del modelo
          controls.update();
        },
        // Callbacks de Progreso (opcional, útil para debugging)
        (xhr) => {
          // console.log( ( xhr.loaded / xhr.total * 100 ) + '% cargado' );
        },
        // --- ERROR CRÍTICO ---
        (error) => {
          console.error('❌ ERROR CRÍTICO: Falló la carga del modelo 3D. Asegúrate de que el archivo es un GLB/GLTF válido.', error);
        }
      );
    } 
    
    // 7. Loop de Animación (Siempre debe estar aquí para que la escena se dibuje)
    const animate = () => {
      requestAnimationFrame(animate);
      if (controls) controls.update(); // Actualizar solo si los controles están inicializados
      renderer.render(scene, camera);
    };
    animate();

    // 8. Manejo del Redimensionamiento
    const onWindowResize = () => {
      camera.aspect = currentMount.offsetWidth / currentMount.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.offsetWidth, currentMount.offsetHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // 9. Limpieza al desmontar el componente (IMPORTANTE)
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      // Liberar la URL temporal del objeto para evitar fugas de memoria
      if (objectURL) {
        URL.revokeObjectURL(objectURL);
      }
      // Limpiar la escena para liberar recursos de la GPU
      scene.traverse((object) => {
          if (!object.isMesh) return;
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
              // Liberar texturas y materiales
              if (Array.isArray(object.material)) {
                  object.material.forEach(material => material.dispose());
              } else {
                  object.material.dispose();
              }
          }
      });
      renderer.dispose();
    };
  }, [file]); // El efecto se ejecuta cuando el archivo (prop) cambia

  return <div ref={mountRef} style={{ width: '100%', height: '500px' }} />;
};

export default ThreeDViewer;