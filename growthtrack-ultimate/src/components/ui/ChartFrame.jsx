import React from 'react';

export default function ChartFrame({ title, description, sampleSize, confidence, methodology, children, alternative }) {
  return <section className="gt-chart-frame" aria-label={title}>
    <header><div><h3>{title}</h3>{description && <p>{description}</p>}</div><div className="gt-chart-frame__meta">{sampleSize != null && <span>{sampleSize} samples</span>}{confidence != null && <span>{confidence}% confidence</span>}</div></header>
    <div className="gt-chart-frame__visual" aria-hidden={Boolean(alternative)}>{children}</div>
    {alternative && <div className="gt-chart-frame__alternative">{alternative}</div>}
    {methodology && <details><summary>How this is calculated</summary><p>{methodology}</p></details>}
  </section>;
}
