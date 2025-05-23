# LibreChat Client

The React-based frontend application for Agentis (LibreChat) - a sophisticated multi-model AI chat interface with advanced features including agent capabilities, code execution, and real-time streaming.

## 🚀 Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR
- **State Management**: 
  - Recoil (global state atoms)
  - React Context API (feature-specific state)
  - TanStack Query v4 (server state & caching)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: 
  - Radix UI (primitives)
  - Headless UI (accessible components)
  - Custom component library
- **Real-time**: Server-Sent Events (SSE)
- **Internationalization**: i18next (30+ languages)
- **Testing**: Jest + React Testing Library
- **PWA**: Service Worker with offline support

## 📋 Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- Backend API server running on port 3080
- Built shared packages (data-provider, mcp, data-schemas)

## 🔧 Installation

1. **Install dependencies**:
```bash
cd LibreChat/client
npm install
```

2. **Build required shared packages** (from project root):
```bash
# Build in dependency order
npm run build:data-schemas
npm run build:data-provider
npm run build:mcp
```

## 🏃‍♂️ Development

### Quick Start

```bash
# Start development server (port 3090)
npm run dev

# Or with Bun
npm run b:dev
```

The development server provides:
- Hot Module Replacement (HMR)
- TypeScript type checking
- Automatic proxy to backend API (port 3080)
- Source maps for debugging

### Development Scripts

```bash
# Core development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview-prod     # Preview production build

# Testing
npm run test             # Run tests in watch mode
npm run test:ci          # Single test run with coverage

# Package management
npm run data-provider    # Rebuild data-provider package

# Bun alternatives
npm run b:dev           # Bun dev server
npm run b:build         # Bun production build
npm run b:test          # Bun test runner
```

## 🏗️ Architecture Overview

### Directory Structure

```
client/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI primitives
│   │   ├── Auth/           # Authentication flow
│   │   ├── Chat/           # Core chat interface
│   │   ├── Messages/       # Message rendering
│   │   ├── Artifacts/      # Code artifacts & preview
│   │   ├── Tools/          # MCP & tool integration
│   │   ├── SidePanel/      # Navigation & conversations
│   │   └── svg/            # SVG icon components
│   ├── Providers/          # Context providers
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Recoil state atoms
│   ├── data-provider/      # API communication
│   ├── routes/             # Route components
│   ├── utils/              # Utility functions
│   ├── locales/            # i18n translations
│   └── main.jsx            # App entry point
├── public/                 # Static assets
│   ├── assets/            # Images, icons
│   └── fonts/             # Web fonts
├── dist/                  # Production build
└── test/                  # Test utilities
```

### Provider Architecture

The application uses a carefully orchestrated provider hierarchy:

```tsx
<QueryClientProvider>          // TanStack Query
  <RecoilRoot>                // Global state
    <RouterProvider>          // React Router v6
      <ThemeProvider>         // Theme management
        <ToastProvider>       // Notifications
          <ScreenshotProvider> // Screenshot utility
            <LiveAnnouncer>    // A11y announcements
              {/* Feature Providers */}
              <ChatContext>
                <AgentsContext>
                  <AssistantsContext>
                    <FileMapContext>
                      {/* App Routes */}
                    </FileMapContext>
                  </AssistantsContext>
                </AgentsContext>
              </ChatContext>
            </LiveAnnouncer>
          </ScreenshotProvider>
        </ToastProvider>
      </ThemeProvider>
    </RouterProvider>
  </RecoilRoot>
</QueryClientProvider>
```

## 🎯 Core Features

### 1. Multi-Model Chat Interface
- Support for 15+ AI providers (OpenAI, Anthropic, Google, etc.)
- Dynamic endpoint switching
- Model-specific parameters and settings
- Custom endpoint configuration

### 2. Agent System
- Ephemeral agents per conversation
- Tool calling capabilities
- MCP (Model Context Protocol) server integration
- Visual tool call tracking

