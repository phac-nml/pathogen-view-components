# frozen_string_literal: true

module Pathogen
  module Form
    # Shared naming and ID rules for direct and Rails-backed form controls.
    module FormFieldAttributes
      private

      def shared_input_name(form:, attribute:, input_name: nil)
        return input_name.to_s if input_name.present?
        return "#{form.object_name}[#{attribute}]" if form&.object_name.present?

        attribute.to_s
      end

      def shared_input_id(form:, attribute:, value:, **options)
        input_name = options[:input_name]
        id = options[:id]
        include_value = options.fetch(:include_value, true)
        return id.to_s if id.present?

        name = shared_input_name(form:, attribute:, input_name:)
        base = if form&.object_name.present?
                 "#{form.object_name}_#{attribute}"
               else
                 name
               end
        base = "#{base}_#{value}" if include_value
        base.gsub(/[\[\]]+/, '_').chomp('_')
      end
    end
  end
end
