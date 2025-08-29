# Roscoe - Smart Home Helper

<div align="center">
  <img src="frontend/public/favicon.svg" alt="Roscoe Logo" width="64" height="64">
  <h3>Your intelligent household assistant for recipes, pantry management, and home organization</h3>
</div>

---

## 🏠 What is Roscoe?

Roscoe is a modern web application designed to streamline household management by combining AI-powered recipe generation, intelligent pantry tracking, and collaborative home administration. Built for families and households who want to reduce food waste, discover new recipes, and efficiently manage their kitchen inventory.

## ✨ Key Features

### 🍳 **AI Recipe Generator**
- **Smart Recipe Creation**: Generate personalized recipes based on available pantry ingredients
- **Dietary Preferences**: Support for various dietary restrictions and preferences
- **Recipe Complexity**: Choose between quick meals (15-30 min) or sophisticated cooking (45+ min)
- **Multiple Options**: Generate 3 recipe variations to choose from
- **Recipe Library**: Save and organize favorite recipes

### 🥫 **Intelligent Pantry Management**
- **Multi-Location Tracking**: Organize items across pantry, fridge, and freezer
- **AI Item Detection**: Upload photos to automatically identify and add multiple items
- **Smart Suggestions**: AI-powered suggestions with confidence levels for manual entry
- **Expiration Tracking**: Monitor shelf life and get notified of expiring items
- **Inventory Integration**: Seamlessly use pantry items in recipe generation

### 👥 **Multi-User Home Management**
- **Home Administration**: Invite and manage family members or housemates
- **Role-Based Access**: Admin and member roles with appropriate permissions
- **Collaborative Pantry**: Shared inventory management across all home members
- **User Profiles**: Individual accounts with home-specific data

### 🎨 **Modern Design System**
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Themes**: Automatic theme switching based on user preference
- **Accessibility First**: WCAG-compliant design with proper contrast and focus management
- **Consistent UI**: Unified design system with Roscoe branding

## 🏗️ Architecture

### **Frontend** (`/frontend`)
- **Framework**: React 18 with functional components and hooks
- **Routing**: React Router v6 for client-side navigation
- **Styling**: Custom CSS design system with CSS custom properties
- **State Management**: React Context for theme and user state
- **Authentication**: Firebase Authentication integration
- **Build Tool**: Create React App with modern JavaScript features

### **Backend** (`/backend`)
- **Runtime**: Node.js with Express.js framework
- **Authentication**: Firebase Admin SDK for secure user verification
- **Database**: Integration with external APIs for user and home management
- **AI Services**: OpenAI integration for recipe generation and item recognition
- **API Design**: RESTful endpoints with proper error handling

### **Key Components**

#### **SharedLayout**
- Responsive navigation with desktop sidebar and mobile bottom navigation
- Theme switching and user profile management
- Consistent header with Roscoe branding

#### **Authentication System**
- Secure login/signup with Firebase Auth
- Password validation and error handling
- Branded authentication experience

#### **Recipe Generator**
- Pantry integration with ingredient selection
- AI-powered recipe creation with multiple options
- Recipe saving and management

#### **Pantry Manager**
- Multi-location inventory tracking
- AI-assisted item entry with photo recognition
- Expiration monitoring and alerts

#### **Home Administration**
- User invitation and role management
- Account settings and logout functionality
- Member oversight and permissions

## 🛠️ Technology Stack

### **Frontend Technologies**
- **React 18**: Modern functional components with hooks
- **React Router v6**: Declarative routing with nested routes
- **Firebase Auth**: Secure authentication and user management
- **Lucide React**: Consistent iconography
- **CSS Custom Properties**: Theme-able design system
- **Responsive Design**: Mobile-first approach with breakpoints

### **Backend Technologies**
- **Node.js**: JavaScript runtime for server-side logic
- **Express.js**: Minimal web framework for API endpoints
- **Firebase Admin**: Server-side Firebase integration
- **OpenAI API**: AI-powered recipe and item recognition
- **CORS**: Cross-origin resource sharing configuration

### **Development Tools**
- **Create React App**: Build tooling and development server
- **ESLint**: Code quality and consistency
- **Git**: Version control with structured commits

## 📱 Responsive Design

Roscoe is built mobile-first with breakpoints at:
- **Mobile**: 320px - 767px (Primary experience)
- **Tablet**: 768px - 1023px (Adaptive layout)
- **Desktop**: 1024px+ (Sidebar navigation)

## 🎨 Design System

### **Color Palette**
- **Primary**: `#34D399` (Green 400) - Roscoe signature color
- **Primary Light**: `#A7F3D0` (Green 200) - Accents and highlights  
- **Primary Dark**: `#047857` (Green 700) - Text and borders
- **Accent**: `#F97316` (Orange 500) - Call-to-action elements

### **Typography**
- **System Fonts**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto
- **Responsive Scale**: Fluid typography that scales with viewport
- **Accessibility**: High contrast ratios and readable font sizes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Gemini**: For powering our AI recipe generation and item recognition
- **Firebase**: For authentication and backend services
- **Lucide**: For beautiful, consistent icons
- **React Community**: For the amazing ecosystem and tools

---

<div align="center">
  <p>Built with ❤️ for better household management</p>
  <p><strong>Roscoe</strong> - Making home life smarter, one recipe at a time</p>
</div>