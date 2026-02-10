---
name: review-pr
description: Review Pull Request
disable-model-invocation: true
---

# Review Pull Request

Comprehensive review of a pull request or branch, including code analysis, automated testing, and merge recommendation.

## Context

This is the Every Language monorepo:

- **Stack**: React 19, TypeScript 5.8, TailwindCSS, TanStack Query 5.83, Zustand 5.0, Supabase (Postgres 17), Deno Edge Functions
- **Project Rules**: See `.cursor/rules/` for frontend, backend, testing guidelines
- **Quality Gate**: `pnpm run ci:pr` must pass for merge readiness
- **Branch Strategy**: All PRs merge to `develop` (or `main` for production)

## Workflow

### 1. Identify PR or Branch

**Get PR Number or Branch Name:**

- If user provides PR number (e.g., `/review-pr 115`): Use GitHub CLI to fetch PR details
- If user provides branch name: Check if branch exists locally or remotely
- If no input: Check current branch and look for associated PR

**Fetch PR Details:**

```bash
# If PR number provided
gh pr view {pr_number} --json number,title,body,state,author,baseRefName,headRefName,files,commits,reviews,comments

# If branch name provided, find associated PR
gh pr list --head {branch_name} --json number,title,body,state
```

**Extract Information:**

- PR number, title, description
- Base branch (should be `develop` or `main`)
- Head branch (feature branch)
- Author
- Files changed
- Commit history
- Existing reviews and comments
- CI/CD status

### 2. Checkout and Prepare Branch

**Save Current State:**

