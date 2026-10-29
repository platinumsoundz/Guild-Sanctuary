import { createElement } from 'react';
import type { ReactElement } from 'react';

export function createSanctuaryPwaIcon(size: number): ReactElement {
  const stroke = Math.max(3, Math.round(size * 0.025));
  const center = size / 2;
  const sunRadius = size * 0.15;
  const archWidth = size * 0.52;
  const archX = center - archWidth / 2;

  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #123b2c 0%, #071f18 100%)',
      },
    },
    createElement(
      'svg',
      { width: size * 0.82, height: size * 0.82, viewBox: `0 0 ${size} ${size}`, fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
      createElement('circle', { cx: center, cy: size * 0.34, r: sunRadius, fill: '#e3c98d' }),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 8;
        const x1 = center + Math.cos(angle) * size * 0.21;
        const y1 = size * 0.34 + Math.sin(angle) * size * 0.21;
        const x2 = center + Math.cos(angle) * size * 0.26;
        const y2 = size * 0.34 + Math.sin(angle) * size * 0.26;
        return createElement('line', { key: index, x1, y1, x2, y2, stroke: '#e3c98d', strokeWidth: stroke, strokeLinecap: 'round' });
      }),
      createElement('path', {
        d: `M ${archX} ${size * 0.77} V ${size * 0.53} Q ${center} ${size * 0.28} ${archX + archWidth} ${size * 0.53} V ${size * 0.77} Z`,
        fill: '#f4efe1',
        stroke: '#f4efe1',
        strokeWidth: stroke,
        strokeLinejoin: 'round',
      }),
      createElement('path', {
        d: `M ${center} ${size * 0.57} C ${center - size * 0.12} ${size * 0.63}, ${center - size * 0.1} ${size * 0.71}, ${center} ${size * 0.74} C ${center + size * 0.1} ${size * 0.71}, ${center + size * 0.12} ${size * 0.63}, ${center} ${size * 0.57} Z`,
        fill: '#123b2c',
      }),
      createElement('path', {
        d: `M ${center} ${size * 0.59} V ${size * 0.71}`,
        stroke: '#e3c98d',
        strokeWidth: stroke,
        strokeLinecap: 'round',
      }),
    ),
  );
}
