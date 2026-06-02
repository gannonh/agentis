export type MarkdownSection = {
  heading: string
  level: number
  path: string
  start: number
  contentStart: number
  end: number
}

const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split(/\n/)
  const offsets: number[] = []
  let cursor = 0
  for (const line of lines) {
    offsets.push(cursor)
    cursor += line.length + 1
  }

  const headings: Omit<MarkdownSection, "end">[] = []
  const stack: { level: number; heading: string }[] = []

  lines.forEach((line, index) => {
    const match = headingPattern.exec(line)
    if (!match) return
    const level = match[1].length
    const heading = match[2].trim()
    while (stack.length > 0 && stack[stack.length - 1]!.level >= level) {
      stack.pop()
    }
    stack.push({ level, heading })
    headings.push({
      heading,
      level,
      path: stack.map((entry) => entry.heading).join(" > "),
      start: offsets[index] ?? 0,
      contentStart: (offsets[index] ?? 0) + line.length + 1,
    })
  })

  return headings.map((heading, index) => ({
    ...heading,
    end: headings[index + 1]?.start ?? markdown.length,
  }))
}

export function replaceMarkdownSectionContent(
  markdown: string,
  section: MarkdownSection,
  content: string
) {
  const normalized = content.trimEnd()
  const prefix = markdown.slice(0, section.contentStart).replace(/\s*$/, "\n\n")
  const suffix = markdown.slice(section.end).replace(/^\s*/, "")
  return `${prefix}${normalized}${suffix ? `\n\n${suffix}` : ""}`
}

function subtreeEnd(markdown: string, parent: MarkdownSection) {
  const nextSiblingOrAncestor = parseMarkdownSections(markdown).find(
    (section) => section.start > parent.start && section.level <= parent.level
  )
  return nextSiblingOrAncestor?.start ?? markdown.length
}

export function appendMarkdownSection(input: {
  markdown: string
  parent?: MarkdownSection
  heading?: string
  content: string
}) {
  const content = input.content.trimEnd()
  if (!input.heading?.trim()) {
    return `${input.markdown.trimEnd()}\n\n${content}\n`
  }

  const level = input.parent ? Math.min(input.parent.level + 1, 6) : 1
  const heading = `${"#".repeat(level)} ${input.heading.trim()}`
  const block = `${heading}\n\n${content}`
  if (!input.parent) return `${input.markdown.trimEnd()}\n\n${block}\n`

  const insertAt = subtreeEnd(input.markdown, input.parent)
  const prefix = input.markdown.slice(0, insertAt).trimEnd()
  const suffix = input.markdown.slice(insertAt).trimStart()
  return `${prefix}\n\n${block}${suffix ? `\n\n${suffix}` : ""}\n`
}
