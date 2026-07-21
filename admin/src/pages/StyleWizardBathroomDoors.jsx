import DoorSeriesManager from '../components/DoorSeriesManager';

/**
 * 风格选材 — 卫生间门系列管理（page_number=3）
 */
export default function StyleWizardBathroomDoors() {
  return (
    <DoorSeriesManager
      pageNumber={3}
      title="卫生间门系列"
      description="管理卫生间门系列、颜色与风格配置"
    />
  );
}
