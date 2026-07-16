import EmptyState from '../components/EmptyState';

/**
 * 风格选材 — 选材单管理（占位页面）
 */
export default function StyleWizardOrders() {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-lg font-semibold text-gray-900">选材单管理</h2>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <EmptyState icon="⏳" title="功能开发中" description="选材单管理功能即将上线" />
      </div>
    </div>
  );
}
