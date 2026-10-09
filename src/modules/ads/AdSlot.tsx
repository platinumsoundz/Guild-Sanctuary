export type AdSlotPlacement = 'feed-inline' | 'feed-sidebar' | 'shorts';

interface AdSlotProps {
  placement: AdSlotPlacement;
}

export function AdSlot({ placement }: AdSlotProps) {
  return (
    <aside
      hidden
      aria-hidden="true"
      data-ad-slot={placement}
      id={`ad-slot-${placement}`}
    />
  );
}
