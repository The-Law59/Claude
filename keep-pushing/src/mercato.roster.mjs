// Pilotes hors grille F1 proposés dans le Mercato : grille F2 2026 et
// pilotes de réserve des écuries (sources : site officiel F2, listes de
// réservistes de début de saison, novembre 2026). Un admin peut en masquer
// ou en ajouter depuis l'écran Mercato ; un pilote déjà en F1 n'est pas doublé.
// note : écurie F2, ou écurie F1 pour un réserviste ; short : nom court
// quand ce n'est pas le dernier mot (« Zhou », « van Hoepen »…).
export const PROSPECTS = [
  // F2 2026
  { name: "Rafael Câmara", category: "f2", note: "Invicta Racing" },
  { name: "Joshua Dürksen", category: "f2", note: "Invicta Racing" },
  { name: "Ritomo Miyata", category: "f2", note: "Hitech" },
  { name: "Colton Herta", category: "f2", note: "Hitech" },
  { name: "Noel León", category: "f2", note: "Campos Racing" },
  { name: "Nikola Tsolov", category: "f2", note: "Campos Racing" },
  { name: "Dino Beganovic", category: "f2", note: "DAMS" },
  { name: "Roman Bilinski", category: "f2", note: "DAMS" },
  { name: "Gabriele Minì", category: "f2", note: "MP Motorsport" },
  { name: "Oliver Goethe", category: "f2", note: "MP Motorsport" },
  { name: "Sebastián Montoya", category: "f2", note: "PREMA Racing" },
  { name: "Mari Boya", category: "f2", note: "PREMA Racing" },
  { name: "Martinius Stenshorne", category: "f2", note: "Rodin Motorsport" },
  { name: "Alexander Dunne", category: "f2", note: "Rodin Motorsport" },
  { name: "Kush Maini", category: "f2", note: "ART Grand Prix" },
  { name: "Tasanapol Inthraphuvasak", category: "f2", note: "ART Grand Prix" },
  { name: "Emerson Fittipaldi Jr.", short: "Fittipaldi Jr.", category: "f2", note: "AIX Racing" },
  { name: "Cian Shields", category: "f2", note: "AIX Racing" },
  { name: "Laurens van Hoepen", short: "van Hoepen", category: "f2", note: "Trident" },
  { name: "John Bennett", category: "f2", note: "Trident" },
  { name: "Rafael Villagómez", category: "f2", note: "Van Amersfoort Racing" },
  // Réserve 2026
  { name: "Leonardo Fornaroli", category: "reserve", note: "McLaren" },
  { name: "Pato O'Ward", category: "reserve", note: "McLaren" },
  { name: "Frederik Vesti", category: "reserve", note: "Mercedes" },
  { name: "Yuki Tsunoda", category: "reserve", note: "Red Bull" },
  { name: "Ayumu Iwasa", category: "reserve", note: "Racing Bulls" },
  { name: "Antonio Giovinazzi", category: "reserve", note: "Ferrari" },
  { name: "Luke Browning", category: "reserve", note: "Williams" },
  { name: "Jak Crawford", category: "reserve", note: "Aston Martin" },
  { name: "Stoffel Vandoorne", category: "reserve", note: "Aston Martin" },
  { name: "Jack Doohan", category: "reserve", note: "Haas" },
  { name: "Paul Aron", category: "reserve", note: "Alpine" },
  { name: "Zhou Guanyu", short: "Zhou", category: "reserve", note: "Cadillac" },
];
