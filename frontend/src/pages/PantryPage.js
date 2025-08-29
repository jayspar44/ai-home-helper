import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Camera, Bot, Upload, AlertCircle, Sparkles, X } from 'lucide-react';
import AIItemDetectionModal from '../components/AIItemDetectionModal';

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

const ItemsList = ({ title, items, onDelete }) => {
  const getExpiryColor = (item) => {
    if (!item.createdAt || item.daysUntilExpiry === null || item.daysUntilExpiry === undefined) {
      return { color: 'var(--text-muted)' };
    }
    
    const expiryDate = Date.parse(item.createdAt) + (item.daysUntilExpiry * 24 * 60 * 60 * 1000);
    const remainingDays = Math.round((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) return { color: 'var(--color-error)' };
    if (remainingDays <= 3) return { color: 'var(--color-error)' };
    if (remainingDays <= 7) return { color: 'var(--color-warning)' };
    return { color: 'var(--color-success)' };
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No items yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add items to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="card-interactive p-4 rounded-lg hover-lift" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base mb-1" style={{ color: 'var(--text-primary)' }}>{item.name}</div>
                  {item.quantity && (
                    <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Qty: {item.quantity}</div>
                  )}
                   {item.createdAt && item.daysUntilExpiry !== undefined && item.daysUntilExpiry !== null ? (() => {
                      const expiryDate = Date.parse(item.createdAt) + (item.daysUntilExpiry * 24 * 60 * 60 * 1000);
                      const remainingDays = Math.round((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div className="text-sm font-medium" style={getExpiryColor(item)}>
                          {remainingDays <= 0 ? 'Expired!' : `Expires in ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`}
                        </div>
                      );
                    })() : (
                     <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No expiry date</div>
                  )}
                  {item.detectedBy === 'ai' && (
                    <div className="text-xs mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                      <Sparkles className="w-3 h-3" /> AI Detected
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="ml-4 p-2 rounded-lg hover:bg-opacity-80 transition-colors"
                  style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-error-light)' }}
                  aria-label="Delete item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SuggestionPanel = ({ suggestionResult, onDirectAdd, onCustomize, onTryAgain, onProceed, onOpenPhotoModal, inputQuery }) => {
  if (!suggestionResult) return null;

  const { action, suggestions, guidance, confidence } = suggestionResult;

  if (action === 'accept') {
    const suggestion = suggestions[0];
    return (
      <div className="card p-4 mt-4" style={{ 
        backgroundColor: 'var(--color-success-light)', 
        borderLeft: '4px solid var(--color-success)' 
      }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold mb-1" style={{ color: 'var(--color-success)' }}>{suggestion.name}</h4>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Quantity: {suggestion.quantity} • Shelf Life: {suggestion.shelfLife}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Confidence: {Math.round(confidence * 100)}%</p>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => onDirectAdd(suggestion)} 
              className="btn-base px-4 py-2 text-sm"
              style={{ 
                backgroundColor: 'var(--color-success)', 
                color: 'white',
                borderColor: 'var(--color-success)'
              }}
            >
              Use This
            </button>
            <button 
              onClick={() => onCustomize(suggestion)} 
              className="btn-base btn-ghost px-4 py-2 text-sm"
              style={{ 
                borderColor: 'var(--color-success)',
                color: 'var(--color-success)'
              }}
            >
              Customize
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            💡 Or <button onClick={onOpenPhotoModal} className="underline" style={{ color: 'var(--color-primary)' }}>upload a photo</button> for even more accuracy
          </p>
        </div>
      </div>
    );
  }

  if (action === 'choose') {
    return (
      <div className="card p-4 mt-4" style={{ 
        backgroundColor: 'var(--color-warning-light)', 
        borderLeft: '4px solid var(--color-warning)' 
      }}>
        <div className="mb-3">
          <h4 className="font-semibold" style={{ color: 'var(--color-warning)' }}>"{inputQuery}" could be several things:</h4>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{guidance.message}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {suggestions.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                  e.preventDefault();
                  onDirectAdd(option);
              }}
              className="text-left p-3 card-interactive transition-colors"
              style={{ borderColor: 'var(--border-light)' }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{option.name}</div>
              <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{option.quantity}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>~{option.shelfLife}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
          <button onClick={onTryAgain} className="hover:underline text-sm" style={{ color: 'var(--color-primary)' }}>✏️ Try a more specific name</button>
          <button onClick={onOpenPhotoModal} className="hover:underline text-sm" style={{ color: 'var(--color-success)' }}>📷 Upload photo instead</button>
          <button onClick={onProceed} className="hover:underline text-sm" style={{ color: 'var(--text-muted)' }}>Enter manually anyway</button>
        </div>
      </div>
    );
  }

  if (action === 'specify') {
    return (
      <div className="card p-4 mt-4" style={{ 
        backgroundColor: 'var(--color-error-light)', 
        borderLeft: '4px solid var(--color-error)' 
      }}>
        <div className="text-center">
          <h4 className="font-semibold mb-2" style={{ color: 'var(--color-error)' }}>Need more details about "{inputQuery}"</h4>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{guidance.message}</p>
          <div className="card p-3 mb-4" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
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
              className="btn-base px-6 py-2"
              style={{ 
                backgroundColor: 'var(--color-success)', 
                color: 'white',
                borderColor: 'var(--color-success)'
              }}
            >
              📷 Upload Photo
            </button>
          </div>
          <button 
            onClick={onProceed} 
            className="hover:underline text-sm mt-3 block mx-auto" 
            style={{ color: 'var(--text-muted)' }}
          >
            Skip suggestions and enter manually
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default function PantryPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};
  const itemNameInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('pantry');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemDaysUntilExpiry, setNewItemDaysUntilExpiry] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  
  const [suggestionResult, setSuggestionResult] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }), [userToken]);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      if (!userToken || !activeHomeId) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/pantry/${activeHomeId}`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch pantry items');
        const data = await response.json();
        
        // Convert Firestore timestamps to Date objects
        const processedData = data.map(item => ({
          ...item,
          createdAt: item.createdAt && item.createdAt._seconds 
            ? new Date(item.createdAt._seconds * 1000).toISOString()
            : item.createdAt
        }));
        
        setItems(processedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [activeHomeId, userToken, getAuthHeaders]);

  const resetForm = () => {
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemDaysUntilExpiry('');
    setNewItemLocation('pantry');
    setSuggestionResult(null);
    setShowManualForm(false);
    setError('');
  };

  // Manual Add Item (from form)
  const handleManualAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const itemToAdd = {
        name: newItemName.trim(),
        location: newItemLocation,
        ...(newItemQuantity && { quantity: newItemQuantity }),
        ...(newItemDaysUntilExpiry && { daysUntilExpiry: parseInt(newItemDaysUntilExpiry, 10) }),
      };

      const response = await fetch(`/api/pantry/${activeHomeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemToAdd)
      });

      if (!response.ok) throw new Error('Failed to add item');

      const newItem = await response.json();
      const displayItem = { ...itemToAdd, id: newItem.id };
      setItems(prev => [displayItem, ...prev]);
      resetForm();

    } catch (err) {
      setError(err.message);
    }
  };

  // Direct Add Item (from suggestion)
  const handleDirectAddItem = async (suggestion) => {
    try {
        const itemToAdd = {
            name: suggestion.name,
            location: suggestion.location,
            quantity: suggestion.quantity,
            daysUntilExpiry: suggestion.daysUntilExpiry,
        };
        const response = await fetch(`/api/pantry/${activeHomeId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(itemToAdd)
        });
        if (!response.ok) throw new Error('Failed to add suggested item');
        const newItem = await response.json();
        const displayItem = { ...itemToAdd, id: newItem.id };
        setItems(prev => [displayItem, ...prev]);
        resetForm();
    } catch (err) {
        setError(err.message);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`/api/pantry/${activeHomeId}/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete item');
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch AI Suggestions
  const fetchAISuggestions = async () => {
    if (!newItemName.trim()) return;
    setIsLoadingSuggestions(true);
    setSuggestionResult(null);
    setError('');
    try {
      const response = await fetch('/api/pantry/suggest-item', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName: newItemName.trim(), homeId: activeHomeId })
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
    setNewItemName(suggestion.name);
    setNewItemQuantity(suggestion.quantity || '');
    setNewItemDaysUntilExpiry(suggestion.daysUntilExpiry || '');
    setNewItemLocation(suggestion.location || 'pantry');
    setSuggestionResult(null);
    setShowManualForm(true); 
  };

  const handleTryAgain = () => {
    setSuggestionResult(null);
    setShowManualForm(false);
    itemNameInputRef.current?.focus();
  };

  const handleProceedManually = () => {
    setShowManualForm(true);
    setSuggestionResult(null);
  }

  // Create recipe from pantry items
  const handleCreateRecipe = () => {
    navigate('/recipe-generator', { 
      state: { ingredients: items.map(item => item.name) }
    });
  };

  // Handle AI-detected items from photo modal
  const handleAIItemsDetected = async (detectedItems) => {
    try {
      const promises = detectedItems.map(item => 
        fetch(`/api/pantry/${activeHomeId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({...item, detectedBy: 'ai'})
        })
      );
      const responses = await Promise.all(promises);
      const newItemsData = await Promise.all(
        responses.map(res => {
          if (!res.ok) throw new Error('One or more items failed to add.');
          return res.json();
        })
      );

      const displayItems = detectedItems.map((item, index) => ({
          ...item,
          id: newItemsData[index].id,
      }));
      
      setItems(prev => [...displayItems, ...prev]);
      setShowAIModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!context) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const showFullForm = showManualForm;

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        {/* Page Header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            🥫 Pantry Manager
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Keep track of your ingredients across pantry, fridge, and freezer
          </p>
        </div>

        {/* Add Item Form */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Item</h2>
          <form onSubmit={handleManualAddItem}>
            <div className="mb-4">
              <label htmlFor="itemName" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Item Name
              </label>
              <input
                type="text"
                id="itemName"
                ref={itemNameInputRef}
                value={newItemName}
                onChange={e => {
                  setNewItemName(e.target.value);
                  if(suggestionResult) setSuggestionResult(null);
                  if(showManualForm) setShowManualForm(false);
                }}
                className="input-base focus-ring"
                placeholder="e.g., 'eggs', 'milk', 'chocolate'"
                required
                disabled={showFullForm}
              />
            </div>
            
            {!showFullForm && !suggestionResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button 
                  type="button"
                  onClick={fetchAISuggestions}
                  disabled={!newItemName.trim() || isLoadingSuggestions}
                  className="btn-base btn-primary"
                >
                  {isLoadingSuggestions ? (
                    <div className="animate-pulse">Getting suggestions...</div>
                  ) : (
                    <>
                      <Bot className="w-5 h-5" /> 
                      Get AI Suggestions
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAIModal(true)}
                  className="btn-base btn-secondary"
                  style={{ 
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    borderColor: 'var(--color-accent)'
                  }}
                >
                  <Camera className="w-5 h-5" /> Upload Photo
                </button>
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
              inputQuery={newItemName}
              onDirectAdd={handleDirectAddItem}
              onCustomize={handleCustomizeSuggestion}
              onTryAgain={handleTryAgain}
              onProceed={handleProceedManually}
              onOpenPhotoModal={() => setShowAIModal(true)}
            />

            {showFullForm && (
              <div className="mt-6 space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Quantity</label>
                        <input 
                          type="text" 
                          id="quantity" 
                          value={newItemQuantity} 
                          onChange={e => setNewItemQuantity(e.target.value)} 
                          className="input-base focus-ring" 
                          placeholder="e.g., 1 dozen"
                        />
                    </div>
                    <div>
                        <label htmlFor="daysUntilExpiry" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Expires in (days)</label>
                        <input 
                          type="number" 
                          id="daysUntilExpiry" 
                          value={newItemDaysUntilExpiry} 
                          onChange={e => setNewItemDaysUntilExpiry(e.target.value)} 
                          className="input-base focus-ring" 
                          placeholder="e.g., 7"
                        />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Location</label>
                        <LocationSelect value={newItemLocation} onChange={setNewItemLocation} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
                    <button 
                      type="button" 
                      onClick={resetForm} 
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
            )}
          </form>
        </div>

        {/* Create Recipe Button */}
        <div className="mb-8">
          <button
            onClick={handleCreateRecipe}
            disabled={items.length === 0}
            className="w-full btn-base py-4 text-lg font-semibold transition-all disabled:opacity-50 hover-lift"
            style={{ 
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            ✨ Create a Recipe with What I Have
          </button>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            {items.length === 0 ? 'Add some items to get started' : `${items.length} item${items.length !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* General Error Message */}
        {error && suggestionResult && (
          <div className="mb-8 p-4 rounded-lg" style={{ 
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

        {/* Items Lists */}
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="animate-shimmer h-6 rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="animate-shimmer h-16 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
            <ItemsList
              title="🏠 Pantry"
              items={items.filter(item => item.location === 'pantry')}
              onDelete={handleDeleteItem}
            />
            <ItemsList
              title="❄️ Fridge"
              items={items.filter(item => item.location === 'fridge')}
              onDelete={handleDeleteItem}
            />
            <ItemsList
              title="🧊 Freezer"
              items={items.filter(item => item.location === 'freezer')}
              onDelete={handleDeleteItem}
            />
          </div>
        )}

        {/* AI Item Detection Modal */}
        <AIItemDetectionModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onItemsDetected={handleAIItemsDetected}
          homeId={activeHomeId}
          userToken={userToken}
        />
      </div>
    </div>
  );
}