# frozen_string_literal: true

require 'json'
require 'open3'
require 'tempfile'

# Runs axe-core structural accessibility rules against rendered HTML fragments.
module AxeAssertions
  AXE_SCRIPT = File.expand_path('run-axe.mjs', __dir__)

  def assert_axe_structural_accessible(html, context: nil)
    violations = run_axe(html)
    return assert_empty(violations) if context.nil?

    message = "axe-core violations (#{context})"
    message << ":\n"
    violations.each do |violation|
      message << "- #{violation['id']}: #{violation['help']}\n"
      violation['nodes'].each do |node|
        message << "  #{node['html']}\n"
      end
    end

    assert_empty violations, message
  end

  private

  def run_axe(html)
    Tempfile.create(['axe-fragment', '.html']) do |file|
      file.write(html)
      file.flush

      stdout, stderr, status = Open3.capture3('node', AXE_SCRIPT, file.path)
      raise "axe-core failed: #{stderr.presence || stdout}" unless status.success?

      JSON.parse(stdout)
    end
  end
end