### 3. Artifact System
- Real-time code block rendering
- Sandpack integration for live code execution
- Syntax highlighting for 30+ languages
- Artifact preview and download

### 4. Message Streaming
- Server-Sent Events (SSE) for real-time responses
- Stream interruption and resumption
- Progress indicators for long operations
- Token usage tracking

### 5. File Management
- Drag-and-drop file upload
- Multi-file selection
- Image preview and editing
- File attachment to messages

### 6. Advanced Chat Features
- Conversation branching/forking
- Message regeneration
- Edit with continuation
- Copy/export conversations
- Search across conversations

## 📦 State Management

### Recoil Atoms (Global State)

```javascript
// User & Auth
user              // Current user data
isAuthenticated   // Auth status

// Conversations
conversation      // Active conversation
messages          // Message history
submission        // Current input state

// UI State
sidebarOpen      // Sidebar visibility
artifactsState   // Code artifacts
showAgentSettings // Agent panel

// Configuration
endpoints        // Available AI endpoints
presets          // User presets
modelsConfig     // Model configurations
```

### Context Providers (Feature State)

- **ChatContext**: Active chat session management
- **AgentsContext**: Agent configurations and state
- **AssistantsContext**: Assistant presets
- **FileMapContext**: File upload tracking
- **ArtifactContext**: Code artifact management
- **ToolCallsMapContext**: Tool execution tracking
- **MessageContext**: Message operations
- **AnnouncerContext**: Accessibility announcements

### Server State (TanStack Query)

Automatic caching and synchronization for:
- Conversations list
- Message history
- User preferences
- Model configurations
- File uploads

## 🌐 Routing Structure

```javascript
// Main routes
/                      // Landing/redirect
/c/:conversationId     // Chat conversation
/d/prompts            // Prompt library dashboard
/share/:shareId       // Shared conversation view

// Auth routes
/login                // Login page
/register             // Registration
/verify               // Email verification
/reset-password       // Password reset

// Settings routes
/settings             // User settings
/settings/account     // Account management
/settings/keys        // API key management
```

## 🧩 Component Architecture

### Key Components

#### Chat Components
- `ChatView` - Main chat container
- `MessageContainer` - Message list with virtualization
- `Message` - Individual message with actions
- `MultiMessage` - Branched message display
- `ChatForm` - Input area with file upload

#### UI Components
- `Dialog` - Modal dialogs (Radix UI based)
- `Button` - Styled button variants
- `Input` - Form inputs with validation
- `ComboBox` - Searchable select
- `DataTable` - Sortable data tables

#### Feature Components
- `ArtifactTabs` - Code artifact viewer
- `MCPServerCard` - MCP server configuration
- `ToolSelectDialog` - Tool selection interface
- `FileUpload` - Drag-and-drop file handler

## 🌍 Internationalization

### Supported Languages

Arabic, Catalan, Czech, Danish, German, English, Spanish, Estonian, Persian, Finnish, French, Hebrew, Hungarian, Indonesian, Italian, Japanese, Georgian, Korean, Dutch, Polish, Portuguese (BR/PT), Russian, Swedish, Thai, Turkish, Vietnamese, Chinese (Simplified/Traditional)

### Usage

```javascript
import { useLocalize } from '~/hooks';

function MyComponent() {
  const localize = useLocalize();
  
  return (
    <div>
      {localize('com_ui_welcome')}
      {localize('com_ui_model_parameters', { model: 'GPT-4' })}
    </div>
  );
}
```

## 🧪 Testing

### Test Configuration

Tests use Jest with React Testing Library:

```bash
# Run tests with coverage
npm run test:ci

# Watch mode for development
npm run test

# View coverage report
open coverage/lcov-report/index.html
```

### Test Structure

```
src/
├── components/
│   └── __tests__/        # Component tests
├── hooks/
│   └── __tests__/        # Hook tests
├── utils/
│   └── __tests__/        # Utility tests
└── test/                 # Test setup & mocks
```

