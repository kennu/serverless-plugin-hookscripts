# Hook scripts plugin for Serverless
Kenneth Falck <kennu@iki.fi> 2016

This plugin lets you easily create shell script hooks that are run whenever
Serverless actions are executed.

## Installation

First install the plugin into your Serverless project:

    npm install --save serverless-plugin-hookscripts

Then edit your **s-project.json**, locate the plugins: [] section, and add
the plugin as follows:

    plugins: [
        "serverless-plugin-hookscripts"
    ]

## Configuration

Use the "hookscripts create" command to create sample hook scripts in the *s-hooks*
folder of your project root.

To enable a hook, remove the ".sample" extension of the generated script.
