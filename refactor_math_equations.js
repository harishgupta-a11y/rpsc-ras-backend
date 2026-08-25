const fs = require('fs');
const path = require('path');

const backendServerPath = "C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\server.js";
const backendWatcherPath = "C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\backend\\auto_watcher.js";
const mobileQuizPath = "C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\frontend-mobile\\src\\screens\\QuizScreen.js";
const mobileAudioPath = "C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\frontend-mobile\\src\\screens\\QuizAudioScreen.js";
const mobileBookmarksPath = "C:\\Users\\aNKIT\\.gemini\\antigravity\\scratch\\rpsc-ras-app\\frontend-mobile\\src\\screens\\BookmarksScreen.js";

// PNG dimensions parser helper to insert into backend files
const pngParserCode = `
// Helper to extract PNG width and height from base64 string
function getPngDimensions(base64Str) {
    try {
        const matches = base64Str.match(/^data:image\\/png;base64,(.+)$/);
        const data = matches ? matches[1] : base64Str;
        const buffer = Buffer.from(data, 'base64');
        
        // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (buffer.readUInt32BE(0) === 0x89504E47 && buffer.readUInt32BE(4) === 0x0D0A1A0A) {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            return { width, height };
        }
    } catch (e) {
        console.error("Failed to parse PNG dimensions:", e.message);
    }
    return null;
}
`;

// ================= 1. REFACTOR BACKEND SERVER.JS =================
let serverCode = fs.readFileSync(backendServerPath, 'utf8').replace(/\r\n/g, '\n');
if (!serverCode.includes("getPngDimensions")) {
    // Insert png parser helper
    serverCode = pngParserCode + "\n" + serverCode;
    
    // Update convertHtmlToTextWithListNumbering img replacement
    const oldImgRepl = `    processedHtml = processedHtml.replace(/<img\\s+([^>]*?)>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) return "";
        const src = srcMatch[1].replace(/[\\r\\n\\s]+/g, '');
        
        const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
        const dimensions = altMatch ? altMatch[1] : ""; // e.g. "width=12&height=22"
        
        if (dimensions && dimensions.startsWith('width=')) {
            const wMatch = dimensions.match(/width=(\\d+)/);
            const hMatch = dimensions.match(/height=(\\d+)/);
            const height = hMatch ? parseInt(hMatch[1]) : 0;
            
            if (height > 0 && height < 50) {
                // Inline image - keep on the same line, no surrounding newlines
                return \`[IMAGE:\${dimensions}:\${src}]\`;
            } else {
                // Block image - wrap in newlines
                return \`\\n[IMAGE:\${dimensions}:\${src}]\\n\`;
            }
        }
        // Fallback for no dimensions - treat as block image
        return \`\\n[IMAGE:\${src}]\\n\`;
    });`;

    const newImgRepl = `    processedHtml = processedHtml.replace(/<img\\s+([^>]*?)>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) return "";
        const src = srcMatch[1].replace(/[\\r\\n\\s]+/g, '');
        
        const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
        let dimensions = altMatch ? altMatch[1] : ""; // e.g. "width=12&height=22"
        
        // Auto-decode dimensions for base64 PNGs on the fly
        if (!dimensions && src.startsWith('data:image/png;base64,')) {
            const dims = getPngDimensions(src);
            if (dims) {
                dimensions = \`width=\${dims.width}&height=\${dims.height}\`;
            }
        }
        
        if (dimensions && dimensions.startsWith('width=')) {
            const wMatch = dimensions.match(/width=(\\d+)/);
            const hMatch = dimensions.match(/height=(\\d+)/);
            const height = hMatch ? parseInt(hMatch[1]) : 0;
            
            if (height > 0 && height < 60) {
                // Inline / math equation image - keep on same line
                return \`[IMAGE:\${dimensions}:\${src}]\`;
            } else {
                // Block image - wrap in newlines
                return \`\\n[IMAGE:\${dimensions}:\${src}]\\n\`;
            }
        }
        // Fallback for no dimensions
        return \`\\n[IMAGE:\${src}]\\n\`;
    });`;

    if (serverCode.includes(oldImgRepl)) {
        serverCode = serverCode.replace(oldImgRepl, newImgRepl);
        fs.writeFileSync(backendServerPath, serverCode, 'utf8');
        console.log("Successfully refactored backend server.js!");
    } else {
        console.log("oldImgRepl target not found in server.js, trying direct regex replace...");
        // Let's do a direct replacement since whitespace can differ
        const serverSearchStr = `processedHtml = processedHtml.replace(/<img\\s+([^>]*?)>/gi`;
        const serverIdx = serverCode.indexOf(serverSearchStr);
        if (serverIdx !== -1) {
            const serverEndIdx = serverCode.indexOf("});", serverIdx) + 3;
            serverCode = serverCode.substring(0, serverIdx) + newImgRepl + serverCode.substring(serverEndIdx);
            fs.writeFileSync(backendServerPath, serverCode, 'utf8');
            console.log("Successfully refactored backend server.js via index replace!");
        } else {
            console.error("ERROR: Failed to refactor server.js image processing!");
        }
    }
}

