import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileUp, X } from 'lucide-react';

export default function CvUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [uploadingCv, setUploadingCv] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setMessage('Error: File size must not exceed 4MB.');
      return;
    }
    
    setUploadingCv(true);
    setMessage('Uploading CV...');
    
    try {
      const formData = new FormData();
      formData.append('cv', file);
      
      const { data, error } = await supabase.functions.invoke('upload-cv', {
        body: formData,
      });
      
      if (error) throw error;
      
      setMessage('CV uploaded successfully!');
      setTimeout(() => {
        setMessage('');
        if (onUploadComplete) onUploadComplete(data.path);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage('Error uploading CV. Please try again.');
    } finally {
      setUploadingCv(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center' }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          borderRadius: 'var(--radius-lg)', 
          margin: 'auto', 
          maxWidth: '500px', 
          padding: '2rem' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={24} className="text-accent" /> Upload Your CV
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {message && (
          <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        <div style={{
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 1rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-background)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        >
          <input 
            type="file" 
            onChange={handleUpload}
            disabled={uploadingCv}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: uploadingCv ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp size={48} className="text-muted" />
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-primary)' }}>
              {uploadingCv ? 'Uploading...' : 'Click or drag a file to upload'}
            </p>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Max size: 4MB
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
