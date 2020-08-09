import path from 'path'
import webpack, { Configuration } from 'webpack'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const PATHS = {
  src: path.resolve(__dirname, '../public/ts'),
  dist: path.resolve(__dirname, '../public/bundle')
}

const config: Configuration = {
  externals: {
    paths: PATHS.src
  },
  entry: {
    app: PATHS.src + '/index.tsx'
  },
  output: {
    path: PATHS.dist,
    publicPath: '/'
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          name: 'vendors',
          test: /node_modules/,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        include: path.resolve(__dirname, '../public/ts'),
        exclude: ['/node_modules/', '/server/']
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: false,
              config: {
                path: `./postcss.config.js`
              }
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: false,
              config: {
                path: `./postcss.config.js`
              }
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /ru/)
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  stats: {
    entrypoints: false,
    children: false
  }
}

export default config