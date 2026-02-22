/**
 * Icônes SVG pour l'interface
 */

const iconStyle = 'width:18px;height:18px;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none';

export const icons = {
  mic: `<svg viewBox="0 0 24 24" style="${iconStyle}"><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  micOff: `<svg viewBox="0 0 24 24" style="${iconStyle}"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  video: `<svg viewBox="0 0 24 24" style="${iconStyle}"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  videoOff: `<svg viewBox="0 0 24 24" style="${iconStyle}"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" style="${iconStyle}"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  monitorOff: `<svg viewBox="0 0 24 24" style="${iconStyle}"><path d="M17 3H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2"/><line x1="1" y1="1" x2="23" y2="23"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" style="${iconStyle}"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`
};

export function icon(name) {
  const svg = icons[name] || '';
  const div = document.createElement('div');
  div.innerHTML = svg;
  div.style.display = 'inline-flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  return div.firstElementChild || div;
}
