export function sanitizeText(raw) {
  if (!raw && raw !== '') return raw;
  let s = String(raw || '');
  
  // Common spelling mistakes and corruptions from AI output
  const replacements = {
    'oot Cause': 'Root Cause',
    'root cause': 'Root Cause',
    'Root cause': 'Root Cause',
    'NNtwork': 'Network',
    'Netwrok': 'Network',
    'connettivity': 'connectivity',
    'conectivity': 'connectivity',
    'Justificatiin': 'Justification',
    'Justificaton': 'Justification',
    'uggy-app-v2': 'buggy-app-v2',
    'bbuggу-app-v2': 'buggy-app-v2',
    'bbuggу': 'buggy',
    'container reac': 'container reaching',
    'exhaustio': 'exhaustion',
    'temmporary': 'temporary',
    'temmorary': 'temporary',
    'iles and': 'iles and',
    'crashes': 'crashes',
    '::': ':',
    'Confidence:': 'Confidence:',
    'Reasoning:': 'Reasoning:',
  };
  
  Object.keys(replacements).forEach(k => { 
    s = s.split(k).join(replacements[k]); 
  });
  
  // Remove any double colons
  s = s.replace(/::/g, ':');
  
  // Fix any character encoding issues (cyrillic sneaking in)
  s = s.replace(/[а-яА-Я]/g, (char) => {
    const map = {
      'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 's', 'т': 't', 'у': 'u', 'х': 'x', 'у': 'y',
      'в': 'b', 'г': 'g', 'д': 'd', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 
      'н': 'n', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ь': '', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    return map[char] || char;
  });
  
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();
  
  // Remove leading/trailing punctuation
  s = s.replace(/^[^\w]+|[^\w]+$/g, '');
  
  return s;
}
