# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module DataGrid
    # Unit tests for VirtualDataset normalization and validation.
    class VirtualDatasetTest < ActiveSupport::TestCase
      # ── build ──────────────────────────────────────────────────────────────

      test 'returns nil for nil input' do
        assert_nil VirtualDataset.build(nil)
      end

      test 'returns nil for invalid mode' do
        assert_nil VirtualDataset.build({ mode: 'invalid', rowCount: 10, columns: [{ id: 'x', label: 'X' }] })
      end

      test 'returns nil when columns are empty' do
        assert_nil VirtualDataset.build({ mode: 'synthetic', rowCount: 10, columns: [] })
      end

      test 'returns nil when rowCount is zero or missing for synthetic mode' do
        assert_nil VirtualDataset.build({ mode: 'synthetic', rowCount: 0, columns: [{ id: 'x', label: 'X' }] })
        assert_nil VirtualDataset.build({ mode: 'synthetic', columns: [{ id: 'x', label: 'X' }] })
      end

      test 'builds valid synthetic dataset with camelCase keys' do
        result = VirtualDataset.build({
                                        mode: 'synthetic',
                                        rowCount: 500,
                                        columns: [{ id: 'sample_id', label: 'Sample ID', width: 180 }]
                                      })

        assert_not_nil result
        assert_equal 'synthetic', result[:mode]
        assert_equal 500, result[:row_count]
        assert_nil result[:rows]
      end

      test 'builds valid static dataset and infers row_count from rows array' do
        result = VirtualDataset.build({
                                        mode: 'static',
                                        columns: [{ id: 'id', label: 'ID' }],
                                        rows: [
                                          { id: 'r1', cells: { id: 'A' } },
                                          { id: 'r2', cells: { id: 'B' } }
                                        ]
                                      })

        assert_not_nil result
        assert_equal 'static', result[:mode]
        assert_equal 2, result[:row_count]
        assert_equal 2, result[:rows].size
      end

      # ── normalize_key ──────────────────────────────────────────────────────

      test 'normalizes camelCase keys to snake_case' do
        assert_equal :row_count, VirtualDataset.normalize_key('rowCount')
        assert_equal :sample_name, VirtualDataset.normalize_key('sampleName')
      end

      test 'normalizes all-caps abbreviations correctly' do
        assert_equal :row_id, VirtualDataset.normalize_key('rowID')
        assert_equal :url_path, VirtualDataset.normalize_key('URLPath')
        assert_equal :id, VirtualDataset.normalize_key('ID')
      end

      test 'normalizes symbol keys' do
        assert_equal :row_count, VirtualDataset.normalize_key(:rowCount)
      end

      # ── normalize_columns ─────────────────────────────────────────────────

      test 'skips columns with blank id' do
        result = VirtualDataset.normalize_columns([
                                                    { id: '', label: 'Bad' },
                                                    { id: 'good', label: 'Good' }
                                                  ])
        assert_equal 1, result.size
        assert_equal 'good', result[0][:id]
      end

      test 'applies default width and label when missing' do
        result = VirtualDataset.normalize_columns([{ id: 'x' }])
        assert_equal VirtualDataset::DEFAULT_COLUMN_WIDTH, result[0][:width]
        assert_equal 'Column 1', result[0][:label]
      end

      test 'marks column interactive when kind is link or button' do
        link_col = VirtualDataset.normalize_columns([{ id: 'a', kind: 'link' }]).first
        button_col = VirtualDataset.normalize_columns([{ id: 'b', kind: 'button' }]).first
        assert link_col[:interactive]
        assert button_col[:interactive]
      end

      # ── normalize_rows ────────────────────────────────────────────────────

      test 'clamps rows to row_count' do
        rows = Array.new(5) { |i| { id: "r#{i}", cells: { x: i } } }
        result = VirtualDataset.normalize_rows(rows, 3)
        assert_equal 3, result.size
      end

      test 'normalizes row cells keys to strings' do
        result = VirtualDataset.normalize_rows([{ id: 'r1', cells: { sample_id: 'S1' } }], 1)
        assert_equal({ 'sample_id' => 'S1' }, result[0][:cells])
      end

      test 'assigns fallback id when row id is blank' do
        result = VirtualDataset.normalize_rows([{ cells: { x: 'v' } }], 1)
        assert_equal 'row-1', result[0][:id]
      end

      # ── truthy? ───────────────────────────────────────────────────────────

      test 'truthy? returns true for recognised truthy values' do
        [true, 1, '1', 'true', 'TRUE'].each do |v|
          assert VirtualDataset.truthy?(v), "expected #{v.inspect} to be truthy"
        end
      end

      test 'truthy? returns false for everything else' do
        [false, nil, 0, '', 'yes', 'on'].each do |v|
          assert_not VirtualDataset.truthy?(v), "expected #{v.inspect} to be falsy"
        end
      end
    end
  end
end
