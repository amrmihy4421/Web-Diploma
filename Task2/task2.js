const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const emitter = new EventEmitter();
const inputFiles = ['file1.txt', 'file2.txt'];
const outputFile = path.join(__dirname, 'merged.txt');
const fileContents = new Array(inputFiles.length);
let completedReads = 0;
let hasError = false;

emitter.on('fileRead', (index, content) => {
  if (hasError) return;

  fileContents[index] = content;
  completedReads += 1;

  if (completedReads === inputFiles.length) {
    emitter.emit('filesReady', fileContents.join('\n'));
  }
});

emitter.once('filesReady', (mergedContent) => {
  fs.writeFile(outputFile, mergedContent, 'utf8', (error) => {
    if (error) {
      emitter.emit('error', error);
      return;
    }

    console.log('The files were merged successfully into merged.txt');
  });
});

emitter.on('error', (error) => {
  hasError = true;
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});

inputFiles.forEach((fileName, index) => {
  const filePath = path.join(__dirname, fileName);

  fs.readFile(filePath, 'utf8', (error, content) => {
    if (error) {
      if (!hasError) emitter.emit('error', error);
      return;
    }

    emitter.emit('fileRead', index, content);
  });
});
