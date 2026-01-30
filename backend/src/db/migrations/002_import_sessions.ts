import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('import_sessions', (table) => {
    table.increments('id').primary();
    table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('upload');
    table.string('fileName').nullable();
    table.integer('fileSize').nullable();
    table.text('rawCsvData').nullable();
    table.text('columnMapping').nullable(); // JSON string
    table.text('parsedRows').nullable(); // JSON string with validation errors
    table.integer('validRowCount').defaultTo(0);
    table.integer('invalidRowCount').defaultTo(0);
    table.integer('skippedRowCount').defaultTo(0);
    table.integer('importedExpenseCount').defaultTo(0);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('import_history', (table) => {
    table.increments('id').primary();
    table.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('sessionId').notNullable();
    table.string('fileName').notNullable();
    table.integer('totalRows').notNullable();
    table.integer('importedRows').notNullable();
    table.integer('skippedRows').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('import_history');
  await knex.schema.dropTableIfExists('import_sessions');
}
