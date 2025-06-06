import React from 'react';
import { DotsIcon } from '~/components/svg';

enum ECallState {
  Thinking = 'thinking',
  Idle = 'idle',
}

// Simple circle component since CircleIcon doesn't exist
const CircleIcon = ({ state, size }: { state: ECallState; size: string }) => (
  <div
    className="rounded-full border-2 border-gray-400"
    style={{ width: `${size}px`, height: `${size}px` }}
  />
);

interface CircleRenderProps {
  rmsLevel: number;
  isCameraOn: boolean;
  state: ECallState;
}

const CircleRender: React.FC<CircleRenderProps> = ({ rmsLevel, isCameraOn, state }) => {
  const getIconComponent = (state) => {
    switch (state) {
      case ECallState.Thinking:
        return <DotsIcon />;
      default:
        return (
          <div className="smooth-transition" style={{ transform: `scale(${transformScale})` }}>
            <CircleIcon state={state} size="256" />
          </div>
        );
    }
  };

  const baseScale = isCameraOn ? 0.5 : 1;
  const scaleMultiplier =
    rmsLevel > 0.08
      ? 1.8
      : rmsLevel > 0.07
        ? 1.6
        : rmsLevel > 0.05
          ? 1.4
          : rmsLevel > 0.01
            ? 1.2
            : 1;

  const transformScale = baseScale * scaleMultiplier;

  return getIconComponent(state);
};

export default CircleRender;
