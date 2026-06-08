import { delay, http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";

const LAZY_LOAD_ROUTE = "/lookbook-mocks/tabs/lazy-load/:panel";

const frameResponses = {
  metrics: {
    frameId: "preview-metrics-frame",
    title: "Quality Metrics",
    body: `
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div class="text-sm font-medium text-emerald-800 dark:text-emerald-200">Pass rate</div>
          <div class="mt-2 text-3xl font-semibold text-emerald-950 dark:text-emerald-50">98.4%</div>
        </div>
        <div class="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
          <div class="text-sm font-medium text-sky-800 dark:text-sky-200">Samples reviewed</div>
          <div class="mt-2 text-3xl font-semibold text-sky-950 dark:text-sky-50">1,284</div>
        </div>
        <div class="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
          <div class="text-sm font-medium text-violet-800 dark:text-violet-200">Median turnaround</div>
          <div class="mt-2 text-3xl font-semibold text-violet-950 dark:text-violet-50">18h</div>
        </div>
      </div>
    `,
  },
  timeline: {
    frameId: "preview-timeline-frame",
    title: "Processing Timeline",
    body: `
      <ol class="space-y-3">
        <li class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div class="font-medium text-neutral-950 dark:text-neutral-50">09:10 - Intake completed</div>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Metadata passed validation and entered the sequencing queue.</p>
        </li>
        <li class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div class="font-medium text-neutral-950 dark:text-neutral-50">11:45 - Quality control passed</div>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Coverage and contamination checks are within expected thresholds.</p>
        </li>
        <li class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div class="font-medium text-neutral-950 dark:text-neutral-50">14:30 - Report generated</div>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">The summary is ready for review in the reporting workspace.</p>
        </li>
      </ol>
    `,
  },
};

let workerStart;

function turboFrameResponse({ frameId, title, body }) {
  return `
    <turbo-frame id="${frameId}">
      <section class="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-950">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold text-neutral-950 dark:text-neutral-50">${title}</h3>
          <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">Loaded by MSW</span>
        </div>
        ${body}
      </section>
    </turbo-frame>
  `;
}

const handlers = [
  http.get(LAZY_LOAD_ROUTE, async ({ params }) => {
    const response = frameResponses[params.panel];

    if (!response) {
      return HttpResponse.html(
        '<turbo-frame id="unknown-frame"><p>Unknown lazy-load preview panel.</p></turbo-frame>',
        { status: 404 },
      );
    }

    await delay(800);

    return HttpResponse.html(turboFrameResponse(response));
  }),
];

const worker = setupWorker(...handlers);

export function enableTabsLazyLoadMocks() {
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve();
  }

  workerStart ??= worker.start({
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
    onUnhandledRequest: "bypass",
  });

  return workerStart;
}
