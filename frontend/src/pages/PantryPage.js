import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Camera, Bot, Upload, AlertCircle, Sparkles, X } from 'lucide-react';
import AIItemDetectionModal from '../components/AIItemDetectionModal';

const LocationSelect = ({ value, onChange, disabled }) => (
  <select 
    value={value} 
    onChange={e => onChange(e.target.value)}
    className="rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
    disabled={disabled}
  >
    <option value="pantry">Pantry</option>
    <option value="fridge">Fridge</option>
    <option value="freezer">Freezer</option>
  </select>
);

const ItemsList = ({ title, items, onDelete }) => {
  const getExpiryColor = (daysUntilExpiry) => {
    if (daysUntilExpiry === null || daysUntilExpiry === undefined) return 'text-gray-500';
    if (daysUntilExpiry <= 3) return 'text-red-600';
    if (daysUntilExpiry <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No items yet</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="bg-gray-50 p-3 rounded">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  {item.quantity && (
                    <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                  )}
                   {item.daysUntilExpiry !== undefined && item.daysUntilExpiry !== null ? (
                    <div className={`text-sm ${getExpiryColor(item.daysUntilExpiry)}`}>
                      Expires in {item.daysUntilExpiry} days
                    </div>
                  ) : (
                     <div className="text-sm text-gray-400">No expiry date</div>
                  )}
                  {item.detectedBy === 'ai' && (
                    <div className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Detected
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-red-500 hover:text-red-700 text-xl"
                  aria-label="Delete item"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-green-800">{suggestion.name}</h4>
            <p className="text-sm text-green-600 mt-1">
              Quantity: {suggestion.quantity} • Shelf Life: {suggestion.shelfLife}
            </p>
            <p className="text-xs text-green-500 mt-1">AI Confidence: {Math.round(confidence * 100)}%</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => onDirectAdd(suggestion)} className="bg-green-600 text-white px-4 py-2 rounded text-sm">
              Use This
            </button>
            <button onClick={() => onCustomize(suggestion)} className="border border-green-600 text-green-600 px-4 py-2 rounded text-sm">
              Customize
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-sm text-green-700">
            💡 Or <button onClick={onOpenPhotoModal} className="underline text-blue-600">upload a photo</button> for even more accuracy
          </p>
        </div>
      </div>
    );
  }

  if (action === 'choose') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <div className="mb-3">
          <h4 className="font-semibold text-yellow-800">"{inputQuery}" could be several things:</h4>
          <p className="text-sm text-yellow-700 mt-1">{guidance.message}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {suggestions.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onDirectAdd(option)}
              className="text-left p-3 border border-yellow-300 rounded hover:bg-yellow-100 transition-colors"
            >
              <div className="font-medium text-yellow-900">{option.name}</div>
              <div className="text-sm text-yellow-700">{option.quantity}</div>
              <div className="text-xs text-yellow-600">~{option.shelfLife}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-3 border-t border-yellow-200">
          <button onClick={onTryAgain} className="text-blue-600 hover:underline text-sm">✏️ Try a more specific name</button>
          <button onClick={onOpenPhotoModal} className="text-green-600 hover:underline text-sm">📷 Upload photo instead</button>
          <button onClick={onProceed} className="text-gray-600 hover:underline text-sm">Enter manually anyway</button>
        </div>
      </div>
    );
  }

  if (action === 'specify') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <div className="text-center">
          <h4 className="font-semibold text-red-800 mb-2">Need more details about "{inputQuery}"</h4>
          <p className="text-red-700 mb-4">{guidance.message}</p>
          <div className="bg-white rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-700 space-y-1">
              {guidance.examples.map((ex, i) => <div key={i}>{ex}</div>)}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onTryAgain} className="bg-blue-600 text-white px-6 py-2 rounded-lg">✏️ Be More Specific</button>
            <button onClick={onOpenPhotoModal} className="bg-green-600 text-white px-6 py-2 rounded-lg">📷 Upload Photo</button>
          </div>
          <button onClick={onProceed} className="text-gray-600 hover:underline text-sm mt-3 block mx-auto">Skip suggestions and enter manually</button>
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
        setItems(data);
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Add Item Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleManualAddItem}>
            <div className="flex-1">
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                placeholder="e.g., 'eggs', 'milk', 'chocolate'"
                required
                disabled={showFullForm}
              />
            </div>
            
            {!showFullForm && !suggestionResult && (
              <div className="flex gap-2 mt-4">
                <button 
                  type="button"
                  onClick={fetchAISuggestions}
                  disabled={!newItemName.trim() || isLoadingSuggestions}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex-1 flex items-center justify-center gap-2"
                >
                  {isLoadingSuggestions ? 'Getting suggestions...' : <> <Bot className="w-5 h-5" /> Get AI Suggestions </>}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAIModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex-1 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" /> Upload Photo
                </button>
              </div>
            )}
            
            {error && !suggestionResult && (
              <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                {error}
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
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input type="text" id="quantity" value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)} className="w-full rounded-lg border-gray-300" placeholder="e.g., 1 dozen"/>
                    </div>
                    <div>
                        <label htmlFor="daysUntilExpiry" className="block text-sm font-medium text-gray-700 mb-1">Expires in (days)</label>
                        <input type="number" id="daysUntilExpiry" value={newItemDaysUntilExpiry} onChange={e => setNewItemDaysUntilExpiry(e.target.value)} className="w-full rounded-lg border-gray-300" placeholder="e.g., 7"/>
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <LocationSelect value={newItemLocation} onChange={setNewItemLocation} />
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={resetForm} className="text-gray-600 hover:underline">Cancel</button>
                    <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">Add Item</button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Create Recipe Button */}
        <button
          onClick={handleCreateRecipe}
          disabled={items.length === 0}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-60"
        >
          Create a Recipe with What I Have
        </button>

        {/* General Error Message */}
        {error && suggestionResult && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            {error}
          </div>
        )}

        {/* Items Lists */}
        {isLoading ? (<p>Loading items...</p>) : (
          <div className="grid md:grid-cols-3 gap-6">
            <ItemsList
              title="Pantry"
              items={items.filter(item => item.location === 'pantry')}
              onDelete={handleDeleteItem}
            />
            <ItemsList
              title="Fridge"
              items={items.filter(item => item.location === 'fridge')}
              onDelete={handleDeleteItem}
            />
            <ItemsList
              title="Freezer"
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