const BaseDevice = require('../../base/BaseDevice.js');
const Constants = require('../../constants/Constants.js');
const DevTypes = require('../../constants/DevTypes.js');
const PropFormat = require('../../constants/PropFormat.js');
const PropUnit = require('../../constants/PropUnit.js');
const PropAccess = require('../../constants/PropAccess.js');


class RobotCleanerDevice extends BaseDevice {
  constructor(device, name, logger) {
    super(device, name, logger);
  }


  /*----------========== LIFECYCLE ==========----------*/

  initialPropertyFetchDone() {
    super.initialPropertyFetchDone();
    // log the the main brush left time when supported
    if (this.supportsMainBrushLeftTimeReporting()) {
      this.logger.info(`Main brush left time: ${this.getMainBrushLeftTime()} hours.`);
    }
    // log the the main brush life level when supported
    if (this.supportsMainBrushLifeLevelReporting()) {
      this.logger.info(`Main brush life level: ${this.getMainBrushLifeLevel()}%.`);
    }
    // log the the side brush left time when supported
    if (this.supportsSideBrushLeftTimeReporting()) {
      this.logger.info(`Side brush left time: ${this.getSideBrushLeftTime()} hours.`);
    }
    // log the the side brush life level when supported
    if (this.supportsSideBrushLifeLevelReporting()) {
      this.logger.info(`Side brush life level: ${this.getSideBrushLifeLevel()}%.`);
    }
    // log the the filter life level when supported
    if (this.supportsFilterLifeLevelReporting()) {
      this.logger.info(`Filter life level: ${this.getFilterLifeLevel()}%.`);
    }
    // log the the filter used time when supported
    if (this.supportsFilterUsedTimeReporting()) {
      this.logger.info(`Filter used time: ${this.getFilterUsedTime()} hours.`);
    }
    // log the the last clean time when supported
    if (this.supportsLastCleanTime()) {
      this.logger.info(`Current/last clean time: ${this.getLastCleanTime()} ${this.cleanTimeUnit()}.`);
    }
    // log the the last clean area when supported
    if (this.supportsLastCleanArea()) {
      this.logger.info(`Current/last clean area: ${this.getLastCleanArea()} ${this.cleanAreaUnit()}.`);
    }
    // log the the total clean time when supported
    if (this.supportsTotalCleanTimeReporting()) {
      this.logger.info(`Total clean time: ${this.getTotalCleanTime()} ${this.totalCleanTimeUnit()}.`);
    }
    // log the the total clean times when supported
    if (this.supportsTotalCleanTimesReporting()) {
      this.logger.info(`Total cleaned: ${this.getTotalCleanTimes()} times.`);
    }
    // log the the total clean area when supported
    if (this.supportsTotalCleanAreaReporting()) {
      this.logger.info(`Total clean area: ${this.getTotalCleanArea()} ${this.totalCleanAreaUnit()}.`);
    }
  }


  /*----------========== DEVICE INFO ==========----------*/

  getType() {
    return DevTypes.ROBOT_CLEANER;
  }

  getDeviceName() {
    return 'Unknown robot cleaner device';
  }


  /*----------========== CONFIG ==========----------*/

  propertiesToMonitor() {
    return ['vacuum:status', 'vacuum:mode', 'vacuum:fault', 'battery:battery-level',
      'battery:charging-state', 'brush-cleaner:brush-left-time', 'brush-cleaner:brush-life-level', 'filter:filter-life-level',
      'filter:filter-left-time', 'vacuum:speed-level', 'vacuum:fan-level', 'vacuum:suction-level', 'vacuum:sweep-type',
      'vacuum:sweep-break-switch', 'vacuum-extend:cleaning-time', 'vacuum-extend:cleaning-area', 'vacuum:cleaning-time',
      'vacuum:cleaning-area', 'vacuum:last-clean-time', 'clean-record:clean-time', 'clean-record:clean-area',
      'clean-record:total-clean-time', 'clean-record:total-clean-count', 'clean-record:total-clean-area',
      'clean-logs:total-clean-time', 'clean-logs:total-clean-times', 'clean-logs:total-clean-area',
      'sweep:side-brush-hours', 'sweep:side-brush-life'
    ];
  }


