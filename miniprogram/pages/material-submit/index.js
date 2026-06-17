/**
 * 选材申请提交页
 *
 * 显示已选材料清单，填写联系信息后提交申请
 * 业主身份自动填充房号（不可编辑）
 */
const api = require('../../utils/api');

Page({
  data: {
    propertyName: '',
    summary: [],
    totalCount: 0,

    // 表单字段
    applicant_name: '',
    applicant_phone: '',
    room_number: '',
    remark: '',

    // 业主状态
    isOwner: false,
    roomLocked: false,

    submitting: false,
    checkingOwner: false,
  },

  onLoad() {
    const app = getApp();
    const sel = app.globalData.materialSelection;

    // 无选材数据 → 返回上一页
    if (!sel || !sel.items || sel.items.length === 0) {
      wx.showToast({ title: '请先选择材料', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({
      propertyName: sel.propertyName,
      summary: sel.summary,
      totalCount: sel.items.length,
    });

    // 检查业主身份
    this.checkOwnerStatus(sel.propertyId);
  },

  /** 检查当前用户是否是该楼盘的业主 */
  async checkOwnerStatus(propertyId) {
    const app = getApp();
    if (!app.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '仅该楼盘的业主可提交选材申请，请先登录。',
        showCancel: false,
        confirmText: '知道了',
        success: () => wx.navigateBack(),
      });
      return;
    }

    this.setData({ checkingOwner: true });
    try {
      const result = await api.getOwnerCheck(propertyId);
      if (result.is_owner) {
        // 业主 → 自动填充房号并锁定
        const roomNumber = [result.building, result.room].filter(Boolean).join('');
        this.setData({
          isOwner: true,
          room_number: roomNumber,
          roomLocked: true,
          checkingOwner: false,
        });
      } else {
        // 非业主 → 提示并返回
        wx.showModal({
          title: '提示',
          content: '您还未成为该小区业主，无法提交选材申请。如需开通请联系管理员。',
          showCancel: false,
          confirmText: '知道了',
          success: () => wx.navigateBack(),
        });
      }
    } catch (err) {
      console.error('获取业主状态失败:', err);
      this.setData({ checkingOwner: false });
      // 401 表示未登录，其他错误忽略
      if (err && err.message && err.message.includes('认证')) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再提交选材申请。',
          showCancel: false,
          confirmText: '知道了',
          success: () => wx.navigateBack(),
        });
      }
    }
  },

  /** 输入处理 */
  onNameInput(e)   { this.setData({ applicant_name: e.detail.value }); },
  onPhoneInput(e)  { this.setData({ applicant_phone: e.detail.value }); },
  onRoomInput(e)   { if (!this.data.roomLocked) this.setData({ room_number: e.detail.value }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  /** 提交申请 */
  async onSubmit() {
    const { applicant_name, applicant_phone, room_number, submitting, checkingOwner } = this.data;

    if (checkingOwner) return;

    // 校验
    if (!applicant_name.trim()) {
      return wx.showToast({ title: '请填写联系人姓名', icon: 'none' });
    }
    if (!/^1[3-9]\d{9}$/.test(applicant_phone)) {
      return wx.showToast({ title: '请填写正确的手机号', icon: 'none' });
    }
    if (!room_number.trim()) {
      return wx.showToast({ title: '请填写房号', icon: 'none' });
    }
    if (submitting) return;

    this.setData({ submitting: true });

    try {
      const app = getApp();
      const sel = app.globalData.materialSelection;

      const result = await api.submitMaterialOrder({
        property_id: sel.propertyId,
        room_number: room_number.trim(),
        applicant_name: applicant_name.trim(),
        applicant_phone,
        remark: this.data.remark.trim() || undefined,
        items: sel.items,
      });

      // 清空选材缓存
      app.globalData.materialSelection = null;

      // 跳转成功页
      wx.redirectTo({
        url: `/pages/material-success/index?orderNo=${result.order_no}&status=${result.status}`,
      });
    } catch (err) {
      console.error('提交失败:', err);
      this.setData({ submitting: false });
    }
  },
});
