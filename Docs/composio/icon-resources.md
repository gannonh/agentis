# Icon Resources for MCP Server Integration

## Branded SVG Icons

For the enhanced MCP server card UI, we will use monochrome SVG icons that can be styled to match light/dark themes. This approach provides a cleaner, more consistent look compared to the current colorful icon approach.

## Icon Resources

### Primary Resources

1. **Simple Icons**
   - URL: https://simpleicons.org/
   - Over 2,000 SVG icons for popular brands in monochrome format
   - Includes icons for Google Workspace (Sheets, Drive, etc.), Microsoft, and many other services
   - All icons are standardized and optimized for web use
   - Example: https://simpleicons.org/icons/googlesheets.svg

2. **Google Workspace Brand Resources**
   - URL: https://workspace.google.com/brand-resource-center/
   - Official Google Workspace icons including Sheets, Docs, Drive
   - Available in various formats including SVG
   - Guidelines for proper usage of Google brand assets

3. **Iconify**
   - URL: https://icon-sets.iconify.design/
   - Aggregates multiple icon sets in one searchable interface
   - Includes brand icons from various sources
   - Can be used with the Iconify API for dynamic loading

### Additional Resources

4. **heroicons**
   - URL: https://heroicons.com/
   - Simple, clean SVG icons that work well in light/dark themes
   - Good for generic UI elements to complement the brand icons

5. **GitHub's primer/octicons**
   - URL: https://primer.style/octicons/
   - Clean monochrome SVG icons used by GitHub
   - Good for developer-focused interfaces

## Implementation Guidelines

### SVG Icon Styling

To ensure icons adapt to the current theme, use the following CSS approach:

```css
.mcp-server-icon {
  fill: currentColor; /* Inherits text color from parent */
  width: 24px;
  height: 24px;
}
```

This allows the icons to automatically change color based on the current theme without requiring separate light/dark versions.

### React Component Example

```tsx
import React from 'react';

interface MCPIconProps {
  serverType: string;
  className?: string;
}

// Map of server types to their SVG paths
const iconPaths: Record<string, string> = {
  googlesheets: 'M11,17.5V16h10v1.5H11z M11,12.5V11h10v1.5H11z M11,7.5V6h10v1.5H11z M7,3h14c1.1,0,2,0.9,2,2v14c0,1.1-0.9,2-2,2H7c-1.1,0-2-0.9-2-2V5C5,3.9,5.9,3,7,3z M14.6,14.9l-2.1,2.1l-1.4-1.4l2.1-2.1L14.6,14.9z M14.6,9.9l-2.1,2.1l-1.4-1.4l2.1-2.1L14.6,9.9z',
  traversal: 'M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  composio: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  // Add more server types as needed
};

const MCPIcon: React.FC<MCPIconProps> = ({ serverType, className = '' }) => {
  const path = iconPaths[serverType.toLowerCase()] || iconPaths.composio; // Default to composio icon
  
  return (
    <svg 
      className={`mcp-server-icon ${className}`}
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
};

export default MCPIcon;
```

### Server Type Mapping

For each MCP server, we should maintain a mapping to the appropriate icon:

```typescript
const MCP_SERVER_ICONS: Record<string, string> = {
  googlesheets: 'googlesheets',
  gmail: 'gmail',
  gdrive: 'googledrive',
  calendar: 'googlecalendar',
  // Add other servers as they are integrated
};
```

This mapping can be used to determine which icon to display for each MCP server card.

## Icon Usage in the MCPServerCard Component

In the `MCPServerCard` component, the icon should be implemented as follows:

```tsx
<div className="h-[70px] w-[70px] shrink-0">
  <div className="relative flex h-full w-full items-center justify-center rounded-[5px] border border-border-medium bg-transparent">
    {serverType && MCP_SERVER_ICONS[serverType] ? (
      <MCPIcon 
        serverType={serverType} 
        className="h-10 w-10 text-text-secondary" 
      />
    ) : (
      <Wrench className="h-8 w-8 text-text-secondary" />
    )}
    <div className="absolute inset-0 rounded-[5px] ring-1 ring-inset ring-black/10"></div>
  </div>
</div>
```

This approach ensures that:
1. Each MCP server has a consistent, branded icon
2. Icons adapt to light/dark themes automatically
3. There's a fallback icon (Wrench) for unknown server types
4. The visual style is clean and consistent with the application design