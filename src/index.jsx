import React from 'react';
import ReactDOM from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './theme/variables.css';
import './index.css';
import App from './EnvoysDashboard';

// Use one Ionic component mode across browsers and devices. Ionic defaults to
// iOS mode on iPhones, where `fill="outline"` is not available, making shared
// form controls lose their borders compared with desktop/Android rendering.
setupIonicReact({ mode: 'md' });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