- Check current branch: `git branch --show-current`
- Check for uncommitted changes: `git status --porcelain`
- If uncommitted changes exist: Warn user but continue (don't stash automatically)

**Checkout PR Branch:**

```bash
# Fetch latest from remote
git fetch origin

# If PR number provided, checkout the PR branch
gh pr checkout {pr_number}

# If branch name provided
git checkout {branch_name}

# Pull latest changes
git pull origin {branch_name}
```

**Verify Branch State:**

- Confirm you're on the correct branch
- Check if branch is up to date with base branch
- Note any merge conflicts or divergence

### 3. Analyze PR Metadata

**Review PR Description:**

- Check for clear problem statement and solution
- Verify acceptance criteria are documented
- Look for testing notes or manual testing instructions
- Check for `fixes {issue_id}` tags linking to Linear issues
- Identify any breaking changes mentioned

**Check PR Size:**

```bash
# Count lines changed
git diff --stat origin/{base_branch}...HEAD

# Count files changed
git diff --name-only origin/{base_branch}...HEAD | wc -l
```

**Assess PR Size:**

- **Small (< 200 lines)**: Quick review, likely safe to merge
- **Medium (200-400 lines)**: Standard review, check for logical grouping
- **Large (400-800 lines)**: Thorough review, may need splitting
- **Very Large (> 800 lines)**: Flag as potentially risky, recommend splitting

**Check Commit History:**

```bash
git log origin/{base_branch}..HEAD --oneline
```

- Verify commits follow conventional commit format
- Check for logical commit grouping
- Look for `ref {issue_id}` tags in commit messages
- Identify any "WIP" or "fixup" commits that should be squashed

### 4. Review Code Changes

**Get List of Changed Files:**

```bash
git diff --name-only origin/{base_branch}...HEAD
```

**Categorize Changes:**

- **Frontend**: Components, hooks, stores, types in `apps/*/src/`
- **Backend**: Migrations, Edge Functions, RLS policies in `supabase/`
- **Types**: Database types in `packages/shared-types/`
- **Config**: Package.json, tsconfig, workflow files
- **Tests**: Test files (_.test.ts, _.test.tsx, \*.spec.ts)

**Review Each Category:**

**For Frontend Changes:**

- Check component structure and organization
- Verify proper use of React hooks (no violations)
- Check state management patterns (Zustand, TanStack Query)
- Verify TypeScript types are explicit (no `any`)
- Check for proper error handling
- Verify accessibility considerations
- Check for performance issues (unnecessary re-renders, missing memoization)
- Verify TailwindCSS usage follows project patterns
- Check file size (should be < 800 lines per project rules)

**For Backend Changes:**

- Review migrations for idempotency (see backend.mdc)
- Check RLS policies are properly defined
- Verify Edge Functions have proper error handling
- Check for SQL injection vulnerabilities
- Verify migrations don't break existing data
- Check for proper indexes on new tables/columns
- Verify environment variable usage

**For Type Changes:**

- Check if types are properly generated from database
- Verify no manual type modifications that will be overwritten
- Check for breaking type changes

**For Test Changes:**

- Verify tests cover new functionality
- Check for edge cases and error scenarios
- Verify test naming and organization
- Check test coverage isn't decreasing

**Code Quality Checks:**

```bash
# Check for TODO/FIXME comments in changed files
git diff origin/{base_branch}...HEAD | grep -E "TODO|FIXME|XXX|HACK" || echo "No TODOs found"

# Check for console.log statements (should be removed in production code)
git diff origin/{base_branch}...HEAD | grep -E "console\.(log|debug|warn|error)" || echo "No console statements"

# Check for commented-out code
git diff origin/{base_branch}...HEAD | grep -E "^\+.*//.*(code|function|class)" || echo "No commented code"

# Check for large files (> 800 lines)
git diff --name-only origin/{base_branch}...HEAD | while read file; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file" 2>/dev/null || echo "0")
    if [ "$lines" -gt 800 ]; then
      echo "⚠️  Large file: $file ($lines lines)"
    fi
  fi
done
```

**Review Specific Files:**

For each changed file, check:

1. **Naming**: Follows project conventions
2. **Structure**: Logical organization, single responsibility
3. **Imports**: Proper imports, no circular dependencies
4. **Types**: Explicit types, no `any`
5. **Error Handling**: Proper try/catch, error boundaries
6. **Documentation**: JSDoc/TSDoc for complex functions
7. **Testing**: Related test files exist and are updated

### 5. Check for Common Issues

**Security Issues:**

- Check for hardcoded secrets or API keys
- Verify input validation and sanitization
- Check for SQL injection risks in raw queries
- Verify authentication/authorization checks
- Check for XSS vulnerabilities in frontend code
- Review dependency updates for security vulnerabilities

**Performance Issues:**

- Check for N+1 query problems
- Verify proper pagination for large datasets
- Check for memory leaks (event listeners, subscriptions)
- Verify proper cleanup in useEffect hooks
- Check for unnecessary re-renders

**Architecture Issues:**

- Verify changes align with project architecture
- Check for tight coupling or circular dependencies
- Verify proper separation of concerns
- Check for code duplication
- Verify changes don't break existing patterns

**Breaking Changes:**

- Check for API changes (function signatures, props)
- Verify database schema changes are backward compatible
- Check for environment variable changes
- Verify migration rollback strategy

**Project-Specific Issues:**

- Check file size limits (< 800 lines per general.mdc)
- Verify migrations are idempotent (backend.mdc)
- Check for proper RLS policies on new tables
- Verify tests follow testing.mdc patterns
- Check for proper Linear issue references in commits

### 6. Run Automated Quality Checks

**Run Full CI Pipeline:**

```bash
pnpm run ci:pr
```

This runs (mirroring CI workflow):

1. **Format check** (all workspaces)
2. **Lint** (all workspaces)
3. **Type check** (all workspaces)
4. **Tests with coverage** (all workspaces)
5. **Build** (all workspaces)
6. **Backend checks** (if backend changed: Supabase start, tests, Deno type-check)
7. **App-specific validation** (App Bible managed workflow check)
8. **Security audit** (`pnpm audit --audit-level high`)

**Capture Results:**

- Note which checks passed/failed
- Capture error messages for failed checks
- Check test coverage changes
- Note any security vulnerabilities

**If Checks Fail:**

- Identify root cause of failures
- Categorize failures:
  - **Blocking**: Must fix before merge (lint errors, type errors, test failures)
  - **Non-blocking**: Should fix but not critical (formatting, warnings)
- Provide specific fix recommendations

### 7. Check Test Coverage

**Analyze Test Changes:**

```bash
# Check if new code has corresponding tests
git diff --name-only origin/{base_branch}...HEAD | grep -E "\.(ts|tsx)$" | while read file; do
  test_file="${file%.*}.test.${file##*.}"
  if [ ! -f "$test_file" ]; then
    echo "⚠️  No test file found for: $file"
  fi
done
```

**Review Test Quality:**

- Verify tests cover happy paths
- Check for edge case coverage
- Verify error scenario testing
- Check for proper test isolation
- Verify tests are maintainable

**Check Coverage Changes:**

- If coverage report available, note any decreases
- Verify new features have adequate coverage
- Check critical paths are well-tested

### 8. Check for Merge Conflicts

**Verify Base Branch Compatibility:**

```bash
# Fetch latest base branch
git fetch origin {base_branch}

# Check if branch is behind base
git rev-list --left-right --count origin/{base_branch}...HEAD

# Check for potential conflicts
git merge-tree $(git merge-base HEAD origin/{base_branch}) HEAD origin/{base_branch} | grep -A 3 "changed in both" || echo "No conflicts detected"
```

**If Behind Base Branch:**

- Note how many commits behind
- Check if rebase/merge is needed
- Verify no conflicts exist

### 9. Review Related Linear Issues

**Extract Linear Issue IDs:**

- From PR description: Look for `fixes {issue_id}` patterns (e.g., `fixes EL-123`)
- From commit messages: Look for `ref {issue_id}` patterns (e.g., `ref EL-123`)
- From branch name: Extract issue ID if present (e.g., `EL-123-feature-name`)

**Check Linear MCP Availability:**

- Attempt to use Linear MCP to fetch issue details
- If Linear MCP is not available or fails: Note this limitation and skip detailed issue verification
- Continue with review but note that Linear issue verification was skipped

**Fetch Comprehensive Issue Details (if Linear MCP available):**

For each issue ID found, use Linear MCP to fetch:

- **Issue Title**: Full title
- **Issue Description**: Complete description with context
- **Issue Type**: Feature/Bug/Improvement/etc.
- **Status**: Current status (should be "In Progress" or "In Review" for active PRs)
- **Acceptance Criteria**: List of all acceptance criteria (may be in description or separate field)
- **Labels**: All labels (frontend/backend/fullstack, priority, etc.)
- **Assignee**: Who is assigned
- **Team**: Backend/Frontend/Fullstack
- **Related Project**: Any related project
- **Comments**: Recent comments that may have clarifications or additional requirements
- **Dependencies**: Related issues that must be completed first
- **Attachments**: Any design files, mockups, or documentation

**Analyze Issue Requirements:**

For each issue, extract and document:

1. **Core Requirements:**
   - What problem is being solved?
   - What is the expected outcome?
   - What are the key features/fixes needed?

2. **Acceptance Criteria:**
   - Parse acceptance criteria (may be in checklist format `- [ ]` or numbered list)
   - Create a checklist of all criteria
   - Note any criteria that are ambiguous or need clarification

3. **Technical Requirements:**
   - Frontend/Backend/Fullstack scope
   - Specific technologies or patterns mentioned
   - Performance requirements
   - Security considerations
   - Integration points

4. **Edge Cases and Constraints:**
   - Error handling requirements
   - Edge cases mentioned
   - Constraints or limitations
   - Breaking change considerations

**Map PR Changes to Issue Requirements:**

For each acceptance criterion and requirement:

1. **Identify Related Code Changes:**
   - Which files/changes address this criterion?
   - Are there tests that verify this criterion?
   - Is the implementation complete?

2. **Verify Coverage:**
   - ✅ **Fully Addressed**: Code changes clearly implement the requirement
   - ⚠️ **Partially Addressed**: Implementation exists but may be incomplete
   - ❌ **Not Addressed**: No code changes found for this requirement
   - ❓ **Unclear**: Cannot determine if requirement is met

3. **Check for Gaps:**
   - Are all acceptance criteria addressed?
   - Are there requirements in the issue description not covered by acceptance criteria?
   - Are there edge cases mentioned but not handled?
   - Are there comments with additional requirements not addressed?

**Verify Implementation Completeness:**

- **Scope Alignment**: Does the PR scope match the issue scope?
  - If issue is frontend-only, verify no unnecessary backend changes
  - If issue is backend-only, verify no unnecessary frontend changes
  - If issue is fullstack, verify both frontend and backend are addressed

- **Acceptance Criteria Coverage:**
  - Count how many criteria are fully addressed
  - Count how many are partially addressed
  - Count how many are not addressed
  - Calculate coverage percentage

- **Issue Status Verification:**
  - If issue status is "Done": Verify PR is ready to merge
  - If issue status is "In Review": Verify PR is ready for review
  - If issue status is "In Progress": Verify PR is complete enough for review
  - If issue status is "Backlog": Note that issue may not be ready

**Identify Missing Implementations:**

If gaps are found:

- List each missing requirement
- Explain why it's missing (not implemented, incomplete, or unclear)
- Recommend whether it should be:
  - **Blocking**: Must be addressed before merge
  - **Follow-up**: Can be addressed in a separate PR
  - **Out of Scope**: Not part of this issue

**Check for Over-Scope:**

- Are there changes in the PR not related to the Linear issue?
- If yes, verify they're intentional (e.g., refactoring, dependency updates)
- Note if PR includes unrelated changes that should be split

**Generate Issue Verification Summary:**

For each Linear issue, create a summary:

```markdown
### Linear Issue: {issue_id} - {issue_title}

**Issue Status**: {status}
**Issue Type**: {type}
**Scope**: {frontend/backend/fullstack}

**Acceptance Criteria Coverage**:

- ✅ Fully Addressed: {count}
- ⚠️ Partially Addressed: {count}
- ❌ Not Addressed: {count}
- **Coverage**: {percentage}%

**Requirements Verification**:

✅ **Fully Addressed**:

- {Requirement 1}: {How PR addresses it}
- {Requirement 2}: {How PR addresses it}

⚠️ **Partially Addressed**:

- {Requirement 3}: {What's missing or incomplete}

❌ **Not Addressed**:

- {Requirement 4}: {Why it's missing, recommendation}

**Gaps Identified**:

- {List any gaps between issue requirements and PR implementation}

**Recommendation**:

- {APPROVE if all criteria met / REQUEST CHANGES if gaps / NEEDS CLARIFICATION if unclear}
```

**If No Linear Issues Found:**

- Note that PR doesn't reference any Linear issues
- Verify if this is intentional (e.g., hotfix, refactoring)
- Recommend adding issue references if this is feature work

### 10. Check CI/CD Status

**Verify GitHub Actions Status:**

```bash
gh pr checks {pr_number} || gh run list --branch {branch_name}
```

- Check if all required checks passed
- Note any failed checks
- Verify checks are relevant to changes made
- Check for flaky tests or transient failures

### 11. Generate Review Summary

**Create Comprehensive Review Report:**

```markdown
## PR Review Summary: #{pr_number} - {pr_title}

### Overview

- **Author**: {author}
- **Base Branch**: {base_branch}
- **Head Branch**: {head_branch}
- **Files Changed**: {file_count}
- **Lines Changed**: {line_count} (+{additions} / -{deletions})
- **Commits**: {commit_count}

### PR Size Assessment

{Small/Medium/Large/Very Large} - {Assessment and recommendation}

### Code Quality

#### ✅ Strengths

- {List positive aspects}
- {Well-structured code}
- {Good test coverage}
- {Clear commit messages}

#### ⚠️ Issues Found

**Blocking Issues** (Must fix before merge):

1. {Issue description}
   - **File**: {file_path}
   - **Line**: {line_number}
   - **Severity**: {High/Medium/Low}
   - **Recommendation**: {How to fix}

**Non-Blocking Issues** (Should fix):

1. {Issue description}
   - **Recommendation**: {How to fix}

#### 🔍 Code Review Details

**Frontend Changes:**

- {Analysis of frontend changes}
- {Component quality}
- {State management}
- {Type safety}

**Backend Changes:**

- {Analysis of backend changes}
- {Migration safety}
- {RLS policies}
- {Edge Functions}

**Test Coverage:**

- {Test analysis}
- {Coverage assessment}
- {Missing tests}

### Automated Checks

#### Quality Gate Results

- ✅ Format: {Passed/Failed}
- ✅ Lint: {Passed/Failed}
- ✅ Type Check: {Passed/Failed}
- ✅ Tests: {Passed/Failed} ({test_count} tests)
- ✅ Build: {Passed/Failed}
- ✅ Security Audit: {Passed/Failed}

{If failed, include error details and fix recommendations}

### Security Review

- {Security findings}
- {Vulnerability assessment}
- {Recommendations}

### Performance Review

- {Performance considerations}
- {Potential bottlenecks}
- {Optimization suggestions}

### Architecture Review

- {Architectural alignment}
- {Design patterns}
- {Code organization}

### Merge Readiness Assessment

**Recommendation**: {APPROVE / REQUEST CHANGES / NEEDS E2E TESTING}

**Reasoning**: {Detailed explanation}

**Next Steps**:

1. {Action item 1}
2. {Action item 2}
3. {Action item 3}

### E2E Testing Instructions (if needed)

{If recommendation is "NEEDS E2E TESTING", provide detailed manual testing steps}

### Linear Issue Verification

**Issues Linked**: {list of issue IDs}

**Issue Coverage Summary**:
{For each issue, include verification summary from step 9}

**Overall Assessment**:

- ✅ All acceptance criteria met
- ⚠️ Some criteria partially met
- ❌ Missing requirements identified

**Recommendation**: {Based on issue verification}
```

### 12. Provide Final Recommendation

**Three Possible Outcomes:**

**1. APPROVE - Safe to Merge**

Criteria:

- All automated checks pass
- Code quality is good
- Tests are comprehensive
- No blocking issues
- PR size is reasonable
- No security concerns

**Action**: Recommend immediate merge

**2. NEEDS E2E TESTING**

Criteria:

- Automated checks pass
- Code looks good
- But changes affect critical user flows
- Or changes are complex/integration-heavy
- Or UI/UX changes need visual verification

**Action**: Provide detailed E2E testing instructions:

```markdown
## E2E Testing Required

### Setup

1. Checkout branch: `git checkout {branch_name}`
2. Install dependencies: `pnpm install`
3. Start dev environment: {specific commands}
4. Set up test data: {if needed}

### Test Scenarios

**Scenario 1: {Primary Use Case}**

1. {Step-by-step instructions}
2. Expected result: {what should happen}
3. Verify: {what to check}

**Scenario 2: {Edge Case}**

1. {Step-by-step instructions}
2. Expected result: {what should happen}

### Verification Checklist

- [ ] {Checklist item 1}
- [ ] {Checklist item 2}
- [ ] {Checklist item 3}

### If Tests Pass

- PR is ready to merge
- All automated checks already passed

### If Tests Fail

- Document issues found
- Create follow-up issues or fix in this PR
```

**3. REQUEST CHANGES**

Criteria:

- Blocking issues found (lint errors, type errors, test failures)
- Security vulnerabilities
- Architectural problems
- Missing tests
- Code quality issues that affect maintainability

**Action**: List all issues with specific recommendations:

```markdown
## Changes Required Before Merge

### Critical Issues (Must Fix)

1. **{Issue Title}**
   - **Location**: {file}:{line}
   - **Problem**: {description}
   - **Impact**: {why this matters}
   - **Fix**: {specific recommendation}
   - **Example**: {code example if helpful}

### Important Issues (Should Fix)

1. **{Issue Title}**
   - **Location**: {file}:{line}
   - **Recommendation**: {how to fix}

### After Fixes Applied

1. Re-run: `pnpm run ci:pr`
2. Verify all checks pass
3. Request re-review or re-run `/review-pr`
```

### 13. Post Review Comment (Optional)

**If PR exists and user wants comment posted:**

```bash
gh pr comment {pr_number} --body-file review-summary.md
```

**Or create inline code review comments:**

```bash
# For specific line comments
gh pr review {pr_number} --comment --body "{comment}" --line {line_number} --path {file_path}
```

## Success Criteria

- PR or branch successfully checked out
- All code changes reviewed comprehensively
- Linear issues verified (if MCP available) with acceptance criteria coverage analysis
- Automated quality checks executed
- Security and performance considerations evaluated
- Clear recommendation provided (APPROVE / NEEDS E2E TESTING / REQUEST CHANGES)
- Actionable next steps documented
- Review summary is clear and helpful

## Error Handling

- **If PR not found**: Verify PR number or branch name is correct
- **If checkout fails**: Check for uncommitted changes, provide resolution options
- **If `ci:pr` fails**: Document failures and provide fix recommendations
- **If GitHub CLI not available**: Provide manual review instructions
- **If branch diverged**: Note divergence and recommend rebase/merge
- **If Linear MCP fails or unavailable**: Continue review without Linear issue verification, note limitation in summary

## Important Notes

- **Objective Review**: Focus on code quality, not personal preferences
- **Constructive Feedback**: Provide actionable recommendations, not just criticism
- **Context Matters**: Consider the PR's scope and purpose when reviewing
- **Don't Merge Automatically**: This command reviews, it doesn't merge
- **E2E Testing**: Some changes require manual verification that automated tests can't cover
- **Security First**: Always flag security concerns, even if code looks good otherwise
- **File Size Limits**: Flag files > 800 lines per project rules
- **Breaking Changes**: Always document and verify breaking changes are intentional

## Review Checklist Reference

Use this checklist during review:

- [ ] PR size is reasonable (< 400 lines ideal, < 800 acceptable)
- [ ] Commits are logical and well-organized
- [ ] Code follows project conventions and style guide
- [ ] TypeScript types are explicit (no `any`)
- [ ] Tests cover new functionality
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Documentation updated if needed
- [ ] No breaking changes (or properly documented)
- [ ] Migration idempotency (if backend changes)
- [ ] RLS policies defined (if new tables)
- [ ] File sizes < 800 lines
- [ ] No TODO/FIXME comments (or intentional and documented)
- [ ] No console.log statements
- [ ] Proper error handling
- [ ] Accessibility considered (if UI changes)
- [ ] All automated checks pass
- [ ] Related Linear issues linked and verified
