// @ts-check
const template = document.createElement('template');
template.innerHTML = `<style>
#list {
    display: grid;
    grid-template-columns: 1fr 2fr;
}
</style>
<div id='list'></div>
`;

export class InfoBox extends HTMLElement {
    #list
    #cells

    constructor() {
        super();

        this.#cells = new Map();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

    }

    connectedCallback() {
        this.#list = this.shadowRoot.querySelector('#list');
    }

    // Initialize the info box with a list of property labels (e.g. ['A', 'B', 'C'])
    initList(labels) {
        const str = labels.map(l => `<span class='label'>${l}</span><span id=${l} class='value'>-</span>`);
        this.#list.innerHTML = str.join('') || '';
        for (const l of labels) {
            this.#cells.set(l, this.#list.querySelector(`#${l}`));
        }
    }

    // Set values for properties (e.g {A: 1, B: 2})
    // NOTE: Only properties given to`initList` will be shown.
    setValues(values) {
        for (const label in values) {
            if (this.#cells.has(label)) this.#cells.get(label).innerText = values[label];
        }
    }

}
customElements.define('info-box', InfoBox);
