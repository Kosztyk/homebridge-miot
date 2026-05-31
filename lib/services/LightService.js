let Service, Characteristic, Accessory, HapStatusError, HAPStatus;
const AbstractService = require('./AbstractService.js');
const Constants = require('../constants/Constants.js');
const Events = require('../constants/Events.js');
const PropFormat = require('../constants/PropFormat.js');
const PropUnit = require('../constants/PropUnit.js');
const PropAccess = require('../constants/PropAccess.js');
const colorConvert = require('color-convert');
const YeelightLanProtocol = require('../protocol/YeelightLanProtocol.js');


class LightService extends AbstractService {
  constructor(serviceId, serviceName, miotService, device, accessory, api, logger) {

    Service = api.hap.Service;
    Characteristic = api.hap.Characteristic;
    Accessory = api.platformAccessory;
    HapStatusError = api.hap.HapStatusError;
    HAPStatus = api.hap.HAPStatus;

    super(serviceId, serviceName, miotService, device, accessory, api, logger);

    this.yeelightLanProtocol = null;
  }


  /*----------========== SERVICE INFO ==========----------*/

  getServiceType() {
    return "Light";
  }


  /*----------========== SETUP SERVICE ==========----------*/

  prepareService() {
    if (!this._onProp()) {
      throw new Error(`The specified service has no 'on' property! Cannot create light service!`);
    }

    this.lightService = new Service.Lightbulb(this.getServiceName(), this.getServiceId());
    this.lightService.addOptionalCharacteristic(Characteristic.ConfiguredName);
    this.lightService.setCharacteristic(Characteristic.ConfiguredName, this.getServiceName());

    //on
    this.onCharacteristic = this.lightService.getCharacteristic(Characteristic.On)
      .onGet(this.isLightOn.bind(this))
      .onSet(this.setLightOn.bind(this));

    // properties to monitor
    this.addPropertyToMonitor(this._onProp());

    // react to property changes
    this._onProp().on(Events.PROP_VALUE_CHANGED, (prop) => {
      this.updateServiceStatus();
    });

    //additional characteristics
    //brightness
    this.setupBrightnessIfSupported();

    // color temperature
    this.setupColorTemperatureIfSupported();

    // color
    this.setupColorIfSupported();

    // add the service
    this.addAccessoryService(this.lightService);

    this.setupYeelightLanStatePollingIfSupported();

    return true;
  }

  setupBrightnessIfSupported() {
    if (this.supportsBrightness()) {
      this.brightnessCharacteristic = this.lightService.addCharacteristic(new Characteristic.Brightness());
      this.brightnessCharacteristic
        .onGet(this.getLightBrightness.bind(this))
        .onSet(this.setLightBrightness.bind(this));

      this.addPropertyToMonitor(this._brightnessProp());

      this._brightnessProp().on(Events.PROP_VALUE_CHANGED, (prop) => {
        this.updateServiceStatus();
      });
    }
  }

  setupColorTemperatureIfSupported() {
    if (this.supportsColorTemperature()) {
      this.colorTemperatureCharacteristic = this.lightService.addCharacteristic(new Characteristic.ColorTemperature());
      this.colorTemperatureCharacteristic
        .onGet(this.getLightColorTemperature.bind(this))
        .onSet(this.setLightColorTemperature.bind(this))
        .setProps({
          minValue: this.getMinColorTempValue(),
          maxValue: this.getMaxColorTempValue()
        });

      this.addPropertyToMonitor(this._colorTemperatureProp());

      this._colorTemperatureProp().on(Events.PROP_VALUE_CHANGED, (prop) => {
        this.updateServiceStatus();
      });
    }
  }

  setupColorIfSupported() {
    if (this.supportsColor()) {
      this.hueCharacteristic = this.lightService.addCharacteristic(new Characteristic.Hue());
      this.hueCharacteristic
        .onGet(this.getLightColorHue.bind(this))
        .onSet(this.setLightColorHue.bind(this));

      this.saturationCharacteristic = this.lightService.addCharacteristic(new Characteristic.Saturation());
      this.saturationCharacteristic
        .onGet(this.getLightColorSaturation.bind(this))
        .onSet(this.setLightColorSaturation.bind(this));

      this.addPropertyToMonitor(this._colorProp());

      this._colorProp().on(Events.PROP_VALUE_CHANGED, (prop) => {
        this.updateServiceStatus();
      });
    }
  }


