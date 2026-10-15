export const schools = [
  { id: 'gcsu', name: 'Georgia College', short: 'GC', town: 'Milledgeville', color: '#173e78', accent: '#a8d9be', wash: '#e4edf5', mascot: 'BOBCAT COUNTRY', landmark: 'Front Campus', destination: 'Downtown Milledgeville', motif: 'columns', logo: null },
  { id: 'uga', name: 'University of Georgia', short: 'UGA', town: 'Athens', color: '#b82035', accent: '#ffc4b3', wash: '#fae8e3', mascot: 'BULLDOG COUNTRY', landmark: 'The Arch', destination: 'Downtown Athens', motif: 'arch', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png' },
  { id: 'gt', name: 'Georgia Tech', short: 'GT', town: 'Atlanta', color: '#64532c', accent: '#ead59c', wash: '#f5efdd', mascot: 'YELLOW JACKET COUNTRY', landmark: 'Tech Green', destination: 'Midtown Atlanta', motif: 'skyline', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/59.png' },
  { id: 'ksu', name: 'Kennesaw State', short: 'KSU', town: 'Kennesaw', color: '#55451b', accent: '#ffda61', wash: '#faf1cf', mascot: 'OWL COUNTRY', landmark: 'Campus Green', destination: 'Downtown Kennesaw', motif: 'mountain', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/338.png' },
] as const;
export type School = typeof schools[number];
