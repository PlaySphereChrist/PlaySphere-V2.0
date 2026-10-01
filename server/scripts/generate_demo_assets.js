'use strict';

const fs = require('fs');
const path = require('path');

const outputDirectory = path.join(__dirname, '../../client/public/images/demo');
const groundThemes = {
  football: {
    label: 'FOOTBALL GROUNDS',
    colors: ['#092e2c', '#16715a', '#b5d76a'],
    scene: '<path d="M0 570h1600v330H0z" fill="#246c50"/><path d="M0 680h1600M0 790h1600M180 570v330m1240-330v330M520 570v330m560-330v330" stroke="#e6f1c8" stroke-opacity=".5" stroke-width="4"/><circle cx="800" cy="735" r="98" fill="none" stroke="#e6f1c8" stroke-opacity=".55" stroke-width="4"/><path d="M500 900v-190h-130v190m730 0v-190h130v190" fill="none" stroke="#e6f1c8" stroke-opacity=".55" stroke-width="4"/>'
  },
  cricket: {
    label: 'CRICKET GROUNDS',
    colors: ['#143b35', '#56864e', '#e2c66a'],
    scene: '<ellipse cx="800" cy="760" rx="690" ry="240" fill="#36764d" stroke="#bbd678" stroke-opacity=".8" stroke-width="5"/><path d="M710 640h180v240H710z" fill="#bca66c"/><path d="M735 650v52m22-52v52m22-52v52m-44 111v52m22-52v52m22-52v52" stroke="#f1e4ba" stroke-width="6"/><circle cx="800" cy="760" r="360" fill="none" stroke="#d8e7b2" stroke-opacity=".35" stroke-width="4"/>'
  },
  basketball: {
    label: 'BASKETBALL COURTS',
    colors: ['#29233d', '#8c4d35', '#f0b65d'],
    scene: '<path d="M0 590h1600v310H0z" fill="#a85f3e"/><path d="M0 745h1600M800 590v310M120 590v310m1360-310v310" stroke="#ffe0a6" stroke-opacity=".72" stroke-width="5"/><circle cx="800" cy="745" r="95" fill="none" stroke="#ffe0a6" stroke-opacity=".72" stroke-width="5"/><path d="M0 630h230v230H0m1600-230h-230v230h230" fill="none" stroke="#ffe0a6" stroke-opacity=".72" stroke-width="5"/><path d="M210 690h70v110h-70m1110-110h70v110h-70" fill="none" stroke="#f5d18f" stroke-width="6"/><path d="M245 705v78m-17-68 34 58m0-58-34 58m1080-58 34 58m0-58-34 58" stroke="#f5d18f" stroke-width="3"/>'
  },
  volleyball: {
    label: 'VOLLEYBALL COURTS',
    colors: ['#202f49', '#28698a', '#75d2cc'],
    scene: '<path d="M0 600h1600v300H0z" fill="#397f91"/><path d="M0 750h1600M190 600v300m1220-300v300M800 600v300" stroke="#d9faf1" stroke-opacity=".7" stroke-width="5"/><path d="M500 600v300m600-300v300" stroke="#d9faf1" stroke-opacity=".4" stroke-width="3"/><path d="M785 600v300m30-300v300" stroke="#effff8" stroke-width="4"/><path d="M790 625h20m-20 20h20m-20 20h20m-20 20h20m-20 20h20m-20 20h20m-20 20h20m-20 20h20m-20 20h20m-20 20h20" stroke="#effff8" stroke-opacity=".75" stroke-width="3"/>'
  },
  badminton: {
    label: 'BADMINTON COURTS',
    colors: ['#172a41', '#2d6374', '#70c2bd'],
    scene: '<path d="M0 600h1600v300H0z" fill="#287177"/><path d="M290 610v280m1020-280v280M290 750h1020M470 610v280m660-280v280" stroke="#e0fff0" stroke-opacity=".78" stroke-width="5"/><path d="M780 610v280m40-280v280" stroke="#f5fff8" stroke-width="4"/><path d="M800 630h20m-20 22h20m-20 22h20m-20 22h20m-20 22h20m-20 22h20m-20 22h20m-20 22h20m-20 22h20" stroke="#f5fff8" stroke-opacity=".75" stroke-width="3"/><path d="M630 675q40-55 80 0m180 120q40-55 80 0" fill="none" stroke="#f8faf4" stroke-width="5"/>'
  },
  multisport: {
    label: 'MULTI-SPORT VENUES',
    colors: ['#282a44', '#62527a', '#e1bd74'],
    scene: '<path d="M0 650h1600v250H0z" fill="#406a5f"/><path d="M200 680h420v190H200zM700 680h300v190H700zM1080 680h320v190h-320z" fill="none" stroke="#dce9ce" stroke-opacity=".65" stroke-width="5"/><path d="M410 680v190m440-190v190m390-190v190M200 775h420m500 0h320" stroke="#dce9ce" stroke-opacity=".4" stroke-width="3"/>'
  }
};

