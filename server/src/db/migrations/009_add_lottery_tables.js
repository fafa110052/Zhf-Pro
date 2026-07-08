/**
 * 009 — 新增摇一摇抽奖模块
 *
 *   1. lottery_config       — 页面配置（文本 + 图片路径）
 *   2. lottery_prizes       — 奖品管理（含概率权重）
 *   3. lottery_records      — 中奖记录（含领取状态）
 *   4. lottery_users        — 用户信息（含每日抽奖计数）
 */

exports.up = async function (knex) {
  // 1. 页面配置表
  await knex.schema.createTable('lottery_config', (table) => {
    table.increments('id').primary();
    table.string('config_key', 64).notNullable().unique().comment('配置键，如 banner_1、activity_start_time');
    table.text('config_value').notNullable().comment('配置值：图片路径或文本');
    table.string('config_type', 16).notNullable().defaultTo('text').comment('image / text / html');
    table.string('category', 32).notNullable().defaultTo('business').comment('banner / business / consultant / prize / share');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    table.index('config_key');
    table.index('category');
  });

  // 2. 奖品表
  await knex.schema.createTable('lottery_prizes', (table) => {
    table.increments('id').primary();
    table.string('name', 64).notNullable().comment('奖品名称');
    table.string('image', 255).comment('奖品图片路径');
    table.string('prize_type', 16).notNullable().defaultTo('physical').comment('physical / virtual / thanks');
    table.decimal('probability', 5, 2).notNullable().defaultTo(0).comment('中奖概率（%），启用的所有奖品概率之和=100');
    table.integer('total_stock').notNullable().defaultTo(0).comment('总库存，-1=不限');
    table.integer('remaining_stock').notNullable().defaultTo(0).comment('剩余库存');
    table.integer('is_vip').defaultTo(0).comment('是否高意向奖品（触发留资弹窗）');
    table.integer('is_active').defaultTo(1).comment('是否启用');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });

  // 3. 中奖记录表
  await knex.schema.createTable('lottery_records', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().comment('关联 lottery_users.id');
    table.integer('prize_id').notNullable().comment('关联 lottery_prizes.id');
    table.string('prize_name', 64).notNullable().comment('奖品名称快照');
    table.string('prize_image', 255).comment('奖品图片快照');
    table.integer('status').defaultTo(0).comment('0未领取 1已领取 2已失效');
    table.timestamp('win_at').comment('中奖时间');
    table.timestamp('claimed_at').comment('领取时间');
    table.timestamps(true, true);
    table.index('user_id');
    table.index('prize_id');
    table.index('status');
  });

  // 4. 用户信息表
  await knex.schema.createTable('lottery_users', (table) => {
    table.increments('id').primary();
    table.string('openid', 64).unique().comment('微信 openid');
    table.string('phone', 20).comment('手机号');
    table.string('name', 32).comment('姓名');
    table.integer('daily_draws').defaultTo(0).comment('当日已抽次数');
    table.integer('total_draws').defaultTo(0).comment('累计抽奖次数');
    table.date('last_draw_date').comment('最近抽奖日期');
    table.timestamps(true, true);
    table.index('openid');
    table.index('phone');
  });

  // ── 初始配置数据 ──
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 文本配置
  const textConfigs = [
    ['project_id', 'ZHF001', 'text', 'business', 1],
    ['service_phone', '400-888-8888', 'text', 'business', 2],
    ['company_address', '请填写公司地址', 'text', 'business', 3],
    ['activity_start_date', '2026-07-01', 'text', 'business', 4],
    ['activity_end_date', '2026-09-30', 'text', 'business', 5],
    ['lottery_start_date', '2026-07-01', 'text', 'business', 6],
    ['prize_start_date', '2026-07-08', 'text', 'business', 7],
    ['consultant_name', '张顾问', 'text', 'business', 8],
    ['consultant_phone', '138-0000-0000', 'text', 'business', 9],
    ['cooperation_phone', '139-0000-0000', 'text', 'business', 10],
    ['latitude', '30.259244', 'text', 'business', 11],
    ['longitude', '120.205234', 'text', 'business', 12],
    ['page_title', '住好房装饰 — 摇一摇抽奖', 'text', 'business', 13],
    ['share_title', '住好房摇一摇抽奖，大奖等你来！', 'text', 'business', 14],
    ['share_desc', '参与摇一摇抽奖，赢取精美好礼', 'text', 'business', 15],
    ['rule_html', `<div class="detailrule"><p class="detailrulet">活动规则</p>
      <p>1、每人每天2次初始抽奖机会，每天最多5次；</p>
      <p>2、活动开始后领取奖品，限本人携带有效身份证领取，奖品有效期24小时；</p>
      <p>3、每人仅限一个微信号参与本次活动；</p>
      <p>4、每人每天仅限领取1个礼品，活动期间最多领取2个；</p>
      <p>5、抽奖时间：7月1日—9月30日；</p>
      <p>6、领奖地址：请咨询客服获取；</p>
      <p>7、领奖电话：400-888-8888；</p>
      <p>8、奖品以实物为准，不可抵现，不提供邮寄；</p>
      <p>9、活动最终解释权归住好房所有。</p></div>`, 'html', 'business', 16],
    ['notice_html', '', 'html', 'business', 17],
    ['daily_init_draws', '2', 'text', 'business', 18],
    ['daily_max_draws', '5', 'text', 'business', 19],
  ];

  for (const [key, value, type, category, sort] of textConfigs) {
    await knex('lottery_config').insert({
      config_key: key, config_value: value, config_type: type,
      category, sort_order: sort,
      created_at: now, updated_at: now,
    });
  }

  // 图片配置（占位，上线后通过管理后台上传替换）
  const imageKeys = [
    'banner_1', 'banner_2', 'banner_3',
    'prize_show',
    'gallery_1', 'gallery_2', 'gallery_3',
    'info_nav', 'info_phone',
    'ad_popup',
    'share_ad', 'share_logo',
    'card_1', 'card_2', 'card_3',
    'consultant_avatar', 'consultant_qrcode', 'contact_qr',
    'vip_prize',
  ];

  for (let i = 0; i < imageKeys.length; i++) {
    await knex('lottery_config').insert({
      config_key: imageKeys[i], config_value: '',
      config_type: 'image', category: imageKeys[i].startsWith('banner') ? 'banner'
        : imageKeys[i].startsWith('consultant') || imageKeys[i] === 'contact_qr' ? 'consultant'
        : imageKeys[i].startsWith('share') ? 'share'
        : imageKeys[i].startsWith('card') ? 'cards'
        : imageKeys[i].startsWith('gallery') ? 'gallery'
        : imageKeys[i].startsWith('info') ? 'info'
        : imageKeys[i] === 'ad_popup' ? 'ad'
        : imageKeys[i] === 'vip_prize' ? 'prize'
        : 'prize',
      sort_order: i + 1,
      created_at: now, updated_at: now,
    });
  }

  // ── 初始奖品数据（4个示例奖品）──
  const prizes = [
    { name: '华为手机', prize_type: 'physical', probability: 5, total_stock: 10, remaining_stock: 10, is_vip: 1, sort_order: 1 },
    { name: '电饭煲', prize_type: 'physical', probability: 15, total_stock: 50, remaining_stock: 50, is_vip: 0, sort_order: 2 },
    { name: '精美雨伞', prize_type: 'physical', probability: 30, total_stock: 200, remaining_stock: 200, is_vip: 0, sort_order: 3 },
    { name: '谢谢参与', prize_type: 'thanks', probability: 50, total_stock: -1, remaining_stock: -1, is_vip: 0, sort_order: 4 },
  ];

  for (const p of prizes) {
    await knex('lottery_prizes').insert({
      ...p, created_at: now, updated_at: now,
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('lottery_records');
  await knex.schema.dropTableIfExists('lottery_users');
  await knex.schema.dropTableIfExists('lottery_prizes');
  await knex.schema.dropTableIfExists('lottery_config');
};
