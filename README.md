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

### 📅 **Smart Meal Planner**
- **Weekly Planning**: Visual calendar showing meals for the entire week
- **3-State Meal System**: Track meals from planned to completed
  - Empty: No meal planned yet
  - Planned: Recipe selected and scheduled
  - Completed: Meal logged with actual consumption details
- **Recipe Integration**: Add saved recipes directly to meal plan
- **Timezone-Independent Dates**: Consistent meal tracking regardless of location
- **Consumption Logging**: Record what was actually eaten vs. what was planned

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
- **Database**: Firebase Firestore for multi-tenant data storage
- **AI Services**: Google Gemini 2.5 Flash for recipe generation and item recognition
- **API Design**: RESTful endpoints with proper error handling
- **Secret Management**: Runtime secret loading from GCP Secret Manager

### **Infrastructure & Deployment**
- **Production**: Google Cloud Platform App Engine (auto-scaling, free tier optimized)
- **CI/CD**: Cloud Build with automated deployments
- **Secrets**: GCP Secret Manager for secure credential storage
- **Local Development**: Full-stack development on localhost
- **Monitoring**: GCP Cloud Logging with structured logs

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

### **Frontend**
- React 18, React Router v6, Firebase Auth
- CSS Custom Properties, Lucide React icons
- Mobile-first responsive design

### **Backend**
- Node.js + Express.js
- Firebase Admin SDK + Firestore
- Google Gemini 2.5 Flash (AI)
- GCP Secret Manager

### **Development & Deployment**
- ESLint, Git, GitHub Actions
- GCP App Engine, Cloud Build
- Automated CI/CD pipeline


## 🎨 Design System

- **Color Palette**: Signature green primary colors with orange accents
- **Typography**: Modern system font stack with responsive scaling
- **Responsive**: Mobile-first design (320px to 1024px+)
- **Accessibility**: WCAG-compliant with high contrast and proper focus management

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini**: For powering our AI recipe generation and item recognition
- **Google Cloud Platform**: For scalable, secure infrastructure and Secret Manager
- **Firebase**: For authentication and Firestore database services
- **Lucide**: For beautiful, consistent icons
- **React Community**: For the amazing ecosystem and tools

---

<div align="center">
  <p>Built with ❤️ for better household management</p>
  <p><strong>Roscoe</strong> - Making home life smarter, one recipe at a time</p>
</div>