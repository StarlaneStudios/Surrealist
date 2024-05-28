import { useConfigStore } from "~/stores/config";
import { useStable } from "./stable";

/**
 * Returns whether the onboarding step has been completed
 *
 * @returns A tuple containing a boolean indicating whether the onboarding step has been completed and a function to mark the onboarding step as completed
 */
export function useOnboarding(onboarding: string) {
	const completeOnboarding = useConfigStore(state => state.completeOnboarding);

	const complete = useStable(() => {
		completeOnboarding(onboarding);
	});

	return [
		useConfigStore(s => s.onboarding.includes(onboarding)),
		complete
	] as const;
}