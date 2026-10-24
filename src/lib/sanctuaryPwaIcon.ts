import { createElement } from 'react';
import type { ReactElement } from 'react';

export function createSanctuaryPwaIcon(size: number): ReactElement {
  const borderWidth = Math.max(3, Math.round(size * 0.035));
  const innerSize = Math.round(size * 0.72);

  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b2b20',
      },
    },
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          width: innerSize + 'px',
          height: innerSize + 'px',
          alignItems: 'center',
          justifyContent: 'center',
          border: borderWidth + 'px solid #d9c8a3',
          borderRadius: '50%',
          color: '#f4efe1',
        },
      },
      createElement(
        'span',
        {
          style: {
            color: '#f4efe1',
            fontFamily: 'serif',
            fontSize: Math.round(size * 0.48),
            fontWeight: 700,
            lineHeight: 1,
          },
        },
        'S',
      ),
    ),
  );
}
