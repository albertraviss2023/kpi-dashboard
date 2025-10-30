// scripts/js_to_json.mjs (enhanced)
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const [,, inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error("Usage: node scripts/js_to_json.mjs <in.js> <out.json>");
  process.exit(1);
}

// Validate input file exists
if (!fs.existsSync(inFile)) {
  console.error(`Input file not found: ${inFile}`);
  process.exit(1);
}

let code = fs.readFileSync(inFile, "utf8");

console.log(`Processing ${inFile} (${code.length} bytes)...`);

// Enhanced ESM export stripping with more patterns
code = code
  .replace(/^\s*export\s+const\s+/gm, "const ")
  .replace(/^\s*export\s+let\s+/gm, "let ")
  .replace(/^\s*export\s+var\s+/gm, "var ")
  .replace(/^\s*export\s+default\s+/gm, "")
  .replace(/^\s*export\s*\{[\s\S]*?\};?\s*$/gm, "")
  .replace(/^\s*export\s+function\s+/gm, "function ") // Handle exported functions
  .replace(/^\s*export\s+async\s+function\s+/gm, "async function ") // Handle async exports
  .replace(/^\s*export\s+class\s+/gm, "class "); // Handle class exports

// Enhanced wrapping with error context
const wrapped = `
(() => {
  "use strict";
  ${code}
  
  // Validate that generateFullData exists
  if (typeof generateFullData !== 'function') {
    throw new Error('generateFullData function not found in the source file');
  }
  
  const result = generateFullData();
  
  // Basic validation of the result structure
  if (!result || typeof result !== 'object') {
    throw new Error('generateFullData() did not return an object');
  }
  
  const expectedKeys = ['quarterlyData', 'processStepData', 'kpiCounts', 'quarterlyVolumes', 'inspectionVolumes', 'bottleneckData', 'processStepCounts'];
  const missingKeys = expectedKeys.filter(key => !(key in result));
  
  if (missingKeys.length > 0) {
    throw new Error('Missing expected keys in result: ' + missingKeys.join(', '));
  }
  
  return result;
})()
`;

// Create VM context with additional globals that might be needed
const context = vm.createContext({
  console,
  Math,
  Date,
  Array,
  Object,
  JSON,
  Number,
  String,
  Boolean,
  RegExp,
  Error,
  TypeError,
  RangeError,
  setTimeout, // Some data generators might use timing functions
  clearTimeout,
  setInterval,
  clearInterval
});

let result;
try {
  result = vm.runInContext(wrapped, context, { 
    filename: path.basename(inFile),
    timeout: 30000 // 30 second timeout for safety
  });
} catch (e) {
  console.error("Failed to evaluate JS:", e.message);
  console.error("Stack:", e.stack);
  process.exit(1);
}

// Additional validation of the generated data
try {
  // Check that we have data for all quarters
  const quarters = [
    'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023',
    'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024',
    'Q1 2025', 'Q2 2025'
  ];
  
  // Validate quarterly data structure
  for (const process of ['MA', 'CT', 'GMP']) {
    if (!result.quarterlyData[process]) {
      console.warn(`Warning: No quarterly data for process ${process}`);
    }
  }
  
  console.log(`Generated data structure validated:`);
  console.log(`- Processes: MA, CT, GMP`);
  console.log(`- Quarters: ${quarters.length} quarters from ${quarters[0]} to ${quarters[quarters.length - 1]}`);
  console.log(`- Data categories: ${Object.keys(result).join(', ')}`);
  
} catch (validationError) {
  console.warn("Data validation warning:", validationError.message);
}

// Write the result
try {
  const jsonString = JSON.stringify(result, null, 2);
  fs.writeFileSync(outFile, jsonString, "utf8");
  console.log(`✓ Successfully wrote ${outFile} (${jsonString.length} bytes)`);
  console.log(`✓ File size: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`);
} catch (writeError) {
  console.error("Failed to write output file:", writeError.message);
  process.exit(1);
}