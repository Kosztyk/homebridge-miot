const RobotCleanerDevice = require('../RobotCleanerDevice.js');


class XiaomiVacuumC108 extends RobotCleanerDevice {
  constructor(miotDevice, name, logger) {
    super(miotDevice, name, logger);
  }


  /*----------========== DEVICE INFO ==========----------*/

  getDeviceName() {
    return 'Xiaomi Robot Vacuum E5';
  }

  getMiotSpecUrl() {
    return 'https://home.miot-spec.com/spec/xiaomi.vacuum.c108';
  }


  /*----------========== CONFIG ==========----------*/

  requiresMiCloud() {
    return false;
  }

  devicePropertiesToMonitor() {
    return ['vacuum:status', 'vacuum:fault', 'vacuum:sweep-type', 'vacuum:suction-level',
      'vacuum:cleaning-area', 'vacuum:cleaning-time', 'vacuum:last-clean-time', 'vacuum:sweep-break-switch',
      'battery:battery-level', 'battery:charging-state', 'filter:filter-life-level', 'filter:filter-left-time',
      'brush-cleaner:brush-life-level', 'brush-cleaner:brush-left-time', 'clean-record:total-clean-area',
      'clean-record:total-clean-time', 'clean-record:total-clean-count'
    ];
  }

  allPropRequestChunkSize() {
    return 4;
  }


  /*----------========== METADATA ==========----------*/

  initDeviceServices() {
    this._addService({ siid: 2, type: 'urn:miot-spec-v2:service:vacuum:00007810:xiaomi-c108:1', description: 'Vacuum' });
    this._addService({ siid: 3, type: 'urn:miot-spec-v2:service:battery:00007805:xiaomi-c108:1', description: 'Battery' });
    this._addService({ siid: 4, type: 'urn:miot-spec-v2:service:identify:0000782C:xiaomi-c108:1', description: 'Identify' });
    this._addService({ siid: 5, type: 'urn:miot-spec-v2:service:vacuum-map:00007842:xiaomi-c108:1', description: 'Vacuum Map' });
    this._addService({ siid: 6, type: 'urn:miot-spec-v2:service:filter:0000780B:xiaomi-c108:1', description: 'Filter' });
    this._addService({ siid: 7, type: 'urn:miot-spec-v2:service:brush-cleaner:0000784C:xiaomi-c108:1', description: 'Brush Cleaner' });
    this._addService({ siid: 9, type: 'urn:xiaomi-spec:service:clean-record:00007803:xiaomi-c108:1', description: 'Clean Record' });
    this._addService({ siid: 10, type: 'urn:miot-spec-v2:service:no-disturb:0000784D:xiaomi-c108:1', description: 'No Disturb' });
    this._addService({ siid: 11, type: 'urn:xiaomi-spec:service:go-charging:00007805:xiaomi-c108:1', description: 'Go Charging' });
    this._addService({ siid: 12, type: 'urn:xiaomi-spec:service:notification:00007802:xiaomi-c108:1', description: 'Notification' });
    this._addService({ siid: 13, type: 'urn:xiaomi-spec:service:remote-control:00007802:xiaomi-c108:1', description: 'Remote Control' });
    this._addService({ siid: 14, type: 'urn:miot-spec-v2:service:lighting:00007846:xiaomi-c108:1', description: 'Lighting' });
    this._addService({ siid: 15, type: 'urn:miot-spec-v2:service:time-zone-info:00007852:xiaomi-c108:1', description: 'Time Zone Info' });
  }

