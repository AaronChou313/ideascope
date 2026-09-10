import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App';

describe('production shell', () => {
  it('labels the baseline and does not present a connected model', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /让一个想法/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('不调用模型');
    expect(screen.getAllByText('待 0.1-B 浏览器实测', { selector: 'dd' })).toHaveLength(2);
  });
});
