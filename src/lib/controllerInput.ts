export type LogicalDirection = 'left' | 'right' | 'up' | 'down';

export type GamepadButtonState = {
  buttons: boolean[];
  pressed: (index: number) => boolean;
};

export type GamepadDirections = Record<LogicalDirection, boolean>;

/** Return the first currently connected controller, without assuming a specific brand or layout. */
export function getConnectedGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null;
  try {
    const pads = navigator.getGamepads();
    return Array.from(pads).find((pad) => pad?.connected) ?? null;
  } catch {
    // Some browsers restrict Gamepad API access until user interaction.
    return null;
  }
}

/** Convert analog and digital button input into stable edge events and logical directions. */
export function readGamepadButtons(pad: Gamepad, previous: boolean[]): GamepadButtonState {
  const buttons = pad.buttons.map((button) => button.pressed || button.value > 0.65);
  return {
    buttons,
    pressed: (index: number) => Boolean(buttons[index] && !previous[index]),
  };
}

export function readGamepadDirections(
  pad: Gamepad,
  pressed: (index: number) => boolean,
): GamepadDirections {
  const horizontal = pad.axes[0] ?? 0;
  const vertical = pad.axes[1] ?? 0;
  return {
    left: pressed(14) || horizontal < -0.45,
    right: pressed(15) || horizontal > 0.45,
    up: pressed(12) || vertical < -0.45,
    down: pressed(13) || vertical > 0.45,
  };
}
