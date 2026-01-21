// Widget Components Index
// Export all widget components for use in WidgetRenderer

// Layout Widgets
export { default as ContainerWidget } from './layout/ContainerWidget';

// Data Widgets
export { default as DeviceStatusWidget } from './data/DeviceStatusWidget';
export { default as ParameterCardWidget } from './data/ParameterCardWidget';

// Visualization Widgets
export { default as TankGaugeWidget } from './visualization/TankGaugeWidget';
export { default as CircularGaugeWidget } from './visualization/CircularGaugeWidget';
export { default as LineChartWidget } from './visualization/LineChartWidget';

// Monitoring Widgets
export { default as AlertWidget } from './monitoring/AlertWidget';
export { default as AvailableDevicesWidget } from './monitoring/AvailableDevicesWidget';
export { default as AuditLogWidget } from './monitoring/AuditLogWidget';

// Control Widgets
export { default as ThresholdEditorWidget } from './controls/ThresholdEditorWidget';
export { default as RecordingControlWidget } from './controls/RecordingControlWidget';
export { default as DeviceConfigWidget } from './controls/DeviceConfigWidget';

// Decorative Widgets
export { default as TextWidget } from './decorative/TextWidget';
export { default as LogoWidget } from './decorative/LogoWidget';
export { default as IconWidget, AVAILABLE_ICONS } from './decorative/IconWidget';
export { default as BackgroundImageWidget } from './decorative/BackgroundImageWidget';
