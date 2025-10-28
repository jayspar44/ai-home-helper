import React, { useState, useRef, useCallback } from 'react';
import { Camera, Plus, Sparkles, X } from 'lucide-react';
import AIItemDetectionModal from './AIItemDetectionModal';
import AddItemModal from './AddItemModal';
import logger from '../utils/logger';

const AddItemSection = ({ 
  onDirectAdd, 
  onAIItemsDetected, 
  onItemEnhancementRequested,
  onStartEnhancementProcessing,
  onUpdateItemDefaults,
  activeHomeId, 
  userToken, 
  getAuthHeaders 
}) => {
  const [quickAddName, setQuickAddName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const itemNameInputRef = useRef(null);

  // Get smart defaults from AI
  const getQuickDefaults = async (itemName) => {
    try {
      const response = await fetch('/api/pantry/quick-defaults', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName, homeId: activeHomeId })
      });
      
      if (!response.ok) throw new Error('Failed to get defaults');
      
      return await response.json();
    } catch (error) {
      // Return sensible fallbacks
      return {
        location: itemName.toLowerCase().includes('milk') || 
                  itemName.toLowerCase().includes('yogurt') || 
                  itemName.toLowerCase().includes('cheese') ? 'fridge' : 'pantry',
        daysUntilExpiry: 7
      };
    }
  };

  // Get full enhancement suggestion
  const getFullEnhancement = async (itemName) => {
    try {
      const response = await fetch('/api/pantry/suggest-item', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemName, homeId: activeHomeId })
      });
      
      if (!response.ok) throw new Error('Failed to get enhancement');
      
      const data = await response.json();
      if (data.action === 'accept' && data.suggestions?.[0]) {
        return data.suggestions[0];
      } else if (data.action === 'choose' && data.suggestions?.[0]) {
        return data.suggestions[0]; // Use first suggestion for medium confidence
      } else if (data.action === 'specify' && data.guidance) {
        return {
          isLowConfidence: true,
          name: itemName, // Keep original name
          guidance: data.guidance,
          location: 'pantry', // Default
          daysUntilExpiry: 7 // Default
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddName.trim()) return;

    setIsLoading(true);
    const itemNameToProcess = quickAddName.trim();
    
    try {
      // Add item with name only - minimal defaults
      const basicItem = {
        name: itemNameToProcess,
        location: 'pantry', // Will be updated with smart defaults
        daysUntilExpiry: 7   // Will be updated with smart defaults
      };
      
      const addedItem = await onDirectAdd(basicItem);
      
      // Clear input and enable form immediately - don't block user workflow  
      setQuickAddName('');
      setIsLoading(false);
      
      // Run both AI calls in parallel (background) - non-blocking
      if (addedItem && onItemEnhancementRequested && onStartEnhancementProcessing && onUpdateItemDefaults) {
        // Show processing indicator
        onStartEnhancementProcessing(addedItem.id);
        
        Promise.all([
          getQuickDefaults(itemNameToProcess),
          getFullEnhancement(itemNameToProcess)
        ]).then(([defaults, enhancement]) => {
          // Update item with smart defaults using edit functionality (no duplication)
          if (defaults && (defaults.location !== 'pantry' || defaults.daysUntilExpiry !== 7)) {
            onUpdateItemDefaults(addedItem.id, defaults);
          }
          
          // Show enhancement if available
          if (enhancement) {
            onItemEnhancementRequested(addedItem.id, enhancement);
          }
        }).catch(error => {
          logger.error('Background AI processing error:', error);
          // Remove processing indicator on error
          onItemEnhancementRequested(addedItem.id, null);
        });
      }
    } catch (error) {
      // Error is already handled by useItemManager hook with toast
      logger.error('Error adding item:', error);
      setIsLoading(false);
    }
  };


  return (
    <>
      <div className="mb-6">
        {/* Vertical stack layout */}
        <div className="space-y-3">

          {/* Camera Upload Card - Visually Prominent but Compact */}
          <div
            onClick={() => setShowAIModal(true)}
            className="card cursor-pointer hover-lift transition-all duration-200 p-4 relative overflow-hidden"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              border: '2px solid var(--color-primary)'
            }}
          >
            {/* Gradient overlay for visual interest */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
              }}
            />

            <div className="relative z-10 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Camera className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Snap to Add
                </h3>

                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Take a photo to add items instantly with AI
                </p>
              </div>

              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
                   style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                <Sparkles className="w-3 h-3" />
                AI Powered
              </div>
            </div>
          </div>

          {/* Text Entry Card - Compact */}
          <div className="card p-4">
            <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Quick Add by Name
            </h3>

            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                type="text"
                ref={itemNameInputRef}
                value={quickAddName}
                onChange={e => setQuickAddName(e.target.value)}
                className="input-base focus-ring flex-1"
                placeholder="e.g., 'milk', 'eggs', 'bread'"
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={!quickAddName.trim() || isLoading}
                className="btn-base btn-primary flex items-center justify-center gap-2 px-6"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Item
                  </>
                )}
              </button>
            </form>
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
        }}
        homeId={activeHomeId}
        userToken={userToken}
      />

    </>
  );
};

export default AddItemSection;