// @ts-check
import { Demo3DObj } from './demo-3dobj.js';
import { Thingy52Driver } from './thingy52-driver.js';

export class MainApp extends HTMLElement {
    /** @type {Demo3DObj} */ #obj
    #cells

    constructor() {
        super();

        this.#cells = [];

        this.handleButton = this.handleButton.bind(this);
        this.handleAccelerometer = this.handleAccelerometer.bind(this);
        this.handleThermometer = this.handleThermometer.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    connectedCallback() {
        this.innerHTML = `
        <style>
        #list {
            display: grid;
            grid-template-columns: 1fr 3fr;
            width: 600px;
        }

        </style>

        <button id='connect'>CONNECT</button>
        <h2>Status: <span id='status'> - </span></h2>
        <div id='list'></div>
        <demo-3dobj></demo-3dobj>
        `;


        this.#obj = this.querySelector('demo-3dobj');
        this.querySelector('#connect').addEventListener('click', this.doScan);

        this._initList();

        Thingy52Driver.addEventListener('connect', this.handleConnect);
        Thingy52Driver.addEventListener('disconnect', this.handleDisconnect);
        Thingy52Driver.addEventListener('accelerometer', this.handleAccelerometer);
        Thingy52Driver.addEventListener('thermometer', this.handleThermometer);
        Thingy52Driver.addEventListener('button', this.handleButton);
    }

    disconnectedCallback() {
        Thingy52Driver.removeEventListener('connect', this.handleConnect);
        Thingy52Driver.removeEventListener('disconnect', this.handleDisconnect);
        Thingy52Driver.removeEventListener('accelerometer', this.handleAccelerometer);
        Thingy52Driver.removeEventListener('thermometer', this.handleThermometer);
        Thingy52Driver.removeEventListener('button', this.handleButton);
    }

    _initList() {
        const list = this.querySelector('#list');
        const labels = ['X [B -/+]', 'Y [A +/-]', 'Z [A/B Red]', 'Temperature'];

        labels.forEach(l => {
            const label = document.createElement('span');
            label.classList.add('label');
            label.innerText = l;

            const value = document.createElement('span');
            value.classList.add('value');
            value.innerText = `-`;
            this.#cells.push(value);

            list.append(label, value);
        });
    }

    setStatus(str) {
        this.querySelector('#status').innerHTML = str;
    }

    setCellValue(i, val) {
        this.#cells[i].innerText = val;
    }

    doScan() {
        Thingy52Driver.scan();
    }

    handleAccelerometer(/** @type {CustomEvent} */ evt) {
        const {x, y, z} = evt.detail;
        this.#obj.setTranslation(x*10, y*10, -z*10);
        this.setCellValue(0, x);
        this.setCellValue(1, y);
        this.setCellValue(2, z);
    }

    handleThermometer(/** @type {CustomEvent} */ evt) {
        const {temperature} = evt.detail;
        this.setCellValue(3, `${temperature}°C`);
    }

    handleButton(/** @type {CustomEvent} */ evt) {
        const {pressed} = evt.detail;
        Thingy52Driver.setLED(pressed ? 255 : 0, pressed ? 0 : 255, 0);
    }

    handleConnect(/** @type {CustomEvent} */ evt) {
        const {device} = evt.detail;
        this.setStatus(`${device.name} connected`);
    }

    handleDisconnect() {
        this.setStatus(` - `);
    }
}
customElements.define('main-app', MainApp);
