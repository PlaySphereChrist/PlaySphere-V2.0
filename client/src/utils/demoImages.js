const groundImagesBySport = {
  badminton: [
    'ground-badminton.jpg',
    'court-indoor-multisport.webp',
  ],
  football: [
    'ground-football.jpg',
    'ground-football-getty-watermarked.jpg',
    'ground-football-night-turf.jpg',
    'ground-football-practice.jpg',
    'ground-football-green-turf.jpg',
  ],
  cricket: [
    'ground-cricket.jpg',
    'ground-cricket-netaji.webp',
  ],
  basketball: [
    'ground-basketball.jpg',
    'ground-courtyard-stock-watermarked.webp',
    'court-indoor-multisport.webp',
  ],
  volleyball: [
    'ground-volleyball.jpg',
    'court-indoor-multisport.webp',
    'ground-courtyard-stock-watermarked.webp',
  ],
  multisport: [
    'ground-multisport.jpg',
    'complex-multisport-model.jpg',
    'complex-aerial-stock-watermarked.webp',
    'court-indoor-multisport.webp',
    'ground-courtyard-stock-watermarked.webp',
  ],
};

const groundImagePath = (filename) => `/images/demo/grounds/realistic/${filename}`;

const legacyPosterSports = {
  'bengaluru-football-cup.svg': 'football',
  'weekend-cricket-open.svg': 'cricket',
  'city-hoops-challenge.svg': 'basketball',
  'spike-city-volleyball-cup.svg': 'volleyball',
  'badminton-doubles-open.svg': 'badminton',
};

function getSportForDemoImage(path) {
  const groundMatch = path.match(/\/images\/demo\/grounds\/ground-(badminton|football|cricket|basketball|volleyball|multisport)\.svg$/);
  if (groundMatch) return groundMatch[1];

  const realisticMatch = path.match(/\/images\/demo\/grounds\/realistic\/(ground-(?:badminton|football|cricket|basketball|volleyball|multisport)(?:-[^/]+)?\.(?:jpg|webp)|court-indoor-multisport\.webp)$/);
  if (realisticMatch) {
    const filename = realisticMatch[1];
    if (filename.startsWith('court-indoor-multisport')) return 'multisport';
    return filename.match(/^ground-(badminton|football|cricket|basketball|volleyball|multisport)/)?.[1];
  }

  const posterMatch = path.match(/\/images\/demo\/tournament-posters\/([^/]+)$/);
  return posterMatch ? legacyPosterSports[posterMatch[1]] : undefined;
}

function hashSeed(seed) {
  let hash = 0;
  for (const character of String(seed || '')) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

export function resolveDemoImageUrl(imageUrl, seed) {
  if (typeof imageUrl !== 'string' || !imageUrl) return imageUrl;

  const path = imageUrl.split(/[?#]/, 1)[0];
  const sport = getSportForDemoImage(path);
  const variants = sport && groundImagesBySport[sport];
  if (variants?.length) return groundImagePath(variants[hashSeed(seed) % variants.length]);

  return imageUrl;
}
