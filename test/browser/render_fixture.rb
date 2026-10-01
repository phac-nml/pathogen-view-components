# frozen_string_literal: true

ENV['RAILS_ENV'] = 'test'
require 'bundler/setup'
require 'rails'
require 'action_controller/railtie'
require 'action_view/railtie'
require 'turbo-rails'

class PathogenBrowserApplication < Rails::Application
  config.root = File.expand_path('../..', __dir__)
  config.eager_load = false
  config.secret_key_base = 'pathogen-browser-acceptance-fixture'
  config.logger = Logger.new(nil)
end

require_relative '../../lib/pathogen/view_components'
PathogenBrowserApplication.initialize!

view = ActionController::Base.new.view_context

child = view.render(
  Pathogen::Dialog.new(id: 'child-dialog', title: 'Child dialog', initial_focus: '#child-reference')
) do |dialog|
  dialog.with_trigger(text: 'Open child dialog', id: 'child-trigger')
  '<p>Only the child should remain interactive.</p><label for="child-reference">Reference</label>' \
  '<input id="child-reference">' \
  '<button type="button" id="child-action">Child action</button>'.html_safe
end

tooltip = view.render(Pathogen::Button.new(id: 'tooltip-trigger', text: 'Details')) do |button|
  button.with_tooltip(text: 'Additional laboratory details')
  'Details'
end

paragraphs = view.safe_join((1..18).map do |index|
  view.tag.section do
    view.safe_join([
                     view.tag.h3("Laboratory section #{index}"),
                     view.tag.p('Review the laboratory details before saving. ' \
                                'This content gives the dialog a scrolling region and allows focused controls ' \
                                'to be checked at narrow widths and enlarged text sizes.')
                   ])
  end
end)

main_dialog = view.render(
  Pathogen::Dialog.new(id: 'main-dialog', title: 'Long laboratory dialog',
                       description: 'Review and save project details.', open: ARGV.include?('--auto-open'))
) do |dialog|
  dialog.with_trigger(text: 'Open long dialog', id: 'main-trigger')
  dialog.with_footer do
    view.safe_join([
                     view.render(Pathogen::Button.new(text: 'Cancel',
                                                      data: { action: 'click->pathogen--dialog#requestClose' })),
                     view.render(Pathogen::Button.new(text: 'Save project', tone: :primary, emphasis: :solid,
                                                      type: :submit, form: 'main-form', id: 'save-project'))
                   ])
  end
  view.safe_join([
                   '<form id="main-form"><label for="project-name">Project name</label>' \
                   '<input id="project-name" name="project_name" value="Laboratory project" required>' \
                   '<label for="project-notes">Project notes</label>' \
                   '<textarea id="project-notes" name="notes"></textarea>' \
                   '<p id="form-status" role="status"></p></form>'.html_safe,
                   tooltip, child, paragraphs,
                   '<button type="button" id="last-body-action">Last content action</button>'.html_safe
                 ])
end

fallback_dialog = view.render(
  Pathogen::Dialog.new(id: 'fallback-dialog', title: 'Explicit return focus',
                       initial_focus: '#fallback-field', return_focus: '#return-focus')
) do |dialog|
  dialog.with_trigger(text: 'Open return focus dialog', id: 'fallback-trigger')
  '<label for="fallback-field">Reference</label><input id="fallback-field">'.html_safe
end

static_dialog = view.render(
  Pathogen::Dialog.new(id: 'static-dialog', title: 'Static laboratory guidance', initial_focus: '#not-focusable')
) do |dialog|
  dialog.with_trigger(text: 'Open static dialog', id: 'static-trigger')
  view.safe_join([view.tag.div('Guidance intro', id: 'not-focusable'), paragraphs])
end

sidebar = view.render(
  Pathogen::Sidebar::Provider.new(id: 'browser-sidebar',
                                  data: { 'pathogen--sidebar-breakpoint-value': '(min-width: 99999px)' })
) do
  view.safe_join([
                   view.render(Pathogen::Sidebar::Trigger.new(id: 'sidebar-trigger')),
                   view.render(Pathogen::Sidebar.new(id: 'browser-sidebar', label: 'Laboratory navigation')) do
                     view.tag.a('Projects', href: '#projects')
                   end
                 ])
end

puts <<~HTML
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Pathogen Dialog browser acceptance</title>
      <link rel="stylesheet" href="/pathogen.css">
      <style>
        body { margin: 0; background: var(--pvc-color-surface); color: var(--pvc-color-text); font-family: sans-serif; }
        main { padding: 24px; min-height: 1600px; }
        main > button, main > [data-controller~="pathogen--dialog"] { margin-block: 12px; }
        form { display: grid; gap: 8px; }
        input, textarea, #child-action, #last-body-action, #return-focus, #background-action {
          min-height: 44px; padding: 8px; border: 1px solid var(--pvc-color-border);
          background: var(--pvc-color-surface); color: var(--pvc-color-text); border-radius: var(--pvc-radius-control);
        }
        input, textarea { min-width: 0; width: 100%; }
        input:focus-visible, textarea:focus-visible, #child-action:focus-visible, #last-body-action:focus-visible,
        #return-focus:focus-visible, #background-action:focus-visible {
          outline: 2px solid var(--pvc-color-focus); outline-offset: 2px;
        }
        section { margin-block: 24px; }
      </style>
      <script type="module" src="/host.js"></script>
    </head>
    <body>
      <main>
        <h1>Dialog acceptance fixture</h1>
        <button type="button" id="background-action">Background action</button>
        <button type="button" id="return-focus">Return focus destination</button>
        #{main_dialog}
        #{fallback_dialog}
        #{static_dialog}
        #{sidebar}
      </main>
    </body>
  </html>
HTML
