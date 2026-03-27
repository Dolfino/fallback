interface HighlightedTextProps {
  text: string;
  query?: string;
  className?: string;
}

export function HighlightedText({
  text,
  query,
  className,
}: HighlightedTextProps) {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escapedQuery})`, "ig");
  const parts = text.split(matcher);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === normalizedQuery.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-amber-100 px-1 py-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}