// ================= 2. REFACTOR BACKEND AUTO_WATCHER.JS =================
let watcherCode = fs.readFileSync(backendWatcherPath, 'utf8').replace(/\r\n/g, '\n');
if (!watcherCode.includes("getPngDimensions")) {
    watcherCode = pngParserCode + "\n" + watcherCode;
    
    const watcherOldImgRepl = `    processedHtml = processedHtml.replace(/<img\\s+[^>]*src=["'](data:image\\/[^"']+)["'][^>]*>/gi, (match, src) => {
        const cleanSrc = src.replace(/[\\r\\n\\s]+/g, '');
        return \`\\n[IMAGE:\${cleanSrc}]\\n\`;
    });`;

    const watcherNewImgRepl = `    processedHtml = processedHtml.replace(/<img\\s+([^>]*?)>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) return "";
        const src = srcMatch[1].replace(/[\\r\\n\\s]+/g, '');
        
        const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
        let dimensions = altMatch ? altMatch[1] : "";
        
        if (!dimensions && src.startsWith('data:image/png;base64,')) {
            const dims = getPngDimensions(src);
            if (dims) {
                dimensions = \`width=\${dims.width}&height=\${dims.height}\`;
            }
        }
        
        if (dimensions && dimensions.startsWith('width=')) {
            const wMatch = dimensions.match(/width=(\\d+)/);
            const hMatch = dimensions.match(/height=(\\d+)/);
            const height = hMatch ? parseInt(hMatch[1]) : 0;
            
            if (height > 0 && height < 60) {
                return \`[IMAGE:\${dimensions}:\${src}]\`;
            } else {
                return \`\\n[IMAGE:\${dimensions}:\${src}]\\n\`;
            }
        }
        return \`\\n[IMAGE:\${src}]\\n\`;
    });`;

    if (watcherCode.includes(watcherOldImgRepl)) {
        watcherCode = watcherCode.replace(watcherOldImgRepl, watcherNewImgRepl);
        fs.writeFileSync(backendWatcherPath, watcherCode, 'utf8');
        console.log("Successfully refactored backend auto_watcher.js!");
    } else {
        console.log("watcherOldImgRepl target not found in auto_watcher.js, trying direct index search...");
        const watcherSearchStr = `processedHtml = processedHtml.replace(/<img\\s+[^>]*src=["'](data:image`;
        const watcherIdx = watcherCode.indexOf(watcherSearchStr);
        if (watcherIdx !== -1) {
            const watcherEndIdx = watcherCode.indexOf("});", watcherIdx) + 3;
            watcherCode = watcherCode.substring(0, watcherIdx) + watcherNewImgRepl + watcherCode.substring(watcherEndIdx);
            fs.writeFileSync(backendWatcherPath, watcherCode, 'utf8');
            console.log("Successfully refactored backend auto_watcher.js via index replace!");
        } else {
            console.error("ERROR: Failed to refactor auto_watcher.js image processing!");
        }
    }
}

