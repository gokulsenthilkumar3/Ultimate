# Contributing to FinSync Super

Thank you for your interest in contributing to FinSync Super! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

---

## Getting Started

### Prerequisites
- Node.js 22.0+
- npm 10.0+
- Git
- Firebase CLI
- Expo CLI (for mobile development)

### Initial Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/finsync-super.git
   cd finsync-super
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Fill in your API keys and secrets
   ```

4. **Start Development**
   ```bash
   # Start all services
   npm run dev
   
   # Or start individually
   npm run web:dev      # Web app
   npm run mobile:dev   # Mobile app
   npm run backend:dev  # Backend API
   ```

---

## Development Workflow

### Branch Naming Convention

- **Feature**: `feat/feature-name` (e.g., `feat/transaction-parser`)
- **Bug Fix**: `fix/bug-description` (e.g., `fix/login-error`)
- **Documentation**: `docs/what-changed` (e.g., `docs/api-guide`)
- **Refactor**: `refactor/component-name` (e.g., `refactor/dashboard`)
- **Test**: `test/test-description` (e.g., `test/auth-endpoints`)

### Workflow Steps

1. **Create a Branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation

3. **Test Locally**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add transaction parser"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create Pull Request**
   - Go to GitHub and create a PR
   - Fill in the PR template
   - Link related issues

---

## Code Standards

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Strict mode** enabled
- **ESLint** rules must pass
- **Prettier** formatting enforced

**Example:**
```typescript
// Good
interface Transaction {
  id: string;
  amount: number;
  category: string;
}

const parseTransaction = async (sms: string): Promise<Transaction> => {
  // Implementation
};

// Bad
function parseTransaction(sms) {
  // No types, not async
}
```

### React Components

- **Functional components** with hooks
- **Props typed** with interfaces
- **Named exports** preferred
- **File structure**: One component per file

**Example:**
```typescript
// components/TransactionCard.tsx
import React from 'react';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (id: string) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onEdit,
}) => {
  return (
    <div className="transaction-card">
      {/* Component content */}
    </div>
  );
};
```

### Styling

- **Tailwind CSS** utility classes
- **Mobile-first** responsive design
- **Dark mode** support required
- **Avoid inline styles**

**Example:**
```tsx
<button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg dark:bg-green-700">
  Submit
</button>
```

### File Organization

```
apps/web/
├── app/                 # Next.js app directory
│   ├── (auth)/         # Auth route group
│   ├── dashboard/      # Dashboard routes
│   └── api/            # API routes
├── components/         # Reusable components
│   ├── ui/            # Base UI components
│   └── features/      # Feature-specific components
├── lib/               # Utilities, helpers
├── hooks/             # Custom React hooks
└── types/             # TypeScript types
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

**Feature:**
```
feat(parser): add support for ICICI bank SMS

- Implement regex pattern for ICICI format
- Add unit tests with 10 sample messages
- Update parser documentation

Closes #123
```

**Bug Fix:**
```
fix(auth): resolve login redirect loop

The issue was caused by incorrect token validation.
Fixed by updating the JWT middleware.

Fixes #456
```

**Documentation:**
```
docs(api): update Firebase setup guide

Added section on emulator configuration
```

---

## Pull Request Process

### PR Template

When creating a PR, fill out this template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least 1 approval required
3. **Testing**: QA team tests on staging
4. **Approval**: Product owner final approval
5. **Merge**: Squash and merge to main

### Review Criteria

Reviewers will check:
- Code quality and readability
- Test coverage
- Performance impact
- Security concerns
- Documentation updates
- Breaking changes

---

## Testing Requirements

### Unit Tests

- **Coverage**: Minimum 80% for new code
- **Framework**: Jest
- **Location**: `__tests__` folder or `.test.ts` suffix

**Example:**
```typescript
// parseTransaction.test.ts
import { parseTransaction } from './parseTransaction';

describe('parseTransaction', () => {
  it('should parse HDFC SMS correctly', async () => {
    const sms = 'Your A/c XX1234 debited Rs.450 on 01-Nov-25...';
    const result = await parseTransaction(sms);
    
    expect(result.amount).toBe(450);
    expect(result.type).toBe('debit');
    expect(result.merchant).toBe('HDFC Bank');
  });
});
```

### Integration Tests

- Test API endpoints
- Test database operations
- Test third-party integrations

### E2E Tests

- **Framework**: Cypress (web), Detox (mobile)
- **Critical flows**: Login, transaction parsing, dashboard load

---

## Documentation

### Code Documentation

- **JSDoc comments** for public functions
- **README** in each major directory
- **Inline comments** for complex logic

**Example:**
```typescript
/**
 * Parses a transaction from SMS text using AI
 * @param smsText - Raw SMS message
 * @returns Parsed transaction object
 * @throws Error if parsing fails
 */
export async function parseTransaction(smsText: string): Promise<Transaction> {
  // Implementation
}
```

### API Documentation

- Document all endpoints in `docs/api/`
- Include request/response examples
- Note authentication requirements

### User Documentation

- Update user guides for new features
- Add screenshots/videos where helpful
- Keep FAQs updated

---

## Questions or Issues?

- **Slack**: #finsync-dev channel
- **Email**: dev@finsyncsuper.com
- **GitHub Issues**: For bug reports and feature requests

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (Proprietary - see LICENSE file).

---

**Thank you for contributing to FinSync Super!** 🚀
