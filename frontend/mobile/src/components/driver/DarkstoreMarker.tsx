import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type DarkstoreMarkerProps = {
  size?: number;
};

export default function DarkstoreMarker({ size = 34 }: DarkstoreMarkerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="29" fill="#ffffff" stroke="#111827" strokeWidth="4" />
      <Path
        d="M18 27L21 18H43L46 27V30H18V27Z"
        fill="#f97316"
        stroke="#111827"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <Rect x="20" y="30" width="24" height="16" rx="2.5" fill="#fff7ed" stroke="#111827" strokeWidth="2.4" />
      <Rect x="23" y="34" width="7" height="12" rx="1.6" fill="#fef3c7" stroke="#111827" strokeWidth="2" />
      <Rect x="33" y="34" width="8" height="5" rx="1.3" fill="#bfdbfe" stroke="#111827" strokeWidth="2" />
    </Svg>
  );
}
