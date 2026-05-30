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

    // A classic HomeKit/HAP robot vacuum service does not exist. The refined view exposes
    // the vacuum as a Fanv2 primary service so Apple Home gets a richer native control card
    // instead of a plain switch. Vacuum-specific buttons/sensors stay as secondary services.
    this.vacuumRefinedHomeKitView = this.getConfigValue('vacuumRefinedHomeKitView', true);
    this.vacuumLegacySwitch = this.getConfigValue('vacuumLegacySwitch', false);

    super.initAccessoryObject();
  }


  /*----------========== ACCESSORY INFO ==========----------*/

  getAccessoryType() {
    return DevTypes.ROBOT_CLEANER;
  }


  /*----------========== INIT ACCESSORIES ==========----------*/

  initAccessories(name, uuid) {
    const category = (this.vacuumRefinedHomeKitView && Service && Service.Fanv2) ? this.api.hap.Categories.FAN : this.api.hap.Categories.SWITCH;
    return [new Accessory(name, uuid, category)];
  }


  /*----------========== SETUP SERVICES ==========----------*/

  setupMainAccessoryService() {
    if (this.vacuumRefinedHomeKitView && Service.Fanv2) {
      this.vacuumFanService = new Service.Fanv2(this.getName(), 'vacuumFanService');
      this.markPrimaryService(this.vacuumFanService);

      this.vacuumFanService
        .getCharacteristic(Characteristic.Active)
        .onGet(this.getVacuumFanActiveState.bind(this))
        .onSet(this.setVacuumFanActiveState.bind(this));

      this.vacuumFanService
        .getCharacteristic(Characteristic.CurrentFanState)
        .onGet(this.getCurrentVacuumFanState.bind(this));

      this.vacuumFanService
        .getCharacteristic(Characteristic.TargetFanState)
        .onGet(this.getTargetVacuumFanState.bind(this))
        .onSet(this.setTargetVacuumFanState.bind(this));

      if (this.getDevice().supportsSuctionLevelControl()) {
        this.vacuumFanService
          .getCharacteristic(Characteristic.RotationSpeed)
          .onGet(this.getVacuumSuctionRotationSpeed.bind(this))
          .onSet(this.setVacuumSuctionRotationSpeed.bind(this))
          .setProps({ minValue: 0, maxValue: 100, minStep: 1 });
      }

      this.addAccessoryService(this.vacuumFanService);

      if (this.vacuumLegacySwitch) {
        this.switchService = this.createStatefulSwitch(`${this.getName()} Start`, 'switchService', this.isVacuumOn, this.setVacuumOn);
        this.addAccessoryService(this.switchService);
      }
    } else {
      // HomeKit does not provide a native robot-vacuum HAP service in the classic Homebridge accessory model.
      // Keep the main tile as a switch, then expose vacuum-specific controls as secondary services below.
      this.switchService = this.createStatefulSwitch(this.getName(), 'switchService', this.isVacuumOn, this.setVacuumOn);
      this.markPrimaryService(this.switchService);
      this.addAccessoryService(this.switchService);
    }
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
    // In refined mode suction is already exposed as RotationSpeed on the primary Fanv2 service.
    if (this.vacuumRefinedHomeKitView && Service.Fanv2) return;

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

  getVacuumFanActiveState() {
    return this.isVacuumOn() ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
  }

  setVacuumFanActiveState(state) {
    return this.setVacuumOn(state === Characteristic.Active.ACTIVE);
  }

  getCurrentVacuumFanState() {
    if (!this.isMiotDeviceConnected()) {
      return Characteristic.CurrentFanState.INACTIVE;
    }
    if (this.getDevice().isVacuumWorking()) {
      return Characteristic.CurrentFanState.BLOWING_AIR;
    }
    if (this.getDevice().isStatusPaused && this.getDevice().isStatusPaused()) {
      return Characteristic.CurrentFanState.IDLE;
    }
    return Characteristic.CurrentFanState.INACTIVE;
  }

  getTargetVacuumFanState() {
    return Characteristic.TargetFanState.MANUAL;
  }

  setTargetVacuumFanState(state) {
    // Robot vacuum cleaning is always manual from HomeKit's Fanv2 perspective.
    return;
  }

  getVacuumSuctionRotationSpeed() {
    if (this.isMiotDeviceConnected() && this.getDevice().supportsSuctionLevelControl()) {
      const suctionProp = this.getDevice().suctionLevelProp();
      const percentage = this.getDevice().convertPropValueToPercentage(suctionProp);
      return percentage == null ? 0 : percentage;
    }
    return 0;
  }

  setVacuumSuctionRotationSpeed(value) {
    if (this.isMiotDeviceConnected() && this.getDevice().supportsSuctionLevelControl()) {
      const suctionProp = this.getDevice().suctionLevelProp();
      const miotValue = this.getDevice().convertPercentageToPropValue(value, suctionProp);
      return this.getDevice().setPropertyValue(suctionProp, miotValue);
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
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

    if (this.vacuumFanService) this.vacuumFanService.getCharacteristic(Characteristic.Active).updateValue(this.getVacuumFanActiveState());
    if (this.vacuumFanService) this.vacuumFanService.getCharacteristic(Characteristic.CurrentFanState).updateValue(this.getCurrentVacuumFanState());
    if (this.vacuumFanService) this.vacuumFanService.getCharacteristic(Characteristic.TargetFanState).updateValue(this.getTargetVacuumFanState());
    if (this.vacuumFanService && this.getDevice().supportsSuctionLevelControl()) this.vacuumFanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.getVacuumSuctionRotationSpeed());

    super.updateAccessoryStatus();
  }


  /*----------========== MULTI-SWITCH SERVICE HELPERS ==========----------*/


  /*----------========== GETTERS ==========----------*/


  /*----------========== PROPERTY WRAPPERS ==========----------*/


  /*----------========== PROPERTY HELPERS ==========----------*/


  /*----------========== HELPERS ==========----------*/

  markPrimaryService(service) {
    if (service && typeof service.setPrimaryService === 'function') {
      service.setPrimaryService(true);
    }
  }


}


module.exports = RobotCleanerAccessory;
