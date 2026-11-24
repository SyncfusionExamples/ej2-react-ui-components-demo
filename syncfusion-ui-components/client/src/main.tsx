import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerLicense } from '@syncfusion/ej2-base';
import { AuthProvider } from './auth/AuthContext';
import { getPublicBasePath } from '../src/basePath';
import App from './App';
import './index.css';

// Paste your Syncfusion license key in client/.env (VITE_SYNCFUSION_LICENSE=...).
const licenseKey = 'Ngo9BigBOggjHTQxAR8/V1JBaF1cXGFCf1FpR2dGfV5yckVHYFZVTXxfS00SNHVRdkdlWH5cdHVVQmldUUd1X0dWYEw=';
if (licenseKey) registerLicense(licenseKey);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={getPublicBasePath()}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
