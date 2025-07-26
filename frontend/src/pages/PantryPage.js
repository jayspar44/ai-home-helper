import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import AIItemDetectionModal from '../components/AIItemDetectionModal';

const LocationSelect = ({ value, onChange }) => (
  <select 
    value={value} 
    onChange={e => onChange(e.target.value)}
    className="rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
  >
    <option value="pantry">Pantry</option>
    <option value="fridge">Fridge</option>
    <option value="freezer">Freezer</option>
  </select>
);

const ItemsList = ({ title, items, onDelete }) => {
  const getExpiryColor = (daysUntilExpiry) => {
    if (!daysUntilExpiry) return '';
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
                  {item.daysUntilExpiry !== undefined && (
                    <div className={`text-sm ${getExpiryColor(item.daysUntilExpiry)}`}>
                      Expires in {item.daysUntilExpiry} days
                    </div>
                  )}
                  {item.detectedBy === 'ai' && (
                    <div className="text-xs text-blue-600 mt-1">
                      🤖 AI Detected
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

export default function PantryPage() {
  const navigate = useNavigate();
  const context = useOutletContext();
  const { userToken, activeHomeId } = context || {};

  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('pantry');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

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
        
        // Add debugging
        console.log('Pantry fetch response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch pantry items');
          } else {
            // If not JSON, get the text response for debugging
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Received invalid response format');
          }
        }
        
        const data = await response.json();
        setItems(data);
      } catch (err) {
        console.error('Fetch error details:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [activeHomeId, userToken, getAuthHeaders]);

  // Add new item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const response = await fetch(`/api/pantry/${activeHomeId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newItemName.trim(),
          location: newItemLocation
        })
      });

      if (!response.ok) throw new Error('Failed to add item');

      const newItem = await response.json();
      setItems(prev => [...prev, newItem]);
      setNewItemName('');
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

  // Create recipe from pantry items
  const handleCreateRecipe = () => {
    navigate('/recipe-generator', { 
      state: { ingredients: items.map(item => item.name) }
    });
  };

  // Handle AI-detected items
  const handleAIItemsDetected = async (detectedItems) => {
    try {
      // Add each item to the pantry
      const promises = detectedItems.map(item => 
        fetch(`/api/pantry/${activeHomeId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(item)
        })
      );

      const responses = await Promise.all(promises);
      const newItems = await Promise.all(
        responses.map(response => {
          if (!response.ok) throw new Error('Failed to add item');
          return response.json();
        })
      );

      // Add all new items to state
      setItems(prev => [...prev, ...newItems]);
      setShowAIModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!context) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Add Item Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleAddItem} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                id="itemName"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Enter item name"
                required
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <LocationSelect value={newItemLocation} onChange={setNewItemLocation} />
            </div>
            <button
              type="submit"
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Add Item
            </button>
          </form>
          
          {/* AI Add Button */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              <Camera className="w-5 h-5" />
              <span>Add Items with AI</span>
            </button>
          </div>
        </div>

        {/* Create Recipe Button */}
        <button
          onClick={handleCreateRecipe}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-orange-700 hover:to-red-700"
        >
          Create a Recipe with What I Have
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            {error}
          </div>
        )}

        {/* Items Lists */}
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