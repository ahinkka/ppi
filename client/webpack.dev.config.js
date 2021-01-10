const baseConfig = require('./webpack.config.js');

module.exports = Object.assign(
  baseConfig,
  {
    devtool: 'eval-cheap-source-map'
  }
)
