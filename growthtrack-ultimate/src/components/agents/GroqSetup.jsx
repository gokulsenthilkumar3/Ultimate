import React from 'react';
import { ArrowUpRight, CheckCircle2, Circle } from 'lucide-react';

export default function GroqSetup({ ready, checking }) {
  return <section className="gt-agents__setup" aria-label="Groq setup">
    <h3>Connect Groq</h3>
    <ol>
      <li><strong>Enter your key on the server</strong><p>Add these settings to growthtrack-ultimate/.env. The key stays on the server.</p><code>{'AGENTS_PROVIDER=groq\nGROQ_API_KEY=your-key'}</code><a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Manage Groq API keys<ArrowUpRight size={14} aria-hidden="true" /></a></li>
      <li><strong>Choose your model</strong><p>GPT-OSS 120B is the default. Qwen 3.8 27B is also available when enabled for your key.</p><code>GROQ_DEFAULT_MODEL=openai/gpt-oss-120b</code></li>
      <li><strong>Restart the API, then refresh models</strong><p>The selector lists permitted models available to your key. Messages and selected records are sent to Groq.</p></li>
    </ol>
    <p className="gt-agents__setup-status">{ready ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}{ready ? 'Connected to Groq' : checking ? 'Checking connection…' : 'Setup is not complete'}</p>
    <a href="https://console.groq.com/docs/quickstart" target="_blank" rel="noreferrer">Groq setup guide<ArrowUpRight size={14} aria-hidden="true" /></a>
  </section>;
}
