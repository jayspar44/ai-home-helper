import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';

const RecipeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-orange-500"><path d="M20 11.08V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M18 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M18 16v.01"></path><path d="M18 20v.01"></path></svg>;
const AdminIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-blue-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const PantryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-orange-500"><path d="M19 11V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" /><path d="M6 11h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" /><path d="M10 11V9" /><path d="M14 11V9" /></svg>;

export default function HomePage() {
  const { currentHome } = useOutletContext();
  console.log('HomePage render - currentHome:', currentHome);
  
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Welcome to HomeHelper!</h1>
        {currentHome && (
          <p className="text-gray-600 text-lg mt-2">
            Currently managing: <span className="font-semibold text-orange-600">{currentHome.name}</span>
          </p>
        )}
        <p className="text-gray-600 text-lg mt-1">Your smart assistant for a happy home.</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link to="/recipe-generator" className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col items-center text-center">
          <RecipeIcon />
          <h2 className="text-2xl font-semibold mt-4 mb-2">Recipe Generator</h2>
          <p className="text-gray-600">Turn your leftover ingredients into delicious meals with the power of AI.</p>
        </Link>

        <Link to="/pantry" className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col items-center text-center">
          <PantryIcon />
          <h2 className="text-2xl font-semibold mt-4 mb-2">Pantry</h2>
          <p className="text-gray-600">Keep track of your ingredients across pantry, fridge, and freezer.</p>
        </Link>

        <Link to="/home-admin" className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out flex flex-col items-center text-center">
          <AdminIcon />
          <h2 className="text-2xl font-semibold mt-4 mb-2">Home Admin</h2>
          <p className="text-gray-600">Manage your home, invite members, and set permissions.</p>
        </Link>
      </div>
    </div>
  );
}