import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';

const VersionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export default function VersionDisplay({ className = "" }) {
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    // Fetch version from backend health API
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          setVersion(data.version);
        }
      } catch (error) {
        logger.error('Failed to fetch version:', error);
        // Fallback to default version
      }
    };

    fetchVersion();
  }, []);

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`} style={{ color: 'var(--text-muted)' }}>
      <VersionIcon />
      <span>v{version}</span>
    </div>
  );
}