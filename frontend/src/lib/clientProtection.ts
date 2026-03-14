function lockPage(): void {
  document.documentElement.innerHTML = `
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Mindcrash</title>
      <style>
        html, body {
          margin: 0;
          height: 100%;
          background: #0a0806;
          color: #f5d27a;
          font-family: serif;
        }
        .locked {
          min-height: 100%;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 24px;
        }
      </style>
    </head>
    <body>
      <main class="locked">
        <div>
          <h2>Mindcrash Security Lock</h2>
          <p>This page was protected because developer tools or restricted shortcuts were detected.</p>
        </div>
      </main>
    </body>
  `;
}

function isKeyAllowedInForm(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function shouldBlockKey(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;

  // Explicit combinations requested to be blocked.
  if (ctrlOrMeta && key === 'u') {
    return true;
  }
  if (ctrlOrMeta && event.shiftKey && (key === 'i' || key === 'c' || key === 'j')) {
    return true;
  }
  if (ctrlOrMeta && key === 'a') {
    return true;
  }

  if (event.key.startsWith('F')) {
    return true;
  }

  if (ctrlOrMeta || event.altKey) {
    return true;
  }

  // Explicitly block common inspect/view-source shortcuts.
  if (key === 'u' || key === 'i' || key === 'j' || key === 'c' || key === 's') {
    return true;
  }

  // Keep text entry possible only inside form elements.
  if (isKeyAllowedInForm(event)) {
    return false;
  }

  return true;
}

function likelyDevToolsOpen(): boolean {
  const widthGap = window.outerWidth - window.innerWidth > 160;
  const heightGap = window.outerHeight - window.innerHeight > 160;
  return widthGap || heightGap;
}

function blockEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  if ('stopImmediatePropagation' in event) {
    event.stopImmediatePropagation();
  }
}

function legacyFalseHandler(): boolean {
  return false;
}

function applyProtectionStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    body {
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    input, textarea {
      -webkit-user-select: text;
      user-select: text;
    }
  `;
  document.head.appendChild(style);
}

export function enableClientProtection(): void {
  applyProtectionStyles();

  const hardBlockEvents = ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart'];
  for (const eventName of hardBlockEvents) {
    window.addEventListener(eventName, blockEvent, true);
    document.addEventListener(eventName, blockEvent, true);
  }

  window.addEventListener('auxclick', (event) => {
    if ((event as MouseEvent).button === 2) {
      blockEvent(event);
    }
  }, true);

  window.addEventListener('mousedown', (event) => {
    if ((event as MouseEvent).button === 2) {
      blockEvent(event);
    }
  }, true);

  const keyHandler = (event: KeyboardEvent) => {
    if (shouldBlockKey(event)) {
      blockEvent(event);

      if (event.key.startsWith('F') || event.key.toLowerCase() === 'i' || event.key.toLowerCase() === 'j') {
        lockPage();
      }
    }
  };

  window.addEventListener('keydown', keyHandler, true);
  window.addEventListener('keyup', keyHandler, true);
  window.addEventListener('keypress', keyHandler, true);
  document.addEventListener('keydown', keyHandler, true);
  document.addEventListener('keyup', keyHandler, true);
  document.addEventListener('keypress', keyHandler, true);

  // Legacy fallback handlers for browsers that still honor direct assignment hooks.
  document.oncontextmenu = legacyFalseHandler;
  document.oncopy = legacyFalseHandler;
  document.oncut = legacyFalseHandler;
  document.onpaste = legacyFalseHandler;
  document.onselectstart = legacyFalseHandler;
  document.onkeydown = (event) => {
    if (shouldBlockKey(event)) {
      blockEvent(event);
      return false;
    }
    return true;
  };

  // Some scripts/plugins can override handlers. Re-assert periodically.
  const reapply = window.setInterval(() => {
    document.oncontextmenu = legacyFalseHandler;
    document.oncopy = legacyFalseHandler;
    document.oncut = legacyFalseHandler;
    document.onpaste = legacyFalseHandler;
    document.onselectstart = legacyFalseHandler;
  }, 2000);

  const detector = window.setInterval(() => {
    if (likelyDevToolsOpen()) {
      window.clearInterval(detector);
      window.clearInterval(reapply);
      lockPage();
    }
  }, 1000);
}
