import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

export const renderWithRouter = (ui, options = {}) =>
  render(ui, { wrapper: BrowserRouter, ...options })

export * from '@testing-library/react'
