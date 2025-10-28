import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import logger from '../utils/logger';

// ===== ICONS =====
const RecipeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M18 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M18 16v.01"></path><path d="M18 20v.01"></path></svg>;

const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>;

const PantryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M19 11V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" /><path d="M6 11h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" /><path d="M10 11V9" /><path d="M14 11V9" /></svg>;



const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function HomePage() {
  const { currentHome, profile } = useOutletContext();
  logger.debug('HomePage render - currentHome:', currentHome);
  
  const currentTime = new Date();
  const hour = currentTime.getHours();
  
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";
  
  
  const quickActions = [
    {
      title: "Recipe Generator",
      description: "Turn ingredients into meals",
      icon: RecipeIcon,
      path: "/recipe-generator",
      color: "var(--color-primary)"
    },
    {
      title: "Pantry Manager",
      description: "Track your ingredients",
      icon: PantryIcon,
      path: "/pantry",
      color: "var(--color-accent)"
    },
    {
      title: "Manage",
      description: "Settings and preferences",
      icon: SettingsIcon,
      path: "/manage",
      color: "var(--color-primary)"
    }
  ];

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        
        {/* ===== WELCOME SECTION ===== */}
        <div className="animate-fade-in mb-8 lg:mb-12">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {greeting}, {profile?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          {currentHome && (
            <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
              Managing <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{currentHome.name}</span>
            </p>
          )}
          <p style={{ color: 'var(--text-muted)' }}>
            Your smart assistant for a organized, happy home.
          </p>
        </div>


        {/* ===== QUICK ACTIONS ===== */}
        <div className="mb-8 lg:mb-12">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={action.path}
                to={action.path}
                className="card card-interactive p-6 flex items-start gap-4 hover-lift animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: action.color, color: 'white' }}
                >
                  <action.icon />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                    {action.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>


        {/* ===== FLOATING ACTION BUTTON (Mobile) ===== */}
        <Link
          to="/pantry"
          className="mobile-only fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 z-10"
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          <PlusIcon />
        </Link>
      </div>
    </div>
  );
}