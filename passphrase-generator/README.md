# Passphrase Generator

A web-based tool for generating secure and memorable passphrases using the passhelp library.

## Features

- **Human Memorable Natural Language**: Generate word-based passphrases that are easy to remember
- **Secure Random**: Generate cryptographically secure random passwords
- Customizable word separators, case options, and enhancements
- All generation happens locally in your browser

## Dependencies

This tool uses the [passhelp library](https://github.com/passhelp/passhelp) for password generation. The minified browser version (`passhelp.min.js`) is included in this directory.

## Updating passhelp.min.js

If you need to update or rebuild the passhelp library, follow these steps:

1. **Clone the passhelp repository**:
   ```bash
   cd /workspaces/otoolebox
   git clone https://github.com/passhelp/passhelp.git
   ```

2. **Use the pre-built version** (recommended):
   ```bash
   cp passhelp/dist/passhelp.min.js passphrase-generator/
   ```

3. **Or build from source** (if needed):
   ```bash
   cd passhelp
   npm install
   npm run build
   cp dist/passhelp.min.js ../passphrase-generator/
   ```

4. **Clean up**:
   ```bash
   cd /workspaces/otoolebox
   rm -rf passhelp
   ```

## Usage

Simply open `index.html` in a web browser. The tool provides:

- **Human Readable Options**: Configure word count, separators, case, and enhancements
- **Secure Random Options**: Configure length, character sets, and ambiguous character handling
- **Copy functionality**: Copy individual passphrases or all generated passphrases at once

## Security

- All password generation happens client-side using secure cryptographic functions
- No passwords are sent to any server
- Uses the Web Crypto API for secure random number generation when available