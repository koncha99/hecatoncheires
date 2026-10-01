import { Page } from '@playwright/test';

/** Shared field-filter toolbar on the Case list and either board. */
export class CaseFieldFilters {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    if (!await this.page.getByTestId('case-field-filters-panel').isVisible()) {
      await this.page.getByTestId('case-field-filters-button').click();
    }
  }

  async toggleOption(fieldId: string, optionName: string): Promise<void> {
    await this.open();
    const field = this.page.getByTestId(`case-field-filter-${fieldId}`);
    if (!await field.getByRole('listbox').isVisible()) {
      await field.locator('button').first().click();
    }
    await field.getByRole('listbox').getByRole('button', { name: new RegExp(optionName) }).click();
  }

  async clear(): Promise<void> {
    await this.open();
    await this.page.getByTestId('case-field-filters-clear').click();
  }
}
