/** Injected at build time (see frontend `build` script / Render render-build). */
export const BUILD_COMMIT = (process.env.REACT_APP_GIT_COMMIT || '').trim() || 'dev';
