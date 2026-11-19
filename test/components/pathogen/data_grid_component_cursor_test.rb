# frozen_string_literal: true

# rubocop:disable Style/FormatStringToken -- These assertions verify literal I18n placeholders sent to JavaScript.

require 'view_component_test_case'

module Pathogen
  # Cursor markup, accessible loading state, and sorting-header rendering contracts.
  class DataGridComponentCursorTest < ViewComponentTestCase
    test 'cursor pagination uses an unknown total while a continuation exists' do
      render_cursor(next_cursor: 'opaque:next+/=')

      assert_selector '[role="grid"][aria-rowcount="-1"]' \
                      '[data-pvc-data-grid-pagination-mode="cursor"]' \
                      '[data-pvc-data-grid-next-cursor="opaque:next+/="]' \
                      '[data-pvc-data-grid-loaded-count="2"]' \
                      '[data-pvc-data-grid-page-size="20"]'
      assert_no_selector '[role="grid"][data-pvc-data-grid-total-count]'
      assert_selector '[role="row"][aria-rowindex="2"][data-pvc-data-grid-global-row-index="0"]'
      assert_selector '[role="row"][aria-rowindex="3"][data-pvc-data-grid-global-row-index="1"]'
    end

    test 'exhausted cursor pagination reports its loaded rows and header as the total' do
      render_cursor(next_cursor: nil)

      assert_selector '[role="grid"][aria-rowcount="3"]'
      assert_no_selector '[role="grid"][data-pvc-data-grid-next-cursor]'
      assert_selector '[data-pathogen--data-grid-target="paginationPosition"]', text: 'All 2 rows loaded.'
    end

    test 'cursor accepts a known matching count without adding unloaded rows' do
      render_cursor(next_cursor: 'next', total_count: 1234)

      assert_selector '[role="grid"][aria-rowcount="1235"][data-pvc-data-grid-total-count="1234"]' \
                      '[data-pvc-data-grid-loaded-count="2"]'
      assert_selector '[role="gridcell"]', count: 2
      assert_selector '[data-pathogen--data-grid-target="paginationPosition"]', text: 'Rows 1–2 of 1234'
    end

    test 'exhaustion replaces a supplied total with the discovered count' do
      render_cursor(next_cursor: nil, total_count: 1234)

      assert_selector '[role="grid"][aria-rowcount="3"]'
      assert_selector '[data-pathogen--data-grid-target="paginationPosition"]', text: 'Rows 1–2 of 2'
    end

    test 'known empty counts and ranges are translated' do
      I18n.with_locale(:fr) do
        render_cursor(rows: [], next_cursor: nil, total_count: 0)

        assert_selector '.pvc-data-grid__empty-state'
        assert_selector '[data-pathogen--data-grid-target="paginationPosition"]', text: 'Lignes 0–0 sur 0'
      end
    end

    test 'cursor total is optional but must be a non-negative integer when supplied' do
      assert_nil cursor_grid(total_count: nil).virtual_total_count
      assert_equal 0, cursor_grid(total_count: 0).virtual_total_count
      assert_equal 12, cursor_grid(total_count: '12').virtual_total_count
      [-1, 'unknown', '', 1.5].each do |total_count|
        assert_raises(ArgumentError) { cursor_grid(total_count:) }
      end
    end

    test 'empty cursor results render the empty state and honest completed count' do
      render_cursor(rows: [], next_cursor: nil)

      assert_no_selector '[role="grid"]'
      assert_selector '.pvc-data-grid__empty-state'
      assert_selector '[data-pathogen--data-grid-target="paginationPosition"]', text: 'All 0 rows loaded.'
    end

    test 'cursor status is persistent and outside the grid busy region' do
      render_cursor(next_cursor: 'next', refresh_url: '/projects/1/samples?sort=name')
      document = Nokogiri::HTML.fragment(rendered_content)
      status = document.at_css('[data-pathogen--data-grid-target="paginationStatus"]')

      assert_equal 'status', status['role']
      assert_equal 'polite', status['aria-live']
      assert_equal 'true', status['aria-atomic']
      assert_nil status['hidden']
      assert_empty status.ancestors('[role="grid"]')
      initial_status = document.at_css('[data-pathogen--data-grid-target="virtualStatus"]')
      assert_empty initial_status.ancestors('[role="grid"]')
      assert_equal '%{count} rows loaded.', status['data-loaded-text']
      assert_equal 'Rows %{start}–%{end} · %{count} loaded', status['data-range-text']
      assert_equal 'Rows %{start}–%{end} of %{total}', status['data-range-total-text']
      assert_selector 'button[data-pathogen--data-grid-target="paginationRetry"]' \
                      '[data-action="click->pathogen--data-grid#retryRows"][hidden]', text: 'Retry', visible: :all
      assert_selector 'a[data-pathogen--data-grid-target="paginationRefresh"]' \
                      '[href="/projects/1/samples?sort=name"][hidden]', text: 'Refresh results', visible: :all
    end

    test 'cursor status and recovery controls are translated' do
      I18n.with_locale(:fr) do
        render_cursor(next_cursor: nil, refresh_url: '/samples')

        assert_selector '[data-pathogen--data-grid-target="paginationPosition"]',
                        text: 'Toutes les lignes sont chargées (2).'
        assert_selector '[data-pathogen--data-grid-target="paginationStatus"]' \
                        '[data-mismatch-text="Ces résultats ont changé. Actualisez les résultats pour continuer."]'
        assert_selector 'button[data-pathogen--data-grid-target="paginationRetry"]',
                        text: 'Réessayer', visible: :all
        assert_selector 'a[data-pathogen--data-grid-target="paginationRefresh"]',
                        text: 'Actualiser les résultats', visible: :all
      end
    end

    test 'cursor rejects unsupported mode invalid continuation and nonzero initial offset' do
      [{ mode: :other }, { next_cursor: 1 }, { next_cursor: '' }, { row_offset: 20 }].each do |options|
        assert_raises(ArgumentError) { cursor_grid(**options) }
      end
    end

    test 'cursor preserves encoded filters and does not require a total count' do
      grid = cursor_grid(next_cursor: 'next', search_params: { q: { s: 'name desc', name_cont: 'A&B' } })

      assert_nil grid.virtual_total_count
      assert_equal 'q%5Bs%5D=name+desc&q%5Bname_cont%5D=A%26B', grid.virtual_search_params
    end

    test 'offset pagination remains the default and exposes the same total' do
      render_inline(DataGridComponent.new(rows: [{ id: 1 }], virtual: true,
                                          virtual_pagination: { total_count: 100, rows_url: '/rows' })) do |grid|
        grid.with_column('ID', key: :id)
      end

      assert_selector '[role="grid"][aria-rowcount="101"][data-pvc-data-grid-pagination-mode="offset"]'
      assert_selector '[role="grid"][data-pvc-data-grid-total-count="100"]'
      assert_selector '[data-pathogen--data-grid-target="paginationStatus"]'
      assert_no_selector '[data-pathogen--data-grid-target="paginationRefresh"]'
    end

    [false, true].each do |virtual|
      test "scalar renderer values remain plain text in virtual=#{virtual} mode" do
        values = [42, 3.5, false, nil, '<button>Untrusted</button>']
        render_inline(DataGridComponent.new(rows: values.map { |value| { value: } }, virtual:)) do |grid|
          grid.with_column('Value', renderer: ->(row, _index) { row[:value] })
        end

        cells = Nokogiri::HTML.fragment(rendered_content).css('[role="gridcell"]')
        cell_texts = cells.map { |cell| cell.text.strip }
        assert_equal values.map(&:to_s), cell_texts
        assert_selector '[role="gridcell"][data-pathogen--data-grid-has-interactive="false"]', count: values.size
        assert_no_selector '[role="gridcell"] button'
      end

      test "interactive headers enter the widget contract in virtual=#{virtual} mode" do
        render_inline(DataGridComponent.new(rows: [{ id: 1 }], virtual:)) do |grid|
          grid.with_column('Sample ID', key: :id, aria: { sort: 'ascending' },
                                        header_content: -> { helpers.button_tag('Sample ID', type: 'button') })
        end

        assert_selector '[role="columnheader"][aria-sort="ascending"]' \
                        '[data-pathogen--data-grid-has-interactive="true"][tabindex="-1"] button[tabindex="-1"]',
                        text: 'Sample ID'
        assert_no_selector '[role="gridcell"][aria-sort]'
      end
    end

    test 'plain header input stays escaped and is not marked interactive' do
      render_inline(DataGridComponent.new(rows: [{ id: 1 }])) do |grid|
        grid.with_column('Sample ID', key: :id, header_content: '<button>Untrusted</button>')
      end

      assert_selector '[role="columnheader"][data-pathogen--data-grid-has-interactive="false"]',
                      text: '<button>Untrusted</button>'
      assert_no_selector '[role="columnheader"] button'
    end

    private

    def helpers
      ActionController::Base.helpers
    end

    def cursor_grid(rows: [{ id: 1 }, { id: 2 }], **options)
      DataGridComponent.new(rows:, virtual: true,
                            virtual_pagination: { mode: :cursor, rows_url: '/samples/cursor_rows' }.merge(options))
    end

    def render_cursor(**options)
      render_inline(cursor_grid(**options)) { |grid| grid.with_column('Sample ID', key: :id, width: 160) }
    end
  end
end

# rubocop:enable Style/FormatStringToken
