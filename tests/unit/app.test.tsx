import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/app/App';

describe('production shell', () => {
  it('labels the baseline and does not present a connected model', () => {
    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /让一个想法/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '模型与来源设置' })).toBeInTheDocument();
  });
});
