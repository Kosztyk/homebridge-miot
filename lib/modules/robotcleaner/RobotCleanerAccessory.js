let Service, Characteristic, Accessory, HapStatusError, HAPStatus;
const BaseAccessory = require('../../base/BaseAccessory.js');
const Constants = require('../../constants/Constants.js');
const DevTypes = require('../../constants/DevTypes.js');
const ValueOperator = require('../../constants/ValueOperator.js');


class RobotCleanerAccessory extends BaseAccessory {
  constructor(name, device, uuid, config, api, logger) {

    Service = api.hap.Service;
    Characteristic = api.hap.Characteristic;
    Accessory = api.platformAccessory;
    HapStatusError = api.hap.HapStatusError;
    HAPStatus = api.hap.HAPStatus;

    super(name, device, uuid, config, api, logger);
  }

  /*----------========== INIT ==========----------*/

  initAccessoryObject() {
    this.vacuumExtraControls = this.getConfigValue('vacuumExtraControls', true);
    this.vacuumSuctionControl = this.getConfigValue('vacuumSuctionControl', true);
    this.vacuumSweepTypeControl = this.getConfigValue('vacuumSweepTypeControl', true);
    this.vacuumBreakpointResumeControl = this.getConfigValue('vacuumBreakpointResumeControl', true);

    super.initAccessoryObject();
  }


  /*----------========== ACCESSORY INFO ==========----------*/

  getAccessoryType() {
    return DevTypes.ROBOT_CLEANER;
  }


  /*----------========== INIT ACCESSORIES ==========----------*/

  initAccessories(name, uuid) {
    // HomeKit does not provide a native robot-vacuum HAP service in the classic Homebridge accessory model.
    // Keep the main tile as a switch, then expose vacuum-specific controls as secondary services below.
    return [new Accessory(name, uuid, this.api.hap.Categories.SWITCH)];
  }


  /*----------========== SETUP SERVICES ==========----------*/

  setupMainAccessoryService() {
    this.switchService = this.createStatefulSwitch(this.getName(), 'switchService', this.isVacuumOn, this.setVacuumOn);
    this.addAccessoryService(this.switchService);
  }

  setupAdditionalAccessoryServices() {
    this.prepareDockOccupancyService();

    if (this.vacuumExtraControls) {
      this.prepareVacuumActionServices();
      this.prepareSuctionLevelControlService();
      this.prepareSweepTypeControlService();
      this.prepareBreakpointResumeControlService();
    }

    super.setupAdditionalAccessoryServices(); // make sure we call super
  }


  /*----------========== CREATE ADDITIONAL SERVICES ==========----------*/

  prepareDockOccupancyService() {
    if (this.getDevice().supportsStatusReporting()) {
      this.addPropMonitorWrapper('Dock', this.getDevice().statusProp(), null, this.getDevice().getDockStatusValues(), null, ValueOperator.CONTAINS);
    }
  }

  prepareVacuumActionServices() {
    if (this.getDevice().supportsPauseSweepAction()) {
      this.pauseService = this.createStatlessSwitch('Pause Cleaning', 'pauseCleaningService', this.setPauseCleaningOn);
      this.addAccessoryService(this.pauseService);
    }

    if (this.getDevice().supportsContinueSweepAction()) {
      this.continueService = this.createStatlessSwitch('Resume Cleaning', 'resumeCleaningService', this.setResumeCleaningOn);
      this.addAccessoryService(this.continueService);
    }

    if (this.getDevice().supportsGoChargeAction()) {
      this.dockService = this.createStatlessSwitch('Return to Dock', 'returnToDockService', this.setReturnToDockOn);
      this.addAccessoryService(this.dockService);
    }
  }

  prepareSuctionLevelControlService() {
    if (this.vacuumSuctionControl && this.getDevice().supportsSuctionLevelControl()) {
      this.addPropWrapper('Suction Level', this.getDevice().suctionLevelProp(), null, null, null, null);
    }
  }

  prepareSweepTypeControlService() {
    if (this.vacuumSweepTypeControl && this.getDevice().supportsSweepTypeControl()) {
      this.addPropWrapper('Cleaning Mode', this.getDevice().sweepTypeProp(), null, null, null, null);
    }
  }

  prepareBreakpointResumeControlService() {
    if (this.vacuumBreakpointResumeControl && this.getDevice().supportsSweepBreakSwitchControl()) {
      this.addPropWrapper('Breakpoint Resume', this.getDevice().sweepBreakSwitchProp(), null, null, null, null);
    }
  }


  /*----------========== HOMEBRIDGE STATE SETTERS/GETTERS ==========----------*/

  isVacuumOn() {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().isVacuumWorking();
    }
    return false;
  }

  setVacuumOn(state) {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().setSweepActive(state);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  setPauseCleaningOn(state) {
    if (this.isMiotDeviceConnected()) {
      if (state) return this.getDevice().pauseSweep();
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  setResumeCleaningOn(state) {
    if (this.isMiotDeviceConnected()) {
      if (state) return this.getDevice().continueSweep();
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  setReturnToDockOn(state) {
    if (this.isMiotDeviceConnected()) {
      if (state) return this.getDevice().returnToDock();
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }


  // ----- additional services


  /*----------========== STATUS ==========----------*/

  updateAccessoryStatus() {
    if (this.switchService) this.switchService.getCharacteristic(Characteristic.On).updateValue(this.isVacuumOn());

    super.updateAccessoryStatus();
  }


  /*----------========== MULTI-SWITCH SERVICE HELPERS ==========----------*/


  /*----------========== GETTERS ==========----------*/


  /*----------========== PROPERTY WRAPPERS ==========----------*/


  /*----------========== PROPERTY HELPERS ==========----------*/


  /*----------========== HELPERS ==========----------*/


}


module.exports = RobotCleanerAccessory;