  initDeviceProperties() {
    this._addProperty('vacuum:status', {
      siid: 2, piid: 1, type: 'urn:miot-spec-v2:property:status:00000007:xiaomi-c108:1', description: 'Status', format: 'uint8', access: ['read', 'notify'],
      valueList: [
        { value: 1, description: 'Standby' }, { value: 2, description: 'Working' }, { value: 3, description: 'Paused' },
        { value: 4, description: 'Fault' }, { value: 5, description: 'Charging' }, { value: 6, description: 'Go Charging' },
        { value: 7, description: 'Charging Completed' }
      ]
    });
    this._addProperty('vacuum:fault', {
      siid: 2, piid: 2, type: 'urn:miot-spec-v2:property:fault:00000009:xiaomi-c108:1', description: 'Device Fault', format: 'uint8', access: ['read', 'notify'],
      valueList: [
        { value: 0, description: 'No Faults' }, { value: 1, description: 'Left Wheel Error' }, { value: 2, description: 'Right Wheel Error' },
        { value: 3, description: 'Bumper Error' }, { value: 4, description: 'Side Brush Error' }, { value: 5, description: 'Cliff Sensor Error' },
        { value: 6, description: 'Wheel Suspended' }, { value: 7, description: 'Fan Error' }, { value: 8, description: 'Battery Low' },
        { value: 9, description: 'Docking Failed' }, { value: 10, description: 'Robot Trapped' }, { value: 14, description: 'Battery Temperature Error' },
        { value: 15, description: 'Slope Detected' }
      ]
    });
    this._addProperty('vacuum:common-params', { siid: 2, piid: 3, type: 'urn:xiaomi-spec:property:common-params:00000001:xiaomi-c108:1', description: 'Common Parameters', format: 'string', access: [] });
    this._addProperty('vacuum:sweep-type', {
      siid: 2, piid: 4, type: 'urn:miot-spec-v2:property:sweep-type:0000004E:xiaomi-c108:1', description: 'Sweep Type', format: 'uint8', access: ['read', 'write', 'notify'],
      valueList: [{ value: 1, description: 'Whole House' }, { value: 2, description: 'Spot Clean' }, { value: 3, description: 'Edge Clean' }]
    });
    this._addProperty('vacuum:suction-level', {
      siid: 2, piid: 5, type: 'urn:miot-spec-v2:property:suction-level:0000004D:xiaomi-c108:1', description: 'Suction Level', format: 'uint8', access: ['read', 'write', 'notify'],
      valueList: [{ value: 0, description: 'Quiet' }, { value: 1, description: 'Standard' }, { value: 2, description: 'Strong' }]
    });
    this._addProperty('vacuum:cleaning-area', { siid: 2, piid: 6, type: 'urn:miot-spec-v2:property:cleaning-area:0000003A:xiaomi-c108:1', description: 'Cleaning Area', format: 'uint32', access: ['read', 'notify'], valueRange: [0, 4294967295, 1] });
    this._addProperty('vacuum:cleaning-time', { siid: 2, piid: 7, type: 'urn:miot-spec-v2:property:cleaning-time:0000003B:xiaomi-c108:1', description: 'Cleaning Time', format: 'uint32', access: ['read', 'notify'], valueRange: [0, 4294967295, 1] });
    this._addProperty('vacuum:last-clean-time', { siid: 2, piid: 9, type: 'urn:xiaomi-spec:property:last-clean-time:00000002:xiaomi-c108:1', description: 'Last Clean Time', format: 'string', access: ['read', 'notify'] });
    this._addProperty('vacuum:order-clean', { siid: 2, piid: 11, type: 'urn:xiaomi-spec:property:order-clean:00000003:xiaomi-c108:1', description: 'Order Clean', format: 'string', access: ['read', 'write', 'notify'] });
    this._addProperty('vacuum:sweep-break-switch', { siid: 2, piid: 12, type: 'urn:xiaomi-spec:property:sweep-break-switch:00000004:xiaomi-c108:1', description: 'Breakpoint Resume', format: 'bool', access: ['read', 'write', 'notify'] });

    this._addProperty('battery:battery-level', { siid: 3, piid: 1, type: 'urn:miot-spec-v2:property:battery-level:00000014:xiaomi-c108:1', description: 'Battery Level', format: 'uint8', access: ['read', 'notify'], unit: 'percentage', valueRange: [0, 100, 1] });
    this._addProperty('battery:charging-state', {
      siid: 3, piid: 2, type: 'urn:miot-spec-v2:property:charging-state:00000015:xiaomi-c108:1', description: 'Charging State', format: 'uint8', access: ['read', 'notify'],
      valueList: [{ value: 1, description: 'Not Charging' }, { value: 2, description: 'Charging' }, { value: 3, description: 'Charging Completed' }]
    });

    this._addProperty('filter:filter-life-level', { siid: 6, piid: 1, type: 'urn:miot-spec-v2:property:filter-life-level:0000001E:xiaomi-c108:1', description: 'Filter Life Level', format: 'uint8', access: ['read', 'notify'], unit: 'percentage', valueRange: [0, 100, 1] });
    this._addProperty('filter:filter-left-time', { siid: 6, piid: 2, type: 'urn:miot-spec-v2:property:filter-left-time:0000001F:xiaomi-c108:1', description: 'Filter Left Time', format: 'uint16', access: ['read', 'notify'], valueRange: [0, 18000, 1] });
    this._addProperty('brush-cleaner:brush-life-level', { siid: 7, piid: 1, type: 'urn:miot-spec-v2:property:brush-life-level:00000085:xiaomi-c108:1', description: 'Brush Life Level', format: 'uint8', access: ['read', 'notify'], unit: 'percentage', valueRange: [0, 100, 1] });
    this._addProperty('brush-cleaner:brush-left-time', { siid: 7, piid: 2, type: 'urn:miot-spec-v2:property:brush-left-time:00000086:xiaomi-c108:1', description: 'Brush Left Time', format: 'uint16', access: ['read', 'notify'], valueRange: [0, 18000, 1] });

    this._addProperty('clean-record:total-clean-area', { siid: 9, piid: 1, type: 'urn:xiaomi-spec:property:total-clean-area:00000001:xiaomi-c108:1', description: 'Total Clean Area', format: 'uint32', access: ['read', 'notify'], valueRange: [0, 4294967295, 1] });
    this._addProperty('clean-record:total-clean-time', { siid: 9, piid: 2, type: 'urn:xiaomi-spec:property:total-clean-time:00000002:xiaomi-c108:1', description: 'Total Clean Time', format: 'uint32', access: ['read', 'notify'], valueRange: [0, 4294967295, 1] });
    this._addProperty('clean-record:total-clean-count', { siid: 9, piid: 3, type: 'urn:xiaomi-spec:property:total-clean-count:00000003:xiaomi-c108:1', description: 'Total Clean Count', format: 'uint16', access: ['read', 'notify'], valueRange: [0, 65535, 1] });
    this._addProperty('clean-record:clean-record', { siid: 9, piid: 5, type: 'urn:xiaomi-spec:property:clean-record:00000005:xiaomi-c108:1', description: 'Clean Record', format: 'string', access: ['read', 'notify'] });

    this._addProperty('no-disturb:no-disturb', { siid: 10, piid: 1, type: 'urn:miot-spec-v2:property:no-disturb:0000004C:xiaomi-c108:1', description: 'Do Not Disturb', format: 'bool', access: ['read', 'write', 'notify'] });
    this._addProperty('no-disturb:enable-time-period', { siid: 10, piid: 2, type: 'urn:miot-spec-v2:property:enable-time-period:0000004B:xiaomi-c108:1', description: 'Enable Time Period', format: 'string', access: ['read', 'write', 'notify'] });

    this._addProperty('notification:notification', { siid: 12, piid: 1, type: 'urn:xiaomi-spec:property:notification:00000001:xiaomi-c108:1', description: 'Notification', format: 'uint8', access: ['read', 'notify'], valueRange: [0, 14, 1] });
    this._addProperty('remote-control:direction-key', {
      siid: 13, piid: 1, type: 'urn:xiaomi-spec:property:direction-key:00000001:xiaomi-c108:1', description: 'Direction Key', format: 'uint8', access: ['write'],
      valueList: [{ value: 0, description: 'Left' }, { value: 1, description: 'Right' }, { value: 2, description: 'Forward' }, { value: 3, description: 'Back' }, { value: 4, description: 'Stop' }]
    });
    this._addProperty('lighting:lighting', { siid: 14, piid: 1, type: 'urn:miot-spec-v2:property:lighting:0000003E:xiaomi-c108:1', description: 'Lighting', format: 'bool', access: ['read', 'write', 'notify'] });
    this._addProperty('time-zone-info:time-zone', { siid: 15, piid: 1, type: 'urn:miot-spec-v2:property:time-zone:00000045:xiaomi-c108:1', description: 'Time Zone', format: 'int32', access: ['read', 'write', 'notify'], valueRange: [-20, 20, 1] });
  }