const posters = [
  { file: 'bengaluru-football-cup.svg', title1: 'BENGALURU', title2: 'FOOTBALL CUP', sport: 'FOOTBALL', colors: ['#102d31', '#1e7b61', '#d7ee82'] },
  { file: 'weekend-cricket-open.svg', title1: 'WEEKEND', title2: 'CRICKET OPEN', sport: 'CRICKET', colors: ['#122d2b', '#39754c', '#e3c86b'] },
  { file: 'city-hoops-challenge.svg', title1: 'CITY HOOPS', title2: 'CHALLENGE', sport: 'BASKETBALL', colors: ['#27223a', '#a14f32', '#ffbf61'] },
  { file: 'spike-city-volleyball-cup.svg', title1: 'SPIKE CITY', title2: 'VOLLEYBALL CUP', sport: 'VOLLEYBALL', colors: ['#14263d', '#236a88', '#74ddd2'] },
  { file: 'badminton-doubles-open.svg', title1: 'BADMINTON', title2: 'DOUBLES OPEN', sport: 'BADMINTON', colors: ['#16243d', '#28666d', '#92d0b8'] }
];

function writeGroundSvg(theme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="${theme.label} sample image">
<defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.colors[0]}"/><stop offset=".58" stop-color="${theme.colors[1]}"/><stop offset="1" stop-color="${theme.colors[2]}"/></linearGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#07141c" stop-opacity="0"/><stop offset="1" stop-color="#07141c" stop-opacity=".86"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#sky)"/><circle cx="1250" cy="180" r="110" fill="#fff4cb" fill-opacity=".62"/><path d="M0 450 220 300l210 145 175-185 205 200 235-220 195 180 180-130 180 170v180H0z" fill="#0b2932" fill-opacity=".35"/><path d="M0 520h1600v90H0z" fill="#102e35" fill-opacity=".5"/><path d="M130 520V400h180v120m90 0V355h210v165m275 0V380h245v140m120 0V420h160v100" fill="#102c32" fill-opacity=".55" stroke="#ffffff" stroke-opacity=".12" stroke-width="5"/>
${theme.scene}
<rect width="1600" height="900" fill="url(#shade)"/><path d="M70 75h270" stroke="${theme.colors[2]}" stroke-width="7" stroke-linecap="round"/><text x="70" y="132" fill="#f8f6ea" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="6">PLAYSPHERE · DEMO ART</text><text x="70" y="805" fill="#fff" font-family="Arial,sans-serif" font-size="49" font-weight="700" letter-spacing="3">${theme.label}</text><text x="72" y="850" fill="#fff" fill-opacity=".74" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">SAMPLE VENUE IMAGE</text></svg>`;
}

function writePosterSvg(poster) {
  const [dark, mid, accent] = poster.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" role="img" aria-label="${poster.title1} ${poster.title2} demo poster">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".62" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".7"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
<rect width="900" height="1200" fill="url(#bg)"/><circle cx="660" cy="430" r="380" fill="url(#glow)"/><circle cx="680" cy="420" r="180" fill="none" stroke="${accent}" stroke-opacity=".26" stroke-width="4"/><circle cx="680" cy="420" r="250" fill="none" stroke="${accent}" stroke-opacity=".18" stroke-width="3"/><path d="M0 880 900 540v660H0z" fill="#08151e" fill-opacity=".6"/><path d="M60 75h140" stroke="${accent}" stroke-width="8" stroke-linecap="round"/><text x="60" y="125" fill="#f6f4e9" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5">PLAYSPHERE · SAMPLE EVENT</text><text x="60" y="700" fill="${accent}" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="7">${poster.sport}</text><text x="60" y="790" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="800" letter-spacing="1">${poster.title1}</text><text x="60" y="865" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="800" letter-spacing="1">${poster.title2}</text><path d="M60 915h300" stroke="${accent}" stroke-width="4"/><text x="60" y="970" fill="#fff" fill-opacity=".82" font-family="Arial,sans-serif" font-size="22" letter-spacing="4">REGISTRATION OPEN</text><text x="60" y="1080" fill="#fff" fill-opacity=".55" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">PLACEHOLDER POSTER · DEMO DATA</text></svg>`;
}

fs.mkdirSync(path.join(outputDirectory, 'grounds'), { recursive: true });
fs.mkdirSync(path.join(outputDirectory, 'tournament-posters'), { recursive: true });

for (const [sport, theme] of Object.entries(groundThemes)) {
  fs.writeFileSync(path.join(outputDirectory, 'grounds', `ground-${sport}.svg`), writeGroundSvg(theme));
}

for (const poster of posters) {
  fs.writeFileSync(path.join(outputDirectory, 'tournament-posters', poster.file), writePosterSvg(poster));
}

console.log(`Generated ${Object.keys(groundThemes).length} ground images and ${posters.length} tournament posters.`);
