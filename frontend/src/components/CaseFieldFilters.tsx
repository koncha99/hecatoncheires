import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from '../i18n'
import type { CaseFieldDefinition, CaseFieldFilterValues } from '../utils/caseFieldFilters'
import Button from './Button'
import FilterDropdown from './FilterDropdown'
import styles from './CaseFieldFilters.module.css'

interface Props {
  fields: readonly CaseFieldDefinition[]
  filters: CaseFieldFilterValues
  onChange: (id: string, values: readonly string[]) => void
  onClear: () => void
}

export default function CaseFieldFilters({ fields, filters, onChange, onClear }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [alignEnd, setAlignEnd] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  if (fields.length === 0 && filters.size === 0) return null

  return (
    <div ref={ref} className={styles.root}>
      <Button
        variant={filters.size ? 'primary' : 'secondary'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const left = ref.current?.getBoundingClientRect().left ?? 0
          setAlignEnd(window.innerWidth - left < 376)
          setOpen((v) => !v)
        }}
        data-testid="case-field-filters-button"
      >
        {t('filterCaseFields')}{filters.size > 0 ? ` · ${filters.size}` : ''}
      </Button>
      {open && (
        <div
          id={panelId}
          className={`${styles.panel} ${alignEnd ? styles.alignEnd : ''}`}
          data-testid="case-field-filters-panel"
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        >
          <p className={styles.hint}>{t('filterCaseFieldsHint')}</p>
          {fields.map((field) => {
            const selected = filters.get(field.id) ?? []
            if (field.type === 'SELECT' || field.type === 'MULTI_SELECT') {
              const options = (field.options ?? []).map((o) => ({ value: o.id, label: o.name }))
              // A deleted option must remain removable in a bookmarked link.
              for (const value of selected) {
                if (!options.some((o) => o.value === value)) options.push({ value, label: value })
              }
              return (
                <div className={styles.field} key={field.id}>
                  <FilterDropdown
                    inline
                    label={field.name}
                    allLabel={t('filterAllShort')}
                    options={options}
                    value={[...selected]}
                    onChange={(next) => onChange(field.id, next)}
                    testId={`case-field-filter-${field.id}`}
                  />
                </div>
              )
            }
            return (
              <label className={styles.field} key={field.id}>
                <span>{field.name}</span>
                <input
                  type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
                  step={field.type === 'NUMBER' ? 'any' : undefined}
                  value={selected[0] ?? ''}
                  placeholder={t('filterCaseFieldExact')}
                  onChange={(e) => onChange(field.id, e.target.value ? [e.target.value] : [])}
                  data-testid={`case-field-filter-${field.id}`}
                />
                {selected.length > 0 && (
                  <span className={styles.values}>
                    {selected.map((value) => (
                      <Button size="sm" variant="ghost" key={value} onClick={() => onChange(field.id, selected.filter((v) => v !== value))}>
                        {value} ×
                      </Button>
                    ))}
                  </span>
                )}
              </label>
            )
          })}
          {[...filters].filter(([id]) => !fields.some((f) => f.id === id)).map(([id, values]) => (
            <Button key={id} size="sm" variant="ghost" onClick={() => onChange(id, [])}>
              {id}: {values.join(', ')} ×
            </Button>
          ))}
          {filters.size > 0 && (
            <Button size="sm" variant="ghost" onClick={onClear} data-testid="case-field-filters-clear">
              {t('filterClear')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
