# frozen_string_literal: true

require 'test_helper'

# The demo must load built entries once and keep preview mock initialization first.
class JavaScriptAssetsTest < ActionView::TestCase
  test 'application layout loads only the application module' do
    render inline: 'Demo', layout: 'layouts/application' # rubocop:disable Rails/RenderInline

    assert_select 'script[type="module"]', count: 1
    assert_select 'script[type="module"][src*="/assets/application-"][data-turbo-track="reload"]'
    assert_select 'script[type="importmap"]', count: 0
  end

  test 'preview layout loads only its module and retains both stylesheets' do
    render inline: 'Preview', layout: 'layouts/lookbook_preview' # rubocop:disable Rails/RenderInline

    assert_select 'script[type="module"]', count: 1
    assert_select 'script[type="module"][src*="/assets/lookbook_preview-"][data-turbo-track="reload"]'
    assert_select 'script[type="importmap"]', count: 0
    assert_select 'link[rel="stylesheet"][href*="/assets/pathogen_view_components-"]'
    assert_select 'link[rel="stylesheet"][href*="/assets/tailwind-"]'
  end

  test 'entry assets resolve to bundles rather than raw source' do
    %w[application.js lookbook_preview.js].each do |name|
      asset = Rails.application.assets.load_path.find(name)

      assert asset, "Missing built asset: #{name}"
      assert_equal Rails.root.join('app/assets/builds', name), asset.path
    end
  end

  test 'demo boots without importmap or publicly served library source' do
    assert_not Rails.application.config.respond_to?(:importmap)
    assert_not Gem.loaded_specs.key?('importmap-rails')

    source_root = Pathogen::ViewComponents::Engine.root.join('app/assets/javascripts')
    source_root.glob('**/*.js').each do |path|
      assert_nil Rails.application.assets.load_path.find(path.relative_path_from(source_root).to_s)
    end
  end

  test 'preview service worker matches the installed mock library' do
    assert_equal Rails.root.parent.join('node_modules/msw/lib/mockServiceWorker.js').binread,
                 Rails.public_path.join('mockServiceWorker.js').binread
  end
end