  /*----------========== VALUES ==========----------*/

  statusSweepingValue() {
    return this.getValueForStatus(['Sweeping', 'Working', 'Cleaning', 'Sweeping and Mopping', 'Cleaning in progress'], true);
  }

  statusIdleValue() {
    return this.getValueForStatus(['Idle', 'Standby', 'Standbying', 'Sleep'], true);
  }

  statusPausedValue() {
    return this.getValueForStatus(['Paused', 'Pause'], true);
  }

  statusErrorValue() {
    return this.getValueForStatus(['Error', 'Fault'], true);
  }

  statusGoChargingValue() {
    return this.getValueForStatus(['Go Charging', 'Going to Charge', 'Returning to Dock', 'Back to Dock'], true);
  }

  statusChargingValue() {
    return this.getValueForStatus(['Charging', 'Charging in Progress'], true);
  }

  statusChargingCompletedValue() {
    return this.getValueForStatus(['Charging Completed', 'Fully Charged', 'Charge Done'], true);
  }

  statusMoppingValue() {
    return this.getValueForStatus(['Mopping', 'Mop'], true);
  }

  statusUpdatingValue() {
    return this.getValueForStatus('Updating', true);
  }

  statusUpgradingValue() {
    return this.getValueForStatus('Upgrading', true);
  }

  statusSleepValue() {
    return this.getValueForStatus('Sleep', true);
  }

  statusDryingValue() {
    return this.getValueForStatus('Drying', true);
  }

  statusWashingValue() {
    return this.getValueForStatus('Washing', true);
  }

  statusWashValue() {
    return this.getValueForStatus('Wash', true);
  }

  statusEmptyingValue() {
    return this.getValueForStatus('Emptying', true);
  }

  statusSweepingAndMoppingValue() {
    return this.getValueForStatus(['Sweeping and Mopping', 'Sweep Mop', 'Vacuum and Mop'], true);
  }


  /*----------========== PROPERTIES ==========----------*/

  //overrides
  statusProp() {
    return this.getProperty('vacuum:status');
  }

  modeProp() {
    return this.getProperty('vacuum:mode');
  }

  faultProp() {
    return this.getProperty('vacuum:fault');
  }

  speedLevelProp() {
    return this.getProperty('vacuum:speed-level') || this.getProperty('vacuum:suction-level') || this.getProperty('vacuum:fan-level');
  }

  suctionLevelProp() {
    return this.getProperty('vacuum:suction-level') || this.speedLevelProp();
  }

  sweepTypeProp() {
    return this.getProperty('vacuum:sweep-type');
  }

  sweepBreakSwitchProp() {
    return this.getProperty('vacuum:sweep-break-switch');
  }

  batteryLevelProp() {
    return this.getProperty('battery:battery-level');
  }

  batteryStateProp() {
    return this.getProperty('battery:charging-state');
  }

  chargingStateProp() {
    return this.getProperty('battery:charging-state');
  }

  //device specific
  mainBrushLeftTimeProp() {
    return this.getProperty('brush-cleaner:brush-left-time');
  }

  mainBrushLifeLevelProp() {
    return this.getProperty('brush-cleaner:brush-life-level');
  }

  sideBrushLeftTimeProp() {
    return this.getProperty('sweep:side-brush-hours') || this.getProperty('brush-cleaner2:brush-left-time');
  }

  sideBrushLifeLevelProp() {
    return this.getProperty('sweep:side-brush-life') || this.getProperty('brush-cleaner2:brush-life-level');
  }

  cleanTimeProp() {
    return this.getProperty('vacuum-extend:cleaning-time') || this.getProperty('vacuum:cleaning-time') || this.getProperty('clean-record:clean-time');
  }

  cleanAreaProp() {
    return this.getProperty('vacuum-extend:cleaning-area') || this.getProperty('vacuum:cleaning-area') || this.getProperty('clean-record:clean-area');
  }

