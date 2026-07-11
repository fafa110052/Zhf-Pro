// 量房预约页面
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    ready: false,
    loading: false,
    error: false,
    submitting: false,

    // 表单字段
    name: '',
    phone: '',
    property_name: '',
    room_number: '',
    area_size: '',
    expected_time: '',
    expected_period: '',
    budget: '',
    remark: '',

    // picker 数据
    timeOptions: ['工作日', '周末', '不限'],
    timeIndex: -1,
    periodOptions: ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'],
    periodIndex: -1,
    budgetOptions: ['5万以下', '5-10万', '10-20万', '20-30万', '30万以上'],
    budgetIndex: -1,

    // 校验
    errors: {},
  },

  onLoad() {
    this.loadData();
  },

  onReady() {
    this._readyFired = true;
    if (this._pageData) {
      this.setData(Object.assign({ ready: true }, this._pageData));
      this._pageData = null;
    }
  },

  loadData() {
    // 页面无需加载数据，直接显示
    const pageData = { loading: false };
    if (this._readyFired) {
      this.setData(Object.assign({ ready: true }, pageData));
    } else {
      this._pageData = pageData;
    }
  },

  // ─── 输入绑定 ───
  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onPropertyInput(e) { this.setData({ property_name: e.detail.value }); },
  onRoomInput(e) { this.setData({ room_number: e.detail.value }); },
  onAreaInput(e) { this.setData({ area_size: e.detail.value }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  // ─── Picker 选择 ───
  onTimeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ timeIndex: idx, expected_time: this.data.timeOptions[idx] });
  },
  onPeriodChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ periodIndex: idx, expected_period: this.data.periodOptions[idx] });
  },
  onBudgetChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ budgetIndex: idx, budget: this.data.budgetOptions[idx] });
  },

  // ─── 校验 ───
  validate() {
    const errors = {};
    if (!this.data.name.trim()) errors.name = '请输入联系人姓名';
    if (!this.data.phone.trim()) {
      errors.phone = '请输入手机号';
    } else if (!/^1\d{10}$/.test(this.data.phone.trim())) {
      errors.phone = '手机号格式不正确';
    }
    if (!this.data.property_name.trim()) errors.property_name = '请输入楼盘/小区名称';
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  // ─── 提交 ───
  async onSubmit() {
    if (this.data.submitting) return;
    if (!this.validate()) {
      return;
    }

    this.setData({ submitting: true });

    try {
      const data = {
        name: this.data.name.trim(),
        phone: this.data.phone.trim(),
        property_name: this.data.property_name.trim(),
        room_number: this.data.room_number.trim() || undefined,
        area_size: this.data.area_size ? parseFloat(this.data.area_size) : undefined,
        expected_time: [this.data.expected_time, this.data.expected_period].filter(Boolean).join(' ') || undefined,
        budget: this.data.budget || undefined,
        remark: this.data.remark.trim() || undefined,
        source: 'miniprogram',
        source_page: 'home_button',
      };

      await api.submitMeasureAppointment(data);

      wx.showToast({ title: '预约成功', icon: 'success', duration: 2000 });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } catch (err) {
      console.error('[量房预约] 提交失败:', err);
      wx.showToast({ title: err?.message || '提交失败，请重试', icon: 'none', duration: 3000 });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