// ================= 3. REFACTOR MOBILE QUIZSCREEN.JS =================
let quizCode = fs.readFileSync(mobileQuizPath, 'utf8').replace(/\r\n/g, '\n');
const quizOldImageRender = `        let imgStyle = {
          width: '100%',
          height: 220,
          resizeMode: 'contain',
          marginVertical: 12,
          borderRadius: 8,
          backgroundColor: isDarkVal ? '#1E293B' : '#F1F5F9',
          borderWidth: 1,
          borderColor: isDarkVal ? '#334155' : '#CBD5E1',
          alignSelf: 'center'
        };

        if (width && height) {
          const maxWidth = 340;
          let finalWidth = width;
          let finalHeight = height;
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            finalWidth = maxWidth;
            finalHeight = height * ratio;
          }
          imgStyle = {
            width: finalWidth,
            height: finalHeight,
            resizeMode: 'contain',
            marginVertical: 12,
            borderRadius: 8,
            backgroundColor: isDarkVal ? '#1E293B' : '#F1F5F9',
            borderWidth: 1,
            borderColor: isDarkVal ? '#334155' : '#CBD5E1',
            alignSelf: 'center'
          };
        }`;

const quizNewImageRender = `        const isMath = (height && height < 60) || src.startsWith('data:image/');
        let imgStyle = {
          width: '100%',
          height: 220,
          resizeMode: 'contain',
          marginVertical: 12,
          borderRadius: isMath ? 0 : 8,
          backgroundColor: isMath ? 'transparent' : (isDarkVal ? '#1E293B' : '#F1F5F9'),
          borderWidth: isMath ? 0 : 1,
          borderColor: isDarkVal ? '#334155' : '#CBD5E1',
          alignSelf: 'center',
          ...(isMath && isDarkVal && { tintColor: '#F8FAFC' })
        };

        if (width && height) {
          const maxWidth = 340;
          let finalWidth = width;
          let finalHeight = height;
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            finalWidth = maxWidth;
            finalHeight = height * ratio;
          }
          imgStyle = {
            width: finalWidth,
            height: finalHeight,
            resizeMode: 'contain',
            marginVertical: 12,
            borderRadius: isMath ? 0 : 8,
            backgroundColor: isMath ? 'transparent' : (isDarkVal ? '#1E293B' : '#F1F5F9'),
            borderWidth: isMath ? 0 : 1,
            borderColor: isDarkVal ? '#334155' : '#CBD5E1',
            alignSelf: 'center',
            ...(isMath && isDarkVal && { tintColor: '#F8FAFC' })
          };
        }`;

if (quizCode.includes(quizOldImageRender)) {
    quizCode = quizCode.replace(quizOldImageRender, quizNewImageRender);
    fs.writeFileSync(mobileQuizPath, quizCode, 'utf8');
    console.log("Successfully refactored image rendering in QuizScreen.js!");
} else {
    console.error("ERROR: Old image render style not found in QuizScreen.js!");
}

// ================= 4. REFACTOR MOBILE QUIZAUDIOSCREEN.JS =================
let audioCode = fs.readFileSync(mobileAudioPath, 'utf8').replace(/\r\n/g, '\n');
if (audioCode.includes(quizOldImageRender)) {
    audioCode = audioCode.replace(quizOldImageRender, quizNewImageRender);
    fs.writeFileSync(mobileAudioPath, audioCode, 'utf8');
    console.log("Successfully refactored image rendering in QuizAudioScreen.js!");
} else {
    console.error("ERROR: Old image render style not found in QuizAudioScreen.js!");
}

// ================= 5. REFACTOR MOBILE BOOKMARKSSCREEN.JS =================
let bookmarksCode = fs.readFileSync(mobileBookmarksPath, 'utf8').replace(/\r\n/g, '\n');

// Update imports in BookmarksScreen.js to include Image and useWindowDimensions
const oldImports = "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, FlatList, LayoutAnimation } from 'react-native';";
const newImports = "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, FlatList, LayoutAnimation, Image, useWindowDimensions } from 'react-native';";

if (bookmarksCode.includes(oldImports)) {
    bookmarksCode = bookmarksCode.replace(oldImports, newImports);
    console.log("BookmarksScreen imports updated.");
}

