import React, { useState, useRef, useCallback } from 'react';
import { Camera, Plus, Sparkles, X } from 'lucide-react';
import AIItemDetectionModal from './AIItemDetectionModal';

const AddItemSection = ({ 
  onDirectAdd, 
  onAIItemsDetected, 
  activeHomeId, 
  userToken, 
  getAuthHeaders 
}) => {
  const [quickAddName, setQuickAddName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [enhancementSuggestion, setEnhancementSuggestion] = useState(null);
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
    
    try {
      // Get smart defaults from AI (location + expiry)
      const defaults = await getQuickDefaults(quickAddName.trim());
      
      // Add immediately with defaults
      const newItem = {
        name: quickAddName.trim(),
        location: defaults.location,
        daysUntilExpiry: defaults.daysUntilExpiry
      };
      
      await onDirectAdd(newItem);
      
      // Clear input
      setQuickAddName('');
      
      // Then show enhancement options
      const enhancement = await getFullEnhancement(quickAddName.trim());
      if (enhancement && (enhancement.name !== quickAddName.trim() || enhancement.quantity)) {
        setEnhancementSuggestion({
          ...enhancement,
          originalItem: newItem
        });
        setShowEnhancement(true);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setShowEnhancement(false);
          setEnhancementSuggestion(null);
        }, 5000);
      }
    } catch (error) {
      // Error is already handled by useItemManager hook with toast
      console.error('Error adding item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyEnhancement = useCallback(async () => {
    if (!enhancementSuggestion) return;
    
    try {
      // Update the item with enhanced details
      const enhancedItem = {
        ...enhancementSuggestion.originalItem,
        name: enhancementSuggestion.name,
        quantity: enhancementSuggestion.quantity,
        location: enhancementSuggestion.location,
        daysUntilExpiry: enhancementSuggestion.daysUntilExpiry
      };
      
      await onDirectAdd(enhancedItem);
      setShowEnhancement(false);
      setEnhancementSuggestion(null);
    } catch (error) {
      console.error('Error applying enhancement:', error);
    }
  }, [enhancementSuggestion, onDirectAdd]);

  const dismissEnhancement = useCallback(() => {
    setShowEnhancement(false);
    setEnhancementSuggestion(null);
  }, []);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Add New Items
        </h2>
        
        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Camera Upload Card - Visually Prominent */}
          <div 
            onClick={() => setShowAIModal(true)}
            className="card cursor-pointer hover-lift transition-all duration-200 p-6 relative overflow-hidden"
            style={{ 
              backgroundColor: 'var(--color-primary-light)',
              border: '2px solid var(--color-primary)',
              minHeight: '140px'
            }}
          >
            {/* Gradient overlay for visual interest */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
              }}
            />
            
            <div className="relative z-10 flex flex-col items-center text-center h-full justify-center">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Camera className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-primary-dark)' }}>
                Scan Multiple Items
              </h3>
              
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Take a photo to add items instantly with AI
              </p>
              
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                   style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                <Sparkles className="w-3 h-3" />
                AI Powered
              </div>
            </div>
          </div>

          {/* Text Entry Card - Secondary but accessible */}
          <div className="card p-6" style={{ minHeight: '140px' }}>
            <div className="flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Quick Add by Name
              </h3>
              
              <form onSubmit={handleQuickAdd} className="flex-1 flex flex-col">
                <div className="flex-1 mb-4">
                  <input
                    type="text"
                    ref={itemNameInputRef}
                    value={quickAddName}
                    onChange={e => setQuickAddName(e.target.value)}
                    className="input-base focus-ring w-full"
                    placeholder="e.g., 'milk', 'eggs', 'bread'"
                    disabled={isLoading}
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={!quickAddName.trim() || isLoading}
                  className="btn-base btn-primary w-full flex items-center justify-center gap-2"
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
              
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                Includes location & expiry automatically
              </p>
            </div>
          </div>
        </div>

        {/* Enhancement Bar */}
        {showEnhancement && enhancementSuggestion && (
          <div className="mt-4 animate-slide-down">
            <div 
              className="flex items-center justify-between p-4 rounded-lg" 
              style={{ backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary)' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    AI suggests: 
                  </span>
                  <span className="text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>
                    "{enhancementSuggestion.name}"
                    {enhancementSuggestion.quantity && `, ${enhancementSuggestion.quantity}`}
                    {' '}in {enhancementSuggestion.location}, expires in {enhancementSuggestion.daysUntilExpiry} days
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button 
                  onClick={applyEnhancement} 
                  className="btn-base px-3 py-1 text-sm"
                  style={{ 
                    backgroundColor: 'var(--color-primary)', 
                    color: 'white',
                    border: '1px solid var(--color-primary)'
                  }}
                >
                  Apply
                </button>
                <button 
                  onClick={dismissEnhancement} 
                  className="p-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
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