import { useEffect, useId, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import Select from 'react-select'
import { CASE_REFS_BY_IDS, REFERENCEABLE_CASES } from '../graphql/caseRef'
import { GET_SLACK_USERS } from '../graphql/slackUsers'
import { useTranslation } from '../i18n'
import type { CaseFieldDefinition } from '../utils/caseFieldFilters'
import { commitOnEnter } from '../utils/keyboard'
import { displayName, type NameableUser } from '../utils/user'
import Button from './Button'
import { buildSelectStyles, portalProps } from './selectStyles'
import styles from './CaseFieldFilters.module.css'

interface Option { value: string; label: string }
interface Props {
  field: CaseFieldDefinition
  values: readonly string[]
  onChange: (values: readonly string[]) => void
  summary?: boolean
  menuTarget?: HTMLDivElement | null
}
interface ChoiceProps extends Props {
  options: Option[]
  loading?: boolean
  error?: boolean
  onSearch?: (query: string) => void
}

function ValueChips({ field, values, onChange, options = [] }: Props & { options?: Option[] }) {
  const { t } = useTranslation()
  return (
    <span className={styles.values}>
      {values.map((value) => {
        const label = options.find((o) => o.value === value)?.label ?? value
        return (
          <Button key={value} size="sm" variant="ghost" className={styles.valueChip}
            aria-label={t('filterRemoveValue', { field: field.name, value: label })}
            onClick={() => onChange(values.filter((v) => v !== value))}>
            {label} ×
          </Button>
        )
      })}
    </span>
  )
}

function ChoiceValues(props: ChoiceProps) {
  const { field, values, onChange, summary, options, loading, error, onSearch, menuTarget } = props
  const { t } = useTranslation()
  const inputId = useId()
  if (summary) return <ValueChips {...props} />
  const selected = values.map((value) => options.find((o) => o.value === value) ?? { value, label: value })
  return (
    <>
      <Select<Option, true>
        inputId={inputId}
        aria-label={field.name}
        isMulti
        options={options}
        value={selected}
        onChange={(next) => onChange(next.map((o) => o.value))}
        onInputChange={onSearch ? (query) => { onSearch(query) } : undefined}
        filterOption={onSearch ? () => true : undefined}
        closeMenuOnSelect
        isLoading={loading}
        placeholder={t('filterSelectValues')}
        noOptionsMessage={() => t('filterNoOptions')}
        styles={buildSelectStyles({ compact: true })}
        {...portalProps}
        menuPortalTarget={menuTarget}
      />
      {error && <span role="status" className={styles.hint}>{t('filterOptionsUnavailable')}</span>}
    </>
  )
}

function UserValues(props: Props) {
  const { data, loading, error } = useQuery<{ slackUsers: NameableUser[] }>(GET_SLACK_USERS)
  const options = (data?.slackUsers ?? []).map((u) => ({ value: u.id!, label: `${displayName(u)} (@${u.name || u.id})` }))
  return <ChoiceValues {...props} options={options} loading={loading} error={!!error} />
}

function CaseValues(props: Props) {
  const { field, values, summary } = props
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300)
    return () => clearTimeout(timer)
  }, [search])
  const ids = useMemo(() => values.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0), [values])
  const { data: resolved, loading: resolving, error: resolveError } = useQuery(CASE_REFS_BY_IDS, {
    variables: { workspaceId: field.referenceWorkspaceId, ids },
    skip: !field.referenceWorkspaceId || ids.length === 0,
  })
  const { data, loading, error } = useQuery(REFERENCEABLE_CASES, {
    variables: { workspaceId: field.referenceWorkspaceId, query: query || undefined, limit: 50 },
    skip: summary || !field.referenceWorkspaceId,
  })
  const toOption = (c: { id: number; title: string }) => ({ value: String(c.id), label: `${c.title} (#${c.id})` })
  // Resolve selected IDs separately so names survive searches and shared links.
  const resolvedOptions: Option[] = (resolved?.caseRefsByIds ?? []).map(toOption)
  const options: Option[] = (data?.referenceableCases ?? []).map(toOption)
  for (const option of resolvedOptions) {
    if (!options.some((o) => o.value === option.value)) options.push(option)
  }
  return <ChoiceValues {...props} options={options} loading={loading || resolving} error={!!error || !!resolveError} onSearch={setSearch} />
}

function ScalarValues(props: Props) {
  const { field, values, onChange, summary } = props
  const { t } = useTranslation()
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const valid = draft !== '' && (field.type !== 'NUMBER' || Number.isFinite(Number(draft)))
  const add = () => {
    if (!valid) return
    onChange([...new Set([...values, draft])])
    setDraft('')
  }
  if (summary) return <ValueChips {...props} />
  return (
    <>
      <ValueChips {...props} />
      <div className={styles.scalarInput}>
        <input
          id={inputId}
          aria-label={field.name}
          type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
          step={field.type === 'NUMBER' ? 'any' : undefined}
          value={draft}
          placeholder={t('filterCaseFieldExact')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={commitOnEnter({ onCommit: add })}
        />
        <Button size="sm" disabled={!valid} onClick={add}>{t('filterAddValue')}</Button>
      </div>
    </>
  )
}

export default function CaseFieldFilterValue(props: Props) {
  switch (props.field.type) {
    case 'SELECT': case 'MULTI_SELECT':
      return <ChoiceValues {...props} options={(props.field.options ?? []).map((o) => ({ value: o.id, label: o.name }))} />
    case 'USER': case 'MULTI_USER': return <UserValues {...props} />
    case 'CASE_REF': case 'MULTI_CASE_REF': return <CaseValues {...props} />
    default: return <ScalarValues {...props} />
  }
}
