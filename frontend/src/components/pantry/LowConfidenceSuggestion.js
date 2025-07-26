import React from 'react';
import { AlertCircle, Camera, Edit3 } from 'lucide-react';

const LowConfidenceSuggestion = ({ 
  itemName,
  guidance,
  confidence,
  onTryAgain,
  onUploadPhoto,
  onManualEntry
}) => {
  const examplePairs = guidance.examples || [
    { bad: "bread", good: "whole wheat bread" },
    { bad: "snacks", good: "potato chips" },
    { bad: "sauce", good: "tomato sauce" }
  ];

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h4 className="font-semibold text-red-800 mb-2">
          Need more details about "{itemName}"
        </h4>
        <p className="text-red-700 mb-4">
          {guidance.message || "Try being more specific to get better suggestions:"}
        </p>
        
        <div className="bg-white rounded-lg p-3 mb-4 max-w-md mx-auto">
          <div className="text-sm text-gray-700 space-y-2">
            {examplePairs.map((example, index) => (
              <div key={index} className="text-left">
                <span className="text-gray-500">Instead of:</span> 
                <span className="font-medium text-red-600"> "{example.bad}"</span> 
                <span className="text-gray-500 mx-2">→</span>
                <span className="text-gray-500">Try:</span> 
                <span className="font-medium text-green-600"> "{example.good}"</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={onTryAgain}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Be More Specific
          </button>
          <button 
            onClick={onUploadPhoto}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Upload Photo
          </button>
        </div>
        
        <button 
          onClick={onManualEntry}
          className="text-gray-600 hover:underline text-sm mt-3 block mx-auto"
        >
          Skip suggestions and enter manually
        </button>
        
        <p className="text-xs text-red-600 mt-3">
          AI Confidence: {Math.round(confidence * 100)}% - {guidance.reasoning}
        </p>
      </div>
    </div>
  );
};

export default LowConfidenceSuggestion;
