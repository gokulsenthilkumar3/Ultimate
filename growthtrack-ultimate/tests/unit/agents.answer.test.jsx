import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AgentAnswer from '../../src/components/agents/AgentAnswer';

afterEach(cleanup);
const mount = text => render(<MemoryRouter basename="/Ultimate" initialEntries={['/Ultimate/hub/agents']}><AgentAnswer>{text}</AgentAnswer></MemoryRouter>);
describe('readable and safe agent answers', () => {
  it('renders tables, code, emphasis and links inside the app base path', () => {
    mount('## Findings\n\n**Two** tasks need attention. [Open Tasks](/workspace/tasks)\n\n| Kind | Count |\n| --- | --- |\n| Open | 2 |\n\n```js\nconst count = 2;\n```\n\n[Docs](https://example.com/docs)');
    expect(screen.getByRole('link', { name: 'Open Tasks' })).toHaveAttribute('href', '/Ultimate/workspace/tasks');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('const count = 2;')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('does not execute HTML, unsafe protocols, or remotely load generated images', () => {
    const { container } = mount('<script>alert(1)</script>\n\n[Bad](javascript:alert(1))\n\n![Tracking image](https://example.com/track.png)');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByText('Tracking image')).toBeInTheDocument();
  });
});
