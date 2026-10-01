import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MockedProvider, type MockedResponse } from '@apollo/client/testing'
import { GET_SLACK_USERS } from '../graphql/slackUsers'
import { CASE_REFS_BY_IDS, REFERENCEABLE_CASES } from '../graphql/caseRef'
import { I18nProvider } from '../i18n'
import type { CaseFieldDefinition } from '../utils/caseFieldFilters'
import CaseFieldFilterValue from './CaseFieldFilterValue'

afterEach(cleanup)
function setup(field: CaseFieldDefinition, values: string[], mocks: MockedResponse[] = [], summary = false) {
  const onChange = vi.fn()
  render(<MockedProvider mocks={mocks} addTypename={false}><I18nProvider defaultLang="en">
    <CaseFieldFilterValue field={field} values={values} onChange={onChange} summary={summary} />
  </I18nProvider></MockedProvider>)
  return onChange
}

describe('CaseFieldFilterValue', () => {
  it.each([
    ['TEXT', 'a,b&c'], ['MARKDOWN', '**exact**'], ['URL', 'https://example.com/a?b=c'],
    ['NUMBER', '0'], ['DATE', '2026-10-01'],
  ])('appends a %s value with Add while keeping previous values', (type, value) => {
    const onChange = setup({ id: 'field', name: 'Field', type }, ['existing'])
    fireEvent.change(screen.getByLabelText('Field'), { target: { value } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onChange).toHaveBeenCalledWith(['existing', value])
  })

  it('searches user names and preserves stable Slack IDs', async () => {
    const onChange = setup({ id: 'user', name: 'Reviewer', type: 'MULTI_USER' }, ['U1'], [{
      request: { query: GET_SLACK_USERS }, result: { data: { slackUsers: [
        { id: 'U1', name: 'alice', realName: 'Alice', imageUrl: null },
        { id: 'U2', name: 'bob', realName: 'ボブ', imageUrl: null },
      ] } },
    }])
    await screen.findByText('Alice (@alice)')
    fireEvent.change(screen.getByRole('combobox', { name: 'Reviewer' }), { target: { value: 'bob' } })
    fireEvent.click(await screen.findByRole('option', { name: 'ボブ (@bob)' }))
    expect(onChange).toHaveBeenCalledWith(['U1', 'U2'])
  })

  it('debounces Case title searches, resolves bookmarked IDs and appends a new reference', async () => {
    const ref = { id: 42, title: 'Earlier case', status: 'CLOSED', workspaceId: 'support' }
    const onChange = setup({ id: 'refs', name: 'Related', type: 'CASE_REF', referenceWorkspaceId: 'support' }, ['42'], [
      { request: { query: CASE_REFS_BY_IDS, variables: { workspaceId: 'support', ids: [42] } }, result: { data: { caseRefsByIds: [ref] } } },
      { request: { query: REFERENCEABLE_CASES, variables: { workspaceId: 'support', limit: 50 } }, result: { data: { referenceableCases: [] } } },
      { request: { query: REFERENCEABLE_CASES, variables: { workspaceId: 'support', query: 'new', limit: 50 } }, result: { data: { referenceableCases: [
        { id: 99, title: 'New case', status: 'OPEN', workspaceId: 'support' },
      ] } } },
    ])
    await screen.findByText('Earlier case (#42)')
    fireEvent.change(screen.getByRole('combobox', { name: 'Related' }), { target: { value: 'new' } })
    fireEvent.click(await screen.findByRole('option', { name: 'New case (#99)' }))
    expect(onChange).toHaveBeenCalledWith(['42', '99'])
  })

  it('resolves Case reference summary names without fetching the candidate list', async () => {
    const onChange = setup({ id: 'refs', name: 'Related', type: 'MULTI_CASE_REF', referenceWorkspaceId: 'support' }, ['42', 'removed'], [{
      request: { query: CASE_REFS_BY_IDS, variables: { workspaceId: 'support', ids: [42] } },
      result: { data: { caseRefsByIds: [{ id: 42, title: 'Earlier case', status: 'CLOSED', workspaceId: 'support' }] } },
    }], true)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Earlier case (#42) from Related' }))
    expect(onChange).toHaveBeenCalledWith(['removed'])
    expect(screen.getByRole('button', { name: 'Remove removed from Related' })).toBeVisible()
  })

  it('keeps selected user IDs removable when the directory is unavailable', async () => {
    const onChange = setup({ id: 'user', name: 'Reviewer', type: 'USER' }, ['U1'], [{
      request: { query: GET_SLACK_USERS }, error: new Error('Unavailable'),
    }])
    expect(await screen.findByRole('status')).toHaveTextContent('Could not load choices')
    fireEvent.click(screen.getByRole('button', { name: 'Remove U1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
