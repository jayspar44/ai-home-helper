import React from 'react';
import HighConfidenceSuggestion from './HighConfidenceSuggestion';
import MediumConfidenceSuggestion from './MediumConfidenceSuggestion';
import LowConfidenceSuggestion from './LowConfidenceSuggestion';
import { Loader2 } from 'lucide-react';

const SuggestionPanel = ({ 
  suggestionData,
  itemName,
  isLoading,
  error,
  onAcceptSuggestion,
  onTryAgain,
  onUploadPhoto,
  onManualEntry
}) => {
  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-gray-600" />
        <span className="text-gray-600">Getting AI suggestions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Failed to get suggestions: {error}</p>
        <button 
          onClick={onTryAgain} 
          className="text-blue-600 hover:underline text-sm mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!suggestionData) return null;

  const { confidence, action, suggestions, guidance } = suggestionData;

  // High confidence - single suggestion
  if (action === 'accept' && confidence > 0.8) {
    return (
      <HighConfidenceSuggestion
        suggestion={suggestions[0]}
        confidence={confidence}
        onAccept={onAcceptSuggestion}
        onCustomize={(customSuggestion) => onAcceptSuggestion(customSuggestion)}
        onUploadPhoto={onUploadPhoto}
      />
    );
  }

  // Medium confidence - multiple choices
  if (action === 'choose' && confidence >= 0.4 && confidence <= 0.8) {
    return (
      <MediumConfidenceSuggestion
        itemName={itemName}
        suggestions={suggestions}
        confidence={confidence}
        onAccept={onAcceptSuggestion}
        onTryAgain={onTryAgain}
        onUploadPhoto={onUploadPhoto}
        onManualEntry={onManualEntry}
      />
    );
  }

  // Low confidence - need more specificity
  if (action === 'specify' && confidence < 0.4) {
    return (
      <LowConfidenceSuggestion
        itemName={itemName}
        guidance={guidance}
        confidence={confidence}
        onTryAgain={onTryAgain}
        onUploadPhoto={onUploadPhoto}
        onManualEntry={onManualEntry}
      />
    );
  }

  // Fallback for unexpected states
  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <p className="text-gray-600">Unable to provide suggestions for "{itemName}"</p>
      <button 
        onClick={onManualEntry} 
        className="text-blue-600 hover:underline text-sm mt-2"
      >
        Enter manually
      </button>
    </div>
  );
};

export default SuggestionPanel;
