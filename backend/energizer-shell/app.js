const loginView = document.getElementById('view-login');
const hubView = document.getElementById('view-hub');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');
const otpBlock = document.getElementById('otp-block');
const btnSubmit = document.getElementById('btn-submit');
const btnResend = document.getElementById('btn-resend');
const btnLogout = document.getElementById('btn-logout');
const loginError = document.getElementById('login-error');
const loginInfo = document.getElementById('login-info');
const channelGrid = document.getElementById('channel-grid');
const hubFooter = document.getElementById('hub-footer');
const hubEmail = document.getElementById('hub-email');

let otpSent = false;
let devSkipAuth = false;

const LOCAL_CHANNEL_PORTS = {
  metcash26: 5001,
  bunnings26: 5002,
  ww26: 5003,
};

function showMessage(el, text) {
  if (!text) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden');
}

function channelHref(ch) {
  if (ch.status !== 'active') return '#';
  const port = LOCAL_CHANNEL_PORTS[ch.id];
  const onLocalGateway =
    window.location.port === '5010' ||
    (window.location.hostname === 'localhost' && window.location.pathname.startsWith('/energizerAU'));
  if (onLocalGateway && port) {
    return `http://localhost:${port}${ch.route}`;
  }
  if (ch.id === 'metcash26') {
    return '/metcash26/?hub=1';
  }
  return ch.route;
}

function badgeFor(status) {
  if (status === 'active') return '<span class="badge badge-active">Active</span>';
  if (status === 'coming_soon') return '<span class="badge badge-soon">Coming soon</span>';
  return '';
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, {
    credentials: 'include',
    headers,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function loadChannels(email) {
  const q = email ? `?email=${encodeURIComponent(email)}` : '';
  const data = await api(`/api/channels${q}`, { cache: 'no-store' });
  channelGrid.innerHTML = (data.channels || [])
    .map((ch) => {
      const disabled = ch.status !== 'active';
      const href = channelHref(ch);
      return `
        <a class="channel-card${disabled ? ' disabled' : ''}" href="${href}" ${disabled ? 'aria-disabled="true"' : ''}>
          <div class="label">${ch.label}</div>
          <div class="subtitle">${ch.subtitle || ''}</div>
          ${badgeFor(ch.status)}
        </a>`;
    })
    .join('');
  hubFooter.textContent = `DBLE Platform · ${data.channels?.length || 0} channels`;
  return data;
}

function showHub(email) {
  loginView.classList.add('hidden');
  hubView.classList.remove('hidden');
  hubEmail.textContent = email || 'Developer';
  loadChannels(email).catch((err) => {
    channelGrid.innerHTML = `<p class="muted">${err.message}</p>`;
  });
}

function showLogin() {
  hubView.classList.add('hidden');
  loginView.classList.remove('hidden');
  otpSent = false;
  otpBlock.classList.add('hidden');
  btnSubmit.textContent = devSkipAuth ? 'Continue' : 'Send sign-in code';
  otpInput.value = '';
  showMessage(loginError, '');
  showMessage(loginInfo, devSkipAuth ? 'Local dev — continue straight to the Channel Hub.' : '');
}

async function initPlatform() {
  try {
    const cfg = await api('/api/platform/config');
    devSkipAuth = Boolean(cfg.devSkipAuth);
    if (devSkipAuth) {
      btnSubmit.textContent = 'Continue';
      showMessage(loginInfo, 'Local dev — continue straight to the Channel Hub.');
    }
  } catch {
    devSkipAuth = false;
  }
}

async function sendCode() {
  const email = emailInput.value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    showMessage(loginError, 'Enter a valid email address.');
    return;
  }
  showMessage(loginError, '');
  showMessage(loginInfo, '');
  btnSubmit.disabled = true;
  btnResend.disabled = true;
  try {
    const data = await api('/api/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    otpSent = true;
    otpBlock.classList.remove('hidden');
    btnSubmit.textContent = 'Verify code';
    let info = 'If your email is approved, we have sent a 6-digit sign-in code.';
    if (data.localOtpCode) info += ` Dev code: ${data.localOtpCode}`;
    showMessage(loginInfo, info);
    otpInput.focus();
  } catch (err) {
    showMessage(loginError, err.message);
  } finally {
    btnSubmit.disabled = false;
    btnResend.disabled = false;
  }
}

async function verifyCode() {
  const email = emailInput.value.trim().toLowerCase();
  const code = otpInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    showMessage(loginError, 'Enter the 6-digit code.');
    return;
  }
  showMessage(loginError, '');
  btnSubmit.disabled = true;
  try {
    const data = await api('/api/auth/verify-link', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    showHub(data.email);
  } catch (err) {
    showMessage(loginError, err.message);
  } finally {
    btnSubmit.disabled = false;
  }
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  if (devSkipAuth) {
    showHub(email || 'dev@local');
    return;
  }
  if (otpSent) verifyCode();
  else sendCode();
});

btnResend.addEventListener('click', (e) => {
  e.preventDefault();
  sendCode();
});

btnLogout.addEventListener('click', () => {
  api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  showLogin();
});

initPlatform().then(async () => {
  if (window.location.pathname === '/channels' && devSkipAuth) {
    showHub(emailInput.value.trim() || 'dev@local');
    return;
  }
  try {
    const me = await api('/api/auth/me');
    if (me.authenticated && me.email) {
      showHub(String(me.email));
    }
  } catch {
    // Stay on login.
  }
});
