// src/components/Uploader.jsx
import React, { useState } from 'react';
import ThreeDViewer from './ThreeDViewer';

const Uploader = () => {
  // 1. Estado para almacenar el archivo seleccionado
  const [modelFile, setModelFile] = useState(null);
  // 2. Estado para el mensaje de carga/error
  const [message, setMessage] = useState('Sube un archivo .glb o .gltf');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 3. Validación de Tipo
      if (!file.name.match(/\.(gltf|glb)$/i)) {
        setMessage('Error: Solo se aceptan archivos .glb o .gltf.');
        setModelFile(null);
        return;
      }
      
      setMessage(`Cargando modelo: ${file.name}`);
      setModelFile(file); // Almacenar el objeto File
    }
  };

  return (
    <>
      <div style={{ padding: '15px', textAlign: 'center', backgroundColor: '#e9e9e9', borderRadius: '8px', marginBottom: '20px' }}>
        <input 
          type="file" 
          accept=".glb, .gltf" 
          onChange={handleFileChange} 
          style={{ display: 'block', margin: '0 auto 10px auto' }}
        />
        <p style={{ margin: 0, color: modelFile ? 'green' : 'red' }}>{message}</p>
      </div>

      <div style={{ width: '100%', height: '500px', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Pasar el objeto File al Visualizador 3D */}
        {modelFile ? (
          // CORRECCIÓN: ELIMINAMOS 'client:only="react"'
          // Si el padre (Uploader) ya tiene una directiva, los hijos no la necesitan.
          <ThreeDViewer file={modelFile} /> 
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <h2>Esperando la subida de tu modelo 3D...</h2>
          </div>
        )}
      </div>
    </>
  );
};

export default Uploader;