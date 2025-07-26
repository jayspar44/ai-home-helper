import React, { useState } from 'react';
import { Check, Edit2 } from 'lucide-react';

const HighConfidenceSuggestion = ({ 
  suggestion, 
  confidence, 
  onAccept, 
  onCustomize, 
  onUploadPhoto 
}) => {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customSuggestion, setCustomSuggestion] = useState(suggestion);

  const handleCustomize = () => {
    setIsCustomizing(true);
  };

  const handleSaveCustomization = () => {
    onAccept(customSuggestion);
    setIsCustomizing(false);
  };

  const handleFieldChange = (field, value) => {
    setCustomSuggestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {!isCustomizing ? (
            <>
              <h4 className="font-semibold text-green-800">{suggestion.name}</h4>
              <p className="text-sm text-green-600 mt-1">
                Quantity: {suggestion.quantity} • Shelf Life: {suggestion.shelfLife}
              </p>
              <p className="text-xs text-green-500 mt-1">AI Confidence: {Math.round(confidence * 100)}%</p>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-green-800">Name</label>
                <input
                  type="text"
                  value={customSuggestion.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-green-800">Quantity</label>
                  <input
                    type="text"
                    value={customSuggestion.quantity}
                    onChange={(e) => handleFieldChange('quantity', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-800">Location</label>
                  <select
                    value={customSuggestion.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm"
                  >
                    <option value="pantry">Pantry</option>
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 ml-4">
          {!isCustomizing ? (
            <>
              <button 
                onClick={() => onAccept(suggestion)} 
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Use This
              </button>
              <button 
                onClick={handleCustomize} 
                className="border border-green-600 text-green-600 px-4 py-2 rounded text-sm hover:bg-green-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Customize
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleSaveCustomization} 
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
              >
                Save
              </button>
              <button 
                onClick={() => setIsCustomizing(false)} 
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      
      {!isCustomizing && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-sm text-green-700">
            💡 Or{' '}
            <button 
              onClick={onUploadPhoto} 
              className="underline text-blue-600 hover:text-blue-800"
            >
              upload a photo
            </button>
            {' '}for even more accuracy
          </p>
        </div>
      )}
    </div>
  );
};

export default HighConfidenceSuggestion;
