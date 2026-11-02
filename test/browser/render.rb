# frozen_string_literal: true

require_relative '../test_helper'

# Use the same Rails/ViewComponent rendering path as the Ruby tests.
view = ActionView::Base.empty
sections = %w[light dark].map do |theme|
  controls = [false, true].map do |checked|
    view.render(Pathogen::Form::Switch.new(attribute: :enabled, id: "#{theme}-#{checked}", checked: checked,
                                           label: "#{theme} notifications #{checked ? 'on' : 'off'}"))
  end.join
  "<section class='#{theme}'><h2>#{theme.capitalize} theme</h2>#{controls}</section>"
end.join

sections += view.render(Pathogen::Tabs.new(id: 'mixed', label: 'Analysis views', sync_url: true)) do |tabs|
  tabs.with_tab(id: 'history', label: 'History')
  tabs.with_tab(id: 'overview', label: 'Overview')
  tabs.with_panel(id: 'overview-panel', tab_id: 'overview') { 'Overview content' }
  tabs.with_lazy_panel(id: 'history-panel', tab_id: 'history', frame_id: 'history-frame',
                       src_path: '/history', selected: true) { 'History content' }
end

sections += <<~HTML
  <div data-controller="pathogen--tooltip">
    <button id="tooltip-trigger" data-pathogen--tooltip-target="trigger" aria-describedby="fixture-tooltip">About analysis</button>
    #{view.render(Pathogen::Tooltip.new(text: 'An analysis processes selected samples.', id: 'fixture-tooltip'))}
  </div>
  <button id="other">Another action</button>
HTML

sections += '<section id="sizes"><h2>Target sizes</h2>'
%i[medium small].each do |size|
  sections += view.render(Pathogen::Toolbar::Button.new(id: "toolbar-#{size}", size: size, text: "#{size} action"))
  sections += view.render(Pathogen::Form::RadioButton.new(attribute: :option, value: size, id: "radio-#{size}",
                                                          aria: { label: "#{size} option" }, size: size))
  sections += view.render(Pathogen::Form::Switch.new(attribute: :updates, id: "switch-#{size}", size: size,
                                                     aria: { label: "#{size} updates" }))
end
sections += '</section>'

form = Pathogen::FormBuilders::PathogenFormBuilder.new('user', Struct.new(:theme).new('dark'), view, {})
radio = form.radio_button(:theme, 'dark', label: 'Dark theme', help_text: 'Change appearance',
                                          error_text: 'Choose an available theme')
sections += "<form id='preferences'>#{radio}</form>"

File.write(ARGV.fetch(0), <<~HTML)
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Pathogen browser acceptance</title>
      <link rel="stylesheet" href="/pathogen.css">
      <style>
        main { max-width: 800px; margin: auto; }
        section { padding: 24px; display: grid; gap: 8px; background: var(--pvc-color-surface); color: var(--pvc-color-text); }
        #tooltip-trigger { margin: 24px; }
      </style>
    </head>
    <body><main><h1>Component acceptance</h1>#{sections}</main><script src="/fixture.js"></script></body>
  </html>
HTML
