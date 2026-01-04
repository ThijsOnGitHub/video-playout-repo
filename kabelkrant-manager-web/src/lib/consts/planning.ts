export const DAYS_NL = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

export const DAYS_SHORT = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Generate color for program based on its ID
export function getProgramColor(programId: string): string {
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-red-500", "bg-yellow-500", "bg-cyan-500"];

  // Simple hash function to get consistent color for same program
  let hash = 0;
  for (let i = 0; i < programId.length; i++) {
    hash = programId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
