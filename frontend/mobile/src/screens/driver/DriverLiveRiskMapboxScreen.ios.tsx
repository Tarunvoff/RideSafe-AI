import Constants from 'expo-constants';
import DriverLiveRiskFallbackScreen from './DriverLiveRiskMapboxScreen.web';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

let DriverLiveRiskMapboxScreen = DriverLiveRiskFallbackScreen;

if (!isExpoGo) {
  try {
    DriverLiveRiskMapboxScreen = require('./DriverLiveRiskMapboxScreen.native').default;
  } catch {
    DriverLiveRiskMapboxScreen = DriverLiveRiskFallbackScreen;
  }
}

export default DriverLiveRiskMapboxScreen;
