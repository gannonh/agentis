export function summarizeTitle(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ")
  if (trimmed.length <= 60) return trimmed
  return `${trimmed.slice(0, 57)}...`
}
