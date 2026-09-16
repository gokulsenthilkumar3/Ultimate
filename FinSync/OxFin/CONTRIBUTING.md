# CONTRIBUTING.md

# Contributing to OxFin

Thank you for your interest in contributing to OxFin! We welcome contributions from the community and are excited to work with you to improve our financial platform.

## Code of Conduct

### Our Pledge
We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
Examples of behavior that contributes to a positive environment:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior:
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## How to Contribute

### Reporting Issues

**Before submitting an issue:**
1. Check existing issues to avoid duplicates
2. Ensure you're using the latest version
3. Include detailed reproduction steps
4. Provide relevant environment information

**Issue Template:**
```markdown
## Description
[Clear and concise description of the issue]

## Steps to Reproduce
1. [First Step]
2. [Second Step]
3. [Expected vs Actual Behavior]

## Environment
- OS: [e.g., Windows 10, macOS 12.0]
- Browser: [e.g., Chrome 98.0.4758.102]
- Node.js Version: [e.g., 18.12.0]
- Package Version: [e.g., 1.2.0]

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Screenshots
[If applicable, add screenshots to help explain your problem]
```

### Feature Requests

**Before submitting a feature request:**
1. Check existing feature requests
2. Explain the problem you're trying to solve
3. Describe the proposed solution
4. Consider alternative approaches

**Feature Request Template:**
```markdown
## Problem Statement
[Clear description of the problem]

## Proposed Solution
[Detailed description of your proposed solution]

## Alternatives Considered
[Other approaches you've considered]

## Additional Context
[Any additional information, mockups, or screenshots]
```

### Pull Requests

#### Getting Started
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/oxfin.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit following our guidelines
6. Push to your fork
7. Create a Pull Request

#### Pull Request Process

**PR Requirements:**
- [ ] Follows coding standards
- [ ] Includes tests for new functionality
- [ ] Updates documentation as needed
- [ ] Passes all CI checks
- [ ] Has been reviewed by team members
- [ ] Addresses related issues (closes #issue-number)

**PR Template:**
```markdown
## Description
[Detailed description of changes]

## Related Issue
Closes #[issue-number]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Browser testing

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective
- [ ] New and existing unit tests pass locally

## Screenshots
[If applicable, add screenshots showing the changes]
```

## Development Guidelines

### Code Standards

#### TypeScript Guidelines
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ❌ Avoid
const user: any = {
  id: 1,
  name: 'John',
  // Missing type safety
};
```

#### React Component Structure
```typescript
// ✅ Good component structure
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  onClick,
  className,
  ...props
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        {
          'bg-blue-600 text-white': variant === 'primary',
          'bg-gray-100 text-gray-900': variant === 'secondary',
          'hover:bg-gray-50': variant === 'ghost',
        },
        {
          'px-4 py-2 text-sm': size === 'sm',
          'px-6 py-3 text-base': size === 'md',
          'px-8 py-4 text-lg': size === 'lg',
        },
        className
      )}
      disabled={isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : (
        children
      )}
    </button>
  );
}
```

#### API Route Standards
```typescript
// ✅ Good API route structure
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { z } from 'zod';

const TransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(255),
  category: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = TransactionSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          issues: result.error.issues 
        },
        { status: 400 }
      );
    }

    // Business logic here
    const transaction = await createTransaction({
      ...result.data,
      userId: session.user.id
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Transaction API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Testing Requirements

#### Unit Testing
```typescript
// Example test structure
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });
});
```

#### Integration Testing
```typescript
// API route testing
import { POST } from '@/app/api/transactions/route';
import { createMockRequest } from '@/lib/test-utils';

describe('Transactions API', () => {
  it('creates transaction successfully', async () => {
    const mockSession = { user: { id: '123' } };
    const mockRequest = createMockRequest({
      method: 'POST',
      body: { amount: 100, description: 'Test transaction' },
      session: mockSession
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('transaction');
  });
});
```

### Documentation Standards

#### Code Comments
```typescript
// ✅ Good comments
/**
 * Calculates compound interest for investment
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (percentage)
 * @param time - Investment duration in years
 * @param compoundFrequency - Compounding periods per year
 * @returns Final amount after compound interest
 */
function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundFrequency: number = 12
): number {
  // Formula: A = P(1 + r/n)^(nt)
  const rateDecimal = rate / 100;
  const result = principal * Math.pow(
    1 + (rateDecimal / compoundFrequency),
    compoundFrequency * time
  );
  
  return Math.round(result * 100) / 100; // Round to 2 decimal places
}
```

#### API Documentation
```typescript
/**
 * Transfer funds between user wallets
 * 
 * @route POST /api/user/transfer
 * @param {string} fromWalletId - Source wallet ID
 * @param {string} toWalletId - Destination wallet ID
 * @param {number} amount - Transfer amount
 * @param {string} description - Transaction description
 * 
 * @returns {Object} Transfer result
 * @throws {400} Invalid transfer parameters
 * @throws {401} Unauthorized access
 * @throws {404} Wallet not found
 * @throws {400} Insufficient funds
 * 
 * @example
 * // Request
 * {
 *   "fromWalletId": "1",
 *   "toWalletId": "2",
 *   "amount": 500.00,
 *   "description": "Monthly savings transfer"
 * }
 * 
 * // Response
 * {
 *   "message": "Transfer successful",
 *   "amount": 500.00,
 *   "fromWalletId": "1",
 *   "toWalletId": "2",
 *   "transactionId": "tx_123456"
 * }
 */
```

## Security Contributions

### Security Bug Reporting
**For security vulnerabilities:**
1. **Do NOT** create public GitHub issues
2. Email security@oxfin.com directly
3. Include detailed vulnerability description
4. Provide reproduction steps if possible
5. Allow time for responsible disclosure

### Security Best Practices
- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication/authorization
- Keep dependencies up to date
- Follow OWASP security guidelines

## Performance Contributions

### Performance Optimization Guidelines
- Profile before optimizing
- Focus on user-perceived performance
- Consider mobile performance
- Optimize critical rendering path
- Implement proper caching strategies
- Minimize bundle size

### Performance Testing
```bash
# Run performance tests
npm run test:performance

# Bundle analysis
npm run analyze

# Lighthouse testing
npm run test:lighthouse
```

## Review Process

### Code Review Checklist
Reviewers should verify:
- [ ] Code follows project standards
- [ ] Tests are comprehensive and passing
- [ ] Documentation is updated
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Error handling is proper
- [ ] Edge cases are covered

### Review Timeline
- **Small changes** (bug fixes): 24-48 hours
- **Medium changes** (new features): 3-5 days
- **Large changes** (architecture): 1-2 weeks

## Community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **Email**: support@oxfin.com for general inquiries
- **Security**: security@oxfin.com for security issues
- **Discord**: Community discussions (if available)

### Recognition
Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Given appropriate credit for their work
- Considered for swag and recognition programs

## License

By contributing to OxFin, you agree that your contributions will be licensed under the project's license.

---

*Thank you for contributing to OxFin! Your efforts help make financial technology more accessible and secure for everyone.*