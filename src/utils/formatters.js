/**
 * formatters.js
 * Pure formatting utilities used across screens and components.
 * No React Native imports — safe to use anywhere (including backend utils).
 */

// ── Currency ──────────────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees.
 * @example formatINR(3600) → "₹3,600"
 */
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Format a number as compact Indian Rupees (lakhs / crores).
 * @example formatINRCompact(1500000) → "₹15L"
 */
export function formatINRCompact(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

// ── Percentage ────────────────────────────────────────────────────────────────

/**
 * Format a decimal or whole number as a percentage string.
 * @example formatPercent(0.72) → "72%"  |  formatPercent(72) → "72%"
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '0%';
  const n = value <= 1 ? value * 100 : value;
  return `${Math.round(n)}%`;
}

// ── Dates & Time ──────────────────────────────────────────────────────────────

/**
 * Returns a human-readable relative time string.
 * @example timeAgo('2026-03-10T08:00:00Z') → "1 day ago"
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec  = Math.floor(diffMs / 1000);
  const diffMin  = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay  = Math.floor(diffHour / 24);

  if (diffSec < 60)   return 'just now';
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffHour < 24)  return `${diffHour}h ago`;
  if (diffDay < 30)   return `${diffDay}d ago`;
  return formatDate(dateStr);
}

/**
 * Format an ISO date string to "DD MMM YYYY".
 * @example formatDate('2026-03-11') → "11 Mar 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Format an ISO date string to "DD MMM · HH:MM".
 * @example formatDateTime('2026-03-11T14:30:00Z') → "11 Mar · 14:30"
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

// ── Strings ───────────────────────────────────────────────────────────────────

/**
 * Capitalize the first letter of each word.
 * @example titleCase('rahul kumar') → "Rahul Kumar"
 */
export function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Generate initials from a full name (max 2 chars).
 * @example getInitials('Rahul Kumar') → "RK"
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Truncate a string to maxLength and append "…" if needed.
 */
export function truncate(str, maxLength = 40) {
  if (!str || str.length <= maxLength) return str ?? '';
  return str.slice(0, maxLength).trimEnd() + '…';
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random alphanumeric ID (e.g. for mock payment IDs).
 * @example makeId('pay_', 12) → "pay_A3FX8K2QPL7M"
 */
export function makeId(prefix = '', length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = prefix;
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
