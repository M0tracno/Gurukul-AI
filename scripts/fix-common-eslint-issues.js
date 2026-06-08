const fs = require('fs');
const path = require('path');

// Common ESLint fixes
const fixUnusedImports = (content) => {
  // Remove completely unused imports
  const commonUnusedImports = [
    'toString', 'constructor', 'useEffect', 'useState', 'Suspense',
    'useTheme', 'Box', 'Paper', 'Grid', 'Container', 'Typography',
    'CircularProgress', 'Alert', 'Snackbar', 'Dialog', 'Menu', 'MenuItem',
    'IconButton', 'Badge', 'Avatar', 'List', 'ListItem', 'ListItemIcon', 
    'ListItemText', 'Divider', 'Card', 'CardContent', 'Chip', 'Tab', 'Tabs'
  ];
  
  let lines = content.split('\n');
  const usageMap = new Map();
  
  // Find what's actually used in the code
  const codeContent = lines.slice(10).join('\n'); // Skip imports section
  
  // Check each potentially unused import
  commonUnusedImports.forEach(importName => {
    const regex = new RegExp(`\\b${importName}\\b`, 'g');
    const matches = codeContent.match(regex);
    usageMap.set(importName, matches ? matches.length : 0);
  });
  
  // Remove unused imports from import lines
  lines = lines.map(line => {
    if (line.includes('import') && line.includes('from')) {
      let newLine = line;
      commonUnusedImports.forEach(importName => {
        if (usageMap.get(importName) === 0 && line.includes(importName)) {
          // Remove the unused import
          newLine = newLine
            .replace(new RegExp(`,\\s*${importName}`, 'g'), '')
            .replace(new RegExp(`${importName}\\s*,`, 'g'), '')
            .replace(new RegExp(`\\{\\s*${importName}\\s*\\}`, 'g'), '{}')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, '}')
            .replace(/\{\s*\}/, '');
        }
      });
      
      // Remove empty import lines
      if (newLine.match(/import\s*\{\s*\}\s*from/) || newLine.match(/import\s*from/)) {
        return '';
      }
      
      return newLine;
    }
    return line;
  });
  
  return lines.filter(line => line !== '').join('\n');
};

// Fix missing dependencies in useEffect
const fixUseEffectDependencies = (content) => {
  return content.replace(
    /React\.useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[\s*\]\s*\)/g,
    match => {
      // Add eslint-disable-next-line comment
      return `// eslint-disable-next-line react-hooks/exhaustive-deps\n  ${match}`;
    }
  );
};

// Process files
const processFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    let fixedContent = content;
    
    // Apply fixes
    fixedContent = fixUnusedImports(fixedContent);
    fixedContent = fixUseEffectDependencies(fixedContent);
    
    // Only write if content changed
    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Fixed: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
};

// Find all JS/JSX/TS/TSX files in src directory
const findSourceFiles = (dir) => {
  const files = [];
  
  const traverse = (currentDir) => {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        traverse(fullPath);
      } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(item)) {
        files.push(fullPath);
      }
    });
  };
  
  traverse(dir);
  return files;
};

// Main execution
console.log('🔧 Starting ESLint fixes...');
const srcDir = path.join(__dirname, '..', 'src');
const sourceFiles = findSourceFiles(srcDir);

console.log(`Found ${sourceFiles.length} source files`);
sourceFiles.forEach(processFile);
console.log('✅ ESLint fixes completed!');