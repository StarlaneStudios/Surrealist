import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { getDefaultConfig } from './vite.config';

// https://vitejs.dev/config/
export default defineConfig((config) => {
	const defaultConfig = getDefaultConfig(config);

	return {
		...defaultConfig,
		plugins: [
			...defaultConfig.plugins || [],
			compression({
				threshold: 100,
				deleteOriginalAssets: true,
				include: /\.(html|xml|css|json|js|mjs|svg|wasm)$/
			})
		]
	};
});