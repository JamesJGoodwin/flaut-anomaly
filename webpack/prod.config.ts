import { Configuration } from 'webpack'
import merge from 'webpack-merge'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

import baseWebpackConfig from './base.config.js'

const buildWebpackConfig = merge(baseWebpackConfig, {
  output: {
    filename: '[name].[contenthash].js'
  },
  mode: 'production',
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new CleanWebpackPlugin()
  ]
} as Configuration)

export default new Promise(resolve => resolve(buildWebpackConfig))