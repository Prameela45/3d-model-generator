import React from 'react';

const ModelControls = ({ onExport }) => {
  return (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <button onClick={onExport} style={buttonStyle}>
        Generate 3D Model
      </button>
    </div>
  );
};

const buttonStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  borderRadius: '8px',
  backgroundColor: '#007BFF',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
};

export default ModelControls;