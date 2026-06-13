# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Renders the virtualized div-grid state for DataGridComponent.
    class VirtualStateComponent < StateComponent
      VIRTUAL_STATUS_CLASSES = %w[
        hidden items-center gap-2
        py-2.5 px-[var(--pvc-data-grid-cell-padding-x)]
        text-[var(--pvc-data-grid-text-muted-color)]
        text-[length:var(--pvc-data-grid-font-size)]
        leading-[var(--pvc-data-grid-line-height)]
      ].freeze

      VIRTUAL_ROW_CLASSES = %w[
        flex min-w-max
      ].freeze

      VIRTUAL_HEADER_ROW_CLASSES = %w[
        sticky top-0 z-[var(--pvc-data-grid-header-z)] bg-[var(--pvc-data-grid-header-bg)]
      ].freeze

      VIRTUAL_LANE_CLASSES = %w[
        grid items-stretch
      ].freeze

      VIRTUAL_LANE_PINNED_CLASSES = %w[
        sticky left-0 z-[calc(var(--pvc-data-grid-sticky-z)+1)] bg-[var(--pvc-data-grid-body-bg)]
      ].freeze

      VIRTUAL_LANE_CENTER_CLASSES = %w[
        flex-1 min-w-max bg-[var(--pvc-data-grid-body-bg)]
      ].freeze

      VIRTUAL_HEADER_LANE_PINNED_CLASSES = %w[
        z-[calc(var(--pvc-data-grid-header-z)+2)] bg-[var(--pvc-data-grid-header-bg)]
      ].freeze

      VIRTUAL_HEADER_LANE_CENTER_CLASSES = %w[
        bg-[var(--pvc-data-grid-header-bg)]
      ].freeze

      VIEWPORT_CLASSES = %w[
        relative overflow-clip [contain:layout_style]
      ].freeze

      SPACER_CLASSES = %w[
        w-px pointer-events-none invisible
      ].freeze

      def virtual_status_classes
        class_names('pvc-data-grid__virtual-status', *VIRTUAL_STATUS_CLASSES)
      end

      def header_row_classes
        class_names(
          'pvc-data-grid__row',
          'pvc-data-grid__row--header',
          *VIRTUAL_ROW_CLASSES,
          *VIRTUAL_HEADER_ROW_CLASSES
        )
      end

      def body_row_classes
        class_names('pvc-data-grid__row', *VIRTUAL_ROW_CLASSES)
      end

      def header_pinned_lane_classes
        class_names(
          'pvc-data-grid__lane',
          'pvc-data-grid__lane--pinned',
          *VIRTUAL_LANE_CLASSES,
          *VIRTUAL_LANE_PINNED_CLASSES,
          *VIRTUAL_HEADER_LANE_PINNED_CLASSES
        )
      end

      def header_center_lane_classes
        class_names(
          'pvc-data-grid__lane',
          'pvc-data-grid__lane--center',
          *VIRTUAL_LANE_CLASSES,
          *VIRTUAL_LANE_CENTER_CLASSES,
          *VIRTUAL_HEADER_LANE_CENTER_CLASSES
        )
      end

      def body_pinned_lane_classes
        class_names(
          'pvc-data-grid__lane',
          'pvc-data-grid__lane--pinned',
          *VIRTUAL_LANE_CLASSES,
          *VIRTUAL_LANE_PINNED_CLASSES
        )
      end

      def body_center_lane_classes
        class_names(
          'pvc-data-grid__lane',
          'pvc-data-grid__lane--center',
          *VIRTUAL_LANE_CLASSES,
          *VIRTUAL_LANE_CENTER_CLASSES
        )
      end

      def viewport_classes
        class_names('pvc-data-grid__viewport', *VIEWPORT_CLASSES)
      end

      def spacer_classes
        class_names('pvc-data-grid__spacer', *SPACER_CLASSES)
      end
    end
  end
end
