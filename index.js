'use strict';

/**
 * Serverless Hookscripts Plugin
 * Kenneth Falck <kennu@iki.fi> 2016
 */

module.exports = function(S) {
  const path = require('path');
  const fs = require('fs');
  const SUtils = require(S.getServerlessPath('utils/index'));
  const SCli = require(S.getServerlessPath('utils/cli'));
  const SError = require(S.getServerlessPath('Error'));
  const Promise = require('bluebird');

  class ServerlessPluginHookscripts extends S.classes.Plugin {
    constructor() {
      super();
    }

    static getName() {
      return 'net.kfalck.' + ServerlessPluginHookscripts.name;
    }

    registerActions() {
      S.addAction(this.createHookscripts.bind(this), {
        handler: 'hookscriptsCreate',
        description: 'Creates sample hook shell scripts',
        context: 'hookscripts',
        contextAction: 'create',
        options: [],
        parameters: []
      });
      return Promise.resolve();
    }

    getScriptName(hook) {
      return hook
        .replace(/Post$/, '-post')
        .replace(/Pre$/, '-pre')
        .replace(/([a-z0-9])([A-Z])/g, m => {
          return m[0] + '-' + m[1].toLowerCase();
        })
        .toLowerCase();
    }

    createHookscripts(evt) {
      var project = S.getProject();
      var hooksPath = path.join(project.getRootPath(), 's-hooks');
      try {
        fs.mkdirSync(hooksPath);
      } catch (err) {
        // Ignore already exists error, report others
        if (err.code !== 'EEXIST') {
          SCli.log(err);
        }
      }
      var numCreated = 0;
      Object.keys(S.hooks).map(key => {
        var scriptName = this.getScriptName(key);
        var sampleScriptName = scriptName + '.sample';
        var scriptPath = path.join(hooksPath, scriptName);
        var sampleScriptPath = path.join(hooksPath, sampleScriptName);
        var content = '#!/bin/sh\n# Serverless ' + key + ' hook script.\n# To enable this hook , rename this file to "' + scriptName + '".\necho "Hookscript: ' + scriptName + ' $*"\n';
        if (!fs.existsSync(scriptPath) && !fs.existsSync(sampleScriptPath)) {
          SCli.log('Creating s-hooks/' + sampleScriptName);
          numCreated += 1;
          try {
            fs.writeFileSync(sampleScriptPath, content, {
              mode: 0o777,
              flag: 'wx'
            });
          } catch (err) {
            SCli.log(err);
          }
        }
      });
      if (numCreated) {
        SCli.log('Note: You can freely delete any of the created sample scripts at any time.');
        SCli.log('Note: You may want to add s-hooks/*.sample to .gitignore.');
      } else {
        SCli.log('All scripts already exist in s-hooks.');
      }
      return Promise.resolve(evt);
    }

    registerHooks() {
      Object.keys(S.hooks).map(key => {
        var action;
        var suffix;
        if (key.match(/Post$/)) {
          suffix = 'post';
          action = key.replace(/Post$/, '');
        } else if (key.match(/Pre$/)) {
          suffix = 'pre';
          action = key.replace(/Pre$/, '');
        } else {
          return;
        }
        S.addHook(this.runHook.bind(this, key), {
          action: action,
          event: suffix
        });
      });
      return Promise.resolve();
    }

    runHook(hook, evt) {
      var project = S.getProject();
      var hooksPath = path.join(project.getRootPath(), 's-hooks');
      var scriptName = this.getScriptName(hook);
      var scriptPath = path.join(hooksPath, scriptName);

      if (fs.existsSync(scriptPath)) {
        //console.log('Exec hook', hook, evt);
        var options = '';
        var env = {};
        Object.keys(process.env).map(envName => {
          env[envName] = process.env[envName];
        });
        if (evt.options) {
          Object.keys(evt.options).map(paramName => {
            var paramValue = evt.options[paramName];
            options += ' --' + paramName + ' ' + JSON.stringify(paramValue); // ensure quoted
            env['SLS_HOOK_' + paramName.toUpperCase()] = typeof paramValue == 'string' || typeof paramValue == 'number' ? paramValue : paramValue === null ? '' : JSON.stringify(paramValue);
          });
        }
        if (exec(scriptPath + options, {
            silent: false,
            env: env
          }).code !== 0) {
          throw new SError(`Error executing hook script ${scriptName}`, SError.errorCodes.UNKNOWN);
        }
      }

      // node scripts
      if (fs.existsSync(scriptPath + '.js')) {
        let nodeScript = require(scriptPath);

        if (typeof nodeScript === 'function') {
          return nodeScript(S, evt);
        } else {
          throw new SError(`Node hook script ${scriptName} must export a function handler`, SError.errorCodes.UNKNOWN);
        }
      }

      return Promise.resolve(evt);
    }
  }

  return ServerlessPluginHookscripts;
};