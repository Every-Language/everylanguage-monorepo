# Code Quality Tools Guide

## Overview

This project uses ESLint, Prettier, and Husky to maintain consistent code quality and formatting. These tools automatically run on every commit to ensure code standards are maintained across the team.

## Tools Setup

### ESLint - Code Linting

**Purpose**: Catches bugs, enforces coding standards, and maintains consistency.

**Configuration**: `eslint.config.js`

**Usage**:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors where possible
npm run lint:fix
```

### Prettier - Code Formatting

**Purpose**: Automatically formats code to maintain consistent style.

**Configuration**: `.prettierrc.js`

**Usage**:

```bash
# Format all files
npm run format

# Check if files need formatting
npm run format:check
```

### Husky - Git Hooks

**Purpose**: Runs quality checks automatically before commits.

**Configuration**: `.husky/pre-commit`

## Developer Workflow

### Daily Development

1. **Write code** - Focus on functionality, don't worry about formatting
2. **Save files** - Most editors auto-format on save if configured
3. **Commit changes** - Pre-commit hooks automatically run
4. **Fix issues** - If hooks fail, fix the reported issues and commit again

### Before Creating a Pull Request

```bash
# Run full linting check
npm run lint

# Format all files
npm run format

# Verify everything is clean
npm run lint
npm run format:check

# Test development server (optional)
npm start
```

## Editor Integration

### VS Code / Cursor

Install these extensions:

- **ESLint** - Highlights linting errors in real-time
- **Prettier** - Formats code on save

## Best Practices

### Writing Clean Code

1. **Use meaningful variable names**
2. **Keep functions small and focused**
3. **Remove unused imports and variables**
4. **Use TypeScript types properly**
5. **Write self-documenting code**

### Handling Warnings

- **Address ESLint warnings** - They often indicate potential bugs
- **Don't disable rules without reason** - If you must, add a comment explaining why
- **Clean up console.log statements** - Use proper logging in production

### Team Collaboration

- **Don't commit code quality fixes with feature changes** - Keep them separate
- **Run checks locally before pushing** - Don't rely only on pre-commit hooks
