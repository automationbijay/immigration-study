import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileUp } from 'lucide-react';
import Modal from './ui/Modal';

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * supabase-js collapses every failing Edge Function response into the same
 * "non-2xx status code" message and hangs the real Response off `.context`.
 * The function's own {"error": "..."} body is in there, and it is the only part
 * that says what actually went wrong.
 */
async function describeInvokeError(error) {
  const res = error?.context;
  if (typeof Response === 'undefined' || !(res instanceof Response)) {
    return { status: null, detail: error?.message ?? 'Unknown error' };
  }

  let detail = '';
  try {
    const body = await res.clone().json();
    detail = body?.error || body?.message || '';
  } catch {
    try {
      detail = (await res.clone().text()).slice(0, 200);
    } catch {
      // Body already consumed; the status alone will have to do.
    }
  }

  return { status: res.status, detail: detail || error?.message || 'Unknown error' };
}

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

      if (error) {
        const { status, detail } = await describeInvokeError(error);
        console.error('upload-cv failed', { status, detail, error });

        // A rejected token is the user's problem to fix, not something retrying
        // the upload will ever resolve.
        setMessage(
          status === 401
            ? 'Error: your session has expired. Please sign in again and retry.'
            : `Error uploading CV: ${detail}`,
        );
        return;
      }

      setMessage('CV uploaded successfully!');
      setTimeout(() => {
        setMessage('');
        if (onUploadComplete) onUploadComplete(data.path);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage(`Error uploading CV: ${err?.message ?? 'unexpected error'}`);
    } finally {
      setUploadingCv(false);
      // Without this, picking the same file again after a failure is a no-op
      // because the input's value never changed.
      e.target.value = '';
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
