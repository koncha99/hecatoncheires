import { test, expect } from '@playwright/test';
import { CaseListPage } from '../pages/CaseListPage';
import { CaseFormPage } from '../pages/CaseFormPage';
import { CaseFieldFilters } from '../pages/CaseFieldFilters';

test('appends text, zero-valued numbers, dates and title-searched reference IDs', async ({ page }) => {
  const list = new CaseListPage(page);
  const form = new CaseFormPage(page);
  const filters = new CaseFieldFilters(page);
  const prefix = `Typed fields ${Date.now()}`;
  const refs: string[] = [];
  for (const name of ['Alpha', 'Beta']) {
    await list.navigate('test');
    await list.clickNewCaseButton();
    await form.createCase({ title: `${prefix} target ${name}`, customFields: { category: 'task' } });
    await list.fillSearchFilter(`${prefix} target ${name}`);
    await list.clickCaseByTitle(`${prefix} target ${name}`);
    refs.push(new URL(page.url()).pathname.split('/').pop()!);
  }
  for (const [name, ticket, estimate, due, ref] of [
    ['one', 'a,b&c', '0', '2026-10-01', 'Alpha'],
    ['two', 'second', '2', '2026-10-02', 'Beta'],
    ['excluded', 'other', '9', '2026-10-03', 'Beta'],
  ]) {
    await list.navigate('review');
    await list.clickNewCaseButton();
    await form.createCase({ title: `${prefix} ${name}`, customFields: { ticket, estimate, due, related: `${prefix} target ${ref}` } });
  }
  await filters.addValue('ticket', 'Ticket', 'a,b&c');
  await filters.addValue('ticket', 'Ticket', 'second');
  await filters.addValue('estimate', 'Estimate', '0');
  await filters.addValue('estimate', 'Estimate', '2');
  await filters.addValue('due', 'Due', '2026-10-01');
  await filters.addValue('due', 'Due', '2026-10-02');
  await filters.addCondition('related', 'Related');
  const related = page.getByTestId('case-field-filter-related').getByRole('combobox');
  await related.fill(`${prefix} target Alpha`);
  await page.getByRole('option', { name: `${prefix} target Alpha (#${refs[0]})`, exact: true }).click();
  await expect(list.getCaseRowByTitle(`${prefix} one`)).toBeVisible();
  await expect(list.getCaseRowByTitle(`${prefix} two`)).toHaveCount(0);
  await related.fill(`${prefix} target Beta`);
  await page.getByRole('option', { name: `${prefix} target Beta (#${refs[1]})`, exact: true }).click();
  await filters.close();
  await expect(list.getCaseRowByTitle(`${prefix} two`)).toBeVisible();
  await expect(list.getCaseRowByTitle(`${prefix} excluded`)).toHaveCount(0);
  expect(new URL(page.url()).searchParams.getAll('field.ticket')).toEqual(['a,b&c', 'second']);
  expect(new URL(page.url()).searchParams.getAll('field.related')).toEqual(refs);
  const sharedUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(sharedUrl);
  await expect(list.getCaseRowByTitle(`${prefix} two`)).toBeVisible();
  const summary = page.getByTestId('case-field-filters-summary');
  await expect(summary).toContainText(`${prefix} target Alpha`);
  await summary.getByRole('button', { name: 'Remove 2 from Estimate', exact: true }).click();
  await expect(list.getCaseRowByTitle(`${prefix} two`)).toHaveCount(0);
  await expect(list.getCaseRowByTitle(`${prefix} one`)).toBeVisible();
  await page.getByTestId('case-field-filters-clear-summary').click();
  await expect(list.getCaseRowByTitle(`${prefix} excluded`)).toBeVisible();
});
