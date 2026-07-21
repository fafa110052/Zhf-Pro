exports.up = function (knex) {
  return knex.schema.table('door_series', (table) => {
    table.integer('page_number').defaultTo(2).notNullable()
      .comment('2=室内木门(step2), 3=卫生间门(step3)');
  });
};

exports.down = function () {
  // SQLite does not support ALTER TABLE ... DROP COLUMN
};
