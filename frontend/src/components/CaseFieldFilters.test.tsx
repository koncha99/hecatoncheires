import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { I18nProvider } from '../i18n'
import CaseFieldFilters from './CaseFieldFilters'

afterEach(cleanup)
const fields = [
  { id: 'category', name: 'Category', type: 'SELECT', options: [{ id: 'it', name: 'IT' }, { id: 'sales', name: 'Sales' }] },
  { id: 'cost', name: 'Cost', type: 'NUMBER' },
]
function setup(filters = new Map<string, readonly string[]>()) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(<I18nProvider defaultLang="en"><CaseFieldFilters fields={fields} filters={filters} onChange={onChange} onClear={onClear} /></I18nProvider>)
  fireEvent.click(screen.getByTestId('case-field-filters-button'))
  return { onChange, onClear }
}

describe('CaseFieldFilters', () => {
  it('offers configured category options even when there are no cases', () => {
    const { onChange } = setup()
    fireEvent.click(within(screen.getByTestId('case-field-filter-category')).getByRole('button'))
    fireEvent.click(screen.getByRole('button', { name: 'IT' }))
    expect(onChange).toHaveBeenCalledWith('category', ['it'])
  })

  it('supports exact scalar input and clear-all', () => {
    const { onChange, onClear } = setup(new Map([['category', ['it']]]))
    expect(screen.getByTestId('case-field-filters-button')).toHaveTextContent('1')
    fireEvent.change(screen.getByLabelText('Cost'), { target: { value: '0' } })
    expect(onChange).toHaveBeenCalledWith('cost', ['0'])
    fireEvent.click(screen.getByTestId('case-field-filters-clear'))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('keeps stale URL selections visible and removable', () => {
    const { onChange } = setup(new Map([['removed', ['old']], ['category', ['retired']]]))
    fireEvent.click(screen.getByRole('button', { name: 'removed: old ×' }))
    expect(onChange).toHaveBeenCalledWith('removed', [])
    fireEvent.click(within(screen.getByTestId('case-field-filter-category')).getByRole('button'))
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('button', { name: /retired/ }))
    expect(onChange).toHaveBeenCalledWith('category', [])
  })

  it('closes on Escape and outside click', () => {
    setup()
    fireEvent.keyDown(screen.getByTestId('case-field-filters-panel'), { key: 'Escape' })
    expect(screen.queryByTestId('case-field-filters-panel')).toBeNull()
    fireEvent.click(screen.getByTestId('case-field-filters-button'))
    fireEvent.mouseDown(document.body)
    expect(screen.queryByTestId('case-field-filters-panel')).toBeNull()
  })
})
