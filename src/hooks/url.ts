import posthog from "posthog-js";
import { useDidUpdate, useWindowEvent } from "@mantine/hooks";
import { useCallback, useEffect } from "react";
import { VIEW_MODES } from "~/constants";
import { useConfigStore } from "~/stores/config";
import { ViewMode } from "~/types";
import { IntentEvent } from "~/util/global-events";
import { useEventSubscription } from "./event";
import { IntentPayload, IntentType, getIntentView, handleIntentRequest } from "~/util/intents";
import { updateTitle } from "~/util/helpers";

/**
 * Sync the active view to the URL and handle incoming intents
 */
export function useUrlHandler() {
	const { setActiveView } = useConfigStore.getState();
	const activeView = useConfigStore((s) => s.activeView);

	const syncViewToUrl = useCallback(() => {
		const url = location.pathname.toLowerCase();
		const params = new URLSearchParams(location.search);
		const intent = params.get('intent');
		const views = Object.keys(VIEW_MODES) as ViewMode[];
		const target = views.find((v) => url === `/${v}`);

		if (target) {
			setActiveView(target);
		} else {
			history.replaceState(null, document.title, `/${activeView}`);
		}

		if (intent) {
			handleIntentRequest(intent);
		}
	}, [activeView, setActiveView]);

	// Sync initial URL to active view
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(syncViewToUrl, []);

	// Sync history change to active view
	useWindowEvent('popstate', syncViewToUrl);

	// Sync active view to URL
	useDidUpdate(() => {
		if (location.pathname !== `/${activeView}`) {
			history.pushState(null, document.title, `/${activeView}`);
			posthog.capture('$pageview');
		}
		updateTitle();
	}, [activeView]);
}

/**
 * Listen to the specified intent and invoke the handler when it is dispatched.
 *
 * @param type The intent type to listen for
 * @param handler The handler to invoke when the intent is dispatched
 */
export function useIntent(type: IntentType, handler: (payload: IntentPayload) => void) {
	useEventSubscription(IntentEvent, (event) => {
		if (event.type === type) {
			handler(event.payload || {});
		}
	});
}

/**
 * Dispatch an intent with the specified payload
 *
 * @param intent The intent type to dispatch
 * @param payload Optional payload
 */
export function dispatchIntent(intent: IntentType, payload?: IntentPayload) {
	const { setActiveView } = useConfigStore.getState();
	const view = getIntentView(intent);

	if (view) {
		setActiveView(view);
	}

	IntentEvent.dispatch({ type: intent, payload });
}
