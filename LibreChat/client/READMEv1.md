# LibreChat Client

The frontend application for Agentis (LibreChat) - a modern, feature-rich React-based chat interface that supports multiple AI model providers.

## 🚀 Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 
- **State Management**: 
  - Recoil (global state)
  - React Context API (feature state)
  - TanStack Query (server state)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Headless UI
- **Internationalization**: i18next
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- npm 8+
- Backend API server running on port 3080

## 🔧 Installation

1. Install dependencies:
```bash
npm install
```

2. Build required shared packages (from project root):
```bash
npm run build:data-provider
npm run build:mcp
npm run build:data-schemas
```

## 🏃‍♂️ Development

### Start Development Server

```bash
npm run dev
```

This starts the Vite dev server on http://localhost:3090 with:
- Hot Module Replacement (HMR)
- Proxy to backend API (port 3080)
- TypeScript type checking

### Alternative Scripts

```bash
# Rebuild data-provider package
npm run data-provider

# Run tests in watch mode
npm run test

# Run tests for CI
npm run test:ci

# Build for production
npm run build

# Preview production build
npm run preview-prod
```

### Bun Support

If using Bun:
```bash
npm run b:dev    # Development server
npm run b:build  # Production build
npm run b:test   # Run tests
```

## 🏗️ Project Structure

```
client/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Reusable UI components
│   │   ├── Auth/       # Authentication components
│   │   ├── Chat/       # Chat interface components
│   │   ├── Messages/   # Message display components
│   │   ├── Nav/        # Navigation components
│   │   └── ...         # Feature-specific components
│   ├── hooks/          # Custom React hooks
│   ├── store/          # Recoil state atoms
│   ├── data-provider/  # API communication layer
│   ├── utils/          # Utility functions
│   ├── locales/        # Translation files
│   ├── routes/         # Route components
│   ├── Providers/      # Context providers
│   └── main.jsx        # Application entry point
├── public/             # Static assets
├── dist/              # Production build output
└── test/              # Test setup and utilities
```

## 🎨 Component Architecture

### Provider Hierarchy

The application uses a layered provider structure:

```jsx
<QueryClientProvider>         // React Query
  <RecoilRoot>               // Global state
    <ThemeProvider>          // Theme management
      <ToastProvider>        // Notifications
        <LiveAnnouncer>      // Accessibility
          <App />
        </LiveAnnouncer>
      </ToastProvider>
    </ThemeProvider>
  </RecoilRoot>
</QueryClientProvider>
```

### Key Components

- **ChatView**: Main chat interface container
- **Messages**: Message list and individual message components
- **Input**: Chat input with file upload, markdown support
- **SidePanel**: Conversation list and navigation
- **Settings**: User and application settings
- **Auth**: Login, registration, password reset

## 📦 State Management

### Recoil Atoms

Global application state is managed through Recoil atoms:

- `user` - Current user data
- `conversation` - Active conversation
- `messages` - Message history
- `endpoints` - Available AI endpoints
- `settings` - User preferences

### Context Providers

Feature-specific state uses React Context:

- `ChatContext` - Chat session state
- `MessageContext` - Message operations
- `FileContext` - File upload/management
- `AssistantsContext` - AI assistant configurations

### Server State

API data is managed with TanStack Query:

- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

## 🌍 Internationalization

The client supports 30+ languages:

```javascript
// Change language
import { useLocalize } from '~/hooks';

const localize = useLocalize();
const translated = localize('com_ui_welcome');
```

Translation files are in `src/locales/[language]/translation.json`

## 🧪 Testing

### Run Tests

```bash
# Watch mode
npm run test

# Single run (CI)
npm run test:ci
```

### Test Structure

- Unit tests for utilities and hooks
- Component tests with React Testing Library
- Integration tests for API interactions

### Coverage

Tests generate coverage reports in:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/cobertura-coverage.xml` - CI report

## 🏭 Production Build

### Build Process

```bash
npm run build
```

This creates an optimized production build with:
- Code splitting
- Tree shaking
- Asset optimization
- Service worker (PWA)

### Build Output

The build creates separate chunks for:
- Vendor libraries
- UI component libraries
- Markdown/syntax highlighting
- Locale files
- Route-based code splitting

### Deployment

The built files in `dist/` can be served by any static file server. Ensure:
- API proxy configuration for `/api` routes
- Proper CORS headers
- HTTPS for production

## 🔧 Configuration

### Environment Variables

Create `.env` file in client directory:

```env
# API Configuration
VITE_API_HOST=http://localhost:3080

# Feature Flags
VITE_SHOW_GOOGLE_LOGIN_OPTION=true
VITE_DISABLE_REGISTRATION=false

# Analytics
VITE_GTM_ID=your-gtm-id
```

### Vite Configuration

The `vite.config.ts` handles:
- Development server setup
- Proxy configuration
- Build optimization
- PWA manifest generation

### TypeScript Configuration

TypeScript is configured with:
- Strict mode (with some exceptions)
- Path aliases (`~/` for src)
- JSX preserve mode
- ESNext target

## 🚀 Features

### Core Features
- Multi-model AI chat interface
- Real-time message streaming
- File upload and preview
- Code syntax highlighting
- LaTeX math rendering
- Markdown support

### Advanced Features
- Conversation branching/forking
- Message regeneration
- Custom presets
- Plugin system
- Artifact preview
- Code execution (Sandpack)

### Accessibility
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- High contrast themes

### Progressive Web App
- Offline support
- Install prompt
- Push notifications (planned)

## 🛠️ Development Tips

### Hot Module Replacement

Vite provides fast HMR. Most changes reflect immediately without losing state.

### Code Splitting

Use dynamic imports for large components:

```javascript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Performance

- Use `React.memo` for expensive components
- Implement virtual scrolling for long lists
- Optimize re-renders with `useCallback` and `useMemo`

### Type Safety

Always define types for:
- Component props
- API responses
- Form data
- Event handlers

## 🤝 Contributing

1. Follow the coding conventions in the main project README
2. Write tests for new features
3. Update translations for UI changes
4. Ensure accessibility compliance
5. Run linting before committing

## 📄 License

This project is part of LibreChat. See the main project for license details.