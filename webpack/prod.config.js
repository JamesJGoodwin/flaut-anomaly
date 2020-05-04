/* eslint-disable */
const merge = require('webpack-merge')
const baseWebpackConfig = require('./base.config.js')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
/* eslint-enable */

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
})

module.exports = new Promise(resolve => resolve(buildWebpackConfig))