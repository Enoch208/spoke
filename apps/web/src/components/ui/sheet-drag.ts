const dismissShare = 0.3;
const dismissVelocity = 0.5;

export type SheetRelease = {
  distance: number;
  height: number;
  velocity: number;
};

export const dragOffset = (distance: number): number => Math.max(0, distance);

export const shouldDismissSheet = ({ distance, height, velocity }: SheetRelease): boolean =>
  distance > 0 && (distance > height * dismissShare || velocity > dismissVelocity);
