import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PresentationPreview from './PresentationPreview';
import PresentationPreviewKiller from './PresentationPreviewKiller';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const preview = new URLSearchParams(window.location.search).get('preview');
const previewPresentation = preview === 'presentation';
const previewPresentationKiller = preview === 'presentation-killer';

root.render(
  previewPresentationKiller ? (
    <PresentationPreviewKiller />
  ) : previewPresentation ? (
    <PresentationPreview />
  ) : (
    <App />
  )
);
reportWebVitals();
