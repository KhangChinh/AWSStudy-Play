import { defineCustomElement } from '@ionic/core/components/ion-icon.js';

if (typeof customElements !== 'undefined' && !customElements.get('ion-icon')) {
  defineCustomElement();
}

const IonIcon = ({ icon, ...props }) => <ion-icon icon={icon} {...props} />;

export { IonIcon };