  initDeviceActions() {
    this._addAction('vacuum:start-sweep', { siid: 2, aiid: 1, type: 'urn:miot-spec-v2:action:start-sweep:00002804:xiaomi-c108:1', description: 'Start Sweep', in: [], out: [] });
    this._addAction('vacuum:stop-sweeping', { siid: 2, aiid: 2, type: 'urn:miot-spec-v2:action:stop-sweeping:00002805:xiaomi-c108:1', description: 'Stop Sweeping', in: [], out: [] });
    this._addAction('vacuum:pause-sweeping', { siid: 2, aiid: 3, type: 'urn:miot-spec-v2:action:pause-sweeping:00002807:xiaomi-c108:1', description: 'Pause Sweeping', in: [], out: [] });
    this._addAction('vacuum:continue-sweep', { siid: 2, aiid: 4, type: 'urn:miot-spec-v2:action:continue-sweep:00002808:xiaomi-c108:1', description: 'Continue Sweep', in: [], out: [] });
    this._addAction('vacuum:add-order-clean', { siid: 2, aiid: 5, type: 'urn:xiaomi-spec:action:add-order-clean:00000001:xiaomi-c108:1', description: 'Add Order Clean', in: [3], out: [] });
    this._addAction('vacuum:delete-order-clean', { siid: 2, aiid: 6, type: 'urn:xiaomi-spec:action:delete-order-clean:00000002:xiaomi-c108:1', description: 'Delete Order Clean', in: [3], out: [] });
    this._addAction('vacuum:modify-order-clean', { siid: 2, aiid: 7, type: 'urn:xiaomi-spec:action:modify-order-clean:00000003:xiaomi-c108:1', description: 'Modify Order Clean', in: [3], out: [] });
    this._addAction('vacuum:stop-and-gocharge', { siid: 2, aiid: 8, type: 'urn:miot-spec-v2:action:stop-and-gocharge:00002806:xiaomi-c108:1', description: 'Stop And Go Charge', in: [], out: [] });
    this._addAction('identify:identify', { siid: 4, aiid: 1, type: 'urn:miot-spec-v2:action:identify:00002801:xiaomi-c108:1', description: 'Identify', in: [], out: [] });
    this._addAction('filter:reset-filter-life', { siid: 6, aiid: 1, type: 'urn:miot-spec-v2:action:reset-filter-life:00002803:xiaomi-c108:1', description: 'Reset Filter Life', in: [], out: [] });
    this._addAction('brush-cleaner:reset-brush-life', { siid: 7, aiid: 1, type: 'urn:miot-spec-v2:action:reset-brush-life:00002830:xiaomi-c108:1', description: 'Reset Brush Life', in: [], out: [] });
    this._addAction('go-charging:start-charging', { siid: 11, aiid: 1, type: 'urn:xiaomi-spec:action:start-charging:00000001:xiaomi-c108:1', description: 'Start Charging', in: [], out: [] });
    this._addAction('go-charging:stop-charging', { siid: 11, aiid: 2, type: 'urn:xiaomi-spec:action:stop-charging:00000002:xiaomi-c108:1', description: 'Stop Charging', in: [], out: [] });
  }

