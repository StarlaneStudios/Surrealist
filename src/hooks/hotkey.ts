import { HotkeyItem, getHotkeyHandler } from "@mantine/hooks";
import { useEffect } from "react";

/**
 * Listen for hotkeys on the body element
 *
 * NOTE See https://github.com/xyflow/xyflow/issues/3924
 *
 * @param hotkeys Hotkeys
 */
export function useCompatHotkeys(hotkeys: HotkeyItem[]) {
	useEffect(() => {
		const handler = getHotkeyHandler(hotkeys);

		document.body.addEventListener('keydown', handler);

		return () => {
			document.body.removeEventListener('keydown', handler);
		};
	}, [hotkeys]);
}