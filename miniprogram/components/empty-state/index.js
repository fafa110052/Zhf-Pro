/**
 * 空状态占位组件
 *
 * Props:
 *   icon  — 图标名（zhficon 码位表 key，如 'inbox'/'search'/'flame'/'alert'），默认 'inbox'
 *   title — 标题文字，默认 '暂无数据'
 *   desc  — 描述文字，可选
 *   showAction — 是否显示操作按钮，默认 false
 *   actionText — 按钮文字，默认 '刷新'
 *
 * Events:
 *   bind:action — 点击按钮
 */
const { IC } = require('../../utils/icons');

Component({
  properties: {
    icon: {
      type: String,
      value: 'inbox',
    },
    title: {
      type: String,
      value: '暂无数据',
    },
    desc: {
      type: String,
      value: '',
    },
    showAction: {
      type: Boolean,
      value: false,
    },
    actionText: {
      type: String,
      value: '刷新',
    },
  },

  data: {
    IC,
  },

  methods: {
    onAction() {
      this.triggerEvent('action');
    },
  },
});
