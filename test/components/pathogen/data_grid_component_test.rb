# frozen_string_literal: true

require 'view_component_test_case'

module Pathogen
  # Tests for Pathogen::DataGridComponent rendering behavior.
  class DataGridComponentTest < ViewComponentTestCase
    # rubocop:disable Metrics/BlockLength
    test 'renders grid with caption and sticky columns' do
      render_inline(Pathogen::DataGridComponent.new(
                      caption: 'Sample grid',
                      sticky_columns: 1,
                      rows: [
                        { id: 'S-001', name: 'Sample one' },
                        { id: 'S-002', name: 'Sample two' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_selector '.pathogen-data-grid__table[aria-labelledby]'
      assert_selector '.pathogen-data-grid__table[aria-describedby]'
      assert_selector '.pathogen-data-grid[data-controller~="pathogen--data-grid"]'
      assert_selector '.pathogen-data-grid__table[role="grid"]'
      assert_selector '.pathogen-data-grid__row[role="row"]', count: 3
      assert_selector '.pathogen-data-grid__caption', text: 'Sample grid'
      assert_no_selector '.pathogen-data-grid--multi-sticky'
      assert_selector 'th.pathogen-data-grid__cell--header[role="columnheader"][tabindex="-1"]'
      assert_selector 'th.pathogen-data-grid__cell--header > span.pathogen-data-grid__header-label', count: 2
      assert_selector 'th.pathogen-data-grid__cell--sticky[style*="--pathogen-data-grid-sticky-left: 0px"]'
      assert_selector 'td.pathogen-data-grid__cell--body[role="gridcell"]', text: 'Sample one'
      assert_selector 'tbody tr:first-child td:first-child[tabindex="0"]'
      assert_selector 'tbody tr:first-child td:nth-child(2)[tabindex="-1"]'
      assert_selector '.pathogen-data-grid__keyboard-help',
                      text: 'Keyboard: Arrow keys move cells; Enter or F2 enters controls; Escape returns to the grid.'
    end
    # rubocop:enable Metrics/BlockLength

    test 'adds multi sticky class when more than one sticky column is active' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 2,
                      rows: [
                        { id: 'S-050', name: 'Sample fifty', status: 'Active' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 220)
        grid.with_column('Status', key: :status)
      end

      assert_selector '.pathogen-data-grid.pathogen-data-grid--multi-sticky'
    end

    test 'adds fill class when fill_container is enabled' do
      render_inline(Pathogen::DataGridComponent.new(
                      fill_container: true,
                      rows: [
                        { id: 'S-061', name: 'Sample sixty-one' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name)
      end

      assert_selector '.pathogen-data-grid.pathogen-data-grid--fill'
      assert_selector '.pathogen-data-grid--fill > .pathogen-data-grid__scroll'
    end

    test 'uses default aria-label when no caption is provided' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-001', name: 'Sample one' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_no_selector '.pathogen-data-grid__caption'
      assert_no_selector '.pathogen-data-grid__table[aria-labelledby]'
      assert_selector '.pathogen-data-grid__table[aria-label="Data grid"]'
      assert_selector '.pathogen-data-grid__table[aria-describedby]'
    end

    test 'does not apply sticky when width is missing' do
      render_inline(Pathogen::DataGridComponent.new(
                      caption: 'Grid without widths',
                      sticky_columns: 1,
                      rows: [
                        { id: 'S-010', name: 'Sample zero' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id)
        grid.with_column('Name', key: :name)
      end

      assert_no_selector 'th.pathogen-data-grid__cell--sticky'
    end

    test 'renders custom cell blocks and defaults to key lookup' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-003', name: 'Sample three' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id)
        grid.with_column('Name') { |row| ActionController::Base.helpers.content_tag(:strong, row[:name]) }
      end

      assert_selector 'td.pathogen-data-grid__cell--body', text: 'S-003'
      assert_selector 'strong', text: 'Sample three'
    end

    test 'active cell owns roving tabindex even when it contains interactive elements' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-301' },
                        { id: 'S-302' }
                      ]
                    )) do |grid|
        grid.with_column('Actions') do |row|
          ActionController::Base.helpers.safe_join(
            [
              ActionController::Base.helpers.link_to("View #{row[:id]}", "/samples/#{row[:id]}"),
              ActionController::Base.helpers.button_tag("Edit #{row[:id]}", type: 'button')
            ],
            ' '
          )
        end
      end

      # The cell (not its interactive descendants) owns tabindex="0" as the roving
      # tabindex entry point. The controller transfers focus to interactive descendants
      # on Enter/F2 (widget mode), per WAI-ARIA grid pattern.
      assert_selector(
        'tbody tr:first-child td:first-child[tabindex="0"][data-pathogen--data-grid-has-interactive="true"]'
      )
      assert_selector 'tbody tr:first-child td:first-child a[tabindex="-1"]'
      assert_selector 'tbody tr:first-child td:first-child button[tabindex="-1"]'
      assert_selector 'tbody tr:nth-child(2) td:first-child a[tabindex="-1"]'
      assert_selector 'tbody tr:nth-child(2) td:first-child button[tabindex="-1"]'
    end

    test 'applies sticky left offset when provided without width' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-020', name: 'Sample twenty' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, sticky: true, sticky_left: 24)
        grid.with_column('Name', key: :name)
      end

      assert_selector 'th.pathogen-data-grid__cell--sticky[style*="--pathogen-data-grid-sticky-left: 24px"]'
    end

    test 'accepts sticky left offset values with CSS units' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-022', name: 'Sample twenty-two' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, sticky: true, sticky_left: 'calc(10ch + 8px)')
        grid.with_column('Name', key: :name)
      end

      assert_selector 'th.pathogen-data-grid__cell--sticky[style*="--pathogen-data-grid-sticky-left: calc(10ch + 8px)"]'
    end

    test 'normalizes numeric widths to px units' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-021', name: 'Sample twenty-one' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 96)
        grid.with_column('Name', key: :name, width: '180px')
      end

      assert_selector 'th[style*="--pathogen-data-grid-col-width: 96px"]'
      assert_selector 'th[style*="--pathogen-data-grid-col-width: 180px"]'
    end

    test 'renders custom header content when provided' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-030', name: 'Sample thirty' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, header_content: -> { 'Custom ID' })
        grid.with_column('Name', key: :name)
      end

      assert_selector 'th', text: 'Custom ID'
      assert_selector 'th', text: 'Name'
      assert_no_selector 'th span.pathogen-data-grid__header-label', text: 'Custom ID'
      assert_selector 'th span.pathogen-data-grid__header-label', text: 'Name'
    end

    test 'renders empty state when rows are blank' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: []
                    )) do |grid|
        grid.with_column('ID', key: :id)
        grid.with_empty_state { 'No rows' }
      end

      assert_selector '.pathogen-data-grid__scroll', text: 'No rows'
      assert_no_selector '.pathogen-data-grid__table'
    end

    test 'renders default empty state when rows are blank and no empty_state slot is provided' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: []
                    )) do |grid|
        grid.with_column('ID', key: :id)
      end

      assert_selector '.pathogen-data-grid__empty-state-text',
                      text: 'No rows found. Try adjusting filters or refreshing the data.'
      assert_no_selector '.pathogen-data-grid__table'
    end

    test 'renders default error state container for non-empty rows' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-001', name: 'Sample one' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_selector '.pathogen-data-grid__error-state[role="alert"][hidden]', visible: :all
      assert_selector '.pathogen-data-grid__error-state-title', text: 'Unable to load grid content', visible: :all
      assert_selector '.pathogen-data-grid__error-state-message',
                      text: 'Something went wrong while rendering this grid. Refresh or try again.',
                      visible: :all
      assert_selector '.pathogen-data-grid__state .pathogen-data-grid__table'
    end

    test 'renders custom error state slot content' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-001', name: 'Sample one' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_error_state do
          ActionController::Base.helpers.content_tag(:p, 'Custom runtime failure', class: 'custom-error-state')
        end
      end

      assert_selector '.pathogen-data-grid__error-state .custom-error-state',
                      text: 'Custom runtime failure',
                      visible: :all
    end

    test 'localizes default empty-state and keyboard-help copy' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::DataGridComponent.new(
                        sticky_columns: 0,
                        rows: [
                          { id: 'S-001', name: 'Sample one' }
                        ]
                      )) do |grid|
          grid.with_column('ID', key: :id, width: 120)
          grid.with_column('Name', key: :name, width: 200)
        end

        assert_selector '.pathogen-data-grid__keyboard-help',
                        text: 'Clavier : les flèches déplacent les cellules; ' \
                              'Entrée ou F2 active les contrôles; Échap revient à la grille.'
      end

      I18n.with_locale(:fr) do
        render_inline(Pathogen::DataGridComponent.new(
                        sticky_columns: 0,
                        rows: []
                      )) do |grid|
          grid.with_column('ID', key: :id)
        end

        assert_selector '.pathogen-data-grid__empty-state-text',
                        text: 'Aucune ligne trouvée. Essayez d’ajuster les filtres ou d’actualiser les données.'
      end
    end

    test 'localizes default error-state copy' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::DataGridComponent.new(
                        sticky_columns: 0,
                        rows: [
                          { id: 'S-001', name: 'Sample one' }
                        ]
                      )) do |grid|
          grid.with_column('ID', key: :id, width: 120)
        end

        assert_selector '.pathogen-data-grid__error-state-title',
                        text: 'Impossible de charger le contenu de la grille',
                        visible: :all
        assert_selector '.pathogen-data-grid__error-state-message',
                        text: 'Un problème est survenu pendant l’affichage de cette grille. ' \
                              'Actualisez la page ou réessayez.',
                        visible: :all
      end
    end

    test 'initial header cells are not tabbable' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-041', name: 'Sample forty-one' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id)
        grid.with_column('Name', key: :name)
      end

      assert_selector 'thead th[tabindex="-1"]', count: 2
    end

    test 'declarative interactive: true column marks cell as interactive' do
      render_inline(Pathogen::DataGridComponent.new(
                      rows: [{ name: 'Alpha' }]
                    )) do |grid|
        grid.with_column('Action', key: :name, interactive: true)
      end

      assert_selector 'td[data-pathogen--data-grid-has-interactive="true"]'
    end

    # rubocop:disable Metrics/BlockLength
    test 'renders live region, metadata warning, and footer slots outside scroll container' do
      render_inline(Pathogen::DataGridComponent.new(
                      sticky_columns: 0,
                      rows: [
                        { id: 'S-040', name: 'Sample forty' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id)
        grid.with_live_region do
          ActionController::Base.helpers.content_tag(:div, 'Live region', class: 'test-live-region')
        end
        grid.with_metadata_warning do
          ActionController::Base.helpers.content_tag(:div, 'Warning', class: 'test-metadata-warning')
        end
        grid.with_footer do
          ActionController::Base.helpers.content_tag(:div, 'Footer', class: 'test-footer')
        end
      end

      assert_selector '.pathogen-data-grid > .test-live-region'
      assert_selector '.pathogen-data-grid > .test-metadata-warning'
      assert_selector '.pathogen-data-grid > .pathogen-data-grid__scroll + .pathogen-data-grid__scroll-hint[hidden]',
                      visible: :all
      assert_selector(
        '.pathogen-data-grid > .pathogen-data-grid__scroll + .pathogen-data-grid__scroll-hint + ' \
        '.pathogen-data-grid__keyboard-help + .test-footer'
      )
      assert_selector '.pathogen-data-grid > .test-live-region + .test-metadata-warning + .pathogen-data-grid__scroll'
      assert_no_selector '.pathogen-data-grid__scroll .test-live-region'
      assert_no_selector '.pathogen-data-grid__scroll .test-metadata-warning'
      assert_no_selector '.pathogen-data-grid__scroll .test-footer'
    end
    # rubocop:enable Metrics/BlockLength

    # === Virtual mode tests ===

    test 'virtual mode renders div-based grid instead of table elements' do
      render_inline(Pathogen::DataGridComponent.new(
                      caption: 'Virtual grid',
                      virtual: true,
                      rows: [
                        { id: 'S-001', name: 'Sample one' },
                        { id: 'S-002', name: 'Sample two' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      # No native table elements
      assert_no_selector 'table'
      assert_no_selector 'thead'
      assert_no_selector 'tbody'
      assert_no_selector 'tr'
      assert_no_selector 'th'
      assert_no_selector 'td'

      # Div-based grid with ARIA roles
      assert_selector '.pathogen-data-grid--virtual'
      assert_selector 'div[role="grid"]'
      assert_selector 'div[role="grid"][aria-describedby]'
      assert_selector 'div[role="row"]', count: 3 # 1 header + 2 body rows
      assert_selector 'div[role="columnheader"]', count: 2
      assert_selector 'div[role="gridcell"]', count: 4 # 2 rows × 2 columns
      assert_selector '.pathogen-data-grid__virtual-status', text: 'Loading rows…'

      # Caption
      assert_selector '.pathogen-data-grid__caption', text: 'Virtual grid'
    end

    test 'virtual mode localizes status copy and exposes translated data attributes' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::DataGridComponent.new(
                        caption: 'Grille virtuelle',
                        virtual: true,
                        rows: [
                          { id: 'S-001', name: 'Sample one' }
                        ]
                      )) do |grid|
          grid.with_column('ID', key: :id, width: 120)
        end

        assert_selector '.pathogen-data-grid__virtual-status',
                        text: 'Chargement des lignes…'
        assert_selector '.pathogen-data-grid__virtual-status[data-loaded-text="Lignes chargées."]'
      end
    end

    test 'virtual mode sets aria-rowcount and aria-colcount on the grid' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [
                        { id: 'S-001', name: 'Alpha' },
                        { id: 'S-002', name: 'Beta' },
                        { id: 'S-003', name: 'Gamma' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_selector 'div[role="grid"][aria-rowcount="4"]' # 3 data + 1 header
      assert_selector 'div[role="grid"][aria-colcount="2"]'
    end

    test 'virtual mode sets aria-rowindex on each row' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [
                        { id: 'S-001', name: 'Alpha' },
                        { id: 'S-002', name: 'Beta' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      # Header row has aria-rowindex 1 (ARIA 1-based)
      assert_selector 'div[role="row"][aria-rowindex="1"] div[role="columnheader"]'
      # Data rows
      assert_selector 'div[role="row"][aria-rowindex="2"] div[role="gridcell"]'
      assert_selector 'div[role="row"][aria-rowindex="3"] div[role="gridcell"]'
    end

    test 'virtual mode preserves roving tabindex with first body cell active' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [
                        { id: 'S-001', name: 'Alpha' },
                        { id: 'S-002', name: 'Beta' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      # First body cell is active (tabindex="0")
      assert_selector 'div[role="gridcell"][tabindex="0"]', count: 1
      # All other cells are tabindex="-1"
      assert_selector 'div[role="gridcell"][tabindex="-1"]', count: 3
      assert_selector 'div[role="columnheader"][tabindex="-1"]', count: 2
    end

    test 'virtual mode applies data-grid Stimulus controller' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [{ id: 'S-001' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
      end

      assert_selector '.pathogen-data-grid[data-controller~="pathogen--data-grid"]'
      assert_selector 'div[data-pathogen--data-grid-target="grid"]'
      assert_selector 'div[data-pathogen--data-grid-target="scrollContainer"]'
    end

    test 'virtual mode exposes lane metadata contract on grid root' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      sticky_columns: 1,
                      rows: [{ id: 'S-001', name: 'Alpha' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_selector(
        'div[role="grid"]' \
        '[data-pathogen-data-grid-row-height]' \
        '[data-pathogen-data-grid-row-overscan]' \
        '[data-pathogen-data-grid-column-overscan]' \
        '[data-pathogen-data-grid-pinned-count]' \
        '[data-pathogen-data-grid-column-widths]'
      )
    end

    test 'virtual mode cell data attributes match non-virtual convention' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [{ id: 'S-001', name: 'Alpha' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_selector(
        'div[role="gridcell"]' \
        '[data-pathogen--data-grid-target="cell"]' \
        '[data-pathogen--data-grid-row-index="1"]' \
        '[data-pathogen--data-grid-column-index="0"]' \
        '[data-pathogen--data-grid-has-interactive="false"]'
      )
      assert_selector(
        'div[role="gridcell"]' \
        '[data-pathogen--data-grid-row-index="1"]' \
        '[data-pathogen--data-grid-column-index="1"]'
      )
    end

    test 'virtual mode renders pinned and center lanes with stable logical column hooks' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      sticky_columns: 1,
                      rows: [{ id: 'S-001', name: 'Alpha', status: 'Ready' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
        grid.with_column('Status', key: :status, width: 160)
      end

      assert_selector '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="pinned"]'
      assert_selector '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"]'
      assert_selector(
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"] ' \
        'div[role="columnheader"][data-pathogen-data-grid-virtual-col-index="1"]'
      )
      assert_selector(
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"] ' \
        'div[role="gridcell"][data-pathogen-data-grid-virtual-col-index="2"]'
      )
      assert_no_selector(
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="pinned"] ' \
        '[data-pathogen-data-grid-virtual-col-index]'
      )
    end

    test 'virtual mode preserves global aria-colindex values across lane split' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      sticky_columns: 1,
                      rows: [{ id: 'S-001', name: 'Alpha', status: 'Ready' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
        grid.with_column('Status', key: :status, width: 160)
      end

      assert_selector 'div[role="columnheader"][aria-colindex="1"]', text: 'ID'
      assert_selector 'div[role="columnheader"][aria-colindex="2"]', text: 'Name'
      assert_selector 'div[role="columnheader"][aria-colindex="3"]', text: 'Status'
      assert_selector 'div[role="row"][aria-rowindex="2"] div[role="gridcell"][aria-colindex="3"]', text: 'Ready'
    end

    test 'virtual mode renders interactive cells with tabindex on descendants' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [{ id: 'S-301' }]
                    )) do |grid|
        grid.with_column('Actions') do |row|
          ActionController::Base.helpers.safe_join(
            [
              ActionController::Base.helpers.link_to("View #{row[:id]}", "/samples/#{row[:id]}"),
              ActionController::Base.helpers.button_tag("Edit #{row[:id]}", type: 'button')
            ],
            ' '
          )
        end
      end

      assert_selector(
        'div[role="gridcell"][tabindex="0"][data-pathogen--data-grid-has-interactive="true"]'
      )
      assert_selector 'div[role="gridcell"] a[tabindex="-1"]'
      assert_selector 'div[role="gridcell"] button[tabindex="-1"]'
    end

    test 'virtual mode renders viewport and spacer for scroll virtualization' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [
                        { id: 'S-001', name: 'Alpha' },
                        { id: 'S-002', name: 'Beta' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      # Body region has a viewport container and spacer for virtual scrolling
      assert_selector '.pathogen-data-grid__viewport'
      assert_selector '.pathogen-data-grid__spacer'
    end

    test 'virtual mode renders empty state when rows are blank' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: []
                    )) do |grid|
        grid.with_column('ID', key: :id)
        grid.with_empty_state { 'No rows' }
      end

      assert_selector '.pathogen-data-grid__scroll', text: 'No rows'
      assert_no_selector 'div[role="grid"]'
    end

    test 'virtual mode with fill_container applies fill class' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      fill_container: true,
                      rows: [{ id: 'S-001' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
      end

      assert_selector '.pathogen-data-grid.pathogen-data-grid--fill.pathogen-data-grid--virtual'
    end

    test 'virtual mode with empty rows and no empty_state slot renders default empty state' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: []
                    )) do |grid|
        grid.with_column('ID', key: :id)
      end

      assert_selector '.pathogen-data-grid__empty-state-text',
                      text: 'No rows found. Try adjusting filters or refreshing the data.'
      assert_no_selector 'div[role="grid"]'
      assert_no_selector '.pathogen-data-grid__viewport'
    end

    test 'virtual mode uses grid-template-columns style from column widths' do
      render_inline(Pathogen::DataGridComponent.new(
                      virtual: true,
                      rows: [{ id: 'S-001', name: 'Alpha' }]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 200)
      end

      assert_selector 'div[role="row"][style*="grid-template-columns"]'
    end
  end
end
