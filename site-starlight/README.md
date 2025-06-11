# Agentis Marketing & Documentation Site

The public-facing marketing website and end-user documentation for Agentis—a commercial AI conversations platform. This site serves as the primary touchpoint for potential customers and existing users.

## 🎯 Purpose

This Starlight-based site provides:

### Marketing Content
- **Homepage**: Hero section, value propositions, social proof
- **Features**: Detailed product capabilities and benefits
- **Pricing**: Subscription tiers and enterprise options
- **Use Cases**: Industry-specific solutions and success stories
- **About**: Company mission, team, and contact information

### User Documentation
- **Getting Started**: Account setup, first conversations
- **User Guides**: How to use each feature effectively
- **Integrations**: Connecting with third-party services
- **FAQs**: Common questions and troubleshooting
- **Support**: Help center and contact options

## 🚀 Tech Stack

- **[Astro](https://astro.build)** - Static site generator for performance
- **[Starlight](https://starlight.astro.build/)** - Documentation-optimized theme
- **[Flexoki Theme](https://delucis.github.io/starlight-theme-flexoki/)** - Clean aesthetic
- **MDX** - Rich content with interactive components

## 📁 Content Structure

```
src/content/docs/
├── index.mdx                    # Landing page with hero
├── features/                    # Product capabilities
│   ├── ai-models.md            # Supported AI providers
│   ├── conversations.md         # Chat management
│   ├── integrations.md         # Third-party connections
│   └── collaboration.md        # Team features
├── pricing/                     # Subscription information
│   ├── plans.md                # Tier comparison
│   └── enterprise.md           # Custom solutions
├── getting-started/             # Onboarding flow
│   ├── create-account.md       # Sign up process
│   ├── first-conversation.md   # Initial setup
│   └── workspace-setup.md      # Configuration
├── guides/                      # How-to articles
│   ├── managing-conversations.md
│   ├── using-ai-models.md
│   ├── sharing-chats.md
│   └── team-collaboration.md
├── help/                        # Support section
│   ├── faq.md                  # Common questions
│   ├── troubleshooting.md      # Problem solving
│   └── contact.md              # Support channels
└── legal/                       # Compliance
    ├── terms.md                # Terms of service
    ├── privacy.md              # Privacy policy
    └── security.md             # Security practices
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 10+

### Quick Start
```bash
# Navigate to project
cd site-starlight

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 Customization Roadmap

### Phase 1: Foundation
- [ ] Update site title to "Agentis"
- [ ] Remove default content and GitHub references
- [ ] Configure navigation structure
- [ ] Add Agentis branding (logo, colors, fonts)

### Phase 2: Marketing Pages
- [ ] Design compelling homepage
- [ ] Create features showcase
- [ ] Build pricing comparison
- [ ] Add testimonials and case studies

### Phase 3: User Documentation
- [ ] Write getting started guide
- [ ] Create feature tutorials
- [ ] Document integrations
- [ ] Build FAQ section

### Phase 4: Polish
- [ ] SEO optimization
- [ ] Analytics integration
- [ ] Performance tuning
- [ ] Legal compliance

## 📝 Content Guidelines

### Voice & Tone
- **Professional** yet approachable
- **Benefits-focused** rather than feature-focused
- **Clear and concise** without technical jargon
- **Action-oriented** with clear next steps

### Writing Standards
- Use active voice
- Keep paragraphs short (3-4 sentences)
- Include visuals (screenshots, diagrams)
- Provide real-world examples
- Optimize for scanning

## 🚢 Deployment

### Build Process
```bash
npm run build
```

The static site will be generated in `./dist/`

### Hosting
- **Production**: `www.agentis.ai`
- **Documentation**: `help.agentis.ai`
- **CDN**: CloudFront or similar for global performance

### Performance Targets
- Lighthouse score: 95+
- Core Web Vitals: All green
- Page load: <2 seconds

## 📊 Success Metrics

### Marketing
- Visitor-to-trial conversion rate
- Time on site
- Organic traffic growth
- Bounce rate

### Documentation
- Search success rate
- Page helpfulness ratings
- Support ticket reduction
- Task completion rate

## 👥 Team Responsibilities

- **Marketing**: Homepage, features, pricing, case studies
- **Product**: User guides, feature documentation
- **Support**: FAQs, troubleshooting content
- **Legal**: Terms, privacy, compliance pages

## 🚀 Launch Checklist

### Pre-Launch
- [ ] Content complete and reviewed
- [ ] Cross-browser testing passed
- [ ] Mobile responsive verified
- [ ] SEO audit complete
- [ ] Analytics configured

### Launch Day
- [ ] Deploy to production
- [ ] DNS configuration
- [ ] Search engine submission
- [ ] Team notification

### Post-Launch
- [ ] Monitor performance
- [ ] Gather feedback
- [ ] Iterate content
- [ ] Expand coverage

## 📚 Resources

- [Astro Documentation](https://docs.astro.build)
- [Starlight Guide](https://starlight.astro.build/)
- [MDX Reference](https://mdxjs.com/)
- [Writing for the Web](https://www.nngroup.com/topic/writing-web/)

---

*This is a fresh Starlight installation. Begin with Phase 1 of the customization roadmap to transform it into the Agentis marketing and documentation site.*