  initDeviceEvents() {
    this.addEventByString('battery:low-battery', JSON.stringify({ siid: 3, eiid: 1, type: 'urn:miot-spec-v2:event:low-battery:00005003:xiaomi-c108:1', description: 'Low Battery', arguments: [] }));
  }


  /*----------========== VALUES OVERRIDES ==========----------*/

  statusIdleValue() {
    return 1;
  }

  statusSweepingValue() {
    return 2;
  }

  statusPausedValue() {
    return 3;
  }

  statusErrorValue() {
    return 4;
  }

  statusChargingValue() {
    return 5;
  }

  statusGoChargingValue() {
    return 6;
  }

  statusChargingCompletedValue() {
    return 7;
  }

  chargingStateNotChargingValue() {
    return 1;
  }

  chargingStateChargingValue() {
    return 2;
  }

  chargingStateNotChargeableValue() {
    return -1;
  }

  chargingStateGoChargingValue() {
    return -1;
  }

  statusMoppingValue() {
    return -1;
  }

  statusSweepingAndMoppingValue() {
    return -1;
  }


  /*----------========== PROPERTY OVERRIDES ==========----------*/

  modeProp() {
    // The C108 has no vacuum:mode property; cleaning style is exposed as vacuum:sweep-type.
    return null;
  }

  speedLevelProp() {
    return this.suctionLevelProp();
  }

  suctionLevelProp() {
    return this.getProperty('vacuum:suction-level');
  }

  sweepTypeProp() {
    return this.getProperty('vacuum:sweep-type');
  }

  cleanTimeProp() {
    return this.getProperty('vacuum:cleaning-time');
  }

  cleanAreaProp() {
    return this.getProperty('vacuum:cleaning-area');
  }

  totalCleanTimeProp() {
    return this.getProperty('clean-record:total-clean-time');
  }

  totalCleanTimesProp() {
    return this.getProperty('clean-record:total-clean-count');
  }

  totalCleanAreaProp() {
    return this.getProperty('clean-record:total-clean-area');
  }


  /*----------========== ACTION OVERRIDES ==========----------*/

  startChargeAction() {
    return this.getAction('go-charging:start-charging') || this.getAction('vacuum:stop-and-gocharge');
  }

  goChargeAction() {
    return this.getAction('vacuum:stop-and-gocharge') || this.startChargeAction();
  }


  /*----------========== HELPERS ==========----------*/

  _addService(spec) {
    return this.createServiceByString(JSON.stringify(spec));
  }

  _addProperty(name, spec) {
    return this.addPropertyByString(name, JSON.stringify(spec));
  }

  _addAction(name, spec) {
    return this.addActionByString(name, JSON.stringify(spec));
  }

}

module.exports = XiaomiVacuumC108;
