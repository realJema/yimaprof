/**
 * Utility to anonymize school names for public display
 * Format: #CODEACRONYM (e.g., #001LBP)
 */

// Generate stable 3-digit code from school ID (uses last 8 chars of UUID)
function generateCode(id: string): string {
  const hash = id.slice(-8);
  const num = (parseInt(hash, 16) % 999) + 1;
  return num.toString().padStart(3, '0');
}

// Generate acronym from school name (first letter of significant words)
function generateAcronym(name: string): string {
  const stopWords = [
    'de', 'du', 'la', 'le', 'les', 'des', "l'", "d'", 'et', 'à',
    'école', 'lycée', 'collège', 'groupe', 'scolaire', 'public', 'privé'
  ];
  
  const words = name
    .split(/[\s\-']+/)
    .filter(word => word.length > 0 && !stopWords.includes(word.toLowerCase()));
  
  return words.slice(0, 5).map(word => word[0].toUpperCase()).join('');
}

// Main function - returns format: #001LBP
export function anonymizeSchoolName(school: { id: string; name: string }): string {
  const code = generateCode(school.id);
  const acronym = generateAcronym(school.name);
  return `#${code}${acronym}`;
}

// For search - matches against both anonymized and real names
export function matchesSchoolSearch(
  school: { id: string; name: string },
  searchTerm: string
): boolean {
  if (!searchTerm.trim()) return true;
  const anonymized = anonymizeSchoolName(school).toLowerCase();
  const realName = school.name.toLowerCase();
  const search = searchTerm.toLowerCase();
  return anonymized.includes(search) || realName.includes(search);
}
