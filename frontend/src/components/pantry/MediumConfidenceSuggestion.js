import React from 'react';
import { ArrowRight, Camera, Edit3 } from 'lucide-react';

const MediumConfidenceSuggestion = ({ 
  itemName,
  suggestions, 
  confidence,
  onAccept, 
  onTryAgain,
  onUploadPhoto,
  onManualEntry
}) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <div className="mb-3">
        <h4 className="font-semibold text-yellow-800">
          "{itemName}" could be several things:
        </h4>
        <p className="text-sm text-yellow-700 mt-1">
          Choose an option or be more specific in your search (e.g., "Hershey's chocolate bar" or "dark chocolate chips")
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {suggestions.map((option, index) => (
          <button
            key={index}
            onClick={() => onAccept(option)}
            className="text-left p-3 border border-yellow-300 rounded hover:bg-yellow-100 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-yellow-900">{option.name}</div>
                <div className="text-sm text-yellow-700">{option.quantity}</div>
                <div className="text-xs text-yellow-600">~{option.shelfLife}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
      
      <div className="flex flex-wrap gap-2 pt-3 border-t border-yellow-200">
        <button 
          onClick={onTryAgain} 
          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
        >
          <Edit3 className="w-4 h-4" />
          Try a more specific name
        </button>
        <button 
          onClick={onUploadPhoto} 
          className="text-green-600 hover:underline text-sm flex items-center gap-1"
        >
          <Camera className="w-4 h-4" />
          Upload photo instead
        </button>
        <button 
          onClick={onManualEntry} 
          className="text-gray-600 hover:underline text-sm"
        >
          Enter manually anyway
        </button>
      </div>
      
      <p className="text-xs text-yellow-600 mt-2">
        AI Confidence: {Math.round(confidence * 100)}%
      </p>
    </div>
  );
};

export default MediumConfidenceSuggestion;
