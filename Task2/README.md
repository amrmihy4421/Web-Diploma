# Merge Two Files with Async and EventEmitter

This project reads two text files using non-blocking asynchronous operations. Once both reads finish, it uses an `EventEmitter` to merge their content and write it to a third file.

## Files

- `task2.js`: Application source code.
- `file1.txt`: First input text file.
- `file2.txt`: Second input text file.
- `merged.txt`: Generated file containing the merged content.
- `package.json`: Project configuration and npm scripts.

## How It Works

1. The program reads `file1.txt` and `file2.txt` asynchronously with `fs.readFile`.
2. When each read finishes, it emits a `fileRead` event through an `EventEmitter`.
3. Once both files have been read, it emits a `filesReady` event and combines the content.
4. It writes the combined content to `merged.txt` asynchronously with `fs.writeFile`.

## Run the Project

From the project directory, run:

```powershell
cd .\Task2
npm start
```

If PowerShell blocks `npm` because of its execution policy, run this instead:

```powershell
npm.cmd start
```

After the program runs, the merged content will be available in `Task2/merged.txt`.
