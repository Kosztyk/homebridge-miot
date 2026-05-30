const net = require('net');

const YEELIGHT_PORT = 55443;
const DEFAULT_TIMEOUT = 5000;
const DEFAULT_EFFECT = 'smooth';
const DEFAULT_DURATION = 350;

class YeelightLanProtocol {
  constructor(ip, logger, options = {}) {
    this.ip = ip;
    this.logger = logger;
    this.timeout = Number(options.timeout) || DEFAULT_TIMEOUT;
    this._id = 1;
  }

  async setPower(isOn, duration = DEFAULT_DURATION) {
    return this.sendCommand('set_power', [isOn ? 'on' : 'off', DEFAULT_EFFECT, duration]);
  }

  async setBrightness(value, duration = DEFAULT_DURATION) {
    const brightness = Math.max(1, Math.min(100, Math.round(Number(value) || 1)));
    return this.sendCommand('set_bright', [brightness, DEFAULT_EFFECT, duration]);
  }

  async setRgb(rgb, duration = DEFAULT_DURATION) {
    const color = Math.max(0, Math.min(16777215, Math.round(Number(rgb) || 0)));
    return this.sendCommand('set_rgb', [color, DEFAULT_EFFECT, duration]);
  }

  async setHsv(hue, saturation, duration = DEFAULT_DURATION) {
    const h = Math.max(0, Math.min(359, Math.round(Number(hue) || 0)));
    const s = Math.max(0, Math.min(100, Math.round(Number(saturation) || 0)));
    return this.sendCommand('set_hsv', [h, s, DEFAULT_EFFECT, duration]);
  }

  async getProps(props = ['power', 'bright', 'rgb', 'hue', 'sat']) {
    return this.sendCommand('get_prop', props);
  }

  sendCommand(method, params = []) {
    const id = this._id++;
    const payload = JSON.stringify({ id, method, params }) + '\r\n';

    return new Promise((resolve, reject) => {
      let buffer = '';
      let settled = false;

      const finish = (err, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { socket.destroy(); } catch (_) {}
        if (err) reject(err);
        else resolve(result);
      };

      const timer = setTimeout(() => {
        finish(new Error(`Yeelight LAN command ${method} timed out for ${this.ip}`));
      }, this.timeout);

      const socket = net.createConnection({ host: this.ip, port: YEELIGHT_PORT }, () => {
        socket.write(payload);
      });

      socket.setEncoding('utf8');

      socket.on('data', data => {
        buffer += data;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.id === id) {
              if (parsed.error) {
                finish(new Error(`Yeelight LAN error for ${method}: ${JSON.stringify(parsed.error)}`));
              } else {
                finish(null, parsed.result);
              }
              return;
            }
          } catch (err) {
            this.logger && this.logger.debug && this.logger.debug(`Unable to parse Yeelight LAN response from ${this.ip}: ${trimmed}`);
          }
        }
      });

      socket.on('error', err => finish(err));
      socket.on('close', () => {
        if (!settled) finish(new Error(`Yeelight LAN socket closed before response for ${method} on ${this.ip}`));
      });
    });
  }
}

module.exports = YeelightLanProtocol;
