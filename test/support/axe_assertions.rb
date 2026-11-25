# frozen_string_literal: true

require 'json'
require 'open3'
require 'tempfile'

# Runs axe-core structural accessibility rules against rendered HTML fragments.
module AxeAssertions
  AXE_SCRIPT = File.expand_path('run-axe.mjs', __dir__)
  DEFAULT_EXCLUDED_RULES = ['page-has-heading-one'].freeze

  def assert_axe_structural_accessible(html, context: nil, excluded_rules: DEFAULT_EXCLUDED_RULES)
    violations = run_axe(html)
    violations.reject! { |violation| excluded_rules.include?(violation['id']) }
    return assert_empty(violations) if context.nil?

    message = "axe-core violations (#{context}):\n"
    violations.each do |violation|
      impact = violation['impact'] || 'unknown'
      message << "- #{violation['id']} (#{impact}): #{violation['help']}\n"
      message << "  Help: #{violation['helpUrl']}\n" if violation['helpUrl'].present?
      violation['nodes'].each do |node|
        target = Array(node['target']).join(' > ')
        message << "  Target: #{target}\n" if target.present?
        message << "  HTML: #{node['html']}\n" if node['html'].present?
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
