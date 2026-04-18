import React from 'react';
import Svg, { 
  Path, 
  Defs, 
  LinearGradient, 
  Stop, 
  Pattern, 
  Rect, 
  Ellipse, 
  Filter, 
  FeGaussianBlur 
} from 'react-native-svg';

export const ScooterMarker = ({ size = 60 }: { size?: number }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 2048 2048" fill="none">
      <Defs>
        <LinearGradient id="bodyShade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#212732"/>
          <Stop offset="46%" stopColor="#11151b"/>
          <Stop offset="100%" stopColor="#232a36"/>
        </LinearGradient>
        <Pattern id="cargoLidPattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Rect width="12" height="12" fill="#f6c926"/>
          <Path d="M 0 0 L 0 12" stroke="#c79a0f" strokeWidth="2" opacity="0.45"/>
        </Pattern>
        <Pattern id="seatTexture" width="8" height="8" patternUnits="userSpaceOnUse">
          <Rect width="8" height="8" fill="#12161d"/>
          <Path d="M0 0 L8 8 M8 0 L0 8" stroke="#2a313d" strokeWidth="0.8" opacity="0.55"/>
        </Pattern>
        <Filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation="4.5" />
        </Filter>
      </Defs>
      
      {/* Shadow */}
      <Ellipse cx="1024.00" cy="1120.00" rx="216.00" ry="768.00" fill="#000" opacity={0.19} />
      
      {/* Bike Body */}
      <Path d="M 923.20 13.60 L 1124.80 13.60 L 1124.80 306.40 L 923.20 306.40 Z" fill="#0b0d11" stroke="#2f3744" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 918.40 1804.00 L 1129.60 1804.00 L 1129.60 2116.00 L 918.40 2116.00 Z" fill="#0b0d11" stroke="#2f3744" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 844.00 400.00 L 1204.00 400.00 L 1204.00 1744.00 L 844.00 1744.00 Z" fill="url(#bodyShade)" stroke="#0e1116" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 874.00 772.00 L 1174.00 772.00 L 1174.00 1612.00 L 874.00 1612.00 Z" fill="#1a1e24" stroke="#2b3340" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 889.60 398.80 L 1158.40 398.80 L 1158.40 794.80 L 889.60 794.80 Z" fill="#222833" stroke="#2a3240" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 916.00 239.20 L 1132.00 239.20 L 1132.00 407.20 L 916.00 407.20 Z" fill="#2a313d" stroke="#4a5566" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      
      {/* Front Seat / Cargo */}
      <Path d="M 851.20 1556.80 L 1196.80 1556.80 L 1196.80 1691.20 L 851.20 1691.20 Z" fill="#242b37" stroke="#3f4a5c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      
      {/* Lights / Details */}
      <Path d="M 808.00 404.80 L 1240.00 404.80 L 1240.00 462.40 L 808.00 462.40 Z" fill="#242a35" stroke="#3f4958" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 656.80 414.40 L 757.60 414.40 L 757.60 462.40 L 656.80 462.40 Z" fill="#11151b" stroke="#343d4c" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 1290.40 414.40 L 1391.20 414.40 L 1391.20 462.40 L 1290.40 462.40 Z" fill="#11151b" stroke="#343d4c" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      
      {/* Handlebars */}
      <Path d="M 676.10 302.56 L 702.62 313.78 L 661.50 411.04 L 634.98 399.82 Z" fill="#2f3845" stroke="#4b576a" strokeWidth={1.5} />
      <Path d="M 1345.38 313.78 L 1371.90 302.56 L 1413.02 399.82 L 1386.50 411.04 Z" fill="#2f3845" stroke="#4b576a" strokeWidth={1.5} />
      <Ellipse cx="616.00" cy="275.20" rx="62.40" ry="48.00" fill="#1a202a" stroke="#627086" strokeWidth={2} />
      <Ellipse cx="1432.00" cy="275.20" rx="62.40" ry="48.00" fill="#1a202a" stroke="#627086" strokeWidth={2} />
      
      {/* Seat */}
      <Path d="M 920.80 1100.80 L 1127.20 1100.80 L 1127.20 1571.20 L 920.80 1571.20 Z" fill="url(#seatTexture)" stroke="#2f3948" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      
      {/* Headlight Area */}
      <Ellipse cx="1024.00" cy="740.80" rx="124.80" ry="120.00" fill="#131920" stroke="#4a5667" strokeWidth="2.5" />
      <Path d="M 973.60 714.40 L 1074.40 714.40 L 1074.40 738.40 L 973.60 738.40 Z" fill="#2f3a4b" opacity={0.8} strokeLinejoin="round" strokeLinecap="round" />
      
      {/* Mid Section */}
      <Path d="M 889.60 762.40 L 1158.40 762.40 L 1158.40 1160.80 L 889.60 1160.80 Z" fill="#121820" stroke="#3d4656" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      
      {/* Yellow Accents */}
      <Path d="M 990.40 781.60 L 1057.60 781.60 L 1057.60 1141.60 L 990.40 1141.60 Z" fill="#f4c015" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 956.45 799.05 L 1004.10 804.79 L 966.75 1114.55 L 919.10 1108.81 Z" fill="#f4c015" />
      <Path d="M 1043.90 804.79 L 1091.55 799.05 L 1128.90 1108.81 L 1081.25 1114.55 Z" fill="#f4c015" />
      
      {/* Cargo Box (Yellow) */}
      <Path d="M 808.00 1528.00 L 1240.00 1528.00 L 1240.00 1940.80 L 808.00 1940.80 Z" fill="#d9a700" stroke="#8f6e09" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 800.80 1609.60 L 1247.20 1609.60 L 1247.20 1811.20 L 800.80 1811.20 Z" fill="url(#cargoLidPattern)" stroke="#9d790b" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M 983.20 1792.00 L 1064.80 1792.00 L 1064.80 1830.40 L 983.20 1830.40 Z" fill="#2d343f" stroke="#596679" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
};

export default ScooterMarker;
