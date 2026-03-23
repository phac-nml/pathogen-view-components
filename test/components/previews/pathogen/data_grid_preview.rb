# frozen_string_literal: true

module Pathogen
  # @label Data Grid
  class DataGridPreview < ViewComponent::Preview
    # @label Basic
    def basic
      render Pathogen::DataGridComponent.new(
        caption: 'Sample inventory (sticky columns preview)',
        sticky_columns: 2,
        rows: ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 140)
        grid.with_column('Name', key: :name)
        grid.with_column('Organism', key: :organism)
        grid.with_column('Collected', key: :collected_at)
        grid.with_column('Notes', key: :notes)
      end
    end

    # @label Without Caption
    def without_caption
      render Pathogen::DataGridComponent.new(
        sticky_columns: 1,
        rows: [
          { id: 'S-001', name: 'Sample one', status: 'Active' },
          { id: 'S-002', name: 'Sample two', status: 'Pending' }
        ]
      ) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name)
        grid.with_column('Status', key: :status)
      end
    end

    # @label No Sticky Columns
    def no_sticky_columns
      render Pathogen::DataGridComponent.new(
        caption: 'Non-sticky grid',
        sticky_columns: 0,
        rows: [
          { sample_id: 'SAM-0101', name: 'Forest isolate', organism: 'E. coli' },
          { sample_id: 'SAM-0102', name: 'Wetland isolate', organism: 'Salmonella enterica' }
        ]
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id)
        grid.with_column('Name', key: :name)
        grid.with_column('Organism', key: :organism)
      end
    end

    # @label Custom Cells
    def custom_cells
      render Pathogen::DataGridComponent.new(
        caption: 'Custom cell rendering',
        sticky_columns: 1,
        rows: [
          { id: 'S-101', name: 'Aurora basin', status: 'Active', collected_at: '2026-01-19' },
          { id: 'S-102', name: 'Prairie creek', status: 'Pending', collected_at: '2026-01-27' }
        ]
      ) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name') { |row| tag.strong(row[:name]) }
        grid.with_column('Status') { |row| tag.span(row[:status], title: "Status: #{row[:status]}") }
        grid.with_column('Collected') { |row| tag.time(row[:collected_at]) }
      end
    end

    # @label Keyboard Navigation
    def keyboard_navigation
      render Pathogen::DataGridComponent.new(
        caption: 'Keyboard navigation exercise grid',
        sticky_columns: 1,
        rows: NAVIGATION_ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Collected', key: :collected_at, width: 160)
        grid.with_column('Status', key: :status, width: 140)
      end
    end

    # @label Keyboard Navigation with Interactive Cells
    def keyboard_navigation_with_interactive_cells
      render Pathogen::DataGridComponent.new(
        caption: 'Keyboard navigation with interactive cell content',
        sticky_columns: 1,
        rows: NAVIGATION_ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Actions', width: 240) { |row| interactive_actions(row) }
      end
    end

    # @label Virtual Grid (1000 rows)
    def virtual_grid
      render Pathogen::DataGridComponent.new(
        caption: 'Virtual grid with 1,000 rows',
        virtual: true,
        fill_container: true,
        rows: VIRTUAL_ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Collected', key: :collected_at, width: 160)
        grid.with_column('Status', key: :status, width: 140)
      end
    end

    # @label Virtual Grid with Interactive Cells
    def virtual_grid_with_interactive_cells
      render Pathogen::DataGridComponent.new(
        caption: 'Virtual grid with interactive cell content',
        virtual: true,
        fill_container: true,
        rows: VIRTUAL_ROWS[0..99]
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Actions', width: 240) { |row| interactive_actions(row) }
      end
    end

    # @label Fixed Window (Horizontal + Vertical Scroll)
    def fixed_window_scroll
      render Pathogen::DataGridComponent.new(
        caption: 'Responsive viewport with horizontal and vertical scrolling',
        sticky_columns: 1,
        fill_container: true,
        style: 'width: 100%; height: min(56vh, 26rem);',
        virtual: true,
        rows: VIRTUAL_ROWS.first(FIXED_WINDOW_ROW_COUNT)
      ) do |grid|
        build_fixed_window_base_columns(grid)
        build_fixed_window_metric_columns(grid)
      end
    end

    ROWS = [
      {
        sample_id: 'SAM-0001',
        name: 'Northern lake isolate with extended name',
        organism: 'Listeria monocytogenes',
        collected_at: '2026-01-18',
        notes: 'Text spacing test: long content stays on one line to demonstrate auto column sizing.'
      },
      {
        sample_id: 'SAM-0002',
        name: 'Coastal sediment sample',
        organism: 'Vibrio parahaemolyticus',
        collected_at: '2026-01-24',
        notes: 'Longer notes area to validate overlap handling when sticky columns are enabled.'
      },
      {
        sample_id: 'SAM-0003',
        name: 'Prairie field isolate',
        organism: 'Campylobacter jejuni',
        collected_at: '2026-01-30',
        notes: 'Additional notes to showcase overflow behavior and sticky boundary.'
      }
    ].freeze

    NAVIGATION_ROWS = [
      {
        sample_id: 'SAM-1001', name: 'Northeast basin', organism: 'Listeria monocytogenes',
        collected_at: '2026-01-02', status: 'Review'
      },
      {
        sample_id: 'SAM-1002', name: 'East channel', organism: 'Salmonella enterica',
        collected_at: '2026-01-04', status: 'Active'
      },
      {
        sample_id: 'SAM-1003', name: 'South marsh', organism: 'Campylobacter jejuni',
        collected_at: '2026-01-05', status: 'Queued'
      },
      {
        sample_id: 'SAM-1004', name: 'West bank', organism: 'Vibrio parahaemolyticus',
        collected_at: '2026-01-07', status: 'Review'
      },
      {
        sample_id: 'SAM-1005', name: 'Delta terrace', organism: 'Escherichia coli',
        collected_at: '2026-01-09', status: 'Active'
      },
      {
        sample_id: 'SAM-1006', name: 'Upper inlet', organism: 'Yersinia enterocolitica',
        collected_at: '2026-01-10', status: 'Queued'
      },
      {
        sample_id: 'SAM-1007', name: 'Lower inlet', organism: 'Shigella sonnei',
        collected_at: '2026-01-12', status: 'Review'
      },
      {
        sample_id: 'SAM-1008', name: 'Pine ridge', organism: 'Bacillus cereus',
        collected_at: '2026-01-13', status: 'Active'
      },
      {
        sample_id: 'SAM-1009', name: 'Cedar ridge', organism: 'Staphylococcus aureus',
        collected_at: '2026-01-15', status: 'Queued'
      },
      {
        sample_id: 'SAM-1010', name: 'Willow ridge', organism: 'Klebsiella pneumoniae',
        collected_at: '2026-01-16', status: 'Review'
      },
      {
        sample_id: 'SAM-1011', name: 'North reserve', organism: 'Pseudomonas aeruginosa',
        collected_at: '2026-01-18', status: 'Active'
      },
      {
        sample_id: 'SAM-1012', name: 'South reserve', organism: 'Enterococcus faecalis',
        collected_at: '2026-01-19', status: 'Queued'
      }
    ].freeze

    ORGANISMS = [
      'Listeria monocytogenes',
      'Salmonella enterica',
      'Campylobacter jejuni',
      'Vibrio parahaemolyticus',
      'Escherichia coli',
      'Yersinia enterocolitica',
      'Shigella sonnei',
      'Bacillus cereus',
      'Staphylococcus aureus',
      'Klebsiella pneumoniae',
      'Pseudomonas aeruginosa',
      'Enterococcus faecalis'
    ].freeze

    SITE_NAMES = %w[
      Basin Channel Marsh Bank Terrace Inlet Ridge Reserve
      Creek Valley Plateau Delta Estuary Lagoon Fjord
    ].freeze

    STATUSES = %w[Active Review Queued Pending Complete].freeze
    FIXED_WINDOW_ROW_COUNT = 120
    FIXED_WINDOW_METRIC_COLUMN_COUNT = 24

    VIRTUAL_ROWS = Array.new(1_000) do |i|
      {
        sample_id: format('SAM-%04d', i + 1),
        name: "#{%w[North South East West Upper Lower Central Outer][i % 8]} #{SITE_NAMES[i % SITE_NAMES.size]}",
        organism: ORGANISMS[i % ORGANISMS.size],
        collected_at: (Date.new(2026, 1, 1) + i).to_s,
        status: STATUSES[i % STATUSES.size]
      }
    end.freeze

    private

    def build_fixed_window_base_columns(grid)
      grid.with_column('Sample ID', key: :sample_id, width: 170)
      grid.with_column('Name', key: :name, width: 260)
      grid.with_column('Organism', key: :organism, width: 240)
      grid.with_column('Collected', key: :collected_at, width: 170)
      grid.with_column('Status', key: :status, width: 160)
      grid.with_column('Site', width: 200) { |row| row[:name].split.last }
      grid.with_column('Region', width: 220) { |row| row[:name].split.first }
    end

    def build_fixed_window_metric_columns(grid)
      (1..FIXED_WINDOW_METRIC_COLUMN_COUNT).each do |index|
        grid.with_column("Metric #{index}", width: 140) { |row| fixed_window_metric(row, index) }
      end
    end

    def fixed_window_metric(row, index)
      sample_number = row[:sample_id].delete('^0-9').to_i
      "M#{index}-#{(sample_number + index) % 997}"
    end

    # rubocop:disable Metrics/MethodLength
    def interactive_actions(row)
      helpers = ActionController::Base.helpers
      sample_id = row[:sample_id]

      helpers.safe_join(
        [
          helpers.link_to(
            "View #{sample_id}",
            "/samples/#{sample_id}",
            class: 'pathogen-u-link',
            aria: { label: "View sample #{sample_id}" }
          ),
          helpers.render(
            Pathogen::Button.new(
              type: :button,
              size: :small,
              aria: { label: "Inspect sample #{sample_id}" }
            )
          ) do
            "Inspect #{sample_id}"
          end
        ],
        ' '
      )
    end
    # rubocop:enable Metrics/MethodLength
  end
end
