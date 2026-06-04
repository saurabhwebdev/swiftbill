# Contributing to SwiftBill

Thank you for your interest in contributing to SwiftBill! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 20+ | Frontend tooling |
| PostgreSQL | 14+ | Database |
| Git | 2.30+ | Version control |

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/offlinepos.git
cd offlinepos
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create a local database
createdb offlinepos

# Apply migrations and seed roles
python manage.py migrate
python manage.py setup_roles
python manage.py createsuperuser

# Start the dev server
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

### 4. Verify Everything Works

- Open `http://localhost:5173` in your browser
- Log in with your superuser credentials
- Navigate through the main sections (Dashboard, POS, Products, Inventory)

---

## Code Style

### Python (Backend)

- Follow [PEP 8](https://peps.python.org/pep-0008/) conventions
- Maximum line length: 120 characters
- Use type hints where practical
- Write docstrings for all public functions, classes, and modules
- Import order: stdlib, third-party, Django, local apps (separated by blank lines)

```python
# Good
from typing import Optional

from django.db import models
from rest_framework import serializers

from apps.accounts.models import Store


def calculate_tax(amount: float, rate: float) -> float:
    """Calculate tax amount for a given base amount and rate."""
    return round(amount * rate / 100, 2)
```

### TypeScript (Frontend)

- Follow the project ESLint configuration
- Use TypeScript strict mode — avoid `any` types
- Prefer named exports over default exports
- Use functional components with hooks
- Keep components focused and under 200 lines where possible

```typescript
// Good
interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  // ...
}
```

### CSS / Styling

- Use Tailwind CSS utility classes as the primary styling method
- Use shadcn/ui components where applicable
- Avoid inline styles and custom CSS unless absolutely necessary
- Follow the responsive-first approach (`sm:`, `md:`, `lg:` breakpoints)

---

## Git Workflow

We use a **fork-and-branch** workflow:

1. **Fork** the repository to your GitHub account
2. **Clone** your fork locally
3. **Create a branch** from `main` for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** with clear, incremental commits
5. **Push** your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** against `main` on the upstream repository

### Branch Naming

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/bulk-product-import` |
| `fix/` | Bug fixes | `fix/receipt-alignment` |
| `refactor/` | Code restructuring | `refactor/sales-service` |
| `docs/` | Documentation only | `docs/api-endpoints` |
| `test/` | Adding or fixing tests | `test/inventory-adjustments` |

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

<optional body>

<optional footer>
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no code logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependency updates |

### Examples

```
feat(pos): add camera-based barcode scanning

fix(inventory): correct stock count after partial refund

docs(readme): add API endpoint reference table

refactor(sales): extract checkout logic into service layer
```

---

## Pull Request Process

### Before Submitting

- [ ] Your branch is up to date with `main`
- [ ] The application runs without errors
- [ ] All existing functionality still works (manual verification)
- [ ] New code follows the project's code style
- [ ] You have added/updated comments and docstrings where needed
- [ ] Database migrations are included if models changed
- [ ] No sensitive data (API keys, passwords) is committed

### PR Description Template

When opening a PR, please include:

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Bullet list of specific changes

## Testing
How you verified the changes work:
- Manual testing steps
- Edge cases considered

## Screenshots
If the PR includes UI changes, attach before/after screenshots.
```

### Review Process

1. A maintainer will review your PR within a few business days
2. Address any requested changes by pushing additional commits
3. Once approved, a maintainer will merge your PR
4. Your branch will be deleted after merging

---

## Issue Guidelines

### Bug Reports

When reporting a bug, include:

- **Summary** — A clear description of the problem
- **Steps to Reproduce** — Numbered steps to trigger the bug
- **Expected Behavior** — What should happen
- **Actual Behavior** — What actually happens
- **Environment** — Browser, OS, and any relevant configuration
- **Screenshots** — If applicable

### Feature Requests

When requesting a feature, include:

- **Problem** — What problem does this feature solve?
- **Proposed Solution** — How you envision the feature working
- **Alternatives** — Any alternative approaches you considered
- **Context** — Any additional context or mockups

---

## Questions?

If you have questions about contributing, feel free to open a GitHub Discussion or reach out to the maintainers.

Thank you for helping make SwiftBill better!