## 🏭 Production Build

### Build Process

```bash
npm run build
```

Creates optimized production build with:
- Code splitting by route and feature
- Tree shaking for minimal bundle size
- Asset optimization and compression
- PWA manifest and service worker

### Build Output Structure

```javascript
// Chunk strategy (vite.config.ts)
{
  'radix-ui': ['@radix-ui/*'],
  'framer-motion': ['framer-motion'],
  'tanstack': ['@tanstack/*'],
  'markdown': ['react-markdown', 'remark-*', 'rehype-*'],
  'highlight': ['highlight.js'],
  'locales': ['locales/*'],
  'vendor': [/* remaining deps */]
}
```

### Deployment

1. **Static Hosting**: Deploy `dist/` to any static host
2. **API Proxy**: Configure proxy for `/api/*` routes
3. **Environment**: Set production environment variables
4. **HTTPS**: Required for PWA features

## ⚙️ Configuration

### Environment Variables

```bash
# .env.local (development)
VITE_API_HOST=http://localhost:3080
VITE_APP_TITLE=LibreChat
VITE_SHOW_GOOGLE_LOGIN_OPTION=true
VITE_DISABLE_REGISTRATION=false
VITE_GTM_ID=                          # Google Tag Manager
```

### Vite Configuration

Key configurations in `vite.config.ts`:
- Development server port: 3090
- API proxy to backend: localhost:3080
- Build optimizations and chunk splitting
- PWA plugin configuration

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "jsx": "preserve",
    "strict": true,
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}
```

## 🚀 Advanced Features

### Model Context Protocol (MCP)
- Integration with MCP servers
- Tool discovery and execution
- Visual tool call feedback
- Server configuration UI

### Code Artifacts
- Live code preview with Sandpack
- Multiple language support
- Export and share functionality
- Syntax highlighting with Highlight.js

### Progressive Web App
- Installable application
- Offline support (excluding auth)
- Background sync
- Push notifications (planned)

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader optimized
- Keyboard navigation
- Live region announcements

## 🛠️ Development Best Practices

### Performance Optimization
```javascript
// Use React.memo for expensive components
export default memo(ExpensiveComponent);

// Lazy load routes
const SettingsPage = lazy(() => import('./routes/Settings'));

// Virtualize long lists
import { VirtualizedList } from 'react-window';
```

### Type Safety
```typescript
// Define component props
interface ChatMessageProps {
  message: TMessage;
  isLatest?: boolean;
  onEdit?: (text: string) => void;
}

// Use discriminated unions
type EndpointType = 
  | { type: 'openai'; apiKey: string }
  | { type: 'anthropic'; apiKey: string }
  | { type: 'custom'; baseUrl: string };
```

### State Management
```javascript
// Recoil atom with default
export const conversationAtom = atom<TConversation | null>({
  key: 'conversation',
  default: null,
});

// Selector for derived state
export const messageCountSelector = selector({
  key: 'messageCount',
  get: ({ get }) => {
    const messages = get(messagesAtom);
    return messages.length;
  },
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Build fails with package errors**
   - Rebuild shared packages in order
   - Clear node_modules and reinstall

2. **HMR not working**
   - Check Vite server is running on 3090
   - Verify no port conflicts

3. **API calls failing**
   - Ensure backend is running on 3080
   - Check proxy configuration

4. **Translations not loading**
   - Verify locale files exist
   - Check i18next configuration

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'librechat:*');
```

## 🤝 Contributing

1. Follow TypeScript and React best practices
2. Write tests for new features
3. Update translations for UI changes
4. Ensure accessibility compliance
5. Run linting before committing:
   ```bash
   npm run lint
   npm run typecheck
   ```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Recoil Documentation](https://recoiljs.org)
- [Radix UI Documentation](https://radix-ui.com)
- [TanStack Query Documentation](https://tanstack.com/query)

## 📄 License

This project is part of LibreChat/Agentis. See the root project for license details.