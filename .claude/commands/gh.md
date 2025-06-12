Please analyze and begin GitHub issue: $ARGUMENTS.

Follow these steps (and add to your TODO list):

1. View issue
2. Understand the problem/task described in the issue
3. Ask clarifying questions if needed
4. Add more details to the issue if needed
5. Break down the task into smaller tasks if needed
6. Create a new branch for the task
7. Search the codebase for relevant files
8. Write failing test that reproduces the issue or practice TDD
9. Implement the fix/feature
10. Add JSDoc style comments
11. Ensure code passes linting and type checking
12. Update README documentation
13. Commit, push and open PR


Remember to use the GitHub CLI (`gh`) or GitHub MCP for all GitHub-related tasks.

# CONVENTIONS:

## TS Style Guide 

### Core
- TS v5 + strict-type-checked
- Prefer narrow types
- Named exports only
- Code by feature

### Types

##### Inference
```ts
// ❌ const x: string = 'admin'
// ✅ const x = 'admin' // literal 'admin'
// ✅ const x = new Map<string, number>() // when narrowing
```

##### Immutability
- Use `ReadonlyArray<T>`, `Readonly<T>`
- Return new objects/arrays, no mutations

##### Objects
- Prefer required props
- Use discriminated unions for variants:
```ts
// ❌ type User = { id?: number; admin?: boolean; guest?: boolean }
// ✅ type User = 
//   | { role: 'admin'; id: number; perms: string[] }
//   | { role: 'guest'; tempToken: string }
```

##### Constants
```ts
// Arrays
const ROLES = ['admin', 'user'] as const satisfies ReadonlyArray<Role>

// Objects  
const CONFIG = { max: 100 } as const satisfies Config
```

##### Templates
```ts
type Route = `/api/${'users'|'posts'}`
type Color = `${BaseColor}-${50|100|200}`
```

##### Avoid
- `any` → use `unknown`
- Type assertions `as T`
- Non-null assertions `!`
- `@ts-ignore` → `@ts-expect-error: reason`

##### Misc
- `type` not `interface`
- `Array<T>` not `T[]`
- `import type` separate

### Functions
- Single responsibility
- Pure, no side effects
- Single object arg (except 1 primitive)
- Required > optional args
- Discriminated args when needed

### Variables
- `as const` for constants
- No enums → literal types/const arrays/objects
- Union types > boolean flags
- `null` = explicit empty, `undefined` = missing

### Naming

##### Case
- camelCase: vars, functions
- PascalCase: types, components
- UPPER_SNAKE: constants
- Generic: `TRequest` not `T`

##### React
- Props: `ComponentNameProps`
- Callbacks: `onEvent` + `handleEvent`
- Hooks: `useX` returns `{data, error}`

##### Misc
- Booleans: `is/has/should` prefix
- Acronyms: `Url` not `URL`
- No abbreviations unless standard

### Structure
```
feature/
├─ api/
├─ components/
├─ utils/
└─ index.tsx
```
- Relative imports within feature
- Absolute imports across features

### React
- Required > optional props
- Discriminated props for variants
- No props→state (except `initialX`)
- No `React.FC`
- Container (logic) vs UI components
- Compound: `<List><List.Item /></List>`
- URL state > global state

### Tests
- AAA pattern
- Test behavior not implementation
- `it('should X when Y')`
- No snapshots
- Mock sparingly


## 🧪 Testing Strategy

### Test Configuration
```bash
# Run with coverage
npm run test:ci

# Development mode
npm run test

# Run specific test file
npm run test:ci -- src/path/to/test.test.tsx

# Coverage report
open coverage/lcov-report/index.html
```

### Test Organization

#### File Structure
Tests follow a consistent directory structure:
```
src/
├── components/
│   └── Chat/
│       └── Messages/
│           ├── ProactiveMCPAuth.tsx
│           └── __tests__/
│               └── ProactiveMCPAuth.test.tsx
├── utils/
│   ├── mcpAuth.ts
│   └── __tests__/
│       └── mcpAuth.test.ts
└── hooks/
    ├── useStartAgentChat.ts
    └── __tests__/
        └── useStartAgentChat.test.ts
```

#### Test Categories
- **Unit Tests**: Utilities, hooks, pure functions
- **Component Tests**: UI behavior with React Testing Library
- **Integration Tests**: API interactions and data flow

#### Naming Conventions
- **Test Files**: Use `*.test.tsx` for components, `*.test.ts` for utilities
- **Test Directories**: Place tests in `__tests__` subdirectories alongside source code
- **Test Structure**: Group tests by component/functionality with descriptive `describe` blocks

### Testing Patterns

#### Component Testing
```typescript
// Example: Component test with proper mocking
describe('MyComponent', () => {
  // Mock external dependencies
  jest.mock('~/hooks/AuthContext');
  jest.mock('~/data-provider/queries');
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default state
  });

  it('should render correctly with props', () => {
    render(<MyComponent {...mockProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

#### Complex Component Mocking
For components with multiple dependencies (Context, Recoil, hooks):
```typescript
// Mock Recoil state
jest.mock('recoil', () => ({
  ...jest.requireActual('recoil'),
  useRecoilValue: jest.fn(),
}));

// Wrap component with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <RecoilRoot>
      <ChatContext.Provider value={mockChatContext}>
        <AgentsMapContext.Provider value={mockAgentsMap}>
          {ui}
        </AgentsMapContext.Provider>
      </ChatContext.Provider>
    </RecoilRoot>
  );
};
```

#### Test Coverage Examples
Recent component tests achieving 100% coverage:
- **ProactiveMCPAuth**: 29 test cases, 100% coverage across all metrics
- **AgentCTA**: Comprehensive rendering and interaction tests
- **AgentDiscovery**: Integration testing with data providers

### Coverage Goals
- Functions: 80%+ (achieving 100% on critical components)
- Lines: 80%+ (achieving 100% on critical components)
- Statements: 80%+ (achieving 100% on critical components)
- Branches: 80%+ (achieving 100% on critical components)

### Testing Tools
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **Mock Service Worker**: API mocking for integration tests

### Preflight Convenience Scripts
`./LibraChat/package.json`
```json
"preflight": "../scripts/dev.sh --clean && npm run build:all && npm run check:all && npm run e2e:ci",
"preflight:fix": "npm run build:all && npm run lint -- --fix && npm run format && npm run typecheck:all && npm run test:all && npm run e2e:ci",
"check:client": "npm run lint:client && npm run typecheck:client && npm run format:client && npm run test:client",
"check:api": "npm run lint:api && npm run format:api && npm run test:api",
"check:packages": "npm run lint:packages && npm run typecheck:packages && npm run format:packages && npm run test:packages",
"check:all": "npm run lint && npm run format && npm run typecheck:all && npm run test:all",
```