# Agentis Documentation Site

This is the marketing and end-user documentation site for [Agentis](https://agentis.ai), an all-in-one AI conversations platform. Built with [Astro](https://astro.build) and the [Starlight](https://starlight.astro.build/) documentation theme.

## 🚀 Tech Stack

- **Framework**: [Astro](https://docs.astro.build/) - Static site generator
- **Theme**: [Starlight](https://starlight.astro.build/) - Documentation-focused theme
- **Styling**: [Flexoki Theme](https://delucis.github.io/starlight-theme-flexoki/) - Clean and modern design
- **Language**: TypeScript - Type-safe development
- **Content**: Markdown/MDX - Rich content with interactive components

## 📁 Project Structure

```
site-starlight/
├── public/                  # Static assets (favicons, robots.txt, etc.)
├── src/
│   ├── assets/             # Images and other assets for content
│   ├── content/
│   │   └── docs/           # Documentation content
│   │       ├── guides/     # How-to guides and tutorials
│   │       ├── reference/  # API and technical reference
│   │       └── index.mdx   # Homepage content
│   └── content.config.ts   # Content collection configuration
├── astro.config.mjs        # Astro configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

### Content Organization

- **`src/content/docs/`**: All documentation content lives here
- **File-based routing**: Each `.md` or `.mdx` file becomes a page route
- **Frontmatter**: Configure page title, description, and layout options
- **MDX Support**: Use React components within markdown files

## 🛠️ Development

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install
```

### Available Commands

| Command                   | Description                                      |
| :----------------------- | :----------------------------------------------- |
| `npm run dev`            | Start development server at `localhost:4321`     |
| `npm run build`          | Build production site to `./dist/`               |
| `npm run preview`        | Preview production build locally                 |
| `npm run astro ...`      | Run Astro CLI commands                          |

### Local Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:4321](http://localhost:4321) in your browser

3. Edit content in `src/content/docs/` - changes auto-refresh

## 📝 Writing Documentation

### Creating New Pages

1. Add a new `.md` or `.mdx` file in `src/content/docs/`
2. Include required frontmatter:

```markdown
---
title: Page Title
description: Brief description for SEO
---

Your content here...
```

### Using Components

Starlight provides built-in components for rich documentation:

```mdx
import { Card, CardGrid, Tabs, TabItem } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Feature 1" icon="rocket">
    Description of feature 1
  </Card>
  <Card title="Feature 2" icon="star">
    Description of feature 2
  </Card>
</CardGrid>
```

### Navigation Structure

Configure the sidebar navigation in `astro.config.mjs`:

```javascript
sidebar: [
  {
    label: 'Getting Started',
    items: [
      { label: 'Introduction', slug: 'intro' },
      { label: 'Installation', slug: 'install' },
    ],
  },
  {
    label: 'API Reference',
    autogenerate: { directory: 'reference' },
  },
]
```

## 🎨 Customization

### Theme Configuration

The site uses the Flexoki theme. Customize appearance in `astro.config.mjs`:

```javascript
starlight({
  plugins: [starlightThemeFlexoki()],
  title: 'Agentis Documentation',
  // Additional configuration...
})
```

### Social Links

Update social links in the configuration:

```javascript
social: [
  { icon: 'github', label: 'GitHub', href: 'https://github.com/gannonh/agentis' },
  { icon: 'x', label: 'Twitter', href: 'https://twitter.com/agentis' },
]
```

## 🚀 Deployment

### Building for Production

```bash
npm run build
```

This generates a static site in the `./dist/` directory.

### Deployment Options

- **Vercel**: Zero-config deployment with Git integration
- **Netlify**: Automatic deployments from Git
- **GitHub Pages**: Free hosting for public repositories
- **Static hosting**: Upload `dist/` to any static file server

## 🔗 Integration with Agentis

This documentation site is part of the larger Agentis monorepo:

- **Main Application**: `../LibreChat/` - The core AI chat platform
- **Documentation**: `../docs/` - Internal documentation and notes
- **Scripts**: `../scripts/` - Utility scripts for development

## 📚 Resources

- [Astro Documentation](https://docs.astro.build)
- [Starlight Documentation](https://starlight.astro.build/)
- [Flexoki Theme Guide](https://delucis.github.io/starlight-theme-flexoki/)
- [MDX Documentation](https://mdxjs.com/)

## 🤝 Contributing

1. Create feature branch from `main`
2. Write or update documentation
3. Test locally with `npm run dev`
4. Build and preview with `npm run build && npm run preview`
5. Submit pull request

## 📄 License

This documentation site is part of the Agentis project. See the main project LICENSE for details.