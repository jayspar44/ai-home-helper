import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import logger from '../utils/logger';

const JSONExportModal = ({ isOpen, onClose, items = [] }) => {
  const [jsonData, setJsonData] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate JSON data when modal opens or items change
  useEffect(() => {
    if (isOpen && items.length > 0) {
      // Process items for export
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalItems: items.length,
        exportSource: 'Roscoe Pantry Manager',
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity || 'Not specified',
          location: item.location || 'Unknown',
          expiresAt: item.expiresAt || null,
          createdAt: item.createdAt || null,
          createdBy: item.createdBy || null,
          confidence: item.confidence || null,
          detectedBy: item.detectedBy || 'manual'
        }))
      };

      // Pretty print JSON with 2-space indentation
      const formattedJson = JSON.stringify(exportData, null, 2);
      setJsonData(formattedJson);
    }
  }, [isOpen, items]);

  // Copy to clipboard function
  const handleCopyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // Modern Clipboard API
        await navigator.clipboard.writeText(jsonData);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = jsonData;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopySuccess(true);

      // Reset success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);

    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
      // Could add error toast here
    }
  };

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setCopySuccess(false);
    setJsonData('');
    onClose();
  }, [onClose]);

  // ESC key handler
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="modal-container modal-container-lg flex flex-col">
        {/* Header */}
        <div className="modal-header">
          <h2
            id="export-modal-title"
            className="modal-title flex items-center gap-2"
          >
            <Download className="icon-small" />
            Export Pantry Data
          </h2>
          <button
            onClick={handleClose}
            className="modal-close"
            aria-label="Close modal"
          >
            <X className="icon-medium" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm" className="text-color-secondary">
              {items.length} items ready for export
            </p>

            {/* Copy Button */}
            <button
              onClick={handleCopyToClipboard}
              disabled={!jsonData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: copySuccess ? 'var(--color-success)' : 'var(--color-primary)',
                color: 'white'
              }}
              aria-label="Copy JSON to clipboard"
            >
              {copySuccess ? (
                <>
                  <Check className="icon-small" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="icon-small" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>

          {/* JSON Display */}
          <div className="flex-1 border rounded-lg overflow-hidden" className="border-color-light">
            <textarea
              value={jsonData}
              readOnly
              className="w-full h-full p-4 font-mono text-sm border-none outline-none resize-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                lineHeight: '1.5'
              }}
              placeholder="JSON will appear here..."
              aria-label="Exported JSON data"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center" className="border-color-light">
          <p className="text-xs" className="text-color-muted">
            This JSON contains all your pantry data including names, quantities, locations, and expiry dates.
            <br />
            You can paste this data into other applications or save it as a backup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JSONExportModal;