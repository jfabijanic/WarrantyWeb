import { useEffect, useRef, useState } from 'react';
import { listDocuments, uploadDocument, deleteDocument, fetchDocumentBlob } from '../api/devices';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime } from '../format';

const MAX_BYTES = 4 * 1024 * 1024;

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Thumb({ deviceId, doc, onOpen }) {
  const [url, setUrl] = useState(null);
  const isImage = doc.mime_type.startsWith('image/');

  useEffect(() => {
    if (!isImage) return undefined;
    let revoked = false;
    let objectUrl;
    fetchDocumentBlob(deviceId, doc.id)
      .then((blob) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [deviceId, doc.id, isImage]);

  return (
    <button type="button" className="doc-thumb" onClick={onOpen} title={doc.filename}>
      {isImage ? url ? <img src={url} alt={doc.filename} /> : <span>…</span> : <span className="doc-pdf">PDF</span>}
    </button>
  );
}

export default function DeviceDocuments({ deviceId }) {
  const { t, language } = useLanguage();
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputs = { receipt: useRef(null), warranty: useRef(null) };

  useEffect(() => {
    let cancelled = false;
    listDocuments(deviceId)
      .then((d) => !cancelled && setDocs(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  async function handleFile(kind, e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return setError(t.docTooLarge);
    setBusy(true);
    setError('');
    try {
      const doc = await uploadDocument(deviceId, kind, file);
      setDocs((prev) => [doc, ...(prev || [])]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function open(doc) {
    try {
      const blob = await fetchDocumentBlob(deviceId, doc.id);
      setPreview({ doc, url: URL.createObjectURL(blob) });
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(doc) {
    if (!window.confirm(t.docConfirmDelete(doc.filename))) return;
    try {
      await deleteDocument(deviceId, doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const accept = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';

  return (
    <div className="docs">
      <h3 style={{ fontSize: 15, margin: '24px 0 10px' }}>{t.docsHeading}</h3>
      {error && <div className="form-error-box" style={{ marginBottom: 10 }}>{error}</div>}

      {['receipt', 'warranty'].map((kind) => {
        const items = (docs || []).filter((d) => d.kind === kind);
        return (
          <div key={kind} className="doc-group">
            <div className="doc-group-head">
              <strong>{kind === 'receipt' ? t.docReceipt : t.docWarranty}</strong>
              <button type="button" className="btn-secondary doc-add" disabled={busy} onClick={() => inputs[kind].current.click()}>
                + {t.docUpload}
              </button>
              <input ref={inputs[kind]} type="file" accept={accept} hidden onChange={(e) => handleFile(kind, e)} />
            </div>
            {docs === null ? (
              <div className="muted">{t.loading}</div>
            ) : items.length === 0 ? (
              <div className="muted">{t.docNone}</div>
            ) : (
              <div className="doc-list">
                {items.map((d) => (
                  <div key={d.id} className="doc-item">
                    <Thumb deviceId={deviceId} doc={d} onOpen={() => open(d)} />
                    <div className="doc-meta">
                      <div className="doc-name" title={d.filename}>{d.filename}</div>
                      <div className="muted">{formatSize(d.size)} · {formatDateTime(d.created_at, language)}</div>
                    </div>
                    <button type="button" className="btn-icon" title={t.delete} onClick={() => remove(d)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {preview && (
        <div className="modal-overlay preview-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div className="preview-box">
            <div className="preview-head">
              <strong className="doc-name">{preview.doc.filename}</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <a className="btn-secondary" href={preview.url} download={preview.doc.filename}>⬇ {t.docDownload}</a>
                <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>{t.close}</button>
              </div>
            </div>
            {preview.doc.mime_type === 'application/pdf' ? (
              <iframe title={preview.doc.filename} src={preview.url} className="preview-frame" />
            ) : (
              <img src={preview.url} alt={preview.doc.filename} className="preview-img" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
