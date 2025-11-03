import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// IMPORTANTE: Importamos ARButton de los ejemplos de Three.js
import { ARButton } from 'three/examples/jsm/webxr/ARButton'; 

const ThreeDViewer = ({ file }) => {
  const mountRef = useRef(null);
  
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Variables locales
    let objectURL = null; 
    let loadedModel = null;
    let controls = null;
    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let controller = null;

    // --- 1. Configuración de la Escena, Cámara y Renderizador ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc); 

    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.offsetWidth / currentMount.offsetHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha=true para AR
    renderer.setSize(currentMount.offsetWidth, currentMount.offsetHeight);
    renderer.xr.enabled = true; // ¡Habilitar el módulo XR!
    
    if (currentMount.firstChild) {
      currentMount.removeChild(currentMount.firstChild);
    }
    currentMount.appendChild(renderer.domElement);

    // 4. Luces y Controles (Solo habilitados si NO estamos en AR)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // ----------------------------------------------------
    // LÓGICA AR: Puntos de Detección y Colocación
    // ----------------------------------------------------
    
    // Anillo que indica dónde se colocará el modelo
    const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // CONTROLADOR: Para detectar cuándo el usuario pulsa la pantalla en AR
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    function onSelect() {
        if (reticle.visible && loadedModel) {
            // Clonar el modelo cargado (para no mover el original)
            const modelClone = loadedModel.clone();
            // Colocar el modelo clonado justo donde está el anillo guía
            modelClone.position.setFromMatrixPosition(reticle.matrix);
            modelClone.scale.set(0.2, 0.2, 0.2); // Escala para AR, puede ser ajustada
            scene.add(modelClone);
        }
    }

    // ----------------------------------------------------
    // 6. Lógica de Carga del Modelo 3D (similar a la anterior)
    // ----------------------------------------------------
    if (file) {
      const loader = new GLTFLoader();
      objectURL = URL.createObjectURL(file); 
      
      loader.load(
        objectURL, 
        (gltf) => {
          // ÉXITO DE CARGA
          loadedModel = gltf.scene;
          
          // Escalar el modelo inicialmente para que sea visible en modo 3D
          const box = new THREE.Box3().setFromObject(loadedModel);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          loadedModel.scale.setScalar(2.0 / maxDim); // Escala el modelo para que quepa en un área de 2 unidades
          
          // Añadir el modelo a la escena SÓLO en modo 3D normal
          scene.add(loadedModel);
          
          // Centrado y controles para el modo 3D estándar
          // (Resto de la lógica de centrado y cámara para modo 3D estándar)
        },
        undefined,
        (error) => {
          console.error('❌ ERROR CRÍTICO: Falló la carga del modelo 3D.', error);
        }
      );
    } 
    
    // ----------------------------------------------------
    // 7. Loop de Animación Modificado para AR
    // ----------------------------------------------------
    renderer.setAnimationLoop( function ( timestamp, frame ) {

        if ( frame ) {
            const referenceSpace = renderer.xr.getReferenceSpace();
            const session = renderer.xr.getSession();

            // 1. Petición inicial del 'Hit Test' (detección de superficies)
            if ( hitTestSourceRequested === false ) {
                session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
                    session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {
                        hitTestSource = source;
                    } );
                } );

                session.addEventListener( 'end', function () {
                    hitTestSourceRequested = false;
                    hitTestSource = null;
                } );

                hitTestSourceRequested = true;
            }

            // 2. Si hay un Hit Test activo, busca superficies
            if ( hitTestSource ) {
                const hitTestResults = frame.getHitTestResults( hitTestSource );

                if ( hitTestResults.length ) {
                    const hit = hitTestResults[ 0 ];
                    reticle.visible = true;
                    // Mueve el anillo a la posición detectada en el mundo real
                    reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );
                } else {
                    reticle.visible = false;
                }
            }
        }
        
        controls.update();
        renderer.render( scene, camera );
    } );

    // 8. Manejo del Redimensionamiento
    const onWindowResize = () => {
      camera.aspect = currentMount.offsetWidth / currentMount.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.offsetWidth, currentMount.offsetHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // 9. Limpieza
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      if (objectURL) URL.revokeObjectURL(objectURL);
      scene.traverse((object) => { /* ... (código de limpieza de geometría y materiales) ... */ });
      renderer.dispose();
      
      // Limpiar el controlador y la escena XR
      controller.removeEventListener('select', onSelect);
      scene.remove(controller);
      
      // Detener el loop de animación XR si es necesario
      renderer.setAnimationLoop(null); 
    };
  }, [file]); 

  // ----------------------------------------------------
  // INTEGRACIÓN DEL BOTÓN AR
  // ----------------------------------------------------

  useEffect(() => {
    // Añadir el botón AR Button a la interfaz
    if (mountRef.current && renderer.xr.enabled) {
        // ARButton necesita el renderer y las opciones (solo 'immersive-ar')
        const button = ARButton.createButton(renderer, { requiredFeatures: [ 'hit-test', 'dom-overlay' ], optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } });
        
        // Estilizar el botón AR para que flote sobre el visor
        button.style.position = 'absolute';
        button.style.bottom = '20px';
        button.style.left = '50%';
        button.style.transform = 'translateX(-50%)';
        button.style.zIndex = '100';

        currentMount.appendChild(button);

        return () => {
            // Limpieza del botón al desmontar
            if (button.parentNode === currentMount) {
                currentMount.removeChild(button);
            }
        };
    }
  }, []); // Se ejecuta solo al montar el componente

  return <div ref={mountRef} style={{ width: '100%', height: '500px', position: 'relative' }} />;
};

export default ThreeDViewer;