  totalCleanTimeProp() {
    return this.getProperty('clean-logs:total-clean-time') || this.getProperty('clean-record:total-clean-time');
  }

  totalCleanTimesProp() {
    return this.getProperty('clean-logs:total-clean-times') || this.getProperty('clean-record:total-clean-times') || this.getProperty('clean-record:total-clean-count');
  }

  totalCleanAreaProp() {
    return this.getProperty('clean-logs:total-clean-area') || this.getProperty('clean-record:total-clean-area');
  }


  /*----------========== ACTIONS ==========----------*/

  startSweepAction() {
    return this.getAction('vacuum:start-sweep');
  }

  stopSweepAction() {
    return this.getAction('vacuum:stop-sweeping');
  }

  pauseSweepAction() {
    return this.getAction('vacuum:pause-sweeping');
  }

  continueSweepAction() {
    return this.getAction('vacuum:continue-sweep');
  }

  startRoomSweepAction() {
    return this.getAction('vacuum:start-room-sweep');
  }

  startChargeAction() {
    return this.getAction('battery:start-charge') || this.getAction('go-charging:start-charging') || this.getAction('vacuum:start-charge') || this.getAction('vacuum:stop-and-gocharge');
  }

  stopChargeAction() {
    return this.getAction('go-charging:stop-charging') || this.getAction('battery:stop-charge') || this.getAction('vacuum:stop-charge');
  }

  goChargeAction() {
    return this.getAction('vacuum:stop-and-gocharge') || this.startChargeAction();
  }


  /*----------========== FEATURES ==========----------*/

  // actions
  supportsStartSweepAction() {
    return !!this.startSweepAction();
  }

  supportsStopSweepAction() {
    return !!this.stopSweepAction();
  }

  supportsPauseSweepAction() {
    return !!this.pauseSweepAction();
  }

  supportsContinueSweepAction() {
    return !!this.continueSweepAction();
  }

  supportsStartChargeAction() {
    return !!this.startChargeAction();
  }

  supportsStopChargeAction() {
    return !!this.stopChargeAction();
  }

  supportsGoChargeAction() {
    return !!this.goChargeAction();
  }

  // controls
  supportsSuctionLevelControl() {
    return !!this.suctionLevelProp();
  }

  supportsSweepTypeControl() {
    return !!this.sweepTypeProp();
  }

  supportsSweepBreakSwitchControl() {
    return !!this.sweepBreakSwitchProp();
  }

  // main brush
  supportsMainBrushLeftTimeReporting() {
    return !!this.mainBrushLeftTimeProp();
  }

  supportsMainBrushLifeLevelReporting() {
    return !!this.mainBrushLifeLevelProp();
  }

  // side brush
  supportsSideBrushLeftTimeReporting() {
    return !!this.sideBrushLeftTimeProp();
  }

  supportsSideBrushLifeLevelReporting() {
    return !!this.sideBrushLifeLevelProp();
  }

  //last clean
  supportsLastCleanTime() {
    return !!this.cleanTimeProp();
  }

  cleanTimeUnit() {
    return this.supportsLastCleanTime() ? this.getPropertyUnit(this.cleanTimeProp()) : PropUnit.MINUTES;
  }

  supportsLastCleanArea() {
    return !!this.cleanAreaProp();
  }

  cleanAreaUnit() {
    return this.supportsLastCleanArea() ? this.getPropertyUnit(this.cleanAreaProp()) : PropUnit.NONE;
  }

  // totals
  supportsTotalCleanTimeReporting() {
    return !!this.totalCleanTimeProp();
  }

  totalCleanTimeUnit() {
    return this.supportsTotalCleanTimeReporting() ? this.getPropertyUnit(this.totalCleanTimeProp()) : PropUnit.HOURS;
  }

  supportsTotalCleanTimesReporting() {
    return !!this.totalCleanTimesProp();
  }

  supportsTotalCleanAreaReporting() {
    return !!this.totalCleanAreaProp();
  }

  totalCleanAreaUnit() {
    return this.supportsTotalCleanAreaReporting() ? this.getPropertyUnit(this.totalCleanAreaProp()) : PropUnit.NONE;
  }


