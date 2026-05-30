let Service, Characteristic, Accessory, HapStatusError, HAPStatus;
const BaseAccessory = require('../../base/BaseAccessory.js');
const Constants = require('../../constants/Constants.js');
const DevTypes = require('../../constants/DevTypes.js');


class AirFryerAccessory extends BaseAccessory {
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
    this.airFryerExtraControls = this.getConfigValue('airFryerExtraControls', true);
    this.airFryerActionControls = this.getConfigValue('airFryerActionControls', true);
    this.airFryerCustomPropertyControls = this.getConfigValue('airFryerCustomPropertyControls', true);

    // Prefer the native HeaterCooler card in Apple Home instead of making the air fryer
    // look like a plain switch. A secondary switch can still be exposed if desired.
    this.airFryerRefinedHomeKitView = this.getConfigValue('airFryerRefinedHomeKitView', true);
    this.airFryerExposeSwitch = this.getConfigValue('airFryerExposeSwitch', false);

    super.initAccessoryObject();
  }


  /*----------========== ACCESSORY INFO ==========----------*/

  getAccessoryType() {
    return DevTypes.AIR_FRYER;
  }


  /*----------========== INIT ACCESSORIES ==========----------*/

  initAccessories(name, uuid) {
    return [new Accessory(this.sanitizeName(name), uuid, this.api.hap.Categories.AIR_HEATER)];
  }


  /*----------========== SETUP SERVICES ==========----------*/

  setupMainAccessoryService() {
    const canUseHeater = this.airFryerRefinedHomeKitView && this.getDevice().supportsTargetTemperature();

    if (canUseHeater) {
      this.prepareAirFryerHeaterCoolerService(true);

      if (this.airFryerExposeSwitch) {
        this.airFryerSwitchService = this.createStatefulSwitch(`${this.getName()} Power`, 'airFryerSwitchService', this.isAirFryerOn, this.setAirFryerOn);
        this.addAccessoryService(this.airFryerSwitchService);
      }
    } else {
      this.airFryerSwitchService = this.createStatefulSwitch(this.getName(), 'airFryerSwitchService', this.isAirFryerOn, this.setAirFryerOn);
      this.markPrimaryService(this.airFryerSwitchService);
      this.addAccessoryService(this.airFryerSwitchService);

      if (this.getDevice().supportsTargetTemperature()) {
        this.prepareAirFryerHeaterCoolerService(false);
      }
    }
  }

  prepareAirFryerHeaterCoolerService(primary = false) {
    this.airFryerHeaterService = new Service.HeaterCooler(this.getName(), 'airFryerHeaterService');
    if (primary) this.markPrimaryService(this.airFryerHeaterService);

    this.airFryerHeaterService
      .getCharacteristic(Characteristic.Active)
      .onGet(this.getAirFryerHeaterActiveState.bind(this))
      .onSet(this.setAirFryerHeaterActiveState.bind(this));

    this.airFryerHeaterService
      .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentAirFryerHeaterCoolerState.bind(this))
      .setProps({
        maxValue: Characteristic.CurrentHeaterCoolerState.HEATING,
        validValues: [
          Characteristic.CurrentHeaterCoolerState.INACTIVE,
          Characteristic.CurrentHeaterCoolerState.HEATING
        ],
      });

    this.airFryerHeaterService
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .onGet(this.getTargetAirFryerHeaterCoolerState.bind(this))
      .onSet(this.setTargetAirFryerHeaterCoolerState.bind(this))
      .setProps({
        maxValue: Characteristic.TargetHeaterCoolerState.HEAT,
        validValues: [
          Characteristic.TargetHeaterCoolerState.HEAT
        ]
      });

    if (this.getDevice().supportsTemperatureReporting()) {
      this.addCurrentTemperatureCharacteristic(this.airFryerHeaterService);
    } else {
      // If temperature reporting is not supported, use target temperature as current temperature while heating.
      this.airFryerHeaterService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .onGet(this.getAirFryerCurrentTemperature.bind(this))
        .setProps({
          maxValue: this.getDevice().targetTemperatureRange()[1]
        });
    }

    this.airFryerHeaterService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .onGet(this.getAirFryerHeatingThresholdTemperature.bind(this))
      .onSet(this.setAirFryerHeatingThresholdTemperature.bind(this))
      .setProps({
        minValue: this.getDevice().targetTemperatureRange()[0],
        maxValue: this.getDevice().targetTemperatureRange()[1],
        minStep: this.getDevice().targetTemperatureRange()[2]
      });

    this.airFryerHeaterService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .setProps({
        maxValue: Characteristic.TemperatureDisplayUnits.CELSIUS,
        validValues: [
          Characteristic.TemperatureDisplayUnits.CELSIUS
        ]
      })
      .setValue(Characteristic.TemperatureDisplayUnits.CELSIUS);

    this.addAccessoryService(this.airFryerHeaterService);
  }

  setupAdditionalAccessoryServices() {
    this.prepareTargetTimeService();
    this.prepareLeftTimeService();
    this.prepareCookingCompleteService();

    if (this.airFryerExtraControls) {
      this.prepareAirFryerActionServices();
      this.prepareAirFryerCustomPropertyServices();
    }

    super.setupAdditionalAccessoryServices(); // make sure we call super
  }


  /*----------========== CREATE ADDITIONAL SERVICES ==========----------*/

  prepareTargetTimeService() {
    if (this.getDevice().supportsTargetTime()) {
      // Use the generic range wrapper instead of a raw Brightness value capped at 100 minutes.
      this.addPropWrapper('Target Time', this.getDevice().targetTimeProp(), null, null, null, null);
    }
  }

  prepareLeftTimeService() {
    if (this.getDevice().supportsLeftTimeReporting()) {
      this.addPropMonitorWrapper('Left Time', this.getDevice().leftTimeProp(), null, null, null, null);
    }
  }

  prepareCookingCompleteService() {
    if (this.getDevice().supportsCookingCompleteStatus()) {
      this.addPropMonitorWrapper('Cooking Complete', this.getDevice().statusProp(), null, this.getDevice().statusCompletedValue(), null, null);
    }
  }

  prepareAirFryerActionServices() {
    if (!this.airFryerActionControls) return;

    if (this.getDevice().supportsPauseCookAction()) {
      this.pauseCookService = this.createStatlessSwitch('Pause Cooking', 'pauseCookingService', this.setPauseCookingOn);
      this.addAccessoryService(this.pauseCookService);
    }

    if (this.getDevice().supportsResumeCookAction()) {
      this.resumeCookService = this.createStatlessSwitch('Resume Cooking', 'resumeCookingService', this.setResumeCookingOn);
      this.addAccessoryService(this.resumeCookService);
    }

    if (this.getDevice().supportsCancelCookAction()) {
      this.cancelCookService = this.createStatlessSwitch('Cancel Cooking', 'cancelCookingService', this.setCancelCookingOn);
      this.addAccessoryService(this.cancelCookService);
    }
  }

  prepareAirFryerCustomPropertyServices() {
    if (!this.airFryerCustomPropertyControls) return;

    if (this.getDevice().supportsPreheatSwitchControl()) {
      this.addPropWrapper('Preheat', this.getDevice().preheatSwitchProp(), null, null, null, null);
    }

    if (this.getDevice().supportsAppointmentTimeControl()) {
      this.addPropWrapper('Appointment Time', this.getDevice().appointTimeProp(), null, null, null, null);
    }

    if (this.getDevice().supportsAppointmentTimeLeftReporting()) {
      this.addPropMonitorWrapper('Appointment Time Left', this.getDevice().appointTimeLeftProp(), null, null, null, null);
    }

    if (this.getDevice().supportsFoodQuantityControl()) {
      this.addPropWrapper('Food Quantity', this.getDevice().foodQuantityProp(), null, null, null, null);
    }

    if (this.getDevice().supportsTurnPotControl()) {
      this.addPropWrapper('Turn Pot', this.getDevice().turnPotProp(), null, null, null, null);
    }
  }


  /*----------========== HOMEBRIDGE STATE SETTERS/GETTERS ==========----------*/

  // switch service
  isAirFryerOn() {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().isActiveOrPaused();
    }
    return false;
  }

  setAirFryerOn(state) {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().setCookingActive(state);
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  // heater service
  getAirFryerHeaterActiveState() {
    if (this.isMiotDeviceConnected() && this.getDevice().isActiveOrPaused()) {
      return Characteristic.Active.ACTIVE;
    }
    return Characteristic.Active.INACTIVE;
  }

  setAirFryerHeaterActiveState(state) {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().setCookingActive(state === Characteristic.Active.ACTIVE);
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  getCurrentAirFryerHeaterCoolerState() {
    if (this.isMiotDeviceConnected() && this.getDevice().isHeating()) {
      return Characteristic.CurrentHeaterCoolerState.HEATING;
    }
    return Characteristic.CurrentHeaterCoolerState.INACTIVE;
  }

  getTargetAirFryerHeaterCoolerState() {
    return Characteristic.TargetHeaterCoolerState.HEAT;
  }

  setTargetAirFryerHeaterCoolerState(state) {
    if (this.isMiotDeviceConnected()) {
      // Only HEAT is valid for an air fryer.
      return;
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  getAirFryerCurrentTemperature() {
    if (this.isMiotDeviceConnected()) {
      if (this.getDevice().isHeating()) {
        return this.getAirFryerHeatingThresholdTemperature();
      }
      return 0;
    }
    return this.getAirFryerHeatingThresholdTemperature();
  }

  getAirFryerHeatingThresholdTemperature() {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().getTargetTemperatureSafe();
    }
    return this.getDevice().targetTemperatureRange()[0]; // return minimum value
  }

  setAirFryerHeatingThresholdTemperature(temp) {
    if (this.isMiotDeviceConnected()) {
      return this.getDevice().setTargetTemperature(temp);
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  getCurrentTemperature() {
    if (this.isMiotDeviceConnected()) {
      if (this.getDevice().supportsTemperatureReporting()) {
        return this.getDevice().getTemperature();
      }
      return this.getDevice().getTargetTemperatureSafe(); // override temperature for devices which do not support temperature reporting
    }
    return 0;
  }

  setPauseCookingOn(state) {
    if (this.isMiotDeviceConnected()) {
      if (state) return this.getDevice().pauseCooking();
      return;
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  setResumeCookingOn(state) {
    if (this.isMiotDeviceConnected()) {
      if (state) return this.getDevice().resumeCooking();
      return;
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  setCancelCookingOn(state) {
    if (this.isMiotDeviceConnected()) {
      if (state) return this.getDevice().cancelCooking();
      return;
    }
    throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }


  /*----------========== STATUS ==========----------*/

  updateAccessoryStatus() {
    // switch stuff
    if (this.airFryerSwitchService) this.airFryerSwitchService.getCharacteristic(Characteristic.On).updateValue(this.isAirFryerOn());

    // heater stuff
    if (this.airFryerHeaterService) this.airFryerHeaterService.getCharacteristic(Characteristic.Active).updateValue(this.getAirFryerHeaterActiveState());
    if (this.airFryerHeaterService) this.airFryerHeaterService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(this.getCurrentAirFryerHeaterCoolerState());
    if (this.airFryerHeaterService) this.airFryerHeaterService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(this.getTargetAirFryerHeaterCoolerState());
    if (this.airFryerHeaterService) this.airFryerHeaterService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.getAirFryerCurrentTemperature());
    if (this.airFryerHeaterService) this.airFryerHeaterService.getCharacteristic(Characteristic.HeatingThresholdTemperature).updateValue(this.getAirFryerHeatingThresholdTemperature());

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


module.exports = AirFryerAccessory;
