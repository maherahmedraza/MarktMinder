# Contributing to MarktMinder

Welcome! This document outlines the technical standards and workflows for contributing to MarktMinder.

---

## 🌳 Branching Strategy

We follow a modified **GitFlow** model focused on stability and clear audit trails.

| Branch | Purpose | Stability |
|--------|---------|-----------|
| `main` | Production-ready code only. | 🟢 Stable |
| `feature/*` | Individual feature development. | 🟡 Active |
| `fix/*` | Critical bug fixes. | 🟡 Active |
| `refactor/*` | Code quality and design improvements. | 🟡 Active |

---

## 🛠️ Contribution Workflow

### 1. Create a Branch
Always create a new branch for your work.
```bash
git checkout -b feature/your-feature-name
```

### 2. Commit Standards
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting/styling
- `refactor:` for code changes that neither fix a bug nor add a feature

### 3. Pull Request Process
1. **Push** your branch to the remote repository.
2. **Open a PR** against the `main` branch.
3. **Fill the Template**: Ensure the PR template is fully completed.
4. **CI Validation**: Wait for the automated CI pipeline to pass.
5. **Review**: All PRs require at least one approval (if working in a team).

---

## 📐 Coding Standards

### Frontend (React/Next.js)
- Use functional components and hooks.
- Follow the "Luminous Void" design system tokens in `globals.css`.
- Use `lucide-react` for iconography.
- Favor `GlassCard` and `GlowButton` for consistent UI.

### Backend (Node.js/Express)
- Use TypeScript for all new logic.
- Document new endpoints in the Swagger/OpenAPI registry.
- Maintain comprehensive logging via the built-in winston wrapper.

---

## 🧪 Testing Requirements

- **Visual**: Verify changes in both Light and Dark modes.
- **Responsive**: Ensure the design works from mobile (375px) to ultra-wide.
- **Regression**: Pass `npm run build` locally before pushing.

---

*Thank you for making MarktMinder better!*