  /*----------========== GETTERS ==========----------*/

  getMainBrushLeftTime() {
    return this.getPropertyValue(this.mainBrushLeftTimeProp());
  }

  getMainBrushLifeLevel() {
    return this.getPropertyValue(this.mainBrushLifeLevelProp());
  }

  getSideBrushLeftTime() {
    return this.getPropertyValue(this.sideBrushLeftTimeProp());
  }

  getSideBrushLifeLevel() {
    return this.getPropertyValue(this.sideBrushLifeLevelProp());
  }

  getLastCleanTime() {
    return this.getPropertyValue(this.cleanTimeProp());
  }

  getLastCleanArea() {
    return this.getPropertyValue(this.cleanAreaProp());
  }

  getTotalCleanTime() {
    return this.getPropertyValue(this.totalCleanTimeProp());
  }

  getTotalCleanTimes() {
    return this.getPropertyValue(this.totalCleanTimesProp());
  }

  getTotalCleanArea() {
    return this.getPropertyValue(this.totalCleanAreaProp());
  }


  /*----------========== SETTERS ==========----------*/


  /*----------========== CONVENIENCE ==========----------*/

  async setSweepActive(active) {
    if (active) {
      return this.startSweep();
    } else {
      // Prefer return-to-dock. On many vacuums stop-sweeping only pauses/stops in place.
      return this.returnToDock();
    }
  }

  async startSweep() {
    return this.fireAction(this.startSweepAction());
  }

  async stopSweep() {
    return this.fireAction(this.stopSweepAction());
  }

  async pauseSweep() {
    if (this.supportsPauseSweepAction()) {
      return this.fireAction(this.pauseSweepAction());
    }
    return this.stopSweep();
  }

  async continueSweep() {
    if (this.supportsContinueSweepAction()) {
      return this.fireAction(this.continueSweepAction());
    }
    return this.startSweep();
  }

  async returnToDock() {
    return this.fireAction(this.goChargeAction());
  }

  isVacuumWorking() {
    return this.isStatusSweeping() || this.isStatusSweepingAndMopping() || this.isStatusMopping();
  }

  isVacuumPaused() {
    return this.isStatusPause();
  }

  isVacuumDockedOrDocking() {
    return this.isStatusCharging() || this.isStatusGoCharging() || this.isStatusChargingCompleted();
  }


  /*----------========== VALUE CONVENIENCE  ==========----------*/

  isStatusSweeping() {
    return this.statusContainsOrEqualsValue(this.statusSweepingValue());
  }

  isStatusSweepingAndMopping() {
    return this.statusContainsOrEqualsValue(this.statusSweepingAndMoppingValue());
  }

  isStatusMopping() {
    return this.statusContainsOrEqualsValue(this.statusMoppingValue());
  }

  isStatusPause() {
    return this.statusContainsOrEqualsValue(this.statusPausedValue());
  }

  isStatusError() {
    return this.statusContainsOrEqualsValue(this.statusErrorValue());
  }

  isStatusGoCharging() {
    return this.statusContainsOrEqualsValue(this.statusGoChargingValue());
  }

  isStatusCharging() {
    return this.statusContainsOrEqualsValue(this.statusChargingValue());
  }

  isStatusChargingCompleted() {
    return this.statusContainsOrEqualsValue(this.statusChargingCompletedValue());
  }

  getDockStatusValues() {
    let dockStatusVals = [];
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusChargingValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusUpdatingValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusUpgradingValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusWashValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusEmptyingValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusWashingValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusDryingValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusChargingCompletedValue());
    dockStatusVals = this._mergeValueOrArrayIntoArray(dockStatusVals, this.statusGoChargingValue());
    return dockStatusVals;
  }

  /*----------========== HELPERS ==========----------*/

  _mergeValueOrArrayIntoArray(targetArr = [], source) {
    if (source != null && source !== -1) { // -1 is returned when the value is not found
      if (!Array.isArray(source)) {
        source = [source];
      }
      return [...targetArr, ...source];
    }
    return targetArr;
  }


}

module.exports = RobotCleanerDevice;
