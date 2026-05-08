import { Sparkles } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

/**
 * Strip all common markdown syntax so plain text is displayed cleanly.
 * Handles: headings (# ## ###), bold (**text**), italic (*text* / _text_),
 * bullet list markers (* - •), numbered list dots, inline code (`code`),
 * code fences (```), horizontal rules (---), and leading/trailing whitespace.
 */
const stripMarkdown = (text: string): string =>
  text
    // Remove code fences (``` blocks)
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
    )
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove headings (### ## #) at start of line
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold+italic combo ***text***
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    // Remove bold **text**
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Remove italic *text* (but not lone * used as bullets — handled below)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    // Remove italic _text_
    .replace(/\b_(.+?)_\b/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Replace bullet markers (* - •) at line start with a dash-space for readability
    .replace(/^\s*[*\-•]\s+/gm, '- ')
    // Clean up any remaining stray asterisks
    .replace(/\*/g, '')
    // Clean up stray underscores used for emphasis
    .replace(/(?<![a-zA-Z0-9])_(?![a-zA-Z0-9])/g, '')
    // Collapse 3+ blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export function ChatMessage({ role, content }: ChatMessageProps) {
  const displayContent = role === "assistant" ? stripMarkdown(content) : content;

  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {role === "assistant" && (
          <Sparkles className="inline-block w-4 h-4 mr-2 mb-1 text-primary" />
        )}
        <span className="whitespace-pre-wrap">{displayContent}</span>
      </div>
    </div>
  );
}
