import React, { useLayoutEffect } from 'react';
import mermaid from 'mermaid';

const MermaidChart = ({ chart,uniqueKey }) => {
  useLayoutEffect(() => {
    mermaid.initialize({ startOnLoad: true });
    const timeoutId = setTimeout(() => {
      mermaid.contentLoaded();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [chart]);

  return (
    <div key={uniqueKey}  className="mermaid">
      {chart}
    </div>
  );
};

export default MermaidChart;  