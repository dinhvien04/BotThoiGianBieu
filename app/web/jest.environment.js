const jsdomExport = require('jest-environment-jsdom')
const JsdomEnvironment =
  jsdomExport.TestEnvironment || jsdomExport.default || jsdomExport

class WebTestEnvironment extends JsdomEnvironment {
  constructor(config, context) {
    if (config.projectConfig) {
      const projectConfig = {
        ...config.projectConfig,
        testEnvironmentOptions: {
          ...config.projectConfig.testEnvironmentOptions,
          url: 'http://localhost:3000/',
        },
      }

      super({ ...config, projectConfig }, context)
    } else {
      super(
        {
          ...config,
          testURL: 'http://localhost:3000/',
          testEnvironmentOptions: {
            ...config.testEnvironmentOptions,
            url: 'http://localhost:3000/',
          },
        },
        context,
      )
    }

    this.global.global = this.global
  }

  async setup() {
    await super.setup()
    this.dom.reconfigure({ url: 'http://localhost:3000/' })
    this.global.global = this.global
  }
}

module.exports = WebTestEnvironment
