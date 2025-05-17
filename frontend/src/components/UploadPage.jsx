import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function UploadPage({ setParseResult, setParsedShapes, setFile, setUploadedFileUrl, setUserRole, userRole }) {
  const [uploadStatus, setUploadStatus] = useState('');
  const navigate = useNavigate();

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return setUploadStatus('Select a file to upload.');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/upload', formData);
      if (res.data.status === 'success') {
        const fileUrl = `http://localhost:5000/uploads/${res.data.filename}`;
        setUploadedFileUrl(fileUrl);
        setUploadStatus(`Uploaded: ${res.data.filename}`);
        const parseResult = res.data.parse_result || null;
        setParseResult(parseResult);

        const shapes = (parseResult || []).filter(item =>
          item.type && (item.width || item.r) && (item.height || item.r)
        );
        setParsedShapes(shapes);

        navigate('/preview');
      } else {
        setUploadStatus('Upload failed. Try again.');
      }
    } catch (error) {
      setUploadStatus('Upload error. Backend/CORS issue.');
    }
  };

  return (
    <div>
      <h2>Upload Blueprint</h2>
      <form onSubmit={handleFileUpload}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      <p>{uploadStatus}</p>
    </div>
  );
}

export default UploadPage;