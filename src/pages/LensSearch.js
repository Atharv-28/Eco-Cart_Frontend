import { useState, useCallback } from 'react';
import { FiUpload, FiCamera, FiSearch, FiChevronDown } from 'react-icons/fi';
import CenterFocusWeakIcon from '@mui/icons-material/CenterFocusWeak';
import './LensSearch.css';
import ProductCard from '../components/ProductCard';

export default function LensSearchPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Stores the Cloudinary URL
  const [filePreview, setFilePreview] = useState(null); // Stores the local file preview
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);

  // Upload file to Cloudinary
  const handleFileSelect = async (e) => {
    const media = e.target.files[0];
    if (media && media.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(media)); // Set the local file preview
      setLoading(true);

      const formData = new FormData();
      formData.append('file', media);
      formData.append('upload_preset', 'ck4cetvf'); // Replace with your Cloudinary upload preset

      try {
        const res = await fetch(
          'https://api.cloudinary.com/v1_1/dhnplptdz/image/upload', // Replace with your Cloudinary cloud name
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!res.ok) {
          throw new Error('Failed to upload image to Cloudinary');
        }

        const data = await res.json();
        setSelectedFile(data.secure_url); // Store the Cloudinary URL
        setLoading(false);
        console.log('Image uploaded successfully:', data.secure_url);
        
      } catch (error) {
        console.error('Error uploading media:', error);
        setError('Failed to upload image. Please try again.');
        setLoading(false);
      }
    }
  };

  const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            throw new Error(`Attempt ${i+1} failed`);
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};
  // Simulated API call to fetch alternatives
  const fetchImageDetails = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetchWithRetry('http://127.0.0.1:3000/gemini-ecoLens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selectedFile }),
    });

        if (!response.ok) throw new Error('Analysis failed');
        
        const analysis = await response.json();
        
        // Use the analysis results to find alternatives
        const alternatives = await fetchAlternatives(analysis);
        setAlternatives(alternatives);
        
    } catch (err) {
        console.error('Error:', err);
        setError(err.message || 'Analysis failed');
    } finally {
        setLoading(false);
    }
};

const fetchAlternatives = async (analysis) => {
  try {
      const response = await fetch('/api/get-eco-alternatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysis),
      });
      return await response.json();
  } catch (error) {
      console.error('Alternatives fetch error:', error);
      return [];
  }
};

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file)); // Set the local file preview
      handleFileSelect({ target: { files: [file] } }); // Trigger file upload
    }
  }, []);

  return (
    <div className="lens-container">
      <header className="lens-header">
        <div className="logo-container">
          <CenterFocusWeakIcon className="logo-icon" />
          <h1>EcoLens</h1>
        </div>
        <h2>Scan Products for Sustainability Insights</h2>
      </header>

      <main className="main-content">
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="image-preview"
              />
            ) : (
              <>
                <FiUpload className="upload-icon" />
                <h3>Drag & Drop Image Here</h3>
                <p>or</p>
                <label className="file-input-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden-input"
                  />
                  <FiCamera className="camera-icon" />
                  Browse Files
                </label>
              </>
            )}
          </div>
        </div>

        {selectedFile && (
          <div className="action-container">
            <button
              className="find-button"
              onClick={fetchImageDetails}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <FiSearch /> Analyze Sustainability
                </>
              )}
            </button>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        {alternatives.length > 0 && (
          <div className="alternatives-section">
            <h3>
              <span className="eco-badge">♻️</span> Eco-Friendly Alternatives
            </h3>

            <div className="alternatives-grid">
              {alternatives
                .slice(0, showMore ? alternatives.length : 3)
                .map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    ecoScore={product.ecoScore}
                  />
                ))}
            </div>

            {alternatives.length > 3 && !showMore && (
              <button
                className="show-more-btn"
                onClick={() => setShowMore(true)}
              >
                Show More Alternatives <FiChevronDown />
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
