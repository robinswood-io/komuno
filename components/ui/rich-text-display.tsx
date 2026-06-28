'use client';

import DOMPurify, { type Config } from 'dompurify';

interface RichTextDisplayProps {
  content: string | null;
  className?: string;
}

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'span', 'div',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  ALLOW_DATA_ATTR: false,
};

export default function RichTextDisplay({ content, className = '' }: RichTextDisplayProps) {
  if (!content) return null;

  const sanitizedContent = DOMPurify.sanitize(content, SANITIZE_CONFIG);

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