// Inject renderContentText function into BookmarksScreen.js (just above renderBookmarkItem)
const renderBookmarkItemTarget = "  const renderBookmarkItem = ({ item }) => {";
const renderContentTextFunction = `  const { width: screenWidth } = useWindowDimensions();

  const renderContentText = (text, isDarkVal, baseStyle = {}) => {
    if (!text) return null;
    
    // Clean up stray double-asterisk issues (e.g. "Introduction**:")
    const regexHeading = /(?<!\\*)\\b(Introduction|Body|Conclusion|Note|Key Points|Background)\\*\\*:/gi;
    const regexHeadingHindi = /(?<!\\*)(भूमिका|प्रस्तावना|मुख्य भाग|निष्कर्ष|नोट|मुख्य बिंदु|पृष्ठभूमि)\\*\\*:/g;
    
    let processedText = text
      .replace(regexHeading, (match, p1) => \`**\${p1}**:\`)
      .replace(regexHeadingHindi, (match, p1) => \`**\${p1}**:\`);
    
    const parts = processedText.split(/(\\[IMAGE:[\\s\\S]*?\\])/);
    
    return parts.map((part, idx) => {
      if (part.startsWith('[IMAGE:') && part.endsWith(']')) {
        const content = part.substring(7, part.length - 1);
        let src = content;
        let width = null;
        let height = null;
        if (content.includes(':http') || content.includes(':data:')) {
          const colonIdx = content.indexOf(':');
          const dims = content.substring(0, colonIdx);
          src = content.substring(colonIdx + 1);
          const wMatch = dims.match(/width=(\\d+)/);
          const hMatch = dims.match(/height=(\\d+)/);
          if (wMatch) width = parseInt(wMatch[1], 10);
          if (hMatch) height = parseInt(hMatch[1], 10);
        }
        
        const isMath = (height && height < 60) || src.startsWith('data:image/');
        let imgStyle = {
          width: '100%',
          height: 220,
          resizeMode: 'contain',
          marginVertical: 12,
          borderRadius: isMath ? 0 : 8,
          backgroundColor: isMath ? 'transparent' : (isDarkVal ? '#1E293B' : '#F1F5F9'),
          borderWidth: isMath ? 0 : 1,
          borderColor: isDarkVal ? '#334155' : '#CBD5E1',
          alignSelf: 'center',
          ...(isMath && isDarkVal && { tintColor: '#F8FAFC' })
        };

        if (width && height) {
          const maxWidth = screenWidth - 64; // responsive margin sizing
          let finalWidth = width;
          let finalHeight = height;
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            finalWidth = maxWidth;
            finalHeight = height * ratio;
          }
          imgStyle = {
            width: finalWidth,
            height: finalHeight,
            resizeMode: 'contain',
            marginVertical: 12,
            borderRadius: isMath ? 0 : 8,
            backgroundColor: isMath ? 'transparent' : (isDarkVal ? '#1E293B' : '#F1F5F9'),
            borderWidth: isMath ? 0 : 1,
            borderColor: isDarkVal ? '#334155' : '#CBD5E1',
            alignSelf: 'center',
            ...(isMath && isDarkVal && { tintColor: '#F8FAFC' })
          };
        }

        return (
          <Image 
            key={idx}
            source={{ uri: src }}
            style={imgStyle}
          />
        );
      }
      
      const renderTextWithBold = (subText) => {
        const boldParts = subText.split(/(\\*\\*[\\s\\S]*?\\*\\*)/g);
        return boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith('**') && bPart.endsWith('**')) {
            return (
              <Text key={bIdx} style={{ fontWeight: 'bold' }}>
                {bPart.slice(2, -2)}
              </Text>
            );
          }
          return bPart;
        });
      };

      const lines = part.split('\\n');
      const renderedElements = [];
      let currentTableRows = [];
      let keyCounter = 0;

      const renderTable = (rows, tableKey) => {
        return (
          <View key={tableKey} style={{ marginVertical: 10, borderWidth: 1, borderColor: isDarkVal ? '#334155' : '#E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
            {rows.map((row, rIdx) => {
              const cols = row.split('|');
              const isHeader = rIdx === 0;
              return (
                <View 
                  key={rIdx} 
                  style={{ 
                    flexDirection: 'row', 
                    borderBottomWidth: rIdx === rows.length - 1 ? 0 : 1, 
                    borderBottomColor: isDarkVal ? '#334155' : '#E2E8F0',
                    backgroundColor: isHeader ? (isDarkVal ? '#1E293B' : '#F1F5F9') : 'transparent',
                    paddingVertical: 8,
                    paddingHorizontal: 6
                  }}
                >
                  {cols.map((col, cIdx) => {
                    return (
                      <Text 
                        key={cIdx} 
                        style={{ 
                          flex: 1, 
                          fontWeight: isHeader ? 'bold' : 'normal',
                          color: isDarkVal ? '#F1F5F9' : '#0F172A',
                          paddingRight: 6
                        }}
                      >
                        {renderTextWithBold(col)}
                      </Text>
                    );
                  })}
                </View>
              );
            })}
          </View>
        );
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('|') && line.endsWith('|')) {
          currentTableRows.push(line.slice(1, -1));
        } else {
          if (currentTableRows.length > 0) {
            renderedElements.push(renderTable(currentTableRows, \`table-\${i}-\${keyCounter++}\`));
            currentTableRows = [];
          }
          
          if (line !== '') {
            renderedElements.push(
              <Text 
                key={\`line-\${i}-\${keyCounter++}\`} 
                style={[
                  baseStyle,
                  isDarkVal && { color: '#F8FAFC' },
                  !isDarkVal && { color: '#0F172A' },
                  { marginVertical: 4 }
                ]}
              >
                {renderTextWithBold(line)}
              </Text>
            );
          } else if (line === '') {
            const lastIsSpacer = renderedElements.length > 0 && renderedElements[renderedElements.length - 1].key && renderedElements[renderedElements.length - 1].key.startsWith('space-');
            if (!lastIsSpacer) {
              renderedElements.push(
                <View key={\`space-\${i}-\${keyCounter++}\`} style={{ height: 8 }} />
              );
            }
          }
        }
      }
      
      if (currentTableRows.length > 0) {
        renderedElements.push(renderTable(currentTableRows, \`table-end-\${keyCounter++}\`));
      }
      
      return renderedElements;
    });
  };

`;

