import React, { useState } from 'react';
import { X, Upload, Camera, AlertCircle, Check, Loader2 } from 'lucide-react';
import { calculateRemainingDays, daysToExpiryDate } from '../utils/dateUtils';

const AIItemDetectionModal = ({ isOpen, onClose, onItemsDetected, homeId, userToken }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedItems, setDetectedItems] = useState([]);
  const [editingItems, setEditingItems] = useState([]);
  const [step, setStep] = useState('upload'); // 'upload' or 'review'

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heif', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or HEIF image');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(file);
    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDetectItems = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`/api/pantry/${homeId}/detect-items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error((await response.json()).error || 'Failed to detect items');
      }

      const data = await response.json();
      setDetectedItems(data.items);
      
      // Separate high confidence items (100% = 1.0) from others
      const highConfidenceItems = data.items.filter(item => item.confidence === 1.0);
      const reviewItems = data.items.filter(item => item.confidence < 1.0);
      
      // Auto-add high confidence items immediately
      if (highConfidenceItems.length > 0) {
        onItemsDetected(highConfidenceItems);
      }
      
      // Only show review if there are items needing review
      if (reviewItems.length > 0) {
        setEditingItems(reviewItems.map(item => ({ ...item, selected: true })));
        setStep('review');
      } else {
        // All items were auto-added, close the modal
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    setEditingItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItems = () => {
    const selectedItems = editingItems.filter(item => item.selected);
    onItemsDetected(selectedItems);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError('');
    setDetectedItems([]);
    setEditingItems([]);
    setStep('upload');
    onClose();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High confidence - likely correct';
    if (confidence >= 0.5) return 'Medium confidence - please verify';
    return 'Low confidence - needs attention';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {step === 'upload' ? 'Add Items with AI' : 'Review Detected Items'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 'upload' ? (
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  preview ? 'border-blue-500' : 'border-gray-300'
                }`}
              >
                {preview ? (
                  <div className="space-y-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-gray-600">{file.name}</p>
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Upload className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">
                      Drag and drop an image here
                    </p>
                    <p className="text-sm text-gray-600">
                      or click to select a file
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/heif,image/heic"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label
                      htmlFor="file-input"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                    >
                      Select Image
                    </label>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Tips */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Tips for best results:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Take clear, well-lit photos</li>
                  <li>• Include multiple items in one photo</li>
                  <li>• Show labels when possible</li>
                  <li>• Avoid blurry or dark images</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Auto-added Items Status */}
              {detectedItems.filter(item => item.confidence === 1.0).length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">
                      ✓ Auto-added {detectedItems.filter(item => item.confidence === 1.0).length} items with high confidence
                    </span>
                  </div>
                </div>
              )}

              {/* Review Header */}
              {editingItems.length > 0 && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    {detectedItems.filter(item => item.confidence === 1.0).length > 0 
                      ? `${editingItems.length} items need review`
                      : 'Review detected items'
                    }
                  </h3>
                </div>
              )}
              
              {/* Detected Items List */}
              {editingItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">All items were automatically added!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk Actions */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => {
                        setEditingItems(prev => prev.map(item => ({ ...item, selected: true })));
                      }}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Accept All Suggestions
                    </button>
                    <button
                      onClick={() => {
                        // Only select high confidence items (>= 0.8)
                        setEditingItems(prev => prev.map(item => ({ 
                          ...item, 
                          selected: item.confidence >= 0.8 
                        })));
                      }}
                      className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Skip Uncertain Items
                    </button>
                    <button
                      onClick={() => {
                        setEditingItems(prev => prev.map(item => ({ ...item, selected: false })));
                      }}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Deselect All
                    </button>
                  </div>
                
                  <div className="space-y-3">
                  {/* Group items by confidence level */}
                  {editingItems
                    .sort((a, b) => b.confidence - a.confidence) // Sort by confidence descending
                    .map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        item.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      } ${
                        item.confidence >= 0.8 ? 'border-l-4 border-l-green-500' :
                        item.confidence >= 0.5 ? 'border-l-4 border-l-yellow-500' :
                        'border-l-4 border-l-red-500'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => handleItemChange(index, 'selected', e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Location</label>
                            <select
                              value={item.location}
                              onChange={(e) => handleItemChange(index, 'location', e.target.value)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            >
                              <option value="pantry">Pantry</option>
                              <option value="fridge">Fridge</option>
                              <option value="freezer">Freezer</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Expires on ({item.expiresAt ? calculateRemainingDays(item.expiresAt) : 'Unknown'} days)
                            </label>
                            <input
                              type="date"
                              value={item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleItemChange(index, 'expiresAt', e.target.value ? new Date(e.target.value) : null)}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                            {Math.round(item.confidence * 100)}% confident
                          </div>
                          <div className={`text-xs ${getConfidenceColor(item.confidence)}`}>
                            {getConfidenceLabel(item.confidence)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          {step === 'upload' ? (
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDetectItems}
                disabled={!file || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Detect Items</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setStep('upload');
                  setDetectedItems([]);
                  setEditingItems([]);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Upload
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItems}
                  disabled={editingItems.filter(item => item.selected).length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Add {editingItems.filter(item => item.selected).length} Items
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIItemDetectionModal;