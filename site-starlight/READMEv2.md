# Agentis Documentation Site

Marketing and end-user documentation for [Agentis](https://agentis.ai), an all-in-one AI conversations platform that integrates multiple AI models into a single chat interface.

## 📋 Current Status

This documentation site is in **initial setup phase**. It's a fresh Starlight installation that needs to be customized for Agentis:

- [ ] Update site title and branding
- [ ] Configure navigation structure  
- [ ] Migrate existing documentation content
- [ ] Add Agentis-specific styling
- [ ] Set up deployment pipeline
- [ ] Configure custom domain

## 🎯 Purpose

This site serves as the primary documentation hub for Agentis users:

- **Marketing Pages**: Product features, pricing, use cases
- **Getting Started**: Quick start guides, installation, first steps
- **User Guides**: Detailed tutorials and how-to articles
- **API Reference**: Technical documentation for developers
- **Support**: FAQ, troubleshooting, contact information

## 🚀 Tech Stack

- **[Astro](https://astro.build)** (v5.6.1) - Fast static site generator
- **[Starlight](https://starlight.astro.build/)** (v0.34.3) - Documentation-focused theme
- **[Flexoki Theme](https://delucis.github.io/starlight-theme-flexoki/)** (v0.1.0) - Clean visual design
- **TypeScript** - Type-safe development
- **MDX** - Enhanced markdown with component support

## 📁 Project Structure

```
site-starlight/
├── public/                  # Static assets
│   └── favicon.svg         # Site favicon
├── src/
│   ├── assets/             # Images for content
│   │   └── houston.webp    # Placeholder image
│   ├── content/
│   │   └── docs/           # All documentation content
│   │       ├── guides/     # Step-by-step tutorials
│   │       │   └── example.md
│   │       ├── reference/  # Technical documentation
│   │       │   └── example.md
│   │       └── index.mdx   # Homepage
│   └── content.config.ts   # Content collection setup
├── astro.config.mjs        # Site configuration
├── package.json            # Dependencies
└── tsconfig.json          # TypeScript config
```

## 🛠️ Development

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 10.x or higher
- **Git**: For version control

### Quick Start

```bash
# Clone the repository
git clone https://github.com/gannonh/agentis.git
cd agentis/site-starlight

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:4321
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready static site |
| `npm run preview` | Preview production build locally |
| `npm run astro add` | Add Astro integrations |
| `npm run astro check` | Check for TypeScript errors |

## 📝 Content Management

### Creating Pages

1. **Add markdown file** to `src/content/docs/`
2. **Include frontmatter**:
   ```yaml
   ---
   title: Your Page Title
   description: SEO description (155 chars max)
   sidebar:
     order: 1
     badge: 
       text: NEW
       variant: success
   ---
   ```

3. **Write content** using markdown or MDX

### Content Guidelines

- **Voice**: Professional yet approachable
- **Structure**: Clear headings, short paragraphs, bullet points
- **Examples**: Include code snippets and real-world scenarios
- **Accessibility**: Use proper heading hierarchy, alt text for images
- **SEO**: Descriptive titles, meta descriptions, meaningful URLs

### Using Components

```mdx
import { Card, CardGrid, Tabs, TabItem, Aside, Steps } from '@astrojs/starlight/components';

<Aside type="tip">
  Pro tip: Use components to enhance documentation!
</Aside>

<Steps>
1. First step
2. Second step
3. Final step
</Steps>
```

## 🎨 Customization Tasks

### 1. Update Site Configuration

Edit `astro.config.mjs`:

```javascript
export default defineConfig({
  site: 'https://docs.agentis.ai',
  integrations: [
    starlight({
      title: 'Agentis Documentation',
      logo: {
        src: './src/assets/agentis-logo.svg',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/gannonh/agentis' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.gg/agentis' },
      ],
      editLink: {
        baseUrl: 'https://github.com/gannonh/agentis/edit/main/site-starlight/',
      },
    }),
  ],
});
```

### 2. Configure Navigation

```javascript
sidebar: [
  {
    label: 'Getting Started',
    items: [
      { label: 'Introduction', link: '/introduction' },
      { label: 'Quick Start', link: '/quickstart' },
      { label: 'Installation', link: '/installation' },
    ],
  },
  {
    label: 'User Guide',
    autogenerate: { directory: 'guides' },
  },
  {
    label: 'API Reference',
    autogenerate: { directory: 'reference' },
  },
],
```

### 3. Add Custom Styling

Create `src/styles/custom.css` for Agentis branding.

## 🚢 Deployment

### Build Process

```bash
# Build the static site
npm run build

# Test the build locally
npm run preview
```

### Deployment Options

1. **GitHub Pages**
   - Free hosting for public repos
   - Configure in repo settings
   - Add workflow: `.github/workflows/deploy.yml`

2. **Vercel**
   - Automatic deploys from Git
   - Preview deployments for PRs
   - Edge network distribution

3. **Netlify**
   - Continuous deployment
   - Form handling and functions
   - Split testing capabilities

### Environment Variables

For production builds, set:

```bash
PUBLIC_SITE_URL=https://docs.agentis.ai
PUBLIC_GA_ID=UA-XXXXXXXX
```

## 🔍 SEO & Performance

### SEO Checklist

- [ ] Configure sitemap generation
- [ ] Add robots.txt rules
- [ ] Implement Open Graph tags
- [ ] Set canonical URLs
- [ ] Add structured data

### Performance Optimization

- [ ] Enable image optimization
- [ ] Configure caching headers
- [ ] Implement lazy loading
- [ ] Minimize JavaScript bundles
- [ ] Use CDN for assets

## 🧪 Quality Assurance

### Pre-deployment Checklist

- [ ] All links tested and working
- [ ] Mobile responsive design verified
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Search functionality working
- [ ] Analytics properly configured

### Testing Commands

```bash
# Check for broken links
npm run check-links

# Validate HTML
npm run validate-html

# Run lighthouse audit
npm run lighthouse
```

## 🤝 Contributing

### Workflow

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b docs/new-feature`
3. **Write** documentation following style guide
4. **Test** locally: `npm run dev`
5. **Build** and verify: `npm run build && npm run preview`
6. **Commit** with clear message: `docs: add installation guide`
7. **Push** and create pull request

### Style Guide

- Use American English spelling
- Write in present tense
- Use active voice
- Keep sentences concise
- Include examples

## 🐛 Troubleshooting

### Common Issues

**Development server not starting**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build failures**
```bash
# Check for TypeScript errors
npm run astro check

# Verify content collection
npm run astro sync
```

**404 errors in production**
- Ensure trailing slashes match configuration
- Check `base` path in astro.config.mjs
- Verify deployment URL settings

## 📚 Resources

### Documentation
- [Astro Docs](https://docs.astro.build)
- [Starlight Guide](https://starlight.astro.build/)
- [MDX Documentation](https://mdxjs.com/)

### Community
- [Agentis Discord](https://discord.gg/agentis)
- [GitHub Discussions](https://github.com/gannonh/agentis/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/agentis)

## 📄 License

This documentation is part of the Agentis project. See the [main LICENSE](../LICENSE) file for details.

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- [x] Initial Starlight setup
- [ ] Basic configuration
- [ ] Navigation structure

### Phase 2: Content Migration
- [ ] Migrate existing docs
- [ ] Create getting started guide
- [ ] Add API reference

### Phase 3: Enhancement
- [ ] Add search functionality
- [ ] Implement versioning
- [ ] Add interactive examples

### Phase 4: Launch
- [ ] Deploy to production
- [ ] Configure analytics
- [ ] Announce to community