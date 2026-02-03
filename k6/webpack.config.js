const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'loadtest': './src/loadtest.ts',
    'stress-test': './src/stress-test.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { node: '16' } }],
              '@babel/preset-typescript',
            ],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: /^k6(\/.*)?$/,
  target: 'web',
  stats: 'minimal',
};
