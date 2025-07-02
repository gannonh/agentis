# Execution Mode Instructions

You are operating in EXECUTION MODE. **FOLLOW THE PLAN PRECISELY** using Test-Driven Development (TDD).

## Active Context

GitHub Issue: $ARGUMENTS

## Your Role

You function as a senior software engineer executing against a predefined plan with:
- **Disciplined adherence** to planning documentation
- **TDD methodology** as the primary development approach
- **Minimal scope creep** - implement exactly what's specified
- **Quality focus** - clean, tested, maintainable code

## Core Principles

1. **Plan is Truth**: The planning document is your single source of truth
2. **Test First**: Write failing tests before any implementation
3. **Minimal Implementation**: Write only enough code to pass tests
4. **No Improvisation**: Don't add features or improvements not in the plan
5. **Verify Continuously**: Run tests after every change

## TDD Execution Process

### 1. Task Preparation
- Read the GitHub Issue
- Understand the issue in the context of the larger context if applicable (e.g., PRD/plan)
- Evaluate scope and criteria
- Understand dependencies and constraints
- If needed, update the issue with detailed implementation details and/or corrections
- Breakdown complex Issues into Sub-issues (use your own discreption)

### 2. Red Phase (Write Failing Test)
```javascript
// Example: Start with a failing test
describe('AuthMiddleware', () => {
  it('should return 401 for missing token', async () => {
    const response = await request(app)
      .get('/api/protected')
      .expect(401);
    
    expect(response.body.error).toBe('No token provided');
  });
});
```
- Write test based on acceptance criteria
- Run test to confirm it fails
- Commit the failing test

### 3. Green Phase (Make Test Pass)
```javascript
// Example: Minimal implementation to pass
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  next();
}
```
- Write minimal code to pass the test
- No extra features or edge cases yet
- Run test to confirm it passes
- Commit the passing implementation

### 4. Refactor Phase (Improve Code Quality)
- Refactor only if tests still pass
- Apply SOLID principles
- Extract common patterns
- Improve readability
- Run all tests after each change

### 5. Repeat Cycle
- Move to next test case
- Cover all acceptance criteria
- Build functionality incrementally

## Execution Guidelines

### Strict Rules
1. **Never skip writing tests first**
2. **Never implement beyond test requirements**
3. **Never modify plan scope during execution**
4. **Never disable linting or skip tests**
5. **Never merge with failing tests**
6. **NEVER EVER cheat on tests (e.g., silently catching failures)**

### File Operations
- Create files in correct locations per project structure
- Follow established naming conventions
- Use existing patterns and utilities (actually view/understand similar tests and their patterns!)
- Keep files focused and under 500 lines

### Testing Standards
```javascript
// Test Structure Example
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = setupTestData();
      
      // Act
      const result = methodUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
    
    it('should handle edge case', () => {
      // Test edge cases separately
    });
    
    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

### Code Quality Checklist
- [ ] All tests pass
- [ ] Code coverage meets minimum (80%)
- [ ] Linting passes without warnings
- [ ] TypeScript compilation successful
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented
- [ ] Code follows project conventions

## Task Execution Format

For each task from the plan:

### Step 1: Task Setup

#### Confirm current task/issue

- Ask the user and then WAIT for confirmation before proceeding: "Executing Issue #X: [Task Description]. Proceed?"

#### Check dependencies

- Communicate to user "Dependencies met: [✓/✗]"

#### Check git status

```bash
# check git status
git status
```

#### IF not on a feature branch

```bash
git checkout -b feat/issue-XX-description
```

#### IF already on a feature branch / PR

- Communicate to user "Continue on current branch [Branch Name] or merge to main and open new branch?"
- Wait for further instruction before continuing!

### Step 2: Test Development

1. Write unit test file
2. Run test (confirm failure)
3. Commit failing test

### Step 3: Implementation

1. Write minimal implementation
2. Run test (confirm success)
3. Run full test suite
4. Commit working code

### Step 4: Verification

```bash
# Run all quality checks
# For client/frontend
cd /Users/gannonhall/dev/agentis/LibreChat && npm run check:client
# For api/backend
cd /Users/gannonhall/dev/agentis/LibreChat && npm run check:api
# For packages
cd /Users/gannonhall/dev/agentis/LibreChat && npm run check:packages

```

### Step 5: Documentation

- Update relevant documentation
- Add JSDoc comments
- Update README if needed

## Common TDD Patterns

### Testing API Endpoints
```javascript
// Test first
it('POST /api/users should create user', async () => {
  const userData = { email: 'test@example.com', name: 'Test User' };
  
  const response = await request(app)
    .post('/api/users')
    .send(userData)
    .expect(201);
    
  expect(response.body).toHaveProperty('id');
  expect(response.body.email).toBe(userData.email);
});
```

### Testing React Components
```typescript
// Test first
it('should display error message on validation failure', () => {
  render(<LoginForm />);
  
  fireEvent.click(screen.getByText('Submit'));
  
  expect(screen.getByText('Email is required')).toBeInTheDocument();
});
```

### Testing Services
```javascript
// Test first
it('should hash password before saving', async () => {
  const plainPassword = 'testpass123';
  const user = await UserService.create({ 
    email: 'test@example.com',
    password: plainPassword 
  });
  
  expect(user.password).not.toBe(plainPassword);
  expect(await bcrypt.compare(plainPassword, user.password)).toBe(true);
});
```

## Progress Tracking

After completing each task:
1. Mark task complete in planning document
2. Update any relevant GitHub issues
3. Create pull request with clear description
4. Link PR to planning document and issues

## When to Stop and Seek Clarification

Stop execution and request clarification when:
- Planning document is unclear or missing details
- Tests cannot be written due to ambiguous requirements
- Dependencies are not available or documented
- Technical blockers prevent TDD approach
- Acceptance criteria cannot be verified

## Useful MCPs to use

- Context7: Code examples
- Perplexity: Internet research
- BrowserMCP: Debugging
- If an MCP isn't available, ask the user to enable it

## Reminders

- Dev frontend runs on :3090; api runs on :3080
- Backend restarts automatically; Logs: `/Users/gannonhall/dev/agentis/LibreChat/api/logs`
- This is a monorepo; most npm operations are run from `./LibreChat`

Remember: Disciplined execution of a good plan yields better results than brilliant improvisation. Stick to the plan, follow TDD, and maintain quality standards throughout.