import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import logger from '../utils/logger';

// Icons are now emojis - no SVG components needed

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
      title: "Pantry Manager",
      description: "Track your ingredients",
      emoji: "🥫",
      path: "/pantry",
      color: "var(--color-accent)"
    },
    {
      title: "Meal Planner",
      description: "Plan your weekly meals",
      emoji: "📅",
      path: "/planner",
      color: "var(--color-primary)"
    },
    {
      title: "Shopping List",
      description: "Never forget an item",
      emoji: "🛒",
      path: "/shopping-list",
      color: "var(--color-primary)"
    },
    {
      title: "Recipe Generator",
      description: "Turn ingredients into meals",
      emoji: "🍽️",
      path: "/recipe-generator",
      color: "var(--color-primary)"
    },
    {
      title: "Manage",
      description: "Settings and preferences",
      emoji: "⚙️",
      path: "/manage",
      color: "var(--color-accent)"
    }
  ];

  return (
    <div className="section-padding">
      <div className="container-mobile lg:max-w-none lg:px-8">
        
        {/* ===== WELCOME SECTION ===== */}
        <div className="animate-fade-in mb-8 lg:mb-12">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-color-primary">
            {greeting}, {profile?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          {currentHome && (
            <p className="text-lg mb-4 text-color-secondary">
              Managing <span className="font-semibold icon-color-primary">{currentHome.name}</span>
            </p>
          )}
          <p className="text-color-muted">
            Your smart assistant for a organized, happy home.
          </p>
        </div>


        {/* ===== QUICK ACTIONS ===== */}
        <div className="mb-8 lg:mb-12">
          <h2 className="text-xl font-semibold mb-6 text-color-primary">Quick Actions</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={action.path}
                to={action.path}
                className="card card-interactive p-6 flex items-start gap-4 hover-lift animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 text-2xl text-white"
                  style={{ backgroundColor: action.color }}
                >
                  {action.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 text-color-primary">
                    {action.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-color-muted">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}