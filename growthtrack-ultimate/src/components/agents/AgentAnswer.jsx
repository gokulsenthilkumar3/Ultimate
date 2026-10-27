import React from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
  a: ({ href, children }) => {
    if (href?.startsWith('/') && !href.startsWith('//') && !href.includes('\\')) {
      const to = href.startsWith('/Ultimate/') ? href.slice('/Ultimate'.length) : href;
      return <Link to={to}>{children}</Link>;
    }
    return href && /^https?:\/\//i.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
  },
  img: ({ alt }) => <span>{alt || 'Image omitted'}</span>,
  table: ({ children }) => <div className="gt-agents__table-scroll"><table>{children}</table></div>,
};

export default function AgentAnswer({ children }) {
  return <div className="gt-agents__answer"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>{children}</ReactMarkdown></div>;
}
