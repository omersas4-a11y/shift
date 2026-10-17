import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StoreProvider } from './StoreContext.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import firebaseConfig from '../firebase-applet-config.json';

import { ErrorBoundary } from './ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={(firebaseConfig as any).oAuthClientId || "dummy-client-id"}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
