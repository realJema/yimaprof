import React from 'react';
import katex from 'katex';

interface LatexTextProps {
  text: string | undefined | null;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * LatexText component renders text with LaTeX math notation.
 * It detects inline \(...\) and block \[...\] LaTeX patterns and renders them using KaTeX.
 * Plain text is returned as-is for optimal performance.
 */
export function LatexText({ text, className, as: Component = 'span' }: LatexTextProps) {
  // Handle null/undefined text
  if (!text) {
    return null;
  }

  // Fast path: if no LaTeX delimiters, return text as-is
  if (!text.includes('\\(') && !text.includes('\\[')) {
    return <Component className={className}>{text}</Component>;
  }

  // Pattern matches: \(...\) for inline math, \[...\] for block math
  const pattern = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  
  // Split text by pattern, keeping delimiters
  const segments = text.split(pattern);
  
  const renderedSegments = segments.map((segment, index) => {
    if (!segment) return null;
    
    // Check if this segment is inline LaTeX: \(...\)
    if (segment.startsWith('\\(') && segment.endsWith('\\)')) {
      const latex = segment.slice(2, -2); // Remove \( and \)
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false, // Inline mode
          strict: false,
        });
        return (
          <span
            key={index}
            className="latex-inline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (error) {
        // Fallback: show raw text if KaTeX fails
        console.warn('KaTeX rendering failed for:', latex, error);
        return <span key={index}>{segment}</span>;
      }
    }
    
    // Check if this segment is block LaTeX: \[...\]
    if (segment.startsWith('\\[') && segment.endsWith('\\]')) {
      const latex = segment.slice(2, -2); // Remove \[ and \]
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true, // Block/display mode
          strict: false,
        });
        return (
          <span
            key={index}
            className="latex-block block my-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (error) {
        // Fallback: show raw text if KaTeX fails
        console.warn('KaTeX rendering failed for:', latex, error);
        return <span key={index}>{segment}</span>;
      }
    }
    
    // Plain text segment
    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });

  return <Component className={className}>{renderedSegments}</Component>;
}

export default LatexText;
