const path = require('path');
const pkg = require(path.join(__dirname, '..', 'frontend-mobile', 'node_modules', 'expo-speech-recognition'));
console.log("Expo Speech Recognition Exports:", Object.keys(pkg));