if (bookmarksCode.includes(renderBookmarkItemTarget) && !bookmarksCode.includes("renderContentText")) {
    bookmarksCode = bookmarksCode.replace(renderBookmarkItemTarget, renderContentTextFunction + renderBookmarkItemTarget);
    console.log("Injected renderContentText function in BookmarksScreen.js.");
}

// Update the rendering of question text, explanation, and model answer in BookmarksScreen
const oldQText = `<Text \n              style={[styles.questionText, isDark ? styles.textDark : styles.textLight]}\n              numberOfLines={isExpanded ? undefined : 2}\n            >\n              {qDetails.question_text}\n            </Text>`;

// Let's do a direct replace for text render blocks to support renderContentText
bookmarksCode = bookmarksCode.replace(
    /style=\{\[styles\.questionText, isDark \? styles\.textDark : styles\.textLight\]\}\s*numberOfLines=\{isExpanded \? undefined : 2\}\s*>\s*\{qDetails\.question_text\}\s*<\/Text>/,
    `style={[styles.questionText, isDark ? styles.textDark : styles.textLight]} numberOfLines={isExpanded ? undefined : 2}>
              {isExpanded ? renderContentText(qDetails.question_text, isDark, styles.questionText) : qDetails.question_text}
            </Text>`
);

bookmarksCode = bookmarksCode.replace(
    /\{qDetails\.detailed_explanation\}\s*<\/Text>/,
    `{renderContentText(qDetails.detailed_explanation, isDark, styles.explanationBodyText)}
                </Text>`
);

bookmarksCode = bookmarksCode.replace(
    /\{qDetails\.model_answer\}\s*<\/Text>/,
    `{renderContentText(qDetails.model_answer, isDark, styles.explanationBodyText)}
                </Text>`
);

fs.writeFileSync(mobileBookmarksPath, bookmarksCode, 'utf8');
console.log("Successfully refactored BookmarksScreen.js!");
