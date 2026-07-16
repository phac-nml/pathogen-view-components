# frozen_string_literal: true

module Demo
  # In-memory sample dataset for paginated virtual DataGrid previews.
  class SampleDataset
    COUNT = 5_000
    METRIC_COLUMN_COUNT = 95

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

    class << self
      def all
        @all ||= Array.new(COUNT) { |index| build_sample(index) }
      end

      def filter(params)
        query = params[:name_cont].to_s.strip
        return all if query.blank?

        all.select { |sample| sample[:name].downcase.include?(query.downcase) }
      end

      def page(page:, limit:)
        offset = (page - 1) * limit
        all.slice(offset, limit) || []
      end

      private

      def build_sample(index)
        direction = %w[North South East West Upper Lower Central Outer][index % 8]
        site = SITE_NAMES[index % SITE_NAMES.size]
        sample_number = index + 1

        {
          puid: format('SAM-%04d', sample_number),
          name: "#{direction} #{site}",
          organism: ORGANISMS[index % ORGANISMS.size],
          collected_at: (Date.new(2026, 1, 1) + index).to_s,
          status: STATUSES[index % STATUSES.size]
        }.merge(metric_fields(sample_number))
      end

      def metric_fields(sample_number)
        (1..METRIC_COLUMN_COUNT).to_h do |metric_index|
          [:"metric_#{metric_index}", format_metric(metric_index, sample_number)]
        end
      end

      def format_metric(metric_index, sample_number)
        "M#{metric_index}-#{(sample_number + metric_index) % 997}"
      end
    end
  end
end
