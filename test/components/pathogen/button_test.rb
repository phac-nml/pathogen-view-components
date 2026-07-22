# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ButtonTest < ViewComponent::TestCase
    test 'medium size uses 44px touch target' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.inline-flex.min-h-11.min-w-11.items-center[class*="rounded-[var(--pvc-radius-action)]"]',
                      text: 'Click me'
    end

    test 'default tone and emphasis map to neutral outline semantic tokens' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector "button[class*='border-[var(--pvc-color-border-strong)]']"
      assert_selector "button[class*='bg-[var(--pvc-color-surface)]']"
      assert_selector "button[class*='text-[var(--pvc-color-text)]']"
    end

    test 'primary solid emits primary solid without shadow' do
      render_inline(Pathogen::Button.new(tone: :primary, emphasis: :solid)) { 'Submit' }

      assert_selector "button[class*='bg-[var(--pvc-color-accent-solid)]']"
      assert_selector "button[class*='text-white']"
      assert_no_selector "button[class*='shadow-sm']"
    end

    test 'danger outline emits danger outline semantic tokens' do
      render_inline(Pathogen::Button.new(tone: :danger, emphasis: :outline)) { 'Delete' }

      assert_selector "button[class*='text-[var(--pvc-color-danger-strong)]']"
      assert_selector "button[class*='bg-[var(--pvc-color-surface)]']"
    end

    test 'tone primary emphasis solid emits primary solid classes' do
      render_inline(Pathogen::Button.new(tone: :primary, emphasis: :solid)) { 'Submit' }

      assert_selector "button[class*='bg-[var(--pvc-color-accent-solid)]']"
    end

    test 'tone neutral emphasis ghost emits quiet classes' do
      render_inline(Pathogen::Button.new(tone: :neutral, emphasis: :ghost)) { 'Cancel' }

      assert_selector "button[class*='bg-transparent']"
      assert_selector "button[class*='border-transparent']"
    end

    test 'tone danger emphasis solid emits solid destructive classes' do
      render_inline(Pathogen::Button.new(tone: :danger, emphasis: :solid)) { 'Delete' }

      assert_selector "button[class*='bg-[var(--pvc-color-danger-solid)]']"
      assert_selector "button[class*='text-white']"
    end

    test 'tone and emphasis are applied independently' do
      render_inline(Pathogen::Button.new(tone: :neutral, emphasis: :ghost)) { 'Back' }

      assert_selector "button[class*='bg-transparent']"
      assert_no_selector "button[class*='bg-[var(--pvc-color-accent-solid)]']"
    end

    test 'tone without emphasis uses outline emphasis for requested tone' do
      render_inline(Pathogen::Button.new(tone: :primary)) { 'Save draft' }

      assert_selector "button[class*='text-[var(--pvc-color-accent-strong)]']"
      assert_selector "button[class*='border-[var(--pvc-color-accent)]']"
      assert_no_selector "button[class*='bg-[var(--pvc-color-accent-solid)]']"
    end

    test 'emphasis without tone uses neutral tone' do
      render_inline(Pathogen::Button.new(emphasis: :solid)) { 'Proceed' }

      assert_selector "button[class*='bg-[var(--pvc-color-text)]']"
      assert_selector "button[class*='text-[var(--pvc-color-surface)]']"
    end

    test 'medium size padding by default' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.px-3.py-2.text-sm'
    end

    test 'small size uses 24px AA minimum touch target and balanced padding' do
      render_inline(Pathogen::Button.new(size: :small)) { 'Small' }

      assert_selector 'button.min-h-6.min-w-6'
      assert_selector 'button.px-2.py-1.text-xs'
    end

    test 'block layout is full width flex' do
      render_inline(Pathogen::Button.new(block: true)) { 'Block button' }

      assert_selector 'button.flex.w-full'
    end

    test 'renders disabled button' do
      render_inline(Pathogen::Button.new(disabled: true)) { 'Disabled' }

      assert_selector 'button[disabled]'
    end

    test 'emits expected Tailwind utility classes for primary small' do
      render_inline(Pathogen::Button.new(tone: :primary, emphasis: :solid, size: :small)) { 'Submit' }

      assert_selector "button[class*='text-white']"
      assert_selector 'button.text-xs'
    end

    test 'all tone and emphasis combinations emit token-backed focus outline classes' do
      Pathogen::Button::TONE_OPTIONS.product(Pathogen::Button::EMPHASIS_OPTIONS).each do |tone, emphasis|
        render_inline(Pathogen::Button.new(tone: tone, emphasis: emphasis)) { "#{tone} #{emphasis}" }

        assert_selector "button[class*='focus-visible:outline-[var(--pvc-color-focus)]']"
        assert_no_selector "button[class*='focus-visible:outline-black']"
        assert_no_selector "button[class*='focus-visible:outline-white']"
      end
    end

    test 'leading and trailing visuals are hidden from assistive technology' do
      render_inline(Pathogen::Button.new) do |button|
        button.with_leading_visual { 'Leading' }
        button.with_trailing_visual { 'Trailing' }
        'Search'
      end

      assert_selector 'button [aria-hidden="true"]', count: 2
      assert_selector 'button', text: 'Search'
    end

    test 'keeps button focusable when aria_disabled is set' do
      render_inline(Pathogen::Button.new(aria_disabled: true)) { 'Continue' }

      assert_selector 'button[aria-disabled="true"]:not([disabled])'
    end

    test 'raises when disabled and aria_disabled are both set' do
      assert_raises(ArgumentError) do
        render_inline(Pathogen::Button.new(disabled: true, aria_disabled: true)) { 'Continue' }
      end
    end

    test 'passes axe-core checks when disabled' do
      render_inline(Pathogen::Button.new(tone: :primary, emphasis: :solid, disabled: true)) { 'Submit' }

      assert_axe_structural_accessible rendered_content, context: 'disabled primary'
    end

    test 'passes axe-core checks for all tone and emphasis combinations' do
      Pathogen::Button::TONE_OPTIONS.product(Pathogen::Button::EMPHASIS_OPTIONS).each do |tone, emphasis|
        render_inline(Pathogen::Button.new(tone: tone, emphasis: emphasis)) { 'Submit' }

        assert_axe_structural_accessible rendered_content, context: "#{tone} #{emphasis}"
      end
    end

    test 'passes axe-core checks when aria_disabled' do
      render_inline(Pathogen::Button.new(tone: :primary, emphasis: :solid, aria_disabled: true)) { 'Continue' }

      assert_axe_structural_accessible rendered_content, context: 'aria-disabled primary'
    end

    test 'passes axe-core checks when rendered as a link' do
      render_inline(Pathogen::Button.new(tag: :a, href: '/samples', tone: :primary, emphasis: :solid,
                                         text: 'View samples'))

      assert_selector 'a[href="/samples"]', text: 'View samples'
      assert_axe_structural_accessible rendered_content, context: 'link button'
    end

    test 'link buttons include interactive hover classes' do
      render_inline(Pathogen::Button.new(tag: :a, href: '/samples', tone: :primary, emphasis: :solid,
                                         text: 'View samples'))

      assert_selector "a[class*='interactive-hover:bg-[var(--pvc-color-accent-solid-hover)]']"
    end

    test 'icon_only passes axe-core checks when rendered as a link' do
      render_inline(Pathogen::Button.new(icon_only: true, tag: :a, href: '/search', text: 'Search')) do |button|
        button.with_leading_visual do
          '<svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6"></circle></svg>'.html_safe
        end
      end

      assert_selector 'a[href="/search"][aria-label="Search"]'
      assert_axe_structural_accessible rendered_content, context: 'icon-only link button'
    end

    test 'renders text option without a content block' do
      render_inline(Pathogen::Button.new(tone: :primary, emphasis: :solid, aria_disabled: true, text: 'Continue'))

      assert_selector 'button[aria-disabled="true"]', text: 'Continue'
    end

    test 'icon_only medium uses 44px square target' do
      render_inline(Pathogen::Button.new(icon_only: true, text: 'Search')) do |button|
        button.with_leading_visual { 'Icon' }
      end

      assert_selector 'button[aria-label="Search"]'
      assert_selector 'button[class*="aspect-square"]'
      assert_selector 'button[class*="w-11"]'
      assert_selector 'button[class*="p-0"]'
      assert_no_selector 'button > span:not([aria-hidden])'
    end

    test 'icon_only small uses 24px AA square target' do
      render_inline(Pathogen::Button.new(icon_only: true, size: :small, text: 'Search')) do |button|
        button.with_leading_visual { 'Icon' }
      end

      assert_selector 'button[class*="w-6"]'
      assert_selector 'button[class*="h-6"]'
    end

    test 'icon_only raises without an accessible name' do
      assert_raises(ArgumentError) do
        render_inline(Pathogen::Button.new(icon_only: true)) do |button|
          button.with_leading_visual { 'Icon' }
        end
      end
    end

    test 'icon_only raises without icon content' do
      assert_raises(ArgumentError) do
        render_inline(Pathogen::Button.new(icon_only: true, text: 'Search'))
      end
    end

    test 'icon_only accepts aria labelledby when referenced text contains the full action label' do
      render_inline(Pathogen::Button.new(icon_only: true, aria: { labelledby: 'edit-payment-date-label' })) do |button|
        button.with_leading_visual { 'Icon' }
      end

      assert_selector 'button[aria-labelledby="edit-payment-date-label"]'
    end

    test 'icon_only passes axe-core structural checks' do
      render_inline(Pathogen::Button.new(icon_only: true, text: 'Search', tone: :primary, emphasis: :solid)) do |button|
        button.with_leading_visual do
          '<svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6"></circle></svg>'.html_safe
        end
      end

      assert_axe_structural_accessible rendered_content, context: 'icon-only button'
    end

    test 'with_tooltip wraps the button and marks it as the tooltip trigger' do
      render_inline(Pathogen::Button.new(icon_only: true, text: 'Specimens')) do |button|
        button.with_leading_visual { 'Icon' }
        button.with_tooltip(text: 'Specimens', placement: :right)
      end

      assert_selector(
        "div[data-controller='pathogen--tooltip']" \
        "[data-pathogen--tooltip-portal-aria-label-value='#{Pathogen::Tooltip.portal_aria_label}']"
      )
      assert_selector 'button[aria-label="Specimens"][data-pathogen--tooltip-target="trigger"]'
      assert_selector "div[role='tooltip'][data-pathogen--tooltip-target='tooltip']", text: 'Specimens'
    end

    test 'with_tooltip on an icon-only button is visual-only (no aria-describedby echo)' do
      render_inline(Pathogen::Button.new(icon_only: true, text: 'Specimens')) do |button|
        button.with_leading_visual { 'Icon' }
        button.with_tooltip(text: 'Specimens', placement: :right)
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='none']"
      assert_selector 'button[aria-label="Specimens"]'
      assert_no_selector 'button[aria-describedby]'
    end

    test 'with_tooltip on a labelled button associates via aria-describedby' do
      render_inline(Pathogen::Button.new(text: 'Export')) do |button|
        button.with_tooltip(text: 'Exports are retained for 30 days')
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='describedby']"
      assert_selector 'button[aria-describedby]'
      tooltip_id = page.find('button')['aria-describedby']
      assert_selector "div##{tooltip_id}[role='tooltip'][data-pathogen--tooltip-target='tooltip']",
                      text: 'Exports are retained for 30 days'
    end

    test 'with_tooltip(describe: true) forces association on an icon-only button' do
      render_inline(Pathogen::Button.new(icon_only: true, text: 'Filters')) do |button|
        button.with_leading_visual { 'Icon' }
        button.with_tooltip(text: '3 active filters', placement: :bottom, describe: true)
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='describedby']"
      assert_selector 'button[aria-label="Filters"][aria-describedby]'
      tooltip_id = page.find('button')['aria-describedby']
      assert_selector "div##{tooltip_id}[role='tooltip']", text: '3 active filters'
    end

    test 'with_tooltip keeps the accessible name on the button itself' do
      render_inline(Pathogen::Button.new(icon_only: true, text: 'Dashboard')) do |button|
        button.with_leading_visual { 'Icon' }
        button.with_tooltip(text: 'Dashboard', placement: :right)
      end

      assert_selector 'button[aria-label="Dashboard"]'
      assert_no_selector 'button[aria-label=""]'
      assert_selector 'div[role="tooltip"]', text: 'Dashboard'
    end

    test 'with_tooltip works on labelled text buttons' do
      render_inline(Pathogen::Button.new(text: 'Export')) do |button|
        button.with_tooltip(text: 'Exports are retained for 30 days')
      end

      assert_selector 'button[data-pathogen--tooltip-target="trigger"]', text: 'Export'
      assert_selector 'div[role="tooltip"]', text: 'Exports are retained for 30 days'
    end

    test 'with_tooltip preserves full-width block button layout' do
      render_inline(Pathogen::Button.new(block: true, text: 'Run analysis')) do |button|
        button.with_tooltip(text: 'Starts this run')
      end

      assert_selector "div[data-controller='pathogen--tooltip'].block.w-full"
      assert_no_selector "div[data-controller='pathogen--tooltip'].inline-block"
      assert_selector "div[data-controller='pathogen--tooltip'] > button.flex.w-full", text: 'Run analysis'
    end

    test 'with_tooltip wrapper stays inline-block for non-block buttons' do
      render_inline(Pathogen::Button.new(text: 'Export')) do |button|
        button.with_tooltip(text: 'Exports are retained for 30 days')
      end

      assert_selector "div[data-controller='pathogen--tooltip'].inline-block"
      assert_no_selector "div[data-controller='pathogen--tooltip'].block"
    end

    test 'with_tooltip defaults to top placement' do
      render_inline(Pathogen::Button.new(text: 'Export')) do |button|
        button.with_tooltip(text: 'Exports are retained for 30 days')
      end

      assert_selector 'div[role="tooltip"][data-placement="top"]', text: 'Exports are retained for 30 days'
    end

    test 'with_tooltip appends its id to a caller-supplied aria-describedby' do
      render_inline(Pathogen::Button.new(text: 'Export', aria: { describedby: 'existing-hint' })) do |button|
        button.with_tooltip(text: 'Exports are retained for 30 days')
      end

      describedby = page.find('button')['aria-describedby'].split
      assert_includes describedby, 'existing-hint'
      tooltip_id = describedby.last
      assert_match(/\Atooltip-/, tooltip_id)
      assert_selector "div##{tooltip_id}[role='tooltip']", text: 'Exports are retained for 30 days'
    end

    test 'with_tooltip on a disabled button raises a helpful error' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Button.new(text: 'Save', disabled: true)) do |button|
          button.with_tooltip(text: 'Save your work')
        end
      end

      assert_match(/disabled/, error.message)
      assert_match(/aria_disabled/, error.message)
    end

    test 'with_tooltip is allowed on an aria_disabled button' do
      render_inline(Pathogen::Button.new(text: 'Continue', aria_disabled: true)) do |button|
        button.with_tooltip(text: 'Complete the form first')
      end

      assert_selector 'button[aria-disabled="true"][data-pathogen--tooltip-target="trigger"]', text: 'Continue'
      assert_selector 'div[role="tooltip"]', text: 'Complete the form first'
    end

    test 'icon_only with_tooltip passes axe-core structural checks' do
      render_inline(
        Pathogen::Button.new(icon_only: true, text: 'Settings', tone: :neutral, emphasis: :ghost)
      ) do |button|
        button.with_leading_visual do
          '<svg aria-hidden="true" width="16" height="16"><circle cx="8" cy="8" r="6"></circle></svg>'.html_safe
        end
        button.with_tooltip(text: 'Settings', placement: :right)
      end

      assert_axe_structural_accessible rendered_content, context: 'icon-only button with tooltip'
    end
  end
end
