// @ts-check

// Thingy52Driver
//
// Supports:
//   * Accelerometer
//   * Button
//   * Thermometer
//   * RGB LED
//

export const Thingy52Driver = new class extends EventTarget {
    #device // Just allow one device, for now
    #ledCharacteristic

    constructor() {
        super();

        this._onThermometerChange = this._onThermometerChange.bind(this);
        this._onAccelerometerChange = this._onAccelerometerChange.bind(this);
        this._onButtonChange = this._onButtonChange.bind(this);
    }

    async openDevice(device) {
        // if already connected to a device - close it
        if (this.#device) {
            this.disconnect();
        }

        const server = await device.gatt.connect();

        device.ongattserverdisconnected = e => this._disconnected(e);

        await this._startAccelerometerNotifications(server);
        await this._startThermometerNotifications(server);
        await this._startButtonClickNotifications(server);

        this.#ledCharacteristic = await this._getLedCharacteristic(server);

        console.log('Opened device: ', device);

        this.#device = device;
        this.dispatchEvent(new CustomEvent('connect', {detail: { device }}));
    }

    _onAccelerometerChange(event) {
        const target = event.target;
        const deviceId = target.service.device.id;

        const accel = {
          x: +target.value.getFloat32(0, true).toPrecision(5),
          y: +target.value.getFloat32(4, true).toPrecision(5),
          z: +target.value.getFloat32(8, true).toPrecision(5)
        };

        this.dispatchEvent(new CustomEvent('accelerometer', {
            detail: accel
        }));

    }

    async _startAccelerometerNotifications(server) {
        const service = await server.getPrimaryService('ef680400-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef68040a-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onAccelerometerChange);
        return characteristic.startNotifications();
    }

    _onButtonChange(event) {
        const target = event.target;
        const deviceId = target.service.device.id;

        const pressed = target.value.getUint8(0) === 1;

        this.dispatchEvent(new CustomEvent('button', {
            detail: { pressed }
        }));
    }

    async _startButtonClickNotifications(server) {
        const service = await server.getPrimaryService('ef680300-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef680302-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onButtonChange);
        return characteristic.startNotifications();
    }

    _onThermometerChange(event) {
        const target = event.target;
    
        const integer = target.value.getUint8(0);
        const decimal = target.value.getUint8(1);
    
        const temperature = Number.parseFloat(`${integer}.${decimal}`);

        this.dispatchEvent(new CustomEvent('thermometer', {
            detail: { temperature }
        }));
    }

    async _startThermometerNotifications(server) {
        const service = await server.getPrimaryService('ef680200-9b35-4933-9b10-52ffa9740042');
        const characteristic = await service.getCharacteristic('ef680201-9b35-4933-9b10-52ffa9740042');
        characteristic.addEventListener('characteristicvaluechanged', this._onThermometerChange);
        return characteristic.startNotifications();
    }

    setLED(r, g, b) {
        return this.#ledCharacteristic.writeValue(new Uint8Array([1, r, g, b]));
    }

    async _getLedCharacteristic(server) {
        const service = await server.getPrimaryService('ef680300-9b35-4933-9b10-52ffa9740042');
        return await service.getCharacteristic('ef680301-9b35-4933-9b10-52ffa9740042');
    }
    
    disconnect() {
        this.#device?.gatt?.disconnect();
        this.#device = undefined;
    }

    _disconnected(evt) {
        this.dispatchEvent(new Event('disconnect'));
    }

    async scan() {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['ef680100-9b35-4933-9b10-52ffa9740042'] }],
            optionalServices: [
                "ef680200-9b35-4933-9b10-52ffa9740042",
                "ef680300-9b35-4933-9b10-52ffa9740042",
                "ef680400-9b35-4933-9b10-52ffa9740042",
                "ef680500-9b35-4933-9b10-52ffa9740042"
            ]
        });

        if (device) {
            await this.openDevice(device);
        }
    }
}
