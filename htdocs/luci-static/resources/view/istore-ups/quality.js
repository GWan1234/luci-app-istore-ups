'use strict';
'require view';
'require form';

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('istore_ups', _('电能质量监控与阈值防抖'),
			_('监控市电电压畸变、电网频率偏离、长期过载与机箱高温。内置硬件级滞回与防抖过滤，杜绝临界波动引发频繁告警。'));

		s = m.section(form.NamedSection, 'quality', 'quality_policy', _('输入电压质量检测 (Mains Voltage)'));
		s.anonymous = true;

		o = s.option(form.Value, 'voltage_low_warn', _('输入电压欠压告警阈值 (V)'),
			_('当市电输入电压低于此值时发出欠压预警 (国标 220V 允许偏差 -10% 为 198V)'));
		o.datatype = 'uinteger';
		o.default = '198';

		o = s.option(form.Value, 'voltage_high_warn', _('输入电压过压告警阈值 (V)'),
			_('当市电输入电压高于此值时发出过压预警 (国标 220V 允许偏差 +10% 为 242V)'));
		o.datatype = 'uinteger';
		o.default = '242';

		o = s.option(form.Value, 'voltage_hysteresis', _('电压告警滞回回差 (V)'),
			_('防止输入电压在临界阈值微小上下跳变引发重复通知。如设定 3V，欠压告警需电压回升至 (阈值 + 3V) 才判定恢复。'));
		o.datatype = 'uinteger';
		o.default = '3';

		s = m.section(form.NamedSection, 'quality', 'quality_policy', _('交流工频与温度检测'));
		s.anonymous = true;

		o = s.option(form.Value, 'freq_low_warn', _('电网频率下限 (Hz)'));
		o.datatype = 'ufloat';
		o.default = '48.5';

		o = s.option(form.Value, 'freq_high_warn', _('电网频率上限 (Hz)'));
		o.datatype = 'ufloat';
		o.default = '51.5';

		o = s.option(form.Value, 'temp_high_warn', _('UPS 机内过温告警阈值 (°C)'),
			_('仅当 UPS 硬件提供温度传感器时有效。未支持温度检测的设备将自动跳过此项。'));
		o.datatype = 'uinteger';
		o.default = '45';

		return m.render();
	}
});
