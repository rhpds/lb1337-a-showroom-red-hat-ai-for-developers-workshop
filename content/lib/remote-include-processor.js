'use strict'

const { execFileSync } = require('node:child_process')

/**
 * A rudimentary include processor that handles remote includes. This version gets registered each
 * time a document is loaded and is thus scoped to the document, which is the recommended approach.
 * 
 * This was taken from https://gitlab.com/opendevise/oss/antora-demo-site/-/blob/remote-include-processor/lib/remote-include-processor.js?ref_type=heads
 * and
 * https://gitlab.com/antora/antora/-/issues/246
 */
function createExtensionGroup() {
  return function () {
    this.includeProcessor(function () {
      this.prepend() // register in front of Antora's include processor
      this.handles((target) => target.startsWith('https://'))
      this.process((doc, reader, target, attrs) => {
        let contents
        try {
          contents = execFileSync('curl', ['--silent', '-L', target], { encoding: 'utf8' })
          reader.pushInclude(contents, target, target, 1, attrs)
        } catch {
          const cursor = reader.$cursor_at_prev_line()
          const message = doc.createLogMessage(`include uri not readable: ${target}`, { source_location: cursor })
          doc.getLogger().error(message)
          contents = `Unresolved directive in ${reader.path} - include::${target}[]`
        }
        // reader.pushInclude(contents, target, target, 1, attrs)
        return true
      })
    })
  }
}

module.exports.register = (registry) => {
  const toProc = (fn) => Object.defineProperty(fn, '$$arity', { value: fn.length })
  registry.$groups().$store('remote-include-processor', toProc(createExtensionGroup()))
  return registry
}