  /*----------========== STATE SETTERS/GETTERS ==========----------*/

  async isLightOn() {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.safeRefreshYeelightLanStateIfNeeded();
      return this.isOn();
    }
    return false;
  }

  async setLightOn(value) {
    if (this.supportsYeelightLanControl()) {
      await this.setOn(value);
      return;
    }
    if (this.isMiotDeviceConnected()) {
      await this.setOn(value);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightBrightness() {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.safeRefreshYeelightLanStateIfNeeded();
      return this.getBrightness();
    }
    return 0;
  }

  async setLightBrightness(brightness) {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      if (this.brightnessTimeout) clearTimeout(this.brightnessTimeout);
      await new Promise((resolve, reject) => {
        this.brightnessTimeout = setTimeout(async () => {
          try {
            await this.setBrightness(brightness);
            resolve();
          } catch (err) {
            reject(err);
          }
        }, Constants.SLIDER_DEBOUNCE);
      });
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightColorTemperature() {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.safeRefreshYeelightLanStateIfNeeded();
      return this.getColorTempMired();
    }
    return this.getMinColorTempValue();
  }

  async setLightColorTemperature(colorTemp) {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.setColorTempMired(colorTemp);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightColorHue() {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.safeRefreshYeelightLanStateIfNeeded();
      return this.getHue();
    }
    return 0;
  }

  async setLightColorHue(hue) {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.setHue(hue);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightColorSaturation() {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.safeRefreshYeelightLanStateIfNeeded();
      return this.getSaturation();
    }
    return 0;
  }

  async setLightColorSaturation(saturation) {
    if (this.isMiotDeviceConnected() || this.supportsYeelightLanControl()) {
      await this.setSaturation(saturation);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }


  /*----------========== SERVICE PROTOCOL ==========----------*/

  updateServiceStatus() {
    if (this.onCharacteristic) this.onCharacteristic.updateValue(this.isOn());
    if (this.brightnessCharacteristic) this.brightnessCharacteristic.updateValue(this.getBrightness());
    if (this.colorTemperatureCharacteristic) this.colorTemperatureCharacteristic.updateValue(this.getColorTempMired());
    if (this.hueCharacteristic) this.hueCharacteristic.updateValue(this.getHue());
    if (this.saturationCharacteristic) this.saturationCharacteristic.updateValue(this.getSaturation());
  }


  /*----------========== SERVICE PROPERTIES ==========----------*/

  isOn() {
    return this.getPropertyValue(this._onProp());
  }

  async setOn(isOn) {
    if (this.supportsYeelightLanControl()) {
      try {
        await this.getYeelightLanProtocol().setPower(isOn);
        this.updatePropInternalValue(this._onProp(), isOn);
        return;
      } catch (err) {
        this.handleYeelightLanError(err, 'set power');
        if (!this.isMiotDeviceConnected()) throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
    return this.setPropertyValue(this._onProp(), isOn);
  }

  getBrightness() {
    return this.getPropertyValue(this._brightnessProp());
  }

  async setBrightness(value) {
    if (this.supportsYeelightLanControl()) {
      try {
        await this.getYeelightLanProtocol().setBrightness(value);
        this.updatePropInternalValue(this._brightnessProp(), Math.max(1, Math.min(100, Math.round(Number(value) || 1))));
        return;
      } catch (err) {
        this.handleYeelightLanError(err, 'set brightness');
        if (!this.isMiotDeviceConnected()) throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
    return this.setPropertyValue(this._brightnessProp(), value);
  }

  getColorTemperature() {
    return this.getPropertyValue(this._colorTemperatureProp());
  }

  async setColorTemperature(value) {
    if (this.supportsYeelightLanControl()) {
      // Yeelight strip2 models normally expose RGB without a MIOT color-temperature property.
      // Keep MIOT fallback for devices that actually expose color-temperature.
      if (this.isMiotDeviceConnected()) {
        return this.setPropertyValue(this._colorTemperatureProp(), value);
      }
      return;
    }
    return this.setPropertyValue(this._colorTemperatureProp(), value);
  }

  getColor() {
    return this.getPropertyValue(this._colorProp());
  }

  async setColor(value) {
    if (this.supportsYeelightLanControl()) {
      try {
        await this.getYeelightLanProtocol().setRgb(value);
        this.updatePropInternalValue(this._colorProp(), value);
        return;
      } catch (err) {
        this.handleYeelightLanError(err, 'set color');
        if (!this.isMiotDeviceConnected()) throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    }
    return this.setPropertyValue(this._colorProp(), value);
  }


  /*----------========== FEATURES ==========----------*/

  supportsBrightness() {
    return !!this._brightnessProp();
  }

  supportsColorTemperature() {
    return !!this._colorTemperatureProp();
  }

  supportsColor() {
    return !!this._colorProp();
  }


  /*----------========== YEELIGHT LAN HELPERS ==========----------*/

  supportsYeelightLanControl() {
    const device = this.getDevice();
    const miotDevice = device && device.getMiotDevice && device.getMiotDevice();
    const config = (miotDevice && miotDevice.userConfig) || {};
    const model = device && device.getModel && device.getModel();

    // If LAN control was recently refused/timed out, temporarily use cached/Xiaomi state.
    // This prevents Homebridge read handlers from throwing ECONNREFUSED when a device IP
    // changed or Yeelight LAN Control/Developer Mode is unavailable.
    if (this.yeelightLanDisabledUntil && Date.now() < this.yeelightLanDisabledUntil) return false;

    // Home Assistant's Yeelight integration controls these strips through the native
    // Yeelight LAN protocol, not through MIOT property writes. Keep it limited to
    // strip2 unless explicitly enabled by config for another model.
    if (config.yeelightLanControl === false) return false;
    if (config.yeelightLanControl === true) return true;
    return model === 'yeelink.light.strip2';
  }


  setupYeelightLanStatePollingIfSupported() {
    if (!this.supportsYeelightLanControl()) return;

    const interval = this.getYeelightLanStatePollingInterval();
    if (interval <= 0) {
      this.getLogger().debug(`[LightService] Yeelight LAN state polling disabled for ${this.getDevice().getName()}`);
      return;
    }

    this.getLogger().debug(`[LightService] Yeelight LAN state polling enabled for ${this.getDevice().getName()} every ${interval}s`);

    // Do a delayed first sync so Homebridge can finish accessory registration first.
    this.yeelightStateSyncTimeout = setTimeout(() => {
      this.refreshYeelightLanState().catch(err => this.logYeelightLanStateError(err));
    }, 1500);

    this.yeelightStateSyncInterval = setInterval(() => {
      this.refreshYeelightLanState().catch(err => this.logYeelightLanStateError(err));
    }, interval * 1000);
  }

  getYeelightLanStatePollingInterval() {
    const device = this.getDevice();
    const miotDevice = device && device.getMiotDevice && device.getMiotDevice();
    const config = (miotDevice && miotDevice.userConfig) || {};

    if (config.yeelightStatePollingInterval === false) return 0;
    if (config.yeelightStatePollingInterval === 0) return 0;

    const configured = Number(config.yeelightStatePollingInterval);
    if (configured > 0) return Math.max(5, Math.round(configured));

    // Use a separate, lightweight Yeelight LAN poll for state sync. Keep it below
    // Yeelight's documented 60 req/min limit and independent from MIOT polling.
    return 15;
  }

  async refreshYeelightLanStateIfNeeded() {
    if (!this.supportsYeelightLanControl()) return;
    const now = Date.now();
    if (this.yeelightStateRefreshPromise) return this.yeelightStateRefreshPromise;
    if (this.lastYeelightStateRefresh && now - this.lastYeelightStateRefresh < 2500) return;
    return this.refreshYeelightLanState();
  }

  async refreshYeelightLanState() {
    if (!this.supportsYeelightLanControl()) return;
    if (this.yeelightStateRefreshPromise) return this.yeelightStateRefreshPromise;

    this.yeelightStateRefreshPromise = (async () => {
      const result = await this.getYeelightLanProtocol().getProps(['power', 'bright', 'rgb', 'hue', 'sat', 'ct', 'color_mode']);
      this.applyYeelightLanState(result);
      this.lastYeelightStateRefresh = Date.now();
      this.updateServiceStatus();
    })();

    try {
      return await this.yeelightStateRefreshPromise;
    } finally {
      this.yeelightStateRefreshPromise = null;
    }
  }

  applyYeelightLanState(result) {
    if (!Array.isArray(result)) return;

    const [power, bright, rgb, hue, sat, ct] = result;

    if (this._onProp() && typeof power === 'string' && power.length > 0) {
      this.updatePropInternalValue(this._onProp(), power === 'on');
    }

    const brightness = Number(bright);
    if (this._brightnessProp() && Number.isFinite(brightness) && brightness > 0) {
      this.updatePropInternalValue(this._brightnessProp(), Math.max(1, Math.min(100, Math.round(brightness))));
    }

    const rgbValue = Number(rgb);
    if (this._colorProp() && Number.isFinite(rgbValue) && rgbValue >= 0) {
      this.updatePropInternalValue(this._colorProp(), Math.max(0, Math.min(16777215, Math.round(rgbValue))));
    } else if (this._colorProp()) {
      const hueValue = Number(hue);
      const satValue = Number(sat);
      if (Number.isFinite(hueValue) && Number.isFinite(satValue)) {
        const currentBrightness = Number.isFinite(brightness) && brightness > 0 ? brightness : this.getBrightness();
        const calculatedRgb = this.getColorRgb(hueValue, satValue, currentBrightness || 100);
        this.updatePropInternalValue(this._colorProp(), calculatedRgb);
      }
    }

    const ctValue = Number(ct);
    if (this._colorTemperatureProp() && Number.isFinite(ctValue) && ctValue > 0) {
      this.updatePropInternalValue(this._colorTemperatureProp(), ctValue);
    }
  }

  logYeelightLanStateError(err) {
    this.handleYeelightLanError(err, 'state sync');
  }

  getYeelightLanProtocol() {
    if (!this.yeelightLanProtocol) {
      const miotDevice = this.getDevice().getMiotDevice();
      const ip = miotDevice.ip;
      this.yeelightLanProtocol = new YeelightLanProtocol(ip, this.getLogger());
      this.getLogger().debug(`[LightService] Yeelight LAN protocol enabled for ${this.getDevice().getName()} at ${ip}`);
    }
    return this.yeelightLanProtocol;
  }

  updatePropInternalValue(propObj, value) {
    const prop = this.getDevice().getProperty(propObj);
    if (prop && prop.updateInternalValue) {
      prop.updateInternalValue(value);
    }
  }

  /*----------========== CONVENIENCE ==========----------*/

  getColorTempMired() {
    let ct = this.getColorTemperature();
    let prop = this._colorTemperatureProp();

    // % (1..100) -> mired (500..140)
    if (prop && prop.getUnit && prop.getUnit() === PropUnit.PERCENTAGE) {
      const pct = Math.max(1, Math.min(100, Number(ct) || 1));
      const minMired = 140;
      const maxMired = 500;

      // 1 = warm (maxMired), 100 = cold (minMired)
      const mired = maxMired - ((pct - 1) * (maxMired - minMired) / 99);
      return Math.round(mired);
    }

    // default (kelvin -> mired)
    if (ct > 0) return Math.floor(1000000 / ct);
    return this.getMinColorTempValue();
  }

  async setColorTempMired(miredVal) {
    let prop = this._colorTemperatureProp();

    if (prop && prop.getUnit && prop.getUnit() === PropUnit.PERCENTAGE) {
      const minMired = 140;
      const maxMired = 500;
      const m = Math.max(minMired, Math.min(maxMired, Number(miredVal) || maxMired));

      // mired (500..140) -> % (1..100)
      const pct = 1 + ((maxMired - m) * 99 / (maxMired - minMired));
      return this.setColorTemperature(Math.round(pct));
    }

    // default (mired -> kelvin)
    if (miredVal > 0) {
      let kelvinVal = Math.floor(1000000 / miredVal);
      return this.setColorTemperature(kelvinVal);
    }
  }

  getHue() {
    return this.getColorHsv()[0];
  }

  getSaturation() {
    return this.getColorHsv()[1];
  }

  async setHue(hue) {
    this.getLogger().debug(`[LightService] Setting hue to ${hue}`);
    return this.setSaturationHue(undefined, hue);
  }

  async setSaturation(saturation) {
    this.getLogger().debug(`[LightService] Setting saturation to ${saturation}`);
    return this.setSaturationHue(saturation, undefined);
  }


  /*----------========== PROPERTIES ==========----------*/

  _onProp() {
    return this.getMiotService().getPropertyByType('on');
  }

  _brightnessProp() {
    return this.getMiotService().getPropertyByType('brightness');
  }

  _colorTemperatureProp() {
    return this.getMiotService().getPropertyByType('color-temperature');
  }

  _colorProp() {
    return this.getMiotService().getPropertyByType('color');
  }


  /*----------========== HELPERS ==========----------*/

  // color temp
  getMinColorTempValue() {
    let prop = this._colorTemperatureProp();
    if (prop && prop.getUnit && prop.getUnit() === PropUnit.PERCENTAGE) return 140; // HomeKit min
    let colorTempRange = this.getPropertyValueRange(this._colorTemperatureProp());
    let minVal = 140;
    if (colorTempRange && colorTempRange.length > 2) {
      minVal = colorTempRange[1];
      minVal = 1000000 / minVal;
    }
    return Math.floor(minVal);
  }

  getMaxColorTempValue() {
    let prop = this._colorTemperatureProp();
    if (prop && prop.getUnit && prop.getUnit() === PropUnit.PERCENTAGE) return 500; // HomeKit max
    let colorTempRange = this.getPropertyValueRange(this._colorTemperatureProp ());
    let maxVal = 500;
    if (colorTempRange && colorTempRange.length > 2) {
      maxVal = colorTempRange[0];
      maxVal = 1000000 / maxVal;
    }
    return Math.floor(maxVal);
  }

  // color
  async setSaturationHue(saturation, hue) {
    if (!this.saturationHueToSet) {
      this.saturationHueToSet = {};
      // just in case if something went wrong, reset the variable
      setTimeout(() => {
        this.saturationHueToSet = null;
      }, 1000);
    }

    if (!this.saturationHueToSet.saturation && parseInt(saturation) >= 0) {
      this.saturationHueToSet.saturation = parseInt(saturation);
    }
    if (!this.saturationHueToSet.hue && parseInt(hue) >= 0) {
      this.saturationHueToSet.hue = parseInt(hue);
    }

    if (this.saturationHueToSet.saturation >= 0 && this.saturationHueToSet.hue >= 0) {
      let colorRgb = this.getColorRgb(this.saturationHueToSet.hue, this.saturationHueToSet.saturation, this.getBrightness());
      this.getLogger().debug(`[LightService] Got hue and saturation! Sending rgb ${colorRgb} value to device!`);
      this.saturationHueToSet = null;
      await this.setColor(colorRgb);
    }
  }

  getColorHsv() {
    let colorRgb = this.getColor();
    if (colorRgb) {
      let r = colorRgb >> 16;
      let g = colorRgb >> 8 & 255;
      let b = colorRgb & 255;
      let color = colorConvert.rgb.hsv([r, g, b]);
      return color;
    }
    return [0, 0];
  }

  getColorRgb(hue, saturation, brightness) {
    const color = colorConvert.hsv.rgb([hue, saturation, brightness])
    const r = color[0];
    const g = color[1];
    const b = color[2];
    return 256 * 256 * r + 256 * g + b;
  }


}


module.exports = LightService;
