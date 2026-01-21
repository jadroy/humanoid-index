export interface MediaItem {
  type: 'image' | 'video';
  url: string; // For images: path to file, For videos: YouTube video ID
  caption?: string;
  thumbnail?: string; // For videos, preview image
}

export interface Humanoid {
  id: string;
  name: string;
  manufacturer: string;
  year?: number;
  cost?: string; // Cost in a displayable format (e.g., "$50K", "$150K", "N/A")
  status?: "In Production" | "Prototype" | "Concept" | "Discontinued";
  height?: number; // in cm
  weight?: number; // in kg
  dof?: number; // degrees of freedom
  maxSpeed?: number; // m/s
  description?: string;
  imageUrl?: string; // Primary/cover image
  logoUrl?: string; // Company logo
  media?: MediaItem[]; // Additional images and videos
  purchaseUrl?: string; // Link to buy/learn more about the robot
}

export const humanoids: Humanoid[] = [
  {
    id: "1",
    name: "Optimus Gen 2",
    manufacturer: "Tesla",
    imageUrl: "/robots/optimus.png",
    logoUrl: "/robots/Tesla-logo.png",
    year: 2024,
    cost: "N/A",
    status: "Prototype",
    height: 173,
    weight: 56,
    dof: 28,
    maxSpeed: 2.5,
    description: "Tesla's second-generation humanoid robot featuring improved hands with 22 degrees of freedom and enhanced balance capabilities.",
    media: [
      { type: 'image', url: '/robots/optimus-torso.png', caption: 'Torso detail' },
      { type: 'image', url: '/robots/optimus-upper-half.png', caption: 'Upper body' },
      { type: 'image', url: '/robots/optimus-legs.png', caption: 'Legs detail' },
      { type: 'image', url: '/robots/optimus-feet.png', caption: 'Feet mechanism' },
      { type: 'image', url: '/robots/optimus-head-front.png', caption: 'Head front view' },
      { type: 'image', url: '/robots/optimus-head-side.png', caption: 'Head side view' },
    ],
  },
  {
    id: "2",
    name: "Electric Atlas",
    manufacturer: "Boston Dynamics",
    imageUrl: "/robots/atlas.png",
    year: 2024,
    cost: "N/A",
    status: "Prototype",
    height: 150,
    weight: 89,
    dof: 28,
    maxSpeed: 2.5,
    description: "Boston Dynamics' fully electric humanoid robot, succeeding the hydraulic Atlas. Built for real-world industrial applications.",
    media: [
      { type: 'image', url: '/robots/atlas.png', caption: 'Full body view' },
      { type: 'image', url: '/robots/placeholder.png', caption: 'Industrial setting' },
    ],
  },
  {
    id: "3",
    name: "Memo",
    manufacturer: "Sunday Robotics",
    imageUrl: "/robots/memo.png",
    year: 2025,
    cost: "$50K",
    status: "Prototype",
    height: 122, // ~4 feet typical working height (can extend to 7 feet)
    description: "Domestic robot designed for household chores like loading dishwashers, making espresso, and folding laundry. Features wheeled base with adjustable height, dexterous dual-arm system, and AI trained on data from over 500 homes. Founded Family Beta program launching late 2026.",
  },
  {
    id: "4",
    name: "Neo",
    manufacturer: "1X Technologies",
    imageUrl: "/robots/neo.png",
    year: 2024,
    cost: "N/A",
    status: "Prototype",
    height: 165,
    weight: 30,
    maxSpeed: 4.0,
    description: "Lightweight bipedal humanoid designed for safe human interaction and home assistance applications.",
    purchaseUrl: "https://www.1x.tech/order",
  },
  {
    id: "5",
    name: "Digit",
    manufacturer: "Agility Robotics",
    imageUrl: "/robots/digit.png",
    year: 2023,
    cost: "$250K",
    status: "In Production",
    height: 175,
    weight: 65,
    dof: 30,
    maxSpeed: 1.5,
    description: "A production-ready humanoid designed for logistics and warehouse automation. Currently deployed in Amazon facilities.",
  },
  {
    id: "7",
    name: "Figure 02",
    manufacturer: "Figure AI",
    imageUrl: "/robots/figure.png",
    year: 2024,
    cost: "N/A",
    status: "Prototype",
    height: 167,
    weight: 70,
    dof: 40,
    description: "Second-generation humanoid from Figure AI with advanced AI integration and dexterous manipulation capabilities.",
  },
  {
    id: "8",
    name: "Phoenix",
    manufacturer: "Sanctuary AI",
    imageUrl: "/robots/placeholder.png",
    year: 2024,
    cost: "N/A",
    status: "Prototype",
    height: 170,
    weight: 70,
    dof: 20,
    description: "General-purpose humanoid powered by Carbon, Sanctuary AI's proprietary AI system for human-like cognition.",
  },
  {
    id: "9",
    name: "Walker X",
    manufacturer: "Ubtech",
    imageUrl: "/robots/placeholder.png",
    year: 2023,
    cost: "$150K",
    status: "In Production",
    height: 145,
    weight: 63,
    dof: 41,
    maxSpeed: 3.0,
  },
  {
    id: "10",
    name: "Apollo",
    manufacturer: "Apptronik",
    imageUrl: "/robots/placeholder.png",
    year: 2024,
    cost: "N/A",
    status: "Prototype",
    height: 173,
    weight: 73,
    dof: 34,
    description: "Modular humanoid platform designed for manufacturing and logistics with swappable battery packs.",
  },
  {
    id: "11",
    name: "G1",
    manufacturer: "Unitree",
    imageUrl: "/robots/g1.png",
    year: 2024,
    cost: "$16K",
    status: "In Production",
    height: 127,
    weight: 35,
    dof: 23,
    maxSpeed: 2.0,
    description: "Compact and affordable humanoid robot with advanced mobility and AI capabilities. Designed for research and early commercial applications.",
    purchaseUrl: "https://shop.unitree.com/",
    media: [
      { type: 'image', url: '/robots/g1.png', caption: 'Front view' },
      { type: 'image', url: '/robots/unitree-g1-humanoid-robot-2_43d63809-5fd6-4fbe-9f3c-31659aa50814_1200x1200 (1).webp', caption: 'Detailed view' },
    ],
  },
];
