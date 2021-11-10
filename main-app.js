// @ts-check
import { Demo3DObj } from './demo-3dobj.js';
import { Thingy52Driver } from './thingy52-driver.js';
import { InfoBox } from './info-box.js';

const hexToRGB = hex => hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));

const template = document.createElement('template');
template.innerHTML = `
<style>
    :host {
        font-family: UbuntuCondensed, Arial;
    }

    .flex-container {
        display: flex;
        height: 100%;
    }
    .content {
        margin: auto;
        position: relative;
        width: 95%;
        max-width: 700px;
    }
    .col {
        display: flex;
        flex-direction: column;
    }
    .row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    .below {
        border-radius: 10px;
        background: #e0e0e0;
        box-shadow: inset 5px 5px 10px #bebebe,
                    inset -5px -5px 10px #ffffff;
    }

    .labbox {
        display: flex;
        box-sizing: border-box;
        width: 25vmin;
        height: 25vmin;
        border: 5px solid black;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 2em;
    }

    button {
        min-height: 40px;
    }
</style>

<div class="flex-container">
    <div class="content">
        <div class="col">
            <button id='connect'>CONNECT</button>
            <h2>Status: <span id='status'> - </span></h2>
            <info-box></info-box>
            <input id='colorpicker' type='color'>
            <div class='row'>
                <div id='labbox1' class='labbox'></div>
                <div id='labbox2' class='labbox'></div>
                <div id='labbox3' class='labbox'></div>
            </div>
            <demo-3dobj></demo-3dobj>
        </div>
    </div>
</div>
`;

export class MainApp extends HTMLElement {
    /** @type {Demo3DObj} */ #obj
    /** @type {InfoBox} */ #infobox
    /** @type {HTMLDivElement} */ #labbox1
    /** @type {HTMLDivElement} */ #labbox2
    /** @type {HTMLDivElement} */ #labbox3


    constructor() {
        super();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        this.handleButton = this.handleButton.bind(this);
        this.handleBattery = this.handleBattery.bind(this);
        this.handleAccelerometer = this.handleAccelerometer.bind(this);
        this.handleThermometer = this.handleThermometer.bind(this);
        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }

    connectedCallback() {
        // Find elements and assign them to class members
        this.#obj = this.shadowRoot.querySelector('demo-3dobj');
        this.#infobox = this.shadowRoot.querySelector('info-box');
        this.#labbox1 = this.shadowRoot.querySelector('#labbox1');
        this.#labbox2 = this.shadowRoot.querySelector('#labbox2');
        this.#labbox3 = this.shadowRoot.querySelector('#labbox3');

        // Set label in lab boxes
        this.#labbox1.textContent = 'Box 1';
        this.#labbox2.textContent = 'Box 2';
        this.#labbox3.textContent = 'Box 3';

        // Assign listeners on button and input to respective handler functions
        this.shadowRoot.querySelector('#connect').addEventListener('click', this.doScan);
        this.shadowRoot.querySelector('#colorpicker').addEventListener('input', this.setColor);

        // Initialize the data info panel with properties to show
        this.#infobox.initList(['X', 'Y', 'Z', 'Temperature', 'Button', 'Battery']);

        // Listen on events from the Thingy52 driver
        Thingy52Driver.addEventListener('connect', this.handleConnect);
        Thingy52Driver.addEventListener('disconnect', this.handleDisconnect);
        Thingy52Driver.addEventListener('accelerometer', this.handleAccelerometer);
        Thingy52Driver.addEventListener('thermometer', this.handleThermometer);
        Thingy52Driver.addEventListener('button', this.handleButton);
        Thingy52Driver.addEventListener('battery', this.handleBattery);
    }

    disconnectedCallback() {
        // Clean up listeners when this element is closed.
        // Note: This is not needed for this particular demo as the element is never removed
        //       but kept as a guideline for how to clean up in elements that will be dynamically added/removed.
        Thingy52Driver.removeEventListener('connect', this.handleConnect);
        Thingy52Driver.removeEventListener('disconnect', this.handleDisconnect);
        Thingy52Driver.removeEventListener('accelerometer', this.handleAccelerometer);
        Thingy52Driver.removeEventListener('thermometer', this.handleThermometer);
        Thingy52Driver.removeEventListener('button', this.handleButton);
        Thingy52Driver.removeEventListener('battery', this.handleBattery);
    }


    // This function sets a status message in the top header
    setStatus(str) {
        this.shadowRoot.querySelector('#status').textContent = str;
    }

    // Start scanning for Thingy52s
    doScan() {
        Thingy52Driver.scan();
    }

    // Set a color on the connected Thingy52
    setColor(evt) {
        const hexcolor = evt.target.value;
        Thingy52Driver.setLED(...hexToRGB(hexcolor));
    }

    // Helper function to map and clamp value to 0-255
    mapValueToColorComponent(min, max, value) {
        const mappedValue = 255 * (value - min) / (max - min);

        return Math.min(255.0, Math.max(0, mappedValue));
    }

    // Handle accelerometer data coming from the Thingy52
    // Remember that gravity is not subtracted, so the length of the vector of a Thingy52 lying still should be 1g (~ 9.8)
    handleAccelerometer(/** @type {CustomEvent} */ evt) {
        const {x, y, z} = evt.detail;

        // Apply ZYX readings to translation of the £D demo object
        this.#obj.setTranslation(x*10, y*10, -z*10);

        // Apply colors to the labboxes (1 = red/x, 2 = green/y, 3 = blue/z)
        this.#labbox1.style.backgroundColor = `rgb(${this.mapValueToColorComponent(-9.8, 9.8, x)},0,0)`;
        this.#labbox2.style.backgroundColor = `rgb(0, ${this.mapValueToColorComponent(-9.8, 9.8, y)},0)`;
        this.#labbox3.style.backgroundColor = `rgb(0, 0, ${this.mapValueToColorComponent(-9.8, 9.8, z)})`;

        this.#infobox.setValues({X:x, Y:y, Z:z});
    }

    // Handle temperature reading from the Thingy52 (in celcius)
    handleThermometer(/** @type {CustomEvent} */ evt) {
        const {temperature} = evt.detail;

        this.#infobox.setValues({Temperature:`${temperature}°C`});
    }

    // Handle up/down events from the button on the middle of the Thingy52
    handleButton(/** @type {CustomEvent} */ evt) {
        const {pressed} = evt.detail;

        // Set the color of the LED on the Thingy52 to red on pressed and green on released
        Thingy52Driver.setLED(pressed ? 255 : 0, pressed ? 0 : 255, 0);

        this.#infobox.setValues({Button:`${pressed ? "DOWN" : "UP"}`});
    }

    // Handle battery info (in percentage)
    handleBattery(/** @type {CustomEvent} */ evt) {
        const {battery} = evt.detail;

        this.#infobox.setValues({Battery:`${battery}%`});
    }

    // Handle when a Thingy52 is connected and ready
    handleConnect(/** @type {CustomEvent} */ evt) {
        const {device} = evt.detail;
        this.setStatus(`${device.name} connected`);
    }

    // Handle a disconnect event (e.g. when the Thingy52 us switched off)
    handleDisconnect() {
        this.setStatus(` - `);
    }
}
customElements.define('main-app', MainApp);
