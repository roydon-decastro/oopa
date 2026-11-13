export const PROPERTY_TYPES = [
  ["condo", "Condo"], ["apartment", "Apartment"], ["house", "House"], ["townhouse", "Townhouse"],
  ["room", "Room"], ["bedspace", "Bedspace / dorm"], ["commercial", "Commercial"],
] as const;

export const FURNISHING = [["unfurnished", "Unfurnished"], ["semi", "Semi-furnished"], ["fully", "Fully furnished"]] as const;

export const AMENITIES = [
  "Air conditioning", "Wi-Fi ready", "Parking", "Swimming pool", "Gym", "24/7 security",
  "Elevator", "Balcony", "Laundry area", "Water heater", "CCTV", "Near public transport",
];

export const PROVINCES = [
  "Metro Manila", "Cebu", "Davao del Sur", "Cavite", "Laguna", "Rizal", "Bulacan", "Pampanga",
  "Batangas", "Benguet", "Iloilo", "Negros Occidental", "Misamis Oriental", "Pangasinan", "Other",
];

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", active: "Published", rented: "Rented", archived: "Archived",
};
