export function sanitizeText(raw) {
  if (!raw && raw !== '') return raw;
  let s = String(raw || '');
  const replacements = {
    'Rot Cause': 'Root Cause',
    'NNtwork': 'Network',
    'Netwrok': 'Network',
    'connettivity': 'connectivity',
    'conectivity': 'connectivity',
    'Justificatiin': 'Justification',
    'Justificaton': 'Justification',
    'uggy-app-v2': 'buggy-app-v2',
  };
  Object.keys(replacements).forEach(k => { s = s.split(k).join(replacements[k]); });
  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
