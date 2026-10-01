import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import FilterDropdown from './FilterDropdown'

afterEach(cleanup)
function setup(inline = false) {
  const onChange = vi.fn()
  render(<FilterDropdown label="Category" allLabel="All" options={[{ value: 'it', label: 'IT' }, { value: 'sales', label: 'Sales' }]} value={['it']} onChange={onChange} inline={inline} />)
  fireEvent.click(screen.getByRole('button', { name: /Category/ }))
  return onChange
}

describe('FilterDropdown', () => {
  it('closes a floating menu on outside mousedown', () => {
    setup()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('keeps an inline choice list expanded on outside mousedown so adjacent controls do not move before click', () => {
    const onChange = setup(true)
    fireEvent.mouseDown(document.body)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))
    expect(onChange).toHaveBeenCalledWith(['it', 'sales'])
    fireEvent.click(screen.getByRole('button', { name: /Category/ }))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('removes selected values and clears the filter', () => {
    const onChange = setup()
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('button', { name: /IT/ }))
    expect(onChange).toHaveBeenCalledWith([])
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})
