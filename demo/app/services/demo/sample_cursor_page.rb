# frozen_string_literal: true

module Demo
  # Illustrative ID-based seek over the immutable demo array, not a SQL/Pagy keyset query.
  class SampleCursorPage
    class CursorMismatch < StandardError; end

    attr_reader :rows, :offset, :next_cursor

    def initialize(limit:, cursor: nil, query: nil)
      @limit = limit
      @query = query.to_s.strip
      continuation = decode(cursor)
      @offset = continuation.fetch('offset', 0)
      remaining = SampleDataset.filter(name_cont: @query)
      remaining = remaining.drop_while { |row| row[:puid] <= continuation['after'] } if continuation['after']
      batch = remaining.first(limit + 1)
      @rows = batch.first(limit)
      @next_cursor = encode if batch.size > limit
    end

    private

    def verifier
      Rails.application.message_verifier('demo-sample-grid-cursor')
    end

    def decode(cursor)
      return {} if cursor.nil?

      payload = verifier.verified(cursor, purpose: 'demo-sample-grid')
      unless payload.is_a?(Hash) && payload['query'] == @query && payload['limit'] == @limit
        raise CursorMismatch, 'The cursor does not match these results'
      end

      payload
    end

    def encode
      verifier.generate(
        { 'after' => @rows.last.fetch(:puid), 'offset' => @offset + @rows.size,
          'query' => @query, 'limit' => @limit },
        purpose: 'demo-sample-grid'
      )
    end
  end
end
