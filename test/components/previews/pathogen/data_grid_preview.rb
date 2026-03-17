# frozen_string_literal: true

module Pathogen
  # @label Data Grid
  class DataGridPreview < ViewComponent::Preview
    # @label Default
    def default
      render Pathogen::DataGridComponent.new(
        aria: { label: 'Sample inventory' },
        sticky_columns: 1,
        rows: ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name') { |row| tag.strong(row[:name]) }
        grid.with_column('Organism', key: :organism)
        grid.with_column('Collected') { |row| tag.time(row[:collected_at]) }
        grid.with_column('Notes', key: :notes)
      end
    end

    # @label Virtual Grid (1000 rows)
    def virtual_grid
      render Pathogen::DataGridComponent.new(
        aria: { label: 'Virtual grid with 1,000 rows' },
        fill_container: true,
        rows: VIRTUAL_ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Collected', key: :collected_at, width: 160)
        grid.with_column('Actions', width: 240) { |row| interactive_actions(row) }
      end
    end

    # @label Fixed Window (Horizontal + Vertical Scroll)
    def fixed_window_scroll
      render Pathogen::DataGridComponent.new(
        aria: { label: 'Dual-axis scrolling grid' },
        sticky_columns: 1,
        fill_container: true,
        style: 'width: 100%; height: min(70vh, 34rem);',
        rows: VIRTUAL_ROWS[0..99]
      ) do |grid|
        build_fixed_window_base_columns(grid)
        build_fixed_window_metric_columns(grid, count: 20)
      end
    end

    ROWS = [
      {
        sample_id: 'SAM-0001',
        name: 'Northern lake isolate',
        organism: 'Listeria monocytogenes',
        collected_at: '2026-01-18',
        notes: 'Long content to demonstrate auto column sizing.'
      },
      {
        sample_id: 'SAM-0002',
        name: 'Coastal sediment sample',
        organism: 'Vibrio parahaemolyticus',
        collected_at: '2026-01-24',
        notes: 'Validates overlap handling with sticky columns.'
      },
      {
        sample_id: 'SAM-0003',
        name: 'Prairie field isolate',
        organism: 'Campylobacter jejuni',
        collected_at: '2026-01-30',
        notes: 'Overflow behavior and sticky boundary test.'
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

    def build_fixed_window_metric_columns(grid, count: 100)
      (1..count).each do |index|
        grid.with_column("Metric #{index}", width: 140) { |row| fixed_window_metric(row, index) }
      end
    end

    def fixed_window_metric(row, index)
      sample_number = row[:sample_id].delete('^0-9').to_i
      "M#{index}-#{(sample_number + index) % 997}"
    end

    def interactive_actions(row)
      helpers = ActionController::Base.helpers

      helpers.safe_join(
        [
          helpers.link_to('View', "/samples/#{row[:sample_id]}", class: 'pathogen-u-link'),
          helpers.render(Pathogen::Button.new(type: :button, size: :small)) do
            'Inspect'
          end
        ],
        ' '
      )
    end
  end
end
