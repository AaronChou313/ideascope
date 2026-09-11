import "fake-indexeddb/auto";
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/app/App';

describe('production shell', () => {
  it('labels the baseline and does not present a connected model', () => {
    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /从一个模糊的研究想法开始/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建探索/ })).toBeInTheDocument();
  });
});
import "fake-indexeddb/auto";
