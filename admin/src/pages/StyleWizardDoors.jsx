import DoorSeriesManager from '../components/DoorSeriesManager';

/**
 * 风格选材 — 室内木门系列管理（page_number=2）
 */
export default function StyleWizardDoors() {
  return (
    <DoorSeriesManager
      pageNumber={2}
      title="室内木门系列"
      description="先维护通用颜色库，再到系列中挑选颜色并勾选所属风格"
    />
  );
}
