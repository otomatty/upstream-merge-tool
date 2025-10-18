# upstream-merge-tool

Automatically merge upstream changes while preserving custom code with automatic conflict resolution.

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18.0.0+ (for npm/yarn)
- **Bun** v1.2.15+ (optional, for Bun runtime)
- **Git** (required for merge operations)

### Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install

# Or using Bun
bun install
```

### Run the Tool

```bash
# Using npm
npm run start

# Using yarn
yarn start

# Using Bun
bun run index.ts
```

This project was created using `bun init` in bun v1.2.15. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## 📋 Configuration

Create a `config.json` file in the project root:

```json
{
  "upstream_repository_name": "upstream",
  "upstream_branch_name": "main",
  "last_merged_upstream_commit": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "custom_code_marker": {
    "start": "// === CUSTOM CODE START ===",
    "end": "// === CUSTOM CODE END ==="
  }
}
```

## 🧪 Run Tests

```bash
# Run all tests
bun test

# Run unit tests only
bun test src/__tests__/unit

# Run specific module tests
npm run test:unit:logger
npm run test:unit:config
npm run test:unit:git
npm run test:unit:conflict
npm run test:unit:report
```

## 📖 Documentation

For detailed setup and configuration instructions, see [`RUNTIME_SETUP.md`](./RUNTIME_SETUP.md).

## 🔧 Available Scripts

```bash
npm run start          # Run the merge tool (npm/tsx)
npm run start:bun      # Run with Bun
npm run dev            # Run in watch mode
npm run build          # Build standalone binary (requires Bun)
npm run test           # Run tests with Bun
npm run test:coverage  # Generate test coverage report
```

## 📦 Project Structure

```
upstream-merge-tool/
├── src/
│   ├── main.ts              # Main entry point
│   ├── logger/              # Logging utilities
│   ├── config/              # Configuration management
│   ├── git/                 # Git operations
│   ├── conflict/            # Conflict resolution
│   ├── report/              # Report generation
│   ├── types/               # TypeScript types
│   ├── utils/               # Utilities
│   └── __tests__/           # Test suite
├── config.json              # Configuration (user-provided)
├── package.json             # npm configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## ✨ Features

- ✅ Automatic upstream merge
- ✅ Smart conflict detection
- ✅ Custom code marker support
- ✅ Conditional auto-resolution
- ✅ Detailed reporting
- ✅ Node.js and Bun compatible

## 📝 License

MIT
