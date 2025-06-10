# TS Style Guide - LLM Compact

## Core
- TS v5 + strict-type-checked
- Prefer narrow types
- Named exports only
- Code by feature

## Types

### Inference
```ts
// ❌ const x: string = 'admin'
// ✅ const x = 'admin' // literal 'admin'
// ✅ const x = new Map<string, number>() // when narrowing
```

### Immutability
- Use `ReadonlyArray<T>`, `Readonly<T>`
- Return new objects/arrays, no mutations

### Objects
- Prefer required props
- Use discriminated unions for variants:
```ts
// ❌ type User = { id?: number; admin?: boolean; guest?: boolean }
// ✅ type User = 
//   | { role: 'admin'; id: number; perms: string[] }
//   | { role: 'guest'; tempToken: string }
```

### Constants
```ts
// Arrays
const ROLES = ['admin', 'user'] as const satisfies ReadonlyArray<Role>

// Objects  
const CONFIG = { max: 100 } as const satisfies Config
```

### Templates
```ts
type Route = `/api/${'users'|'posts'}`
type Color = `${BaseColor}-${50|100|200}`
```

### Avoid
- `any` → use `unknown`
- Type assertions `as T`
- Non-null assertions `!`
- `@ts-ignore` → `@ts-expect-error: reason`

### Misc
- `type` not `interface`
- `Array<T>` not `T[]`
- `import type` separate

## Functions
- Single responsibility
- Pure, no side effects
- Single object arg (except 1 primitive)
- Required > optional args
- Discriminated args when needed

## Variables
- `as const` for constants
- No enums → literal types/const arrays/objects
- Union types > boolean flags
- `null` = explicit empty, `undefined` = missing

## Naming

### Case
- camelCase: vars, functions
- PascalCase: types, components
- UPPER_SNAKE: constants
- Generic: `TRequest` not `T`

### React
- Props: `ComponentNameProps`
- Callbacks: `onEvent` + `handleEvent`
- Hooks: `useX` returns `{data, error}`

### Misc
- Booleans: `is/has/should` prefix
- Acronyms: `Url` not `URL`
- No abbreviations unless standard

## Structure
```
feature/
├─ api/
├─ components/
├─ utils/
└─ index.tsx
```
- Relative imports within feature
- Absolute imports across features

## React
- Required > optional props
- Discriminated props for variants
- No props→state (except `initialX`)
- No `React.FC`
- Container (logic) vs UI components
- Compound: `<List><List.Item /></List>`
- URL state > global state

## Tests
- AAA pattern
- Test behavior not implementation
- `it('should X when Y')`
- No snapshots
- Mock sparingly