import { useState } from 'react'
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
function setup(initial = new Map<string, readonly string[]>()) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  function Harness() {
    const [filters, setFilters] = useState(initial)
    return <CaseFieldFilters fields={fields} filters={filters} onChange={(id, values) => {
      onChange(id, values)
      setFilters((prev) => { const next = new Map(prev); if (values.length) next.set(id, values); else next.delete(id); return next })
    }} onClear={() => { onClear(); setFilters(new Map()) }} />
  }
  render(<I18nProvider defaultLang="en"><Harness /></I18nProvider>)
  fireEvent.click(screen.getByTestId('case-field-filters-button'))
  return { onChange, onClear }
}
function addCondition(name: string) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Add condition' }), { key: 'ArrowDown' })
  fireEvent.click(screen.getByRole('option', { name }))
}

describe('CaseFieldFilters', () => {
  it('adds only requested conditions and searches configured choices without any cases', () => {
    const { onChange } = setup()
    expect(screen.queryByTestId('case-field-filter-category')).toBeNull()
    addCondition('Category')
    const input = screen.getByRole('combobox', { name: 'Category' })
    fireEvent.change(input, { target: { value: 'sale' } })
    expect(screen.queryByRole('option', { name: 'IT' })).toBeNull()
    const sales = screen.getByRole('option', { name: 'Sales' })
    fireEvent.mouseDown(sales)
    fireEvent.click(sales)
    expect(onChange).toHaveBeenCalledWith('category', ['sales'])
    expect(screen.getByTestId('case-field-filters-panel')).toBeVisible()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('option', { name: 'IT' }))
    expect(onChange).toHaveBeenLastCalledWith('category', ['sales', 'it'])
    expect(screen.queryByTestId('case-field-filter-cost')).toBeNull()
  })

  it('appends numeric values instead of replacing previous selections, and ignores duplicates', () => {
    const { onChange } = setup(new Map([['cost', ['12']]]))
    const input = screen.getByLabelText('Cost')
    fireEvent.change(input, { target: { value: '0' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('cost', ['12', '0'])
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onChange).toHaveBeenLastCalledWith('cost', ['12', '0'])
    expect(input).toHaveValue(null)
  })

  it('does not add a value on IME confirmation or Safari composition keydown', () => {
    const { onChange } = setup(new Map([['cost', ['12']]]))
    const input = screen.getByLabelText('Cost')
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows active values when closed and supports removing values, conditions and all filters', () => {
    const { onChange, onClear } = setup(new Map([['category', ['it', 'sales']], ['cost', ['0']]]))
    fireEvent.click(screen.getByTestId('case-field-filters-button'))
    const summary = screen.getByTestId('case-field-filters-summary')
    expect(summary).toHaveTextContent('Category:')
    expect(summary).toHaveTextContent('Sales')
    fireEvent.click(within(summary).getByRole('button', { name: 'Remove IT from Category' }))
    expect(onChange).toHaveBeenLastCalledWith('category', ['sales'])
    fireEvent.click(within(summary).getByRole('button', { name: 'Remove Cost condition' }))
    expect(onChange).toHaveBeenLastCalledWith('cost', [])
    fireEvent.click(screen.getByTestId('case-field-filters-clear-summary'))
    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('case-field-filters-summary')).toBeNull()
  })

  it('keeps stale URL selections visible and removable', () => {
    const { onChange } = setup(new Map([['removed', ['old']], ['category', ['retired']]]))
    const summary = screen.getByTestId('case-field-filters-summary')
    fireEvent.click(within(summary).getByRole('button', { name: 'Remove removed condition' }))
    expect(onChange).toHaveBeenCalledWith('removed', [])
    fireEvent.click(within(summary).getByRole('button', { name: 'Remove retired from Category' }))
    expect(onChange).toHaveBeenLastCalledWith('category', [])
  })

  it('removes an empty condition and clears both pending and applied rows', () => {
    const { onClear } = setup()
    addCondition('Cost')
    expect(screen.getByTestId('case-field-filter-cost')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Cost condition' }))
    expect(screen.queryByTestId('case-field-filter-cost')).toBeNull()
    addCondition('Category')
    fireEvent.click(screen.getByTestId('case-field-filters-clear'))
    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('case-field-filter-category')).toBeNull()
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
