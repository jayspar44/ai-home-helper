import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Camera, AlertCircle } from 'lucide-react';
import AIItemDetectionModal from './AIItemDetectionModal';
import { daysToExpiryDate, safeToDateInputValue } from '../utils/dateUtils';

const LocationSelect = ({ value, onChange, disabled }) => (
  <select 
    value={value} 
    onChange={e => onChange(e.target.value)}
    className="input-base focus-ring"
    disabled={disabled}
  >
    <option value="pantry">🏠 Pantry</option>
    <option value="fridge">❄️ Fridge</option>
    <option value="freezer">🧊 Freezer</option>
  </select>
);

const SuggestionPanel = ({ suggestionResult, onDirectAdd, onCustomize, onTryAgain, onProceed, onOpenPhotoModal, inputQuery }) => {
  if (!suggestionResult) return null;

  const { action, suggestions, guidance, confidence } = suggestionResult;

  if (action === 'accept') {
    const suggestion = suggestions[0];
    return (
      <div className="card suggestion-panel suggestion-panel-success p-4 mt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold mb-1 icon-color-success">{suggestion.name}</h4>
            <p className="text-sm mb-1 text-color-secondary">
              Quantity: {suggestion.quantity} • Shelf Life: {suggestion.shelfLife}
            </p>
            <p className="text-xs text-color-muted">AI Confidence: {Math.round(confidence * 100)}%</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onDirectAdd(suggestion)}
              className="btn-base btn-success px-4 py-2 text-sm"
            >
              Use This
            </button>
            <button
              onClick={() => onCustomize(suggestion)}
              className="btn-base btn-ghost px-4 py-2 text-sm icon-color-success border-color-success"
            >
              Customize
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (action === 'choose') {
    return (
      <div className="card suggestion-panel suggestion-panel-warning p-4 mt-4">
        <div className="mb-3">
          <h4 className="font-semibold icon-color-warning">"{inputQuery}" could be several things:</h4>
          <p className="text-sm mt-1 text-color-secondary">{guidance.message}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {suggestions.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onDirectAdd(option)}
              className="text-left p-3 card-interactive transition-colors border border-color-light"
            >
              <div className="font-medium mb-1 text-color-primary">{option.name}</div>
              <div className="text-sm mb-1 text-color-secondary">{option.quantity}</div>
              <div className="text-xs text-color-muted">~{option.shelfLife}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-3 border-t border-color-light">
          <button onClick={onTryAgain} className="hover:underline text-sm icon-color-primary">✏️ Try a more specific name</button>
          <button onClick={onOpenPhotoModal} className="hover:underline text-sm icon-color-success">📷 Upload photo instead</button>
          <button onClick={onProceed} className="hover:underline text-sm text-color-muted">Enter manually anyway</button>
        </div>
      </div>
    );
  }

  if (action === 'specify') {
    return (
      <div className="card suggestion-panel suggestion-panel-error p-4 mt-4">
        <div className="text-center">
          <h4 className="font-semibold mb-2 text-color-error">Need more details about "{inputQuery}"</h4>
          <p className="mb-4 text-color-secondary">{guidance.message}</p>
          <div className="card bg-card p-3 mb-4">
            <div className="text-sm space-y-1 text-color-secondary">
              {guidance.examples.map((ex, i) => <div key={i}>{ex}</div>)}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onTryAgain}
              className="btn-base btn-primary px-6 py-2"
            >
              ✏️ Be More Specific
            </button>
            <button
              onClick={onOpenPhotoModal}
              className="btn-base btn-success px-6 py-2"
            >
              📷 Upload Photo
            </button>
          </div>
          <button
            onClick={onProceed}
            className="hover:underline text-sm mt-3 block mx-auto text-color-muted"
          >
            Skip suggestions and enter manually
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const AddItemModal = ({ 
  isOpen, 
  initialMode = 'manual', 
  initialName = '',
  initialData = null,
  onClose, 
  onDirectAdd, 
  onAIItemsDetected,
  activeHomeId,
  userToken,
  getAuthHeaders
}) => {
  const [activeTab, setActiveTab] = useState(initialMode);
  const [showAIModal, setShowAIModal] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.name || initialName,
    quantity: initialData?.quantity || '',
    expiresAt: initialData?.expiresAt ? safeToDateInputValue(initialData.expiresAt) : '',
    location: initialData?.location || 'pantry'
  });

  // AI suggestions state
  const [suggestionResult, setSuggestionResult] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showManualForm, setShowManualForm] = useState(!!initialData); // Show form immediately if we have initial data

  const itemNameInputRef = useRef(null);

  // Update form when initialName/initialData changes and auto-fetch AI suggestions
  useEffect(() => {
    setFormData({
      name: initialData?.name || initialName,
      quantity: initialData?.quantity || '',
      expiresAt: initialData?.expiresAt ? safeToDateInputValue(initialData.expiresAt) : '',
      location: initialData?.location || 'pantry'
    });
    setActiveTab(initialMode);
    setShowManualForm(!!initialData); // Show form if we have initial data
    
    // Auto-fetch AI suggestions if we have a name and we're in AI mode
    if ((initialData?.name || initialName).trim() && initialMode === 'ai') {
      fetchAISuggestions();
    }
  }, [initialName, initialMode, initialData]);

  // Auto-fetch when formData.name changes in AI tab
  useEffect(() => {
    if (activeTab === 'ai' && formData.name.trim() && !isLoadingSuggestions && !suggestionResult) {
      const timeoutId = setTimeout(() => {
        fetchAISuggestions();
      }, 500); // Small delay to avoid too many API calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.name, activeTab, isLoadingSuggestions, suggestionResult]);

  const resetForm = () => {
    setFormData({
      name: '',
      quantity: '',
      expiresAt: '',
      location: 'pantry'
    });
    setSuggestionResult(null);
    setShowManualForm(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const itemToAdd = {
        name: formData.name.trim(),
        location: formData.location,
        ...(formData.quantity && { quantity: formData.quantity }),
        ...(formData.expiresAt && { expiresAt: new Date(formData.expiresAt) }),
      };

      await onDirectAdd(itemToAdd);
      handleClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAISuggestions = async () => {
    if (!formData.name.trim()) return;
    setIsLoadingSuggestions(true);
    setSuggestionResult(null);
    setError('');
    
    try {
      const response = await fetch('/api/pantry/suggest-item', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName: formData.name.trim(), homeId: activeHomeId })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to get suggestions');
      const data = await response.json();
      setSuggestionResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleCustomizeSuggestion = (suggestion) => {
    setFormData({
      name: suggestion.name,
      quantity: suggestion.quantity || '',
      expiresAt: suggestion.expiresAt ? safeToDateInputValue(suggestion.expiresAt) : (suggestion.daysUntilExpiry ? safeToDateInputValue(daysToExpiryDate(suggestion.daysUntilExpiry)) : ''),
      location: suggestion.location || 'pantry'
    });
    setSuggestionResult(null);
    setShowManualForm(true);
    setActiveTab('manual');
  };

  const handleTryAgain = () => {
    setSuggestionResult(null);
    setShowManualForm(false);
    itemNameInputRef.current?.focus();
  };

  const handleProceedManually = () => {
    setShowManualForm(true);
    setSuggestionResult(null);
    setActiveTab('manual');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-color-light">
            <h2 className="text-xl font-semibold text-color-primary">
              Add New Item
            </h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors text-color-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Show tabs only for photo mode */}
          {activeTab === 'photo' && (
            <div className="flex border-b border-color-light">
              <button
                onClick={() => setActiveTab('ai')}
                className="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:bg-gray-50 text-color-muted"
              >
                <Bot className="w-4 h-4" />
                Back to AI Suggestions
              </button>
              <button
                className="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-b-2 icon-color-primary"
                style={{
                  borderBottomColor: 'var(--color-primary)'
                }}
              >
                <Camera className="w-4 h-4" />
                Photo Upload
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="aiItemName" className="block text-sm font-medium mb-2 text-color-secondary">
                    What item would you like to add?
                  </label>
                  <input
                    type="text"
                    id="aiItemName"
                    value={formData.name}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      if (suggestionResult) setSuggestionResult(null);
                      if (showManualForm) setShowManualForm(false);
                    }}
                    className="input-base focus-ring w-full"
                    placeholder="e.g., 'eggs', 'milk', 'chocolate'"
                    disabled={showManualForm}
                  />
                </div>

                {isLoadingSuggestions && (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-lg mb-2 icon-color-primary">
                      Getting AI suggestions...
                    </div>
                    <div className="text-sm text-color-muted">
                      Analyzing "{formData.name}"
                    </div>
                  </div>
                )}

                {error && !suggestionResult && (
                  <div className="mt-4 p-4 rounded-lg" style={{
                    backgroundColor: 'var(--color-error-light)',
                    borderLeft: '4px solid var(--color-error)',
                    color: 'var(--color-error)'
                  }}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <SuggestionPanel
                  suggestionResult={suggestionResult}
                  inputQuery={formData.name}
                  onDirectAdd={onDirectAdd}
                  onCustomize={handleCustomizeSuggestion}
                  onTryAgain={handleTryAgain}
                  onProceed={handleProceedManually}
                  onOpenPhotoModal={() => setActiveTab('photo')}
                />

                {showManualForm && (
                  <form onSubmit={handleManualSubmit} className="mt-6 space-y-4 animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="quantity" className="block text-sm font-medium mb-2 text-color-secondary">Quantity</label>
                        <input
                          type="text"
                          value={formData.quantity}
                          onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                          className="input-base focus-ring w-full"
                          placeholder="e.g., 1 dozen"
                        />
                      </div>
                      <div>
                        <label htmlFor="expiresAt" className="block text-sm font-medium mb-2 text-color-secondary">Expires on</label>
                        <input
                          type="date"
                          id="expiresAt"
                          value={formData.expiresAt}
                          onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                          className="input-base focus-ring w-full"
                          placeholder="e.g., 7"
                        />
                      </div>
                      <div>
                        <label htmlFor="location" className="block text-sm font-medium mb-2 text-color-secondary">Location</label>
                        <LocationSelect 
                          value={formData.location} 
                          onChange={value => setFormData(prev => ({ ...prev, location: value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-color-light">
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualForm(false);
                          setSuggestionResult(null);
                        }}
                        className="btn-base btn-ghost"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="btn-base btn-primary"
                      >
                        Add Item
                      </button>
                    </div>
                  </form>
                )}

                {/* Manual Add Option */}
                {!showManualForm && !isLoadingSuggestions && (
                  <div className="text-center pt-4 border-t border-color-light">
                    <button
                      type="button"
                      onClick={() => setShowManualForm(true)}
                      className="text-sm underline hover:no-underline text-color-muted"
                    >
                      Enter details manually instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="itemName" className="block text-sm font-medium mb-2 text-color-secondary">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      id="itemName"
                      ref={itemNameInputRef}
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-base focus-ring w-full"
                      placeholder="e.g., 'eggs', 'milk', 'chocolate'"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium mb-2 text-color-secondary">
                        Quantity
                      </label>
                      <input
                        type="text"
                        id="quantity"
                        value={formData.quantity}
                        onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        className="input-base focus-ring w-full"
                        placeholder="e.g., 1 dozen"
                      />
                    </div>

                    <div>
                      <label htmlFor="expiresAt" className="block text-sm font-medium mb-2 text-color-secondary">
                        Expires on
                      </label>
                      <input
                        type="date"
                        id="expiresAt"
                        value={formData.expiresAt}
                        onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                        className="input-base focus-ring w-full" 
                        placeholder="e.g., 7"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium mb-2 text-color-secondary">
                        Location
                      </label>
                      <LocationSelect
                        value={formData.location}
                        onChange={value => setFormData(prev => ({ ...prev, location: value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="btn-base btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-base btn-primary"
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </form>
            )}


            {activeTab === 'photo' && (
              <div className="text-center py-8">
                <Camera className="w-16 h-16 mx-auto mb-4 icon-color-muted" />
                <h3 className="text-lg font-semibold mb-2 text-color-primary">
                  Upload Photo for AI Detection
                </h3>
                <p className="mb-6 text-color-secondary">
                  Take or upload a photo of your items and let AI detect and add them automatically.
                </p>
                <button
                  onClick={() => setShowAIModal(true)}
                  className="btn-base btn-primary px-8 py-3"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Open Camera
                </button>
              </div>
            )}

            {error && suggestionResult && (
              <div className="mt-4 p-4 rounded-lg" style={{
                backgroundColor: 'var(--color-error-light)',
                borderLeft: '4px solid var(--color-error)',
                color: 'var(--color-error)'
              }}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Item Detection Modal */}
      <AIItemDetectionModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onItemsDetected={(items) => {
          onAIItemsDetected(items);
          setShowAIModal(false);
          handleClose();
        }}
        homeId={activeHomeId}
        userToken={userToken}
      />
    </>
  );
};

export default AddItemModal;
