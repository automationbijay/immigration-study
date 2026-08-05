import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileUp } from 'lucide-react';
import Modal from './ui/Modal';

const MAX_BYTES = 4 * 1024 * 1024;

export default function CvUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [uploadingCv, setUploadingCv] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Your CV" size="sm">
      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      <div className="dropzone">
        <input
          type="file"
          className="dropzone-input"
          onChange={handleUpload}
          disabled={uploadingCv}
          aria-label="Choose a CV file to upload"
        />
        <FileUp size={48} className="text-muted" aria-hidden="true" />
        <p className="dropzone-title">
          {uploadingCv ? 'Uploading...' : 'Click or drag a file to upload'}
        </p>
        <p className="text-muted text-sm">Max size: 4MB</p>
      </div>
    </Modal>
  );
}
