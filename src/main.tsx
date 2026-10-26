import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StoreProvider } from './StoreContext.tsx';

import { ErrorBoundary } from './ErrorBoundary';
import FeedbackPage from './components/views/FeedbackPage';

const publicFeedbackPath = window.location.pathname.match(/^\/f\/([A-Za-z0-9_-]{8,16})\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {window.location.pathname.startsWith('/f/') ? <FeedbackPage code={publicFeedbackPath?.[1] || ''} /> :
        <StoreProvider><App /></StoreProvider>}
    </ErrorBoundary>
  </StrictMode>,
);
