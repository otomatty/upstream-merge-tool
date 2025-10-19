import path from 'path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  // Main process
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/electron/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist/electron'),
      filename: 'main.js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                noEmit: false,
                allowImportingTsExtensions: false,
              },
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      plugins: [new TsconfigPathsPlugin()],
    },
    target: 'electron-main',
    devtool: 'source-map',
  },
  // Preload script
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/electron/preload.ts',
    output: {
      path: path.resolve(__dirname, 'dist/electron'),
      filename: 'preload.js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                noEmit: false,
                allowImportingTsExtensions: false,
              },
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      plugins: [new TsconfigPathsPlugin()],
    },
    target: 'electron-preload',
    devtool: 'source-map',
  },
];
