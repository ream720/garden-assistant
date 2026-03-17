interface PlantLike {
  name: string;
  variety?: string | null;
}

export const formatPlantDisplayName = (plant: PlantLike): string => {
  const variety = plant.variety?.trim();
  return variety ? `${plant.name} (${variety})` : plant.name;
};

export const formatPlantVariety = (
  variety: string | null | undefined,
  fallback = 'Not set'
): string => {
  const trimmed = variety?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};
