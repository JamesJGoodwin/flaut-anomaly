import webpack, { Configuration } from 'webpack'
import merge from 'webpack-merge'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

import baseWebpackConfig from './base.config.js'

const devWebpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  output: {
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        loader: 'babel-loader',
        exclude: /(node_modules|server)/
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: /vendors.*.*/
    })
  ]
} as Configuration)

export default new Promise(resolve => resolve(devWebpackConfig))