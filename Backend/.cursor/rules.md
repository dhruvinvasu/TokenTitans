# Cursor Rules

## Primary Objective
- Always write production-ready, maintainable, and high-quality code.
- Think and act like a senior/staff software engineer.
- Prioritize correctness, readability, scalability, and performance.

---

# Before Starting

- Read this entire rules file before processing any request.
- Carefully read and understand the complete requirement.
- Think about the implementation before writing any code.
- If any requirement is unclear or ambiguous, ask for clarification before coding.
- Never make assumptions about business logic.

---

# Existing Codebase

- Follow the existing project architecture.
- Follow the existing folder structure.
- Follow the existing naming conventions.
- Follow the existing coding style.
- Follow the existing design patterns.
- Reuse existing utilities and helper functions whenever possible.
- Maintain consistency with the surrounding code.

Never introduce a different coding style unless explicitly requested.

---

# Code Quality

Always write:

- Clean code
- Modular code
- Readable code
- Reusable code
- Maintainable code
- Scalable code
- Production-ready code

Code should be easy for another developer to understand.

---

# Don't Break Existing Code

Do not modify unrelated code.

Do not:
- change existing functionality
- change existing behavior
- remove existing logic
- rename existing variables/functions unnecessarily
- change formatting unnecessarily
- change file structure unnecessarily

Only change what is required by the task.

---

# Reusability

Avoid duplicate code.

Always:
- reuse existing functions
- create common helper functions when logic is repeated
- keep business logic centralized
- avoid copy-paste implementations

Follow the DRY principle.

---

# Performance

Prefer efficient solutions.

Avoid:
- unnecessary loops
- unnecessary database queries
- unnecessary API calls
- unnecessary re-renders
- unnecessary state updates
- memory leaks

Optimize only where it improves performance without reducing readability.

---

# Error Handling

Handle:
- edge cases
- null values
- undefined values
- empty arrays
- invalid inputs
- unexpected failures

Never leave obvious runtime risks.

---

# Database

When writing database code:

- Write optimized queries.
- Avoid unnecessary reads.
- Avoid unnecessary writes.
- Use indexes where appropriate.
- Avoid N+1 query problems.
- Keep transactions safe.
- Never change data unintentionally.

---

# API Development

- Keep APIs backward compatible unless requested.
- Validate inputs.
- Return consistent responses.
- Handle errors properly.
- Keep controllers thin.
- Move business logic into services/helpers.

---

# Frontend

- Keep components small.
- Avoid unnecessary re-renders.
- Reuse components.
- Keep state minimal.
- Don't duplicate UI logic.
- Follow existing component structure.

---

# Backend

- Keep business logic separated.
- Keep functions focused on one responsibility.
- Write reusable services.
- Avoid large functions.
- Keep controllers lightweight.

---

# Naming

Use meaningful names.

Variable names should clearly describe their purpose.

Avoid:
- temp
- data
- obj
- arr
- test
- newData

unless appropriate.

---

# Comments

Write comments only when necessary.

Code should be self-explanatory.

Avoid obvious comments.

---

# Security

Never introduce security risks.

Always:
- validate inputs
- sanitize data where needed
- avoid exposing sensitive information
- avoid insecure implementations

---

# Logging

Do not add unnecessary logs.

Remove temporary debugging code before finishing.

Do not leave:
- console.log
- print
- debug statements

unless explicitly requested.

---

# Testing Yourself

Before finishing:

Verify:

- Requirement is fully implemented.
- Existing functionality is unaffected.
- No duplicate logic exists.
- Code follows the existing structure.
- No unnecessary changes were made.
- No unused imports remain.
- No dead code remains.
- No formatting issues exist.
- No lint issues exist.
- No obvious bugs exist.

If something does not satisfy the requirement, fix it before responding.

---

# Response Rules

Do not explain your implementation unless explicitly asked.

After completing the task successfully, respond only with:

DONE

If clarification is required before implementation, ask concise questions instead of writing code.

---

# General Principles

Always:

- Think before coding.
- Simplicity over complexity.
- Readability over cleverness.
- Reuse over duplication.
- Consistency over personal preference.
- Maintainability over shortcuts.
- Production quality over quick fixes.

---

# Never

- Never assume requirements.
- Never modify unrelated files.
- Never refactor code unless requested.
- Never remove existing functionality unless requested.
- Never introduce breaking changes.
- Never over-engineer a solution.
- Never add unnecessary dependencies.
- Never change code style unnecessarily.
- Never generate placeholder code unless requested.

---

# Goal

Every solution should:
- Solve exactly what was requested.
- Preserve existing behavior.
- Match the project's architecture.
- Be production-ready.
- Be clean, efficient, reusable, and maintainable.
```