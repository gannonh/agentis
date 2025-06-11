# Agentis Marketing & Documentation Site

The public-facing marketing website and end-user documentation for Agentis - a commercial AI conversations platform. This site serves as the primary touchpoint for potential customers and existing users.

## 🎯 Purpose

This Starlight-based site will provide:

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

## 📁 Content Structure Plan

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

## 🛠️ Development Setup

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
```

### Development Workflow

1. **Content Creation**: Write marketing copy and user guides in MDX
2. **Component Usage**: Leverage Starlight components for rich layouts
3. **Preview**: Test locally at `http://localhost:4321`
4. **Build**: Generate static site with `npm run build`

## 🎨 Customization Roadmap

### Phase 1: Foundation
- [ ] Update site title to "Agentis"
- [ ] Remove GitHub links and developer-focused content
- [ ] Configure proper navigation structure
- [ ] Add Agentis branding (logo, colors, fonts)

### Phase 2: Marketing Pages
- [ ] Design compelling homepage with hero section
- [ ] Create features showcase with screenshots
- [ ] Build pricing page with tier comparison
- [ ] Add customer testimonials and case studies

### Phase 3: User Documentation
- [ ] Write comprehensive getting started guide
- [ ] Create step-by-step tutorials with screenshots
- [ ] Document all user-facing features
- [ ] Build searchable FAQ section

### Phase 4: Interactive Elements
- [ ] Add "Try Now" CTAs linking to app
- [ ] Implement interactive product tours
- [ ] Create video tutorials and demos
- [ ] Build contact forms for sales/support

### Phase 5: Launch Preparation
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Analytics integration (GA4, Mixpanel)
- [ ] Performance optimization
- [ ] Legal pages and compliance

## 📝 Content Guidelines

### Voice & Tone
- **Professional**: Establish credibility and trust
- **Approachable**: Avoid technical jargon
- **Action-oriented**: Focus on user benefits
- **Empathetic**: Understand user challenges

### Writing Principles
- Lead with benefits, not features
- Use clear, concise language
- Include real-world examples
- Provide visual aids (screenshots, diagrams)
- Optimize for scanning (headings, bullets)

### SEO Considerations
- Target keywords: "AI chat platform", "multi-model AI", etc.
- Descriptive page titles and meta descriptions
- Structured data for rich snippets
- Internal linking strategy

## 🚢 Deployment Strategy

### Hosting Options
1. **Vercel** - Recommended for optimal performance
2. **Netlify** - Alternative with good DX
3. **AWS CloudFront** - Enterprise-grade CDN

### Domain Configuration
- Primary: `www.agentis.ai`
- Documentation: `help.agentis.ai` or `docs.agentis.ai`
- Marketing pages at root level

### Performance Targets
- Lighthouse score: 95+
- Core Web Vitals: All green
- Page load: <2 seconds
- Time to Interactive: <3 seconds

## 🔗 Integration Points

### With Main Application
- Single Sign-On (SSO) for documentation access
- Dynamic pricing based on user's plan
- In-app help links to relevant docs
- User onboarding flow integration

### Analytics & Tracking
- User journey from marketing to signup
- Documentation page effectiveness
- Search query analysis
- Support ticket deflection

### Marketing Tools
- Email capture forms
- Newsletter integration
- Live chat widget
- A/B testing framework

## 🏗️ Current Status

This is a fresh Starlight installation. No content has been created yet. The next steps are:

1. **Immediate**: Configure basic site settings and branding
2. **Week 1**: Create homepage and core marketing pages
3. **Week 2**: Build initial user documentation
4. **Week 3**: Add interactive elements and polish
5. **Week 4**: Testing, optimization, and launch prep

## 👥 Team Collaboration

### Content Responsibilities
- **Marketing Team**: Homepage, features, pricing, case studies
- **Product Team**: User guides, feature documentation
- **Support Team**: FAQs, troubleshooting guides
- **Legal Team**: Terms, privacy, compliance pages

### Review Process
1. Content draft in MDX
2. Preview in development environment
3. Stakeholder review and feedback
4. Copy editing and polish
5. Final approval before deployment

## 📊 Success Metrics

### Marketing KPIs
- Organic traffic growth
- Conversion rate (visitor to trial)
- Time on site
- Bounce rate reduction

### Documentation KPIs
- Search success rate
- Page helpfulness ratings
- Support ticket reduction
- User task completion rate

## 🔒 Security & Compliance

- No sensitive data in public documentation
- GDPR-compliant cookie consent
- Accessibility standards (WCAG 2.1 AA)
- Regular security audits

## 📚 Resources

### Design Assets
- Brand guidelines (pending)
- Logo files and variations
- Product screenshots
- Icon library

### Content Sources
- Product requirement documents
- User research findings
- Support ticket patterns
- Competitor analysis

## 🚀 Launch Checklist

### Pre-Launch
- [ ] Content review and approval
- [ ] Cross-browser testing
- [ ] Mobile responsiveness check
- [ ] SEO audit complete
- [ ] Analytics configured
- [ ] Legal review passed

### Launch Day
- [ ] Deploy to production
- [ ] Configure DNS
- [ ] Submit sitemap to search engines
- [ ] Announce to users
- [ ] Monitor performance

### Post-Launch
- [ ] Gather user feedback
- [ ] Analyze usage patterns
- [ ] Iterate on content
- [ ] Expand documentation
- [ ] Optimize based